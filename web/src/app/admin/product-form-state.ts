export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  entityId?: string;
};

export const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
};
