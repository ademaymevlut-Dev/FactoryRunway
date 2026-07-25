export const AUTH_MESSAGE_CODES = [
  "ACCOUNT_CREATED",
  "EMAIL_ALREADY_EXISTS",
  "INVALID_CREDENTIALS",
  "INVALID_EMAIL",
  "INVALID_ROLE",
  "NAME_TOO_SHORT",
  "PASSWORD_REQUIRED",
  "PASSWORD_TOO_SHORT",
  "UNAUTHORIZED",
  "UNKNOWN_ERROR",
  "VALIDATION_ERROR",
] as const;

export type AuthMessageCode = (typeof AUTH_MESSAGE_CODES)[number];

export type PublicAuthField = "email" | "name" | "password";

export type PublicAuthState = {
  fieldErrors?: Partial<Record<PublicAuthField, AuthMessageCode>>;
  messageCode: AuthMessageCode | null;
};

export type AdminAuthState = {
  fieldErrors?: Partial<
    Record<PublicAuthField | "role", AuthMessageCode>
  >;
  messageCode: AuthMessageCode | null;
};

export const initialPublicAuthState: PublicAuthState = {
  messageCode: null,
};
