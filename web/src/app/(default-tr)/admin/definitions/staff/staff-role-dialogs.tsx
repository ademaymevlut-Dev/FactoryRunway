"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

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

import { Field, FormGrid, Input, Options, Select, enumOptions } from "../../form-ui";
import { initialAdminActionState } from "../../product-form-state";
import {
  createStaffRoleAction,
  deleteStaffRoleAction,
  updateStaffRoleAction,
} from "./staff-role-actions";

export type StaffSectorOption = {
  id: string;
  key: string;
  name: string;
};

export type StaffDepartmentOption = {
  id: string;
  sectorId: string;
  key: string;
  name: string;
};

export type StaffRoleFormValue = {
  id: string;
  sectorId: string;
  departmentId: string | null;
  key: string;
  staffType: string;
  monthlySalaryCents: number;
  sortOrder: number;
  status: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  supportCategories: string[];
  isUsed: boolean;
};

const staffTypes = ["DIRECT_PRODUCTION", "SUPPORT", "MANAGEMENT"] as const;
const categoryOptions = [
  ["PLANNING", "Planlama"],
  ["QUALITY", "Kalite"],
  ["MAINTENANCE", "Bakım"],
  ["WAREHOUSE", "Depo"],
  ["LOGISTICS", "Lojistik"],
  ["HR_ADMIN", "İnsan Kaynakları / İdari"],
  ["FINANCE", "Finans"],
  ["FACILITY", "Tesis"],
  ["OUTSOURCE_FOLLOWUP", "Fason Takibi"],
  ["MANAGEMENT", "Yönetim"],
] as const;

type RoleFormProps = {
  departments: StaffDepartmentOption[];
  role?: StaffRoleFormValue;
  sectors: StaffSectorOption[];
};

