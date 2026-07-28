import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  createGoogleAuthorizationUrl,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
} from "@/lib/auth/google-oauth";
import { normalizeLocale } from "@/lib/i18n/locales";

const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return redirectToAccount(request);
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  const redirectUri = resolveGoogleRedirectUri(request.url);
  const cookieStore = await cookies();

  cookieStore.set(
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
    [state, nonce, locale].join("."),
    {
      httpOnly: true,
      maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  return NextResponse.redirect(
    createGoogleAuthorizationUrl({
      nonce,
      redirectUri,
      state,
    }),
  );
}

function redirectToAccount(request: NextRequest) {
  const url = new URL("/#account", request.url);

  return NextResponse.redirect(url);
}
