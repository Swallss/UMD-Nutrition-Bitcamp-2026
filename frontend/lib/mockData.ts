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

/**
 * Returns an emoji that best represents a food item based on keywords in its name.
 * Checks are ordered from most-specific to most-general so that e.g. "chicken
 * salad" resolves to 🥗 (salad) rather than 🍗 (chicken).
 */
export function getFoodEmoji(name: string): string {
  const n = name.toLowerCase();

  // ── Specific dishes ──────────────────────────────────────────────────────────
  if (/pizza/.test(n))                                          return '🍕';
  if (/burger|hamburger/.test(n))                               return '🍔';
  if (/hot.?dog/.test(n))                                       return '🌭';
  if (/taco|burrito|quesadilla|nacho|fajita/.test(n))           return '🌮';
  if (/sandwich|sub|hoagie|panini/.test(n))                     return '🥪';
  if (/sushi|roll.*rice|onigiri/.test(n))                       return '🍣';
  if (/dumpling|wonton|gyoza|potsticker/.test(n))               return '🥟';
  if (/stir.?fry/.test(n))                                      return '🥘';

  // ── Salad ─────────────────────────────────────────────────────────────────
  if (/salad/.test(n))                                          return '🥗';

  // ── Soup / stew ───────────────────────────────────────────────────────────
  if (/soup|stew|chili|chowder|bisque|broth|gumbo/.test(n))    return '🍲';

  // ── Desserts ──────────────────────────────────────────────────────────────
  if (/ice.?cream|gelato|sorbet|sundae/.test(n))                return '🍦';
  if (/cookie|brownie/.test(n))                                 return '🍪';
  if (/cake|cupcake|cheesecake/.test(n))                        return '🍰';
  if (/pie|cobbler|crisp|crumble/.test(n))                      return '🥧';
  if (/donut|doughnut/.test(n))                                 return '🍩';
  if (/pudding|custard|mousse|flan/.test(n))                    return '🍮';
  if (/waffle/.test(n))                                         return '🧇';
  if (/pancake/.test(n))                                        return '🥞';

  // ── Breakfast items ───────────────────────────────────────────────────────
  if (/french.?toast/.test(n))                                  return '🍞';
  if (/egg|omelet|omelette|frittata|quiche|scrambled/.test(n)) return '🍳';
  if (/oatmeal|granola|cereal/.test(n))                         return '🥣';

  // ── Proteins ──────────────────────────────────────────────────────────────
  if (/chicken|turkey|poultry|hen|wing/.test(n))                return '🍗';
  if (/bacon/.test(n))                                          return '🥓';
  if (/beef|steak|brisket|meatball|meatloaf|ground meat/.test(n)) return '🥩';
  if (/pork|ham|sausage|chorizo|pepperoni|salami/.test(n))      return '🥩';
  if (/salmon|tuna|tilapia|cod|mahi|shrimp|seafood|fish|crab|lobster/.test(n)) return '🐟';
  if (/tofu|tempeh/.test(n))                                    return '🫘';

  // ── Pasta / noodles ───────────────────────────────────────────────────────
  if (/pasta|spaghetti|linguine|penne|fettuccine|rigatoni|lasagna|mac(aroni)?|noodle|ramen|lo.?mein|udon/.test(n)) return '🍝';

  // ── Rice / grains ─────────────────────────────────────────────────────────
  if (/\brice\b|quinoa|couscous|pilaf|risotto|fried rice/.test(n)) return '🍚';

  // ── Vegetables ────────────────────────────────────────────────────────────
  if (/broccoli/.test(n))                                       return '🥦';
  if (/corn/.test(n))                                           return '🌽';
  if (/carrot/.test(n))                                         return '🥕';
  if (/potato|fries|tots|hash.?brown/.test(n))                  return '🥔';
  if (/pepper/.test(n))                                         return '🫑';
  if (/mushroom/.test(n))                                       return '🍄';
  if (/tomato/.test(n))                                         return '🍅';
  if (/avocado/.test(n))                                        return '🥑';
  if (/spinach|kale|chard|collard|lettuce|arugula/.test(n))     return '🥬';
  if (/vegetable|veggie|veg\b|stir.?veg|mixed veg/.test(n))     return '🥦';

  // ── Legumes ───────────────────────────────────────────────────────────────
  if (/bean|lentil|chickpea|hummus|falafel|edamame/.test(n))   return '🫘';

  // ── Bread / bakery ────────────────────────────────────────────────────────
  if (/muffin/.test(n))                                         return '🧁';
  if (/bread|roll|biscuit|croissant|bagel|toast|pretzel|naan|pita|flatbread/.test(n)) return '🍞';

  // ── Cheese / dairy ────────────────────────────────────────────────────────
  if (/cheese|yogurt|cottage|ricotta|mozzarella|cheddar|parmesan/.test(n)) return '🧀';

  // ── Fruit ─────────────────────────────────────────────────────────────────
  if (/apple/.test(n))                                          return '🍎';
  if (/banana/.test(n))                                         return '🍌';
  if (/orange|citrus|mandarin/.test(n))                         return '🍊';
  if (/grape/.test(n))                                          return '🍇';
  if (/strawberr/.test(n))                                      return '🍓';
  if (/berry|berries|blueberr|raspberr|blackberr/.test(n))      return '🫐';
  if (/melon|watermelon|cantaloupe/.test(n))                    return '🍉';
  if (/mango/.test(n))                                          return '🥭';
  if (/pineapple/.test(n))                                      return '🍍';
  if (/peach|plum|apricot/.test(n))                             return '🍑';
  if (/pear/.test(n))                                           return '🍐';
  if (/cherry|cherries/.test(n))                                return '🍒';
  if (/fruit/.test(n))                                          return '🍎';

  // ── Drinks ────────────────────────────────────────────────────────────────
  if (/coffee|espresso|latte|cappuccino/.test(n))               return '☕';
  if (/tea/.test(n))                                            return '🍵';
  if (/juice|lemonade|smoothie/.test(n))                        return '🥤';
  if (/milk/.test(n))                                           return '🥛';

  // ── Fallback ──────────────────────────────────────────────────────────────
  return '🍽️';
}

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
