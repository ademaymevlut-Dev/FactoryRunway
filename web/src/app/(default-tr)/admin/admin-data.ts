import { Prisma } from "@/generated/prisma/client";

export function text(formData: FormData, key: string, required = true) {
  const value = formData.get(key);
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${key} zorunlu.`);
  return result;
}

export function optionalText(formData: FormData, key: string) {
  return text(formData, key, false) || null;
}

export function integer(
  formData: FormData,
  key: string,
  options: { min?: number; max?: number; nullable: true },
): number | null;
export function integer(
  formData: FormData,
  key: string,
  options?: { min?: number; max?: number; nullable?: false },
): number;
export function integer(
  formData: FormData,
  key: string,
  options: { min?: number; max?: number; nullable?: boolean } = {},
) {
  const raw = text(formData, key, false);
  if (!raw && options.nullable) return null;
  const value = Number(raw);
  if (
    !Number.isInteger(value) ||
    value < (options.min ?? 0) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw new Error(`${key} geçerli bir tam sayı olmalı.`);
  }
  return value;
}

export function bigint(formData: FormData, key: string, nullable: true): bigint | null;
export function bigint(formData: FormData, key: string, nullable?: false): bigint;
export function bigint(formData: FormData, key: string, nullable = false) {
  const raw = text(formData, key, false);
  if (!raw && nullable) return null;
  if (!/^\d+$/.test(raw)) throw new Error(`${key} 0 veya daha büyük bir tam sayı olmalı.`);
  return BigInt(raw);
}

export function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function json(formData: FormData, key = "metadata") {
  const raw = text(formData, key, false);
  if (!raw) return Prisma.DbNull;
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue;
  } catch {
    throw new Error(`${key} geçerli JSON olmalı.`);
  }
}

export function jsonText(value: unknown) {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

export function assertMinMax(min: number, max: number, label: string) {
  if (min > max) throw new Error(`${label}: minimum değer maksimum değerden büyük olamaz.`);
}
