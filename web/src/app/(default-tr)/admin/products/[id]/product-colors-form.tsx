"use client";

import { Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Field, FormGrid, Input, Panel } from "../../form-ui";
import { initialAdminActionState } from "../../product-form-state";
import { saveProductColorsAction } from "../product-actions";

export type ProductColorOption = {
  id: string;
  key: string;
  name: string;
  hexCode: string;
  status: string;
  isSelected: boolean;
  isActive: boolean;
  isDefault: boolean;
  selectionWeightBps: number;
  sortOrder: number;
};

export type ProductColorRules = {
  id: string;
  offerColorCountMin: number;
  offerColorCountMax: number;
};

export function ProductColorsForm({
  colors,
  product,
}: {
  colors: ProductColorOption[];
  product: ProductColorRules;
}) {
  const [state, action, pending] = useActionState(
    saveProductColorsAction.bind(null, product.id),
    initialAdminActionState,
  );
  const [selectedColorIds, setSelectedColorIds] = useState(
    () =>
      new Set(
        colors
          .filter((color) => color.isSelected)
          .map((color) => color.id),
      ),
  );
  const [defaultColorId, setDefaultColorId] = useState(
    colors.find((color) => color.isDefault)?.id ?? "",
  );
  const selectedCount = selectedColorIds.size;
  const selectedLabel = useMemo(
    () =>
      selectedCount
        ? `${selectedCount} renk seçildi`
        : "Henüz renk seçilmedi",
    [selectedCount],
  );

  function toggleColor(colorId: string, checked: boolean) {
    setSelectedColorIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(colorId);
      } else {
        next.delete(colorId);
      }
      return next;
    });

    if (!checked && defaultColorId === colorId) {
      setDefaultColorId("");
    }
  }

  return (
    <Panel
      description="Sipariş motorunun bu ürün için seçebileceği renk havuzu ve renk sayısı limitleri."
      title="Ürün renkleri"
    >
      <form action={action} className="grid gap-5">
        <FormGrid>
          <Field
            hint="Sipariş teklifinde kullanılabilecek en düşük renk adedi."
            label="Minimum renk sayısı"
          >
            <Input
              defaultValue={product.offerColorCountMin}
              min="1"
              name="offerColorCountMin"
              required
              type="number"
            />
          </Field>
          <Field
            hint="Aktif seçili renk sayısından büyük olamaz."
            label="Maksimum renk sayısı"
          >
            <Input
              defaultValue={product.offerColorCountMax}
              max={Math.max(selectedCount, 1)}
              min="1"
              name="offerColorCountMax"
              required
              type="number"
            />
          </Field>
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
              Seçim durumu
            </p>
            <p className="mt-2 text-lg font-semibold text-primary">
              {selectedLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pasif işaretlenen renkler saklanır ama sipariş havuzuna girmez.
            </p>
          </div>
        </FormGrid>

        {colors.length ? (
          <div className="grid gap-3">
            {colors.map((color) => {
              const isSelected = selectedColorIds.has(color.id);

              return (
                <article
                  className="grid gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground xl:grid-cols-[minmax(220px,1.2fr)_120px_120px_120px_120px]"
                  key={color.id}
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      checked={isSelected}
                      className="size-4 shrink-0 accent-primary"
                      name="colorVariantId"
                      onChange={(event) =>
                        toggleColor(color.id, event.target.checked)
                      }
                      type="checkbox"
                      value={color.id}
                    />
                    <span
                      aria-hidden="true"
                      className="size-8 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {color.name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {color.key} · {color.hexCode} · {color.status}
                      </span>
                    </span>
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-semibold">Aktif</span>
                    <input
                      className="mt-2 size-4 accent-primary"
                      defaultChecked={color.isActive}
                      disabled={!isSelected}
                      name={`isActive:${color.id}`}
                      type="checkbox"
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-semibold">Varsayılan</span>
                    <input
                      checked={defaultColorId === color.id}
                      className="mt-2 size-4 accent-primary"
                      disabled={!isSelected}
                      name="defaultColorVariantId"
                      onChange={() => setDefaultColorId(color.id)}
                      type="radio"
                      value={color.id}
                    />
                  </label>

                  <Field label="Ağırlık (%)">
                    <Input
                      defaultValue={formatWeightPercent(color.selectionWeightBps)}
                      disabled={!isSelected}
                      inputMode="decimal"
                      max="100"
                      min="0.01"
                      name={`selectionWeightPercent:${color.id}`}
                      required={isSelected}
                      step="0.01"
                      type="number"
                    />
                  </Field>

                  <Field label="Sıra">
                    <Input
                      defaultValue={color.sortOrder}
                      disabled={!isSelected}
                      min="0"
                      name={`sortOrder:${color.id}`}
                      required={isSelected}
                      type="number"
                    />
                  </Field>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Bu ürünün sektöründe aktif renk master kaydı yok. Önce Ürün
            Tanımları ekranından renk oluşturmalısın.
          </p>
        )}

        {state.message ? (
          <p
            className={
              state.status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-primary"
            }
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="game-button-primary w-fit"
          disabled={pending || !colors.length}
          type="submit"
        >
          <Save size={16} />
          {pending ? "Kaydediliyor..." : "Renkleri Kaydet"}
        </button>
      </form>
    </Panel>
  );
}

function formatWeightPercent(selectionWeightBps: number) {
  const percent = selectionWeightBps / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
}
