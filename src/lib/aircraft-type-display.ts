/** Shown type line: custom variant (BBJ, Prestige, …) or catalog name. */
export function primaryAircraftTypeDisplay(
  catalogName: string | null | undefined,
  variantLabel: string | null | undefined,
): string {
  const v = variantLabel?.trim();
  if (v) return v;
  return (catalogName || '').trim();
}
