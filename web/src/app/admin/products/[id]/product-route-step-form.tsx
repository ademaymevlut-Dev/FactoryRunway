"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  Field,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "../../form-ui";
import {
  deleteProductRouteStepAction,
  saveProductRouteStepAction,
} from "../product-actions";
import { initialAdminActionState } from "../../product-form-state";

export type ProductRouteDepartmentOption = {
  id: string;
  name: string;
  standardWorkloadPoints: number | null;
};

export type ProductRouteStepValue = {
  id: string;
  departmentId: string;
  sequence: number;
  isRequired: boolean;
  canOutsource: boolean;
  workloadPointsPerUnit: number;
  setupPoints: number;
  metadata: string;
};

export function ProductRouteStepForm({
  defaultSequence,
  departments,
  productId,
  step,
}: {
  defaultSequence?: number;
  departments: ProductRouteDepartmentOption[];
  productId: string;
  step?: ProductRouteStepValue;
}) {
  const [state, action, pending] = useActionState(
    saveProductRouteStepAction.bind(null, productId, step?.id ?? null),
    initialAdminActionState,
  );
  const initialDepartmentId = step?.departmentId ?? departments[0]?.id ?? "";
  const initialStandard =
    departments.find((department) => department.id === initialDepartmentId)
      ?.standardWorkloadPoints ?? null;
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [workloadPoints, setWorkloadPoints] = useState(
    step?.workloadPointsPerUnit ?? initialStandard ?? 1,
  );
  const selectedDepartment = departments.find(
    (department) => department.id === departmentId,
  );
  const standardPoints = selectedDepartment?.standardWorkloadPoints ?? null;
  const difference =
    standardPoints === null ? null : workloadPoints - standardPoints;
  const hasDepartments = departments.length > 0;

  function changeDepartment(nextDepartmentId: string) {
    const nextStandard =
      departments.find(
        (department) => department.id === nextDepartmentId,
      )?.standardWorkloadPoints ?? null;

    setDepartmentId(nextDepartmentId);
    setWorkloadPoints(nextStandard ?? 1);
  }

  return (
    <form
      action={action}
      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <FormGrid>
        <Field label="Departman">
          <Select
            disabled={!hasDepartments}
            name="departmentId"
            onChange={(event) => changeDepartment(event.target.value)}
            required
            value={departmentId}
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rota sırası">
          <Input
            defaultValue={step?.sequence ?? defaultSequence ?? 1}
            min="1"
            name="sequence"
            required
            type="number"
          />
        </Field>
        <Field
          label="Birim başına iş yükü puanı"
          hint="Kaydedilen değer ürün rotasının nihai iş yüküdür."
        >
          <div className="flex items-center gap-2">
            <Button
              aria-label="İş yükü puanını azalt"
              disabled={workloadPoints <= 1}
              onClick={() =>
                setWorkloadPoints((current) => Math.max(1, current - 1))
              }
              size="icon"
              type="button"
              variant="outline"
            >
              <Minus />
            </Button>
            <Input
              className="min-w-24 text-center font-mono text-base font-semibold"
              min="1"
              name="workloadPointsPerUnit"
              onChange={(event) =>
                setWorkloadPoints(Math.max(1, Number(event.target.value) || 1))
              }
              required
              type="number"
              value={workloadPoints}
            />
            <Button
              aria-label="İş yükü puanını artır"
              onClick={() => setWorkloadPoints((current) => current + 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <Plus />
            </Button>
          </div>
        </Field>
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Ürün türü standardı
          </p>
          {standardPoints === null ? (
            <p className="mt-2 text-sm text-amber-300">
              Bu departman için standart bulunamadı.
            </p>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-semibold text-primary">
                  {standardPoints} puan
                </p>
                <p className="text-xs text-muted-foreground">
                  Fark: {formatDifference(difference ?? 0)}
                </p>
              </div>
              <Button
                disabled={workloadPoints === standardPoints}
                onClick={() => setWorkloadPoints(standardPoints)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RotateCcw />
                Standarda dön
              </Button>
            </div>
          )}
        </div>
        <Field
          label="Kurulum puanı"
          hint="Her allocation başlangıcında bir defa tüketilen sabit kapasite."
        >
          <Input
            defaultValue={step?.setupPoints ?? 0}
            min="0"
            name="setupPoints"
            required
            type="number"
          />
        </Field>
        <Field label="Zorunlu adım">
          <input
            className="mt-2 size-4 accent-primary"
            defaultChecked={step?.isRequired ?? true}
            name="isRequired"
            type="checkbox"
          />
        </Field>
        <Field label="Fason yapılabilir">
          <input
            className="mt-2 size-4 accent-primary"
            defaultChecked={step?.canOutsource ?? false}
            name="canOutsource"
            type="checkbox"
          />
        </Field>
      </FormGrid>
      <div className="mt-4">
        <Field label="Metadata JSON">
          <Textarea defaultValue={step?.metadata ?? ""} name="metadata" />
        </Field>
      </div>
      {!hasDepartments ? (
        <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          {step
            ? "Bu sektör için kullanılabilir PRODUCTION departmanı bulunmuyor."
            : "Rotaya eklenebilecek başka bir PRODUCTION departmanı bulunmuyor."}
        </p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "mt-4 text-sm text-destructive"
              : "mt-4 text-sm text-primary"
          }
        >
          {state.message}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          className="game-button-primary"
          disabled={pending || !hasDepartments}
          type="submit"
        >
          {pending
            ? "Kaydediliyor..."
            : step
              ? "Rota Adımını Güncelle"
              : "Rota Adımı Ekle"}
        </button>
        {step ? (
          <button
            className="game-button-ghost"
            formAction={deleteProductRouteStepAction.bind(
              null,
              productId,
              step.id,
            )}
          >
            Sil
          </button>
        ) : null}
      </div>
    </form>
  );
}

function formatDifference(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}
