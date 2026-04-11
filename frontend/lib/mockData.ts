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
  openingTime?: string;
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
    closingTime: '9:00 PM',
  },
  {
    id: 'south-campus',
    name: 'South Campus Dining Hall',
    location: 'South Campus',
    isOpen: true,
    closingTime: '8:30 PM',
  },
  {
    id: '251-north',
    name: '251 North Dining Hall',
    location: 'North Campus',
    isOpen: false,
    openingTime: 'Tomorrow 7:00 AM',
  },
];

// ── Mock Food Items ───────────────────────────────────────────────────────────

export const mockFoodItems: FoodItem[] = [
  {
    id: 'f1',
    name: 'Pan-Seared Salmon',
    calories: 420,
    protein: 38,
    carbs: 12,
    fat: 22,
    diningHallId: 'yahentamitsi',
    mealTime: 'Lunch',
    dietaryTag: 'Gluten Free',
    station: "Chef's Specials",
  },
  {
    id: 'f2',
    name: 'Wild Mushroom Risotto',
    calories: 380,
    protein: 12,
    carbs: 58,
    fat: 14,
    diningHallId: 'yahentamitsi',
    mealTime: 'Lunch',
    dietaryTag: 'Vegetarian',
    station: "Chef's Specials",
  },
  {
    id: 'f3',
    name: 'UMD Custom Burger',
    calories: 650,
    protein: 42,
    carbs: 48,
    fat: 28,
    diningHallId: 'yahentamitsi',
    mealTime: 'Lunch',
    dietaryTag: 'Popular',
    station: 'Terrapin Grill',
  },
  {
    id: 'f4',
    name: 'Atlantic Salmon Power Bowl',
    calories: 640,
    protein: 45,
    carbs: 55,
    fat: 18,
    diningHallId: 'yahentamitsi',
    mealTime: 'Dinner',
    dietaryTag: 'Gluten Free',
    station: "Chef's Specials",
  },
  {
    id: 'f5',
    name: 'The Marylander Burger',
    calories: 820,
    protein: 48,
    carbs: 62,
    fat: 36,
    diningHallId: 'south-campus',
    mealTime: 'Lunch',
    dietaryTag: 'Popular',
    station: 'Grill',
  },
  {
    id: 'f6',
    name: 'Crispy Chickpea Harvest',
    calories: 410,
    protein: 18,
    carbs: 52,
    fat: 14,
    diningHallId: '251-north',
    mealTime: 'Lunch',
    dietaryTag: 'Vegan',
    station: 'Harvest Bowl',
  },
  {
    id: 'f7',
    name: 'Heritage Bowl',
    calories: 645,
    protein: 40,
    carbs: 60,
    fat: 20,
    diningHallId: 'yahentamitsi',
    mealTime: 'Lunch',
    dietaryTag: null,
    station: 'Bowls',
  },
  {
    id: 'f8',
    name: 'Garden Salad & Smoothie',
    calories: 320,
    protein: 8,
    carbs: 42,
    fat: 10,
    diningHallId: 'south-campus',
    mealTime: 'Snack',
    dietaryTag: 'Vegan',
    station: 'Salad Bar',
  },
  {
    id: 'f9',
    name: 'Terp Breakfast Platter',
    calories: 885,
    protein: 32,
    carbs: 88,
    fat: 38,
    diningHallId: 'yahentamitsi',
    mealTime: 'Breakfast',
    dietaryTag: null,
    station: 'Breakfast Station',
  },
  {
    id: 'f10',
    name: 'Scrambled Eggs & Toast',
    calories: 340,
    protein: 22,
    carbs: 30,
    fat: 14,
    diningHallId: 'south-campus',
    mealTime: 'Breakfast',
    dietaryTag: 'Vegetarian',
    station: 'Morning Grill',
  },
  {
    id: 'f11',
    name: 'Grilled Chicken Wrap',
    calories: 520,
    protein: 36,
    carbs: 44,
    fat: 16,
    diningHallId: 'south-campus',
    mealTime: 'Dinner',
    dietaryTag: null,
    station: 'Wraps & More',
  },
  {
    id: 'f12',
    name: 'Vegan Buddha Bowl',
    calories: 480,
    protein: 16,
    carbs: 72,
    fat: 14,
    diningHallId: '251-north',
    mealTime: 'Dinner',
    dietaryTag: 'Vegan',
    station: 'Plant Kitchen',
  },
];

// ── Mock Today's Log ──────────────────────────────────────────────────────────

export const mockTodayLog: LogEntry[] = [
  {
    id: 'l1',
    foodItemId: 'f7',
    foodName: 'Heritage Bowl',
    calories: 645,
    protein: 40,
    carbs: 60,
    fat: 20,
    mealTime: 'Lunch',
    diningHallName: 'Yahentamitsi',
    loggedAt: '12:45 PM',
  },
  {
    id: 'l2',
    foodItemId: 'f8',
    foodName: 'Garden Salad & Smoothie',
    calories: 320,
    protein: 8,
    carbs: 42,
    fat: 10,
    mealTime: 'Snack',
    diningHallName: 'South Campus Dining Hall',
    loggedAt: '3:15 PM',
  },
  {
    id: 'l3',
    foodItemId: 'f1',
    foodName: 'Pan-Seared Salmon',
    calories: 420,
    protein: 38,
    carbs: 12,
    fat: 22,
    mealTime: 'Dinner',
    diningHallName: 'Yahentamitsi',
    loggedAt: '6:30 PM',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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
