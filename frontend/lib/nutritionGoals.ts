import type { UserProfile } from '@/lib/firestore';

const ACTIVITY_FACTORS: Record<UserProfile['metrics']['activity_level'], number> = {
  low: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

const GOAL_ADJUSTMENTS: Record<UserProfile['metrics']['goal_type'], number> = {
  extreme_weight_loss: -500,
  moderate_weight_loss: -250,
  maintain_weight: 0,
  moderate_weight_gain: 250,
  extreme_weight_gain: 500,
};

export interface NutritionGoals {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

export function calculateNutritionGoals(profile: UserProfile): NutritionGoals {
  const weightLbs = Math.max(profile.metrics.current_weight_lbs, 1);
  const weightKg = weightLbs * 0.453592;
  const heightCm = Math.max(profile.metrics.height_in, 1) * 2.54;
  const age = Math.max(profile.metrics.age, 13);
  const sexAdjustment = profile.metrics.sex === 'female' ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment;
  const tdee = bmr * ACTIVITY_FACTORS[profile.metrics.activity_level];
  const calculatedCalories = Math.max(Math.round(tdee + GOAL_ADJUSTMENTS[profile.metrics.goal_type]), 1200);

  // Use manual override if set, otherwise fall back to the calculated value.
  const override = profile.metrics.calorie_override;
  const calorieGoal = override && override >= 1200 ? override : calculatedCalories;

  const proteinGoal = Math.round(weightLbs * 0.8);
  const fatGoal = Math.round((calorieGoal * 0.25) / 9);
  const carbGoal = Math.max(Math.round((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4), 0);

  return {
    calorieGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
  };
}
