import { setDefinitionStatusAction } from "../content-actions";

type DefinitionEntity =
  | "sector"
  | "departmentGroup"
  | "department"
  | "productCategory"
  | "productType"
  | "productColorVariant";

export function DefinitionStatusButton({
  entity,
  id,
  isActive,
}: {
  entity: DefinitionEntity;
  id: string;
  isActive: boolean;
}) {
  return (
    <form action={setDefinitionStatusAction.bind(null, entity, id, !isActive)}>
      <button className="game-button-ghost min-h-8 px-2.5 text-xs" type="submit">
        {isActive ? "Pasife Al" : "Aktif Et"}
      </button>
    </form>
  );
}
