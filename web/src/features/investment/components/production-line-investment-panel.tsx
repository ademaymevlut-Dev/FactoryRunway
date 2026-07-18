"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameSnapshot } from "@/features/game/types";
import { useGameUiStore } from "@/features/game/store/game-ui-store";

import { ProductionLineTemplatePurchaseCard } from "./production-line-template-purchase-card";

export function ProductionLineInvestmentPanel({
  initialDepartmentId,
  sectionId,
  snapshot,
}: {
  initialDepartmentId: string;
  sectionId: string;
  snapshot: GameSnapshot;
}) {
  const { isShiftPlaybackActive } = useGameUiStore();
  const availableDepartments = useMemo(
    () => {
      if (sectionId) {
        return snapshot.investment.departments.filter(
          (department) =>
            department.departmentGroupId === sectionId ||
            (!department.departmentGroupId &&
              sectionId === `department:${department.id}`),
        );
      }

      if (initialDepartmentId) {
        return snapshot.investment.departments.filter(
          (department) => department.id === initialDepartmentId,
        );
      }

      return snapshot.investment.departments;
    },
    [initialDepartmentId, sectionId, snapshot.investment.departments],
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    () =>
      availableDepartments.some(
        (department) => department.id === initialDepartmentId,
      )
        ? initialDepartmentId
        : availableDepartments[0]?.id ?? "",
  );
  const selectedDepartment =
    availableDepartments.find(
      (department) => department.id === selectedDepartmentId,
    ) ?? availableDepartments[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const selectedTemplate =
    selectedDepartment?.templates.find(
      (template) => template.id === selectedTemplateId,
    ) ?? selectedDepartment?.templates[0];

  if (!selectedDepartment) {
    return (
      <div className="rounded-lg border border-white/10 bg-card p-4 text-sm text-muted-foreground">
        Bu bölüm için aktif üretim hattı seçeneği bulunmuyor.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedDepartment.name} · Teknik ve finansal seçenekler
        </p>
        <span className="text-xs text-muted-foreground">
          {isShiftPlaybackActive ? "Vardiya sırasında kilitli" : "Planlama açık"}
        </span>
      </div>

      {availableDepartments.length > 1 ? (
        <nav aria-label="Yatırım departmanı" className="flex flex-wrap gap-2">
          {availableDepartments.map((department) => (
            <Button
              key={department.id}
              onClick={() => setSelectedDepartmentId(department.id)}
              size="sm"
              type="button"
              variant={
                department.id === selectedDepartment.id
                  ? "default"
                  : "outline"
              }
            >
              {department.name}
            </Button>
          ))}
        </nav>
      ) : null}

      <nav
        aria-label="Üretim hattı standardı"
        className="flex shrink-0 gap-2 overflow-x-auto pb-1"
      >
        {selectedDepartment.templates.map((template) => (
          <button
            aria-pressed={template.id === selectedTemplate?.id}
            className={`flex min-w-[142px] items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
              template.id === selectedTemplate?.id
                ? "border-primary/60 bg-primary/12 text-white"
                : "border-white/10 bg-card/55 text-muted-foreground hover:border-white/20"
            }`}
            key={template.id}
            onClick={() => setSelectedTemplateId(template.id)}
            type="button"
          >
            <GradeGlyph grade={template.grade} />
            <span>
              <strong className="block text-xs text-current">
                {gradeLabels[template.grade]}
              </strong>
              <span className="text-[10px]">
                {template.machineCount} makine
              </span>
            </span>
          </button>
        ))}
      </nav>

      {selectedTemplate ? (
        <ProductionLineTemplatePurchaseCard
          currencyCode={snapshot.investment.currencyCode}
          factoryId={snapshot.factory.id}
          key={selectedTemplate.id}
          template={selectedTemplate}
        />
      ) : null}
    </div>
  );
}

const gradeLabels = {
  WORKSHOP: "Workshop",
  INDUSTRIAL: "Industrial",
  PRECISION: "Precision",
  SMART: "Smart",
} as const;

function GradeGlyph({ grade }: { grade: keyof typeof gradeLabels }) {
  return (
    <span className={`production-grade-badge xs ${grade.toLowerCase()}`}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64">
        <path className="grade-badge-shadow" d="M32 5.5 55 18.8v26.4L32 58.5 9 45.2V18.8L32 5.5Z" />
        <path className="grade-badge-outer" d="M32 7.5 53.2 19.7v24.6L32 56.5 10.8 44.3V19.7L32 7.5Z" />
        <path className="grade-badge-inner" d="M32 13.2 47.9 22.3v19.4L32 50.8 16.1 41.7V22.3L32 13.2Z" />
        <path className="grade-badge-glint" d="M19.3 23.8 32 16.5l12.9 7.4" />
        <text className="grade-badge-letter" dominantBaseline="central" textAnchor="middle" x="32" y="34">
          {grade[0]}
        </text>
      </svg>
    </span>
  );
}
