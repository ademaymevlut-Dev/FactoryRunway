import { ShiftDepartmentResultView } from "@/components/game-presentation/shift-department-result-view";
import { cn } from "@/lib/utils";

import {
  formatShiftSimulationNumber,
} from "./shift-simulation-formatters";
import type { ShiftSimulationSceneState } from "./shift-simulation-scene-state";
import type {
  ResolvedShiftSimulationDepartment,
  ShiftSimulationSceneCopy,
  ShiftSimulationSceneModel,
} from "./shift-simulation-scene-types";

export type ShiftSimulationDepartmentsProps = {
  copy: ShiftSimulationSceneCopy;
  model: ShiftSimulationSceneModel;
  numberLocale: string;
  state: ShiftSimulationSceneState;
};

function getTone(department: ResolvedShiftSimulationDepartment) {
  if (department.status === "bottleneck") return "danger" as const;
  if (department.status === "under_plan") return "warning" as const;
  return "success" as const;
}

export function ShiftSimulationDepartments({
  copy,
  model,
  numberLocale,
  state,
}: ShiftSimulationDepartmentsProps) {
  const final =
    state.status === "completed" || state.status === "summary_open";

  return (
    <section
      aria-label={copy.plannedLabel}
      className={cn(
        "mt-3 rounded-xl border border-white/10 p-2.5 transition-[border-color,box-shadow] sm:p-3",
        state.activeTarget === "shift-planned" &&
          "border-primary/60 shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
      )}
      data-highlighted={state.activeTarget === "shift-planned"}
      data-showcase-target="shift-planned"
      data-shift-departments
    >
      <div className="grid gap-2.5 md:grid-cols-3">
        {model.departments.map((department) => {
          const isBottleneck = department.status === "bottleneck";
          const actualQuantity =
            state.actualQuantityByDepartment[department.departmentKey] ?? 0;

          return (
            <div
              className={cn(
                "rounded-xl transition-[box-shadow,transform]",
                isBottleneck &&
                  state.activeTarget === "shift-bottleneck" &&
                  "scale-[1.01] shadow-[0_0_0_1px_rgba(248,113,113,0.65),0_0_28px_rgba(248,113,113,0.16)]",
              )}
              data-highlighted={
                isBottleneck &&
                state.activeTarget === "shift-bottleneck"
              }
              data-shift-department-key={department.departmentKey}
              data-showcase-target={
                isBottleneck ? "shift-bottleneck" : undefined
              }
              key={department.departmentKey}
            >
              <ShiftDepartmentResultView
                activeLineLabel={copy.activeLineLabel}
                compactMetrics
                departmentLabel={department.departmentName}
                isFinal
                metrics={[
                  {
                    key: "input",
                    label: copy.inputLabel,
                    value: department.inputQuantity,
                  },
                  {
                    key: "planned",
                    label: copy.plannedLabel,
                    value: department.plannedQuantity,
                  },
                  {
                    key: "actual",
                    label: copy.actualLabel,
                    value: actualQuantity,
                  },
                ]}
                numberLocale={numberLocale}
                processedProductsLabel={copy.processedProductsLabel}
                products={
                  final
                    ? [
                        {
                          imageUrl: department.product.imageUrl,
                          key: `${department.departmentKey}:${department.product.key}`,
                          name: department.product.name,
                          orderLabel: department.departmentName,
                          quantityLabel: `${formatShiftSimulationNumber(
                            department.actualQuantity,
                            numberLocale,
                          )} ${copy.pieceUnitLabel}`,
                        },
                      ]
                    : []
                }
                statusLabel={copy.statuses[department.status]}
                statusTone={getTone(department)}
                utilizationAriaLabel={`${department.departmentName}: ${
                  copy.utilizationLabel
                } %${department.utilizationPercent}`}
                utilizationPercent={department.utilizationPercent}
                utilizationTone={getTone(department)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
