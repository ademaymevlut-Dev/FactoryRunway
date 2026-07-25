export const DEPARTMENT_GROUP_SEMANTIC_KEYS = {
  VALUE_ADDED_PROCESS: "value_added_process",
} as const;

export type DepartmentGroupSemanticKey =
  (typeof DEPARTMENT_GROUP_SEMANTIC_KEYS)[keyof typeof DEPARTMENT_GROUP_SEMANTIC_KEYS];
