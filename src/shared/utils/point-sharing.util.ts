// Shared by the point-distribution purchase queue (actual crediting) and the
// buyer-facing product API (the "how points get shared" preview), so both
// always agree on how a product's total_points is split across receivers.

// Points a single PointDistribution rule contributes per unit, given the
// purchased product's total_points and that rule's points_percentage.
export function calculateSharedPoints(
  totalPointsPerUnit: number,
  pointsPercentage: number,
): number {
  return (Number(totalPointsPerUnit) * Number(pointsPercentage)) / 100;
}
