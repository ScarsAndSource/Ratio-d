const STRUCTURAL_ZONES = new Set(["shoulderHipRatio", "upperArmSymmetry", "thighSymmetry"]);
const ACTIONABLE_ZONES = new Set(["postureTilt", "forwardHead"]);

export function classifyZone(key: string): boolean {
  if (STRUCTURAL_ZONES.has(key)) return false;
  if (ACTIONABLE_ZONES.has(key)) return true;
  return false;
}