export function CreateStaffRoleDialog({
  departments,
  sectors,
}: Omit<RoleFormProps, "role">) {
  const [state, action, pending] = useActionState(
    createStaffRoleAction,
    initialAdminActionState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-lg" disabled={sectors.length === 0}>
          <Plus />
          Personel Rolü Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Yeni personel rolü</DialogTitle>
          <DialogDescription>
            Rolün kapsamını, görünen adlarını ve aylık ücretini tanımla.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-5">
          <StaffRoleFields departments={departments} sectors={sectors} />
          <ActionMessage message={state.message} status={state.status} />
          <DialogFooter>
            <button
              className="game-button-primary w-full sm:w-auto"
              disabled={pending}
              type="submit"
            >
              {pending ? "Oluşturuluyor…" : "Personel Rolünü Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditStaffRoleDialog({
  departments,
  role,
  sectors,
}: RoleFormProps & { role: StaffRoleFormValue }) {
  const [state, action, pending] = useActionState(
    updateStaffRoleAction.bind(null, role.id),
    initialAdminActionState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Personel rolünü düzenle</DialogTitle>
          <DialogDescription>
            {role.isUsed
              ? "Bu rol kullanımda. Sektör, departman ve personel türü korunmalıdır."
              : "Rolün kapsamını ve içerik bilgilerini güncelleyebilirsin."}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-5">
          <StaffRoleFields
            departments={departments}
            role={role}
            sectors={sectors}
          />
          <ActionMessage message={state.message} status={state.status} />
          <DialogFooter>
            <button
              className="game-button-primary w-full sm:w-auto"
              disabled={pending}
              type="submit"
            >
              {pending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteStaffRoleDialog({
  isUsed,
  name,
  roleId,
}: {
  isUsed: boolean;
  name: string;
  roleId: string;
}) {
  const [state, action, pending] = useActionState(
    deleteStaffRoleAction.bind(null, roleId),
    initialAdminActionState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          disabled={isUsed}
          size="sm"
          title={isUsed ? "Kullanımdaki roller silinemez; pasife alınabilir." : "Rolü sil"}
          variant="destructive"
        >
          <Trash2 />
          Sil
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl border border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Personel rolünü sil</DialogTitle>
          <DialogDescription>
            “{name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-5">
          <ActionMessage message={state.message} status={state.status} />
          <DialogFooter showCloseButton>
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? "Siliniyor…" : "Kalıcı Olarak Sil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffRoleFields({ departments, role, sectors }: RoleFormProps) {
  const [sectorId, setSectorId] = useState(role?.sectorId ?? sectors[0]?.id ?? "");
  const [staffType, setStaffType] = useState(
    role?.staffType ?? "DIRECT_PRODUCTION",
  );
  const filteredDepartments = departments.filter(
    (department) => department.sectorId === sectorId,
  );
  const isDirectProduction = staffType === "DIRECT_PRODUCTION";

  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <div>
          <h3 className="font-semibold">Temel bilgiler</h3>
          <p className="text-xs text-muted-foreground">
            Teknik anahtar sektör içinde benzersizdir.
          </p>
        </div>
        <FormGrid>
          <Field label="Sektör">
            <Select
              disabled={role?.isUsed}
              name="sectorId"
              onChange={(event) => setSectorId(event.target.value)}
              required
              value={sectorId}
            >
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name} ({sector.key})
                </option>
              ))}
            </Select>
            {role?.isUsed ? (
              <input name="sectorId" type="hidden" value={sectorId} />
            ) : null}
          </Field>
          <Field label="Personel türü">
            <Select
              disabled={role?.isUsed}
              name="staffType"
              onChange={(event) => setStaffType(event.target.value)}
              value={staffType}
            >
              <Options values={staffTypes} />
            </Select>
            {role?.isUsed ? (
              <input name="staffType" type="hidden" value={staffType} />
            ) : null}
          </Field>
          <Field
            label="Departman"
            hint={
              isDirectProduction
                ? "Doğrudan üretim rolleri için zorunlu."
                : "Destek ve yönetim rolleri için isteğe bağlı."
            }
          >
            <Select
              defaultValue={role?.departmentId ?? ""}
              disabled={role?.isUsed}
              name="departmentId"
              required={isDirectProduction}
            >
              <option value="">Departman yok</option>
              {filteredDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} ({department.key})
                </option>
              ))}
            </Select>
            {role?.isUsed ? (
              <input
                name="departmentId"
                type="hidden"
                value={role.departmentId ?? ""}
              />
            ) : null}
          </Field>
          <Field label="Teknik anahtar" hint="Örnek: cutting_operator">
            <Input
              defaultValue={role?.key}
              name="key"
              placeholder="cutting_operator"
              required
            />
          </Field>
          <Field label="Aylık ücret (kuruş)">
            <Input
              defaultValue={role?.monthlySalaryCents ?? 0}
              min="0"
              name="monthlySalaryCents"
              required
              step="1"
              type="number"
            />
          </Field>
          <Field label="Sıralama">
            <Input
              defaultValue={role?.sortOrder ?? 0}
              min="0"
              name="sortOrder"
              required
              type="number"
            />
          </Field>
          <Field label="Durum">
            <Select defaultValue={role?.status ?? "ACTIVE"} name="status">
              <Options values={enumOptions.statuses} />
            </Select>
          </Field>
        </FormGrid>
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="font-semibold">Görünen metinler</h3>
          <p className="text-xs text-muted-foreground">
            Türkçe ad zorunlu, İngilizce içerik isteğe bağlıdır.
          </p>
        </div>
        <FormGrid>
          <Field label="Türkçe ad">
            <Input defaultValue={role?.nameTr} name="nameTr" required />
          </Field>
          <Field label="İngilizce ad">
            <Input defaultValue={role?.nameEn} name="nameEn" />
          </Field>
          <Field label="Türkçe açıklama">
            <Input defaultValue={role?.descriptionTr} name="descriptionTr" />
          </Field>
          <Field label="İngilizce açıklama">
            <Input defaultValue={role?.descriptionEn} name="descriptionEn" />
          </Field>
        </FormGrid>
      </section>

      {!isDirectProduction ? (
        <section className="grid gap-4">
          <div>
            <h3 className="font-semibold">Destek kategorileri</h3>
            <p className="text-xs text-muted-foreground">
              En az bir kategori seçilmelidir.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categoryOptions.map(([value, label]) => (
              <label
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm"
                key={value}
              >
                <input
                  className="size-4 accent-primary"
                  defaultChecked={role?.supportCategories.includes(value)}
                  name="supportCategories"
                  type="checkbox"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActionMessage({
  message,
  status,
}: {
  message: string;
  status: "idle" | "success" | "error";
}) {
  if (!message) return null;

  return (
    <p
      className={
        status === "error"
          ? "rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive-foreground"
          : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
      }
    >
      {message}
    </p>
  );
}
