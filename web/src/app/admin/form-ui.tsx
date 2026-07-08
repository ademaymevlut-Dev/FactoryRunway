import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { NativeSelect } from "@/components/ui/native-select";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-secondary-foreground">
      <span className="font-semibold">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`game-input admin-form-control min-h-11 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <NativeSelect {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`game-input admin-form-control min-h-24 font-mono text-xs ${props.className ?? ""}`} />;
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="game-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export const enumOptions = {
  tiers: ["BASIC", "STANDARD", "PREMIUM", "LUXURY"],
  grades: ["WORKSHOP", "INDUSTRIAL", "PRECISION", "SMART"],
  standards: ["WORKSHOP", "SMALL_FACTORY", "INDUSTRIAL_FACTORY", "ADVANCED_FACTORY"],
  statuses: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"],
};

export function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option key={value} value={value}>{value}</option>);
}
