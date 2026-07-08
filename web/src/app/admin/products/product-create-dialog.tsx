"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Field, FormGrid, Input, Options, Select, enumOptions } from "../form-ui";
import { initialAdminActionState } from "../product-form-state";
import { createProductAction } from "./product-actions";
import {
  ProductScopeFields,
  type ProductScopeOption,
} from "./product-scope-fields";

export function ProductCreateDialog({
  categories,
  productTypes,
  sectors,
}: {
  categories: ProductScopeOption[];
  productTypes: ProductScopeOption[];
  sectors: ProductScopeOption[];
}) {
  const [state, action, pending] = useActionState(
    createProductAction,
    initialAdminActionState,
  );
  const canCreateProduct = productTypes.some((productType) =>
    categories.some(
      (category) =>
        category.id === productType.categoryId &&
        category.sectorId === productType.sectorId,
    ),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="game-button-primary rounded-lg px-4"
          disabled={!canCreateProduct}
          size="lg"
          title={
            canCreateProduct
              ? "Yeni ürün oluştur"
              : "Önce Ürün Tanımları ekranında kategori ve ürün tipi oluşturmalısın"
          }
        >
          <Plus />
          Yeni Ürün Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Yeni ürün ana kaydı
          </DialogTitle>
          <DialogDescription>
            Ana kaydı oluştur. Rota, açıklama, görseller ve kart tasarımını
            Details ekranında tamamlayacaksın.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-5">
          <FormGrid>
            <ProductScopeFields
              categories={categories}
              productTypes={productTypes}
              sectors={sectors}
            />
            <Field label="Teknik anahtar" hint="Sektör içinde benzersizdir.">
              <Input name="key" placeholder="manama_tshirt" required />
            </Field>
            <Field label="Ürün kodu" hint="İsteğe bağlı; girilirse benzersizdir.">
              <Input name="code" placeholder="TXT-TSH-001" />
            </Field>
            <Field label="Ürün adı">
              <Input name="name" placeholder="Manama T-Shirt" required />
            </Field>
            <Field label="Ürün seviyesi">
              <Select defaultValue="BASIC" name="tier">
                <Options values={enumOptions.tiers} />
              </Select>
            </Field>
            <Field label="Cinsiyet">
              <Select defaultValue="" name="gender">
                <option value="">Belirtilmedi</option>
                <Options values={["MEN", "WOMEN", "KIDS", "UNISEX", "BABY"]} />
              </Select>
            </Field>
            <Field label="Sıralama">
              <Input defaultValue="0" min="0" name="sortOrder" type="number" />
            </Field>
            <Field label="Durum">
              <Select defaultValue="DRAFT" name="status">
                <Options values={enumOptions.statuses} />
              </Select>
            </Field>
          </FormGrid>
          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
                  : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
              }
            >
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <button
              className="game-button-primary w-full sm:w-auto"
              disabled={pending}
              type="submit"
            >
              {pending ? "Oluşturuluyor…" : "Ürün Ana Kaydını Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
