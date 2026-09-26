/**
 * Sustainability impact estimates used by the Business Dashboard.
 *
 * These are project-level assumptions, not measured environmental data.
 * Update these constants if your project later introduces category-specific
 * conversion factors or backend-calculated impact metrics.
 */
export const SUSTAINABILITY_FACTORS = {
  /** Treat one donated inventory unit as one kg for the dashboard estimate. */
  kgFoodPerDonatedUnit: 1,
  /** Estimated kg CO2e avoided per kg of food successfully redistributed. */
  co2eKgPerKgFood: 2.5,
  /** Estimated meals represented by one kg of successfully redistributed food. */
  mealsPerKgFood: 2,
};

export interface SustainabilityImpact {
  foodWasteDivertedKg: number;
  co2eSavedKg: number;
  mealsRedistributed: number;
  completedDonations: number;
}

export function calculateSustainabilityImpact(
  completedDonationQuantities: number[]
): SustainabilityImpact {
  const totalDonatedUnits = completedDonationQuantities.reduce(
    (sum, quantity) => sum + Math.max(0, Number(quantity) || 0),
    0
  );

  const foodWasteDivertedKg =
    totalDonatedUnits * SUSTAINABILITY_FACTORS.kgFoodPerDonatedUnit;

  return {
    foodWasteDivertedKg,
    co2eSavedKg:
      foodWasteDivertedKg * SUSTAINABILITY_FACTORS.co2eKgPerKgFood,
    mealsRedistributed:
      foodWasteDivertedKg * SUSTAINABILITY_FACTORS.mealsPerKgFood,
    completedDonations: completedDonationQuantities.length,
  };
}
