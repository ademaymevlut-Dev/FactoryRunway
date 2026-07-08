import { BriefcaseBusiness, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPrisma } from "@/lib/db";

import { Panel } from "../../form-ui";
import {
  CreateStaffRoleDialog,
  DeleteStaffRoleDialog,
  EditStaffRoleDialog,
  type StaffRoleFormValue,
} from "./staff-role-dialogs";
import { setStaffRoleStatusAction } from "./staff-role-actions";

export default async function StaffRoleDefinitionsPage() {
  const prisma = getPrisma();
  const [sectors, departments, roles] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.department.findMany({
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { routeOrder: "asc" },
        { key: "asc" },
      ],
      include: { translations: true },
    }),
    prisma.staffRole.findMany({
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { key: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        department: { include: { translations: true } },
        translations: true,
        supportCategories: true,
        _count: {
          select: {
            assignments: true,
            lineRequirements: true,
          },
        },
      },
    }),
  ]);

  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    key: sector.key,
    name: displayName(sector.translations, sector.key),
  }));
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    sectorId: department.sectorId,
    key: department.key,
    name: displayName(department.translations, department.key),
  }));

  return (
    <div className="grid gap-4">
      <header className="game-topbar gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Tanımlamalar
          </p>
          <h1 className="text-2xl font-semibold">Personel Rolleri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Üretim, destek ve yönetim kadrolarında kullanılacak rol kataloğu.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="secondary">{roles.length} rol</Badge>
          <CreateStaffRoleDialog
            departments={departmentOptions}
            sectors={sectorOptions}
          />
        </div>
      </header>

      {sectors.length === 0 ? (
        <Panel
          description="Personel rolü oluşturmak için önce en az bir sektör tanımlamalısın."
          title="Önce sektör gerekli"
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <BriefcaseBusiness size={18} />
            Kullanılabilir sektör bulunmuyor.
          </div>
        </Panel>
      ) : null}

      <Panel title={`Personel rolü kataloğu (${roles.length})`}>
        {roles.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Rol</TableHead>
                  <TableHead>Sektör / Departman</TableHead>
                  <TableHead>Tür / Kategori</TableHead>
                  <TableHead>Aylık ücret</TableHead>
                  <TableHead>Kullanım</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const name = displayName(role.translations, role.key);
                  const isActive = role.status === "ACTIVE";
                  const usageCount =
                    role._count.assignments + role._count.lineRequirements;
                  const isUsed = usageCount > 0;
                  const formValue: StaffRoleFormValue = {
                    id: role.id,
                    sectorId: role.sectorId,
                    departmentId: role.departmentId,
                    key: role.key,
                    staffType: role.staffType,
                    monthlySalaryCents: role.monthlySalaryCents,
                    sortOrder: role.sortOrder,
                    status: role.status,
                    nameTr: translatedValue(role.translations, "tr", "name"),
                    nameEn: translatedValue(role.translations, "en", "name"),
                    descriptionTr: translatedValue(
                      role.translations,
                      "tr",
                      "description",
                    ),
                    descriptionEn: translatedValue(
                      role.translations,
                      "en",
                      "description",
                    ),
                    supportCategories: role.supportCategories.map(
                      (category) => category.supportCategory,
                    ),
                    isUsed,
                  };

                  return (
                    <TableRow className="border-border" key={role.id}>
                      <TableCell>
                        <p className="font-semibold">{name}</p>
                        <p className="font-mono text-xs text-primary">{role.key}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {displayName(role.sector.translations, role.sector.key)}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {role.department
                            ? displayName(
                                role.department.translations,
                                role.department.key,
                              )
                            : "Fabrika geneli"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.staffType}</Badge>
                        {role.supportCategories.length ? (
                          <p className="mt-1 max-w-56 text-xs text-muted-foreground">
                            {role.supportCategories
                              .map((category) => category.supportCategory)
                              .join(", ")}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCents(role.monthlySalaryCents)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {role._count.lineRequirements} hat gereksinimi
                        <br />
                        {role._count.assignments} atama
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {role.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <form
                            action={setStaffRoleStatusAction.bind(
                              null,
                              role.id,
                              !isActive,
                            )}
                          >
                            <button
                              className="game-button-ghost min-h-8 px-2.5 text-xs"
                              type="submit"
                            >
                              {isActive ? "Pasife Al" : "Aktif Et"}
                            </button>
                          </form>
                          <EditStaffRoleDialog
                            departments={departmentOptions}
                            role={formValue}
                            sectors={sectorOptions}
                          />
                          <DeleteStaffRoleDialog
                            isUsed={isUsed}
                            name={name}
                            roleId={role.id}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Users />
            Henüz personel rolü oluşturulmadı.
          </div>
        )}
      </Panel>
    </div>
  );
}

type Translation = {
  locale: string;
  name: string;
  description: string | null;
};

function displayName(translations: Translation[], fallback: string) {
  return translatedValue(translations, "tr", "name") || fallback;
}

function translatedValue(
  translations: Translation[],
  locale: string,
  field: "name" | "description",
) {
  return translations.find((translation) => translation.locale === locale)?.[
    field
  ] ?? "";
}

function formatCents(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
