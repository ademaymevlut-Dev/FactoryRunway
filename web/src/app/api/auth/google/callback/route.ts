import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  exchangeGoogleAuthorizationCode,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  resolveGoogleRedirectUri,
  signInWithGoogleProfile,
  verifyGoogleIdToken,
} from "@/lib/auth/google-oauth";
import { USER_ROLES } from "@/lib/auth/roles";
import { createSession } from "@/lib/auth/session";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n/locales";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const stateCookie = readStateCookie(
    cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value,
  );
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE_NAME);

  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (searchParams.get("error") || !code || !stateCookie || state !== stateCookie.state) {
    return redirectToAccount(request);
  }

  try {
    const idToken = await exchangeGoogleAuthorizationCode({
      code,
      redirectUri: resolveGoogleRedirectUri(request.url),
    });
    const profile = await verifyGoogleIdToken(idToken, stateCookie.nonce);
    const result = await signInWithGoogleProfile(profile, stateCookie.locale);

    await createSession(result.userId);

    if (result.role === USER_ROLES.ADMIN || result.role === USER_ROLES.SUPER_ADMIN) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.redirect(
      new URL(result.isNewUser ? "/onboarding" : "/player", request.url),
    );
  } catch {
    return redirectToAccount(request);
  }
}

function readStateCookie(value: string | undefined):
  | {
      locale: SupportedLocale;
      nonce: string;
      state: string;
    }
  | null {
  if (!value) return null;

  const [state, nonce, locale] = value.split(".");

  if (!state || !nonce) return null;

  return {
    locale: normalizeLocale(locale),
    nonce,
    state,
  };
}

function redirectToAccount(request: NextRequest) {
  return NextResponse.redirect(new URL("/#account", request.url));
}
