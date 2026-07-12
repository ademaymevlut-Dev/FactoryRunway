export function calculateOutsourceCompletion(input: {
  completedQuantity: number
  inOutsourceQuantity: number
  jobQuantity: number
  plannedQuantity: number
}) {
  const completedQuantity = Math.min(
    input.plannedQuantity,
    input.completedQuantity + input.jobQuantity,
  )
  const completedByOutsource = completedQuantity - input.completedQuantity

  if (
    completedByOutsource <= 0 ||
    completedByOutsource > input.inOutsourceQuantity
  ) {
    throw new Error("Fason dönüş miktarı üretim ilerlemesiyle uyuşmuyor.")
  }

  return {
    completedByOutsource,
    completedQuantity,
    inOutsourceQuantity: Math.max(
      0,
      input.inOutsourceQuantity - completedByOutsource,
    ),
    remainingQuantity: Math.max(0, input.plannedQuantity - completedQuantity),
  }
}
