export type CreateUserField = "email" | "password" | "name" | "role";

export type CreateUserState = {
  message: string;
  fieldErrors?: Partial<Record<CreateUserField, string>>;
};

export const initialCreateUserState: CreateUserState = {
  message: "",
};
