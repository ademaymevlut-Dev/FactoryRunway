"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type {
  AdminAuthState,
  AuthMessageCode,
  PublicAuthField,
  PublicAuthState,
} from "@/lib/auth/public-auth-state";
import { USER_ROLES } from "@/lib/auth/roles";
import { clearSession, createSession } from "@/lib/auth/session";
import type { CreateUserField } from "@/lib/auth/create-user-state";
import { getPrisma } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";

import { requireAdminUser } from "./(default-tr)/admin/admin-auth";

const ADMIN_ROLES = new Set<string>([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);
type BaseUserField = Extract<CreateUserField, PublicAuthField>;
type BaseUserFieldErrors = Partial<Record<BaseUserField, AuthMessageCode>>;

function readString(formData: FormData, key: CreateUserField) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readRequestedLocale(formData: FormData) {
  return normalizeLocale(formData.get("locale") ?? "en");
}

function validateBaseUser(formData: FormData) {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const name = readString(formData, "name");
  const fieldErrors: BaseUserFieldErrors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "INVALID_EMAIL";
  }

  if (password.length < 8) {
    fieldErrors.password = "PASSWORD_TOO_SHORT";
  }

  if (name.length < 2) {
    fieldErrors.name = "NAME_TOO_SHORT";
  }

  return {
    data: { email, password, name },
    fieldErrors,
  };
}

async function isEmailTaken(email: string) {
  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return Boolean(existingUser);
}

export async function createPlayerAction(
  _previousState: PublicAuthState,
  formData: FormData,
): Promise<PublicAuthState> {
  const { data, fieldErrors } = validateBaseUser(formData);
  const locale = readRequestedLocale(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      messageCode: "VALIDATION_ERROR",
    };
  }

  if (await isEmailTaken(data.email)) {
    return {
      fieldErrors: {
        email: "EMAIL_ALREADY_EXISTS",
      },
      messageCode: "EMAIL_ALREADY_EXISTS",
    };
  }

  const passwordHash = await hashPassword(data.password);
  const prisma = getPrisma();

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: USER_ROLES.PLAYER,
      playerProfile: {
        create: {
          displayName: data.name,
          preferredLocale: locale,
        },
      },
    },
    select: {
      id: true,
    },
  });

  await createSession(user.id);

  redirect("/onboarding");
}

export async function createAdminAction(
  _previousState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  await requireAdminUser();

  const { data, fieldErrors: validationErrors } = validateBaseUser(formData);
  const fieldErrors: NonNullable<AdminAuthState["fieldErrors"]> = {
    ...validationErrors,
  };
  const role = readString(formData, "role") || USER_ROLES.ADMIN;

  if (!ADMIN_ROLES.has(role)) {
    fieldErrors.role = "INVALID_ROLE";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      messageCode: "VALIDATION_ERROR",
    };
  }

  if (await isEmailTaken(data.email)) {
    return {
      fieldErrors: {
        email: "EMAIL_ALREADY_EXISTS",
      },
      messageCode: "EMAIL_ALREADY_EXISTS",
    };
  }

  const passwordHash = await hashPassword(data.password);
  const prisma = getPrisma();

  await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role,
      adminProfile: {
        create: {
          displayName: data.name,
          permissions: {},
        },
      },
    },
  });

  return {
    messageCode: "ACCOUNT_CREATED",
  };
}

export async function loginAction(
  _previousState: PublicAuthState,
  formData: FormData,
): Promise<PublicAuthState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const fieldErrors: PublicAuthState["fieldErrors"] = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "INVALID_EMAIL";
  }

  if (!password) {
    fieldErrors.password = "PASSWORD_REQUIRED";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      messageCode: "VALIDATION_ERROR",
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
    },
  });

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return {
      fieldErrors: {
        email: "INVALID_CREDENTIALS",
        password: "INVALID_CREDENTIALS",
      },
      messageCode: "INVALID_CREDENTIALS",
    };
  }

  await createSession(user.id);

  if (ADMIN_ROLES.has(user.role)) {
    redirect("/admin");
  }

  await prisma.playerProfile.updateMany({
    where: { userId: user.id },
    data: { preferredLocale: readRequestedLocale(formData) },
  });

  redirect("/player");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
