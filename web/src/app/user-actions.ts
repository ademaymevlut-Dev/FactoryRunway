"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { USER_ROLES } from "@/lib/auth/roles";
import { clearSession, createSession } from "@/lib/auth/session";
import type { CreateUserField, CreateUserState } from "@/lib/auth/create-user-state";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = new Set<string>([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

function readString(formData: FormData, key: CreateUserField) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function validateBaseUser(formData: FormData) {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const name = readString(formData, "name");
  const fieldErrors: CreateUserState["fieldErrors"] = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Geçerli bir e-posta gir.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Şifre en az 8 karakter olmalı.";
  }

  if (name.length < 2) {
    fieldErrors.name = "Ad en az 2 karakter olmalı.";
  }

  return {
    data: { email, password, name },
    fieldErrors,
  };
}

async function isEmailTaken(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return Boolean(existingUser);
}

export async function createPlayerAction(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const { data, fieldErrors } = validateBaseUser(formData);
  const factoryName = readString(formData, "factoryName");

  if (factoryName.length < 2) {
    fieldErrors.factoryName = "Fabrika adı en az 2 karakter olmalı.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "Player oluşturulamadı. Lütfen alanları kontrol et.",
      fieldErrors,
    };
  }

  if (await isEmailTaken(data.email)) {
    return {
      message: "Bu e-posta ile kayıtlı bir kullanıcı zaten var.",
      fieldErrors: {
        email: "Bu e-posta zaten kullanılıyor.",
      },
    };
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: USER_ROLES.PLAYER,
      playerProfile: {
        create: {
          displayName: data.name,
          factoryName,
        },
      },
    },
    select: {
      id: true,
    },
  });

  await createSession(user.id);

  redirect("/player?created=1");
}

export async function createAdminAction(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const { data, fieldErrors } = validateBaseUser(formData);
  const role = readString(formData, "role") || USER_ROLES.ADMIN;

  if (!ADMIN_ROLES.has(role)) {
    fieldErrors.role = "Admin rolü geçersiz.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "Admin oluşturulamadı. Lütfen alanları kontrol et.",
      fieldErrors,
    };
  }

  if (await isEmailTaken(data.email)) {
    return {
      message: "Bu e-posta ile kayıtlı bir kullanıcı zaten var.",
      fieldErrors: {
        email: "Bu e-posta zaten kullanılıyor.",
      },
    };
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
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
    select: {
      id: true,
    },
  });

  await createSession(user.id);

  redirect("/admin?created=1");
}

export async function loginAction(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const fieldErrors: CreateUserState["fieldErrors"] = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Geçerli bir e-posta gir.";
  }

  if (!password) {
    fieldErrors.password = "Şifre gerekli.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      message: "Giriş yapılamadı. Lütfen alanları kontrol et.",
      fieldErrors,
    };
  }

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
      message: "E-posta veya şifre hatalı.",
      fieldErrors: {
        email: "Bilgileri kontrol et.",
        password: "Bilgileri kontrol et.",
      },
    };
  }

  await createSession(user.id);

  if (ADMIN_ROLES.has(user.role)) {
    redirect("/admin");
  }

  redirect("/player");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
