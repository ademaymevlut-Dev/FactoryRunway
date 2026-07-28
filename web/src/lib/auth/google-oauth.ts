import { createRemoteJWKSet, jwtVerify } from "jose";

import type { Prisma } from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/db";
import type { SupportedLocale } from "@/lib/i18n/locales";

export const GOOGLE_AUTH_PROVIDER = "google";
export const GOOGLE_OAUTH_STATE_COOKIE_NAME =
  "factory_runway_google_oauth_state";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_LEGACY_ISSUER = "accounts.google.com";
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

type GoogleTokenResponse = {
  error?: string;
  error_description?: string;
  id_token?: string;
};

export type GoogleIdProfile = {
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string;
  sub: string;
};

export type GoogleSignInResult = {
  isNewUser: boolean;
  role: string;
  userId: string;
};

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function resolveGoogleRedirectUri(requestUrl: string) {
  const requestOrigin = new URL(requestUrl);

  if (isLocalhost(requestOrigin.hostname)) {
    return new URL("/api/auth/google/callback", requestOrigin.origin).toString();
  }

  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return new URL("/api/auth/google/callback", requestUrl).toString();
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function createGoogleAuthorizationUrl({
  nonce,
  redirectUri,
  state,
}: {
  nonce: string;
  redirectUri: string;
  state: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required for Google OAuth.");
  }

  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");

  return url;
}

export async function exchangeGoogleAuthorizationCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are missing.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const tokenResponse = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !tokenResponse.id_token) {
    throw new Error(
      tokenResponse.error_description ??
        tokenResponse.error ??
        "Google token exchange failed.",
    );
  }

  return tokenResponse.id_token;
}

export async function verifyGoogleIdToken(idToken: string, expectedNonce: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required for Google ID token verification.");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    issuer: [GOOGLE_ISSUER, GOOGLE_LEGACY_ISSUER],
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error("Google OAuth nonce mismatch.");
  }

  const sub = stringClaim(payload.sub);
  const email = stringClaim(payload.email)?.toLowerCase();
  const emailVerified = payload.email_verified === true;

  if (!sub || !email || !emailVerified) {
    throw new Error("Google account email is missing or not verified.");
  }

  return {
    email,
    emailVerified,
    image: stringClaim(payload.picture) ?? null,
    name: stringClaim(payload.name) ?? email.split("@")[0] ?? "Player",
    sub,
  } satisfies GoogleIdProfile;
}

export async function signInWithGoogleProfile(
  profile: GoogleIdProfile,
  locale: SupportedLocale,
): Promise<GoogleSignInResult> {
  const prisma = getPrisma();
  const verifiedAt = profile.emailVerified ? new Date() : null;

  return prisma.$transaction(async (tx) => {
    const account = await tx.authAccount.findUnique({
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
      where: {
        provider_providerAccountId: {
          provider: GOOGLE_AUTH_PROVIDER,
          providerAccountId: profile.sub,
        },
      },
    });

    if (account) {
      await tx.authAccount.update({
        data: {
          providerEmail: profile.email,
        },
        where: {
          id: account.id,
        },
      });
      await syncGoogleUserProfile(tx, account.user.id, profile, verifiedAt);

      return {
        isNewUser: false,
        role: account.user.role,
        userId: account.user.id,
      };
    }

    const existingUser = await tx.user.findUnique({
      select: {
        id: true,
        playerProfile: {
          select: {
            id: true,
          },
        },
        role: true,
      },
      where: {
        email: profile.email,
      },
    });

    if (existingUser) {
      await tx.authAccount.create({
        data: {
          provider: GOOGLE_AUTH_PROVIDER,
          providerAccountId: profile.sub,
          providerEmail: profile.email,
          userId: existingUser.id,
        },
      });
      await syncGoogleUserProfile(tx, existingUser.id, profile, verifiedAt);

      if (existingUser.role === USER_ROLES.PLAYER && !existingUser.playerProfile) {
        await tx.playerProfile.create({
          data: {
            displayName: profile.name,
            preferredLocale: locale,
            userId: existingUser.id,
          },
        });
      } else if (existingUser.role === USER_ROLES.PLAYER) {
        await tx.playerProfile.updateMany({
          data: {
            preferredLocale: locale,
          },
          where: {
            userId: existingUser.id,
          },
        });
      }

      return {
        isNewUser: false,
        role: existingUser.role,
        userId: existingUser.id,
      };
    }

    const user = await tx.user.create({
      data: {
        authAccounts: {
          create: {
            provider: GOOGLE_AUTH_PROVIDER,
            providerAccountId: profile.sub,
            providerEmail: profile.email,
          },
        },
        email: profile.email,
        emailVerified: verifiedAt,
        image: profile.image,
        name: profile.name,
        playerProfile: {
          create: {
            displayName: profile.name,
            preferredLocale: locale,
          },
        },
        role: USER_ROLES.PLAYER,
      },
      select: {
        id: true,
        role: true,
      },
    });

    return {
      isNewUser: true,
      role: user.role,
      userId: user.id,
    };
  });
}

async function syncGoogleUserProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  profile: GoogleIdProfile,
  verifiedAt: Date | null,
) {
  const emailOwner = await tx.user.findUnique({
    select: {
      id: true,
    },
    where: {
      email: profile.email,
    },
  });
  const canSyncEmail = !emailOwner || emailOwner.id === userId;

  await tx.user.update({
    data: {
      ...(canSyncEmail ? { email: profile.email } : {}),
      ...(verifiedAt ? { emailVerified: verifiedAt } : {}),
      image: profile.image,
      name: profile.name,
    },
    where: {
      id: userId,
    },
  });
}

function stringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
