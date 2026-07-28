"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { GameSnapshot } from "@/features/game/types";
import { useGameUiStore } from "@/features/game/store/game-ui-store";
import { recordTaskEventAction } from "@/features/tasks/actions/record-task-event-action";
import type { ProductionGrade } from "@/generated/prisma/enums";
import { investmentCopy } from "../investment-copy";

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
  const router = useRouter();
  const copy = investmentCopy[snapshot.locale];
  const { isShiftPlaybackActive } = useGameUiStore();
  const recordedInvestmentReviewRef = useRef(false);

  useEffect(() => {
    if (recordedInvestmentReviewRef.current) return;
    recordedInvestmentReviewRef.current = true;

    void recordTaskEventAction({
      factoryId: snapshot.factory.id,
      objectiveType: "OPEN_INVESTMENT_PANEL",
    }).then((result) => {
      if (result.ok) router.refresh();
    });
  }, [router, snapshot.factory.id]);

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
        {copy.panel.noOptions}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {isShiftPlaybackActive ? (
        <div className="flex shrink-0 justify-end">
          <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-100">
            {copy.panel.locked}
          </span>
        </div>
      ) : null}

      {availableDepartments.length > 1 ? (
        <nav
          aria-label={copy.panel.departmentNavAria}
          className="flex shrink-0 flex-wrap gap-1.5"
        >
          {availableDepartments.map((department) => (
            <Button
              className="h-7 rounded-md px-2 text-xs"
              key={department.id}
              onClick={() => setSelectedDepartmentId(department.id)}
              size="xs"
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
        aria-label={copy.panel.templateNavAria}
        className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5"
      >
        {selectedDepartment.templates.map((template) => (
          <button
            aria-pressed={template.id === selectedTemplate?.id}
            className={`flex min-w-[126px] items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors ${
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
              <strong className="block text-[11px] leading-4 text-current">
                {copy.gradeLabels[template.grade]}
              </strong>
              <span className="text-[9px] leading-3">
                {copy.panel.machineCount(template.machineCount)}
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
          locale={snapshot.locale}
          template={selectedTemplate}
        />
      ) : null}
    </div>
  );
}

function GradeGlyph({ grade }: { grade: ProductionGrade }) {
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
