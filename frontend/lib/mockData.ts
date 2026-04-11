// UMD Nutrition — Mock data (no backend required)
// Replace with real API calls once Firebase / backend is wired up.

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Sex = 'male' | 'female' | 'other';
export type MealTime = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type DietaryTag = 'Gluten Free' | 'Vegetarian' | 'Vegan' | 'Popular' | 'Halal' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  calorieGoal: number;
  proteinGoal: number;   // grams
  carbGoal: number;      // grams
  fatGoal: number;       // grams
  height: number;        // inches
  weight: number;        // lbs
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  weightTarget: number;  // lbs
  dietaryPreferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
  };
  weeklyCalories: number[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

export interface DiningHall {
  id: string;
  name: string;
  location: string;
  isOpen: boolean;
  closingTime?: string;
  closingTimeWeekend?: string;
  openingTime?: string;
  openingTimeWeekend?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  diningHallId: string;
  mealTime: MealTime;
  dietaryTag: DietaryTag;
  station: string;
  servingSize?: string;
}

export interface LogEntry {
  id: string;
  foodItemId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealTime: MealTime;
  diningHallName: string;
  loggedAt: string; // e.g. "12:45 PM"
}

// ── Mock User ─────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: '115829304',
  name: 'Marcus Terrapin',
  email: 'marcus@umd.edu',
  calorieGoal: 2500,
  proteinGoal: 150,
  carbGoal: 280,
  fatGoal: 80,
  height: 72,       // 6'0"
  weight: 185,
  age: 21,
  sex: 'male',
  activityLevel: 'moderate',
  weightTarget: 180,
  dietaryPreferences: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
  },
  weeklyCalories: [2100, 1980, 2340, 1750, 2200, 2450, 1385],
};

// ── Mock Dining Halls ─────────────────────────────────────────────────────────

export const mockDiningHalls: DiningHall[] = [
  {
    id: 'yahentamitsi',
    name: 'Yahentamitsi',
    location: 'Heritage Community',
    isOpen: true,
    openingTime: '7:00 AM',
    closingTime: '9:00 PM',
    // Weekend schedule: opens later
    openingTimeWeekend: '10:00 AM',
    closingTimeWeekend: '9:00 PM',
  },
  {
    id: 'south-campus',
    name: 'South Campus',
    location: 'South Campus',
    isOpen: true,
    openingTime: '7:00 AM',
        closingTime: '9:00 PM',
    // Weekend schedule: opens later
    openingTimeWeekend: '10:00 AM',
    closingTimeWeekend: '9:00 PM',
  },
  {
    id: '251-north',
    name: '251 North',
    location: 'North Campus',
    isOpen: true,
    openingTime: '8:00 AM',
    closingTime: '8:00 PM',
    // Fri/Sat/Sun close earlier at 7:00 PM
    closingTimeWeekend: '7:00 PM',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const mockFoodItems: FoodItem[] = [];

export function formatFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bBbq\b/g, 'BBQ')
    .replace(/\bDmv\b/g, 'DMV');
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function getTodayTotals(log: LogEntry[]): MacroTotals {
  return log.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Returns the current meal period based on time of day. */
export function getCurrentMealTime(): MealTime {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 17) return 'Snack';
  return 'Dinner';
}

/** Formats height in total inches to a ft'in" string. */
export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const i = inches % 12;
  return `${ft}'${i}"`;
}

/** Capitalises the first letter of an activity level string. */
export function formatActivityLevel(level: ActivityLevel): string {
  const map: Record<ActivityLevel, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Active',
    very_active: 'Very Active',
  };
  return map[level];
}
