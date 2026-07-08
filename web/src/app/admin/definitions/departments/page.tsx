import { Building2, Layers3, Route } from "lucide-react";

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

import {
  createDepartmentAction,
  createDepartmentGroupAction,
} from "../../content-actions";
import {
  Field,
  FormGrid,
  Input,
  Options,
  Panel,
  Select,
  enumOptions,
} from "../../form-ui";
import { DefinitionForm } from "../definition-form";
import { DepartmentScopeFields } from "../scoped-definition-fields";
import { DefinitionStatusButton } from "../status-button";

const departmentKinds = [
  "PRODUCTION",
  "WAREHOUSE",
  "LOGISTICS",
  "QUALITY",
  "SUPPORT",
] as const;

export default async function DepartmentDefinitionsPage() {
  const prisma = getPrisma();
  const [sectors, groups, departments] = await Promise.all([
    prisma.sector.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      include: { translations: true },
    }),
    prisma.departmentGroup.findMany({
      orderBy: [{ sector: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        sector: { include: { translations: true } },
        translations: true,
        _count: { select: { departments: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: [
        { sector: { sortOrder: "asc" } },
        { routeOrder: "asc" },
        { key: "asc" },
      ],
      include: {
        sector: { include: { translations: true } },
        departmentGroup: { include: { translations: true } },
        translations: true,
      },
    }),
  ]);
  const hasSector = sectors.length > 0;
  const sectorOptions = sectors.map((sector) => ({
    id: sector.id,
    key: sector.key,
    name: displayName(sector.translations, sector.key),
  }));
  const groupOptions = groups.map((group) => ({
    id: group.id,
    sectorId: group.sectorId,
    name: displayName(group.translations, group.key),
  }));

  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-primary">
            Tanımlamalar
          </p>
          <h1 className="text-2xl font-semibold">Departman Yapısı</h1>
        </div>
        <Badge variant="secondary">
          {groups.length} grup · {departments.length} departman
        </Badge>
      </header>

      {!hasSector ? (
        <Panel
          title="Önce sektör gerekli"
          description="Departman grubu ve departman oluşturabilmek için önce Sektörler ekranından bir sektör tanımla."
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <Building2 size={18} />
            Kullanılabilir sektör bulunmuyor.
          </div>
        </Panel>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Departman grubu oluştur"
            description="Fabrika haritası ve admin görünümündeki ana organizasyon blokları."
          >
            <DefinitionForm
              action={createDepartmentGroupAction}
              submitLabel="Departman Grubunu Oluştur"
            >
              <FormGrid>
                <SectorField sectors={sectors} />
                <Field label="Teknik anahtar">
                  <Input name="key" placeholder="main_production" required />
                </Field>
                <TranslationFields />
                <Field label="Sıralama">
                  <Input defaultValue="0" min="0" name="sortOrder" type="number" />
                </Field>
                <Field label="Durum">
                  <Select defaultValue="ACTIVE" name="status">
                    <Options values={enumOptions.statuses} />
                  </Select>
                </Field>
              </FormGrid>
            </DefinitionForm>
          </Panel>

          <Panel
            title="Departman oluştur"
            description="Ürün rotalarının ve üretim hattı şablonlarının bağlanacağı operasyon alanı."
          >
            <DefinitionForm
              action={createDepartmentAction}
              submitLabel="Departmanı Oluştur"
            >
              <FormGrid>
                <DepartmentScopeFields
                  groups={groupOptions}
                  sectors={sectorOptions}
                />
                <Field label="Teknik anahtar">
                  <Input name="key" placeholder="cutting" required />
                </Field>
                <TranslationFields />
                <Field label="Departman türü">
                  <Select defaultValue="PRODUCTION" name="kind">
                    <Options values={departmentKinds} />
                  </Select>
                </Field>
                <Field label="Rota sırası">
                  <Input defaultValue="0" min="0" name="routeOrder" type="number" />
                </Field>
                <Field label="Durum">
                  <Select defaultValue="ACTIVE" name="status">
                    <Options values={enumOptions.statuses} />
                  </Select>
                </Field>
                <Field label="Başlangıç departmanı">
                  <input
                    className="mt-2 size-4 accent-primary"
                    name="isStarter"
                    type="checkbox"
                  />
                </Field>
                <Field label="Fason destekler">
                  <input
                    className="mt-2 size-4 accent-primary"
                    name="supportsOutsource"
                    type="checkbox"
                  />
                </Field>
              </FormGrid>
            </DefinitionForm>
          </Panel>
        </section>
      )}

      <Panel title={`Departman grupları (${groups.length})`}>
        {groups.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const isActive = group.status === "ACTIVE";

              return (
                <article className="rounded-lg border border-border bg-card p-4" key={group.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {displayName(group.translations, group.key)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-primary">{group.key}</p>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {group.status}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {displayName(group.sector.translations, group.sector.key)} ·{" "}
                    {group._count.departments} departman
                  </p>
                  <div className="mt-4">
                    <DefinitionStatusButton
                      entity="departmentGroup"
                      id={group.id}
                      isActive={isActive}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Layers3 />} text="Henüz departman grubu yok." />
        )}
      </Panel>

      <Panel title={`Departmanlar (${departments.length})`}>
        {departments.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Departman</TableHead>
                  <TableHead>Sektör / Grup</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Özellik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => {
                  const isActive = department.status === "ACTIVE";

                  return (
                    <TableRow className="border-border" key={department.id}>
                      <TableCell>
                        <p className="font-semibold">
                          {displayName(department.translations, department.key)}
                        </p>
                        <p className="font-mono text-xs text-primary">{department.key}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {displayName(department.sector.translations, department.sector.key)}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {department.departmentGroup
                            ? displayName(
                                department.departmentGroup.translations,
                                department.departmentGroup.key,
                              )
                            : "Grupsuz"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{department.kind}</Badge>
                      </TableCell>
                      <TableCell>{department.routeOrder}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {department.isStarter ? "Başlangıç" : "Sonradan"}
                        {department.supportsOutsource ? " · Fason" : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {department.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DefinitionStatusButton
                            entity="department"
                            id={department.id}
                            isActive={isActive}
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
          <EmptyState icon={<Route />} text="Henüz departman yok." />
        )}
      </Panel>
    </div>
  );
}

function SectorField({
  sectors,
}: {
  sectors: Array<{
    id: string;
    key: string;
    translations: Array<{ locale: string; name: string }>;
  }>;
}) {
  return (
    <Field label="Sektör">
      <Select defaultValue={sectors[0]?.id} name="sectorId" required>
        {sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            {displayName(sector.translations, sector.key)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function TranslationFields() {
  return (
    <>
      <Field label="Türkçe ad">
        <Input name="nameTr" required />
      </Field>
      <Field label="İngilizce ad">
        <Input name="nameEn" />
      </Field>
      <Field label="Türkçe açıklama">
        <Input name="descriptionTr" />
      </Field>
      <Field label="İngilizce açıklama">
        <Input name="descriptionEn" />
      </Field>
    </>
  );
}

function displayName(
  translations: Array<{ locale: string; name: string }>,
  fallback: string,
) {
  return (
    translations.find((translation) => translation.locale === "tr")?.name ??
    translations[0]?.name ??
    fallback
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <span className="mx-auto block w-fit text-primary">{icon}</span>
      <p className="mt-3">{text}</p>
    </div>
  );
}
