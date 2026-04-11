import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { mockFoodItems, mockUser, type FoodItem, type LogEntry, type MealTime } from '@/lib/mockData';

export type ActivityLevel = 'low' | 'light' | 'moderate' | 'high' | 'very_high';
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type Sex = 'male' | 'female' | 'other';

export interface UserProfile {
  displayName: string;
  email: string;
  metrics: {
    activity_level: ActivityLevel;
    age: number;
    current_weight_lbs: number;
    goal_type: GoalType;
    height_in: number;
    sex: Sex;
    target_weight_lbs: number;
  };
  createdAt?: Timestamp;
  onboarding_complete?: boolean;
  updatedAt?: Timestamp;
}

export interface DailyLogEntry extends LogEntry {
  userId: string;
  quantity: number;
  servingSize?: string;
  date: string;
  loggedAtTimestamp?: Timestamp;
  rating?: number;
}

const DEFAULT_METRICS: UserProfile['metrics'] = {
  activity_level: 'moderate',
  age: mockUser.age,
  current_weight_lbs: mockUser.weight,
  goal_type: 'lose_weight',
  height_in: mockUser.height,
  sex: 'male',
  target_weight_lbs: mockUser.weightTarget,
};

// Maps scraper location codes → app dining hall IDs
// Scraper writes: "Y", "SOUTH", "251"
const LOCATION_TO_HALL: Record<string, string> = {
  Y:     'yahentamitsi',
  SOUTH: 'south-campus',
  '251': '251-north',
};

const HALL_NAMES: Record<string, string> = {
  yahentamitsi:   'Yahentamitsi',
  'south-campus': 'South Campus Dining Hall',
  '251-north':    '251 North Dining Hall',
};

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function firstLocation(locations: unknown): string {
  if (Array.isArray(locations) && typeof locations[0] === 'string') return locations[0];
  if (typeof locations === 'string') return locations;
  return 'Y';
}

function currentMealTime(): MealTime {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 17) return 'Snack';
  return 'Dinner';
}

function normalizeProfile(
  data: Partial<UserProfile> | undefined,
  user?: User,
): UserProfile {
  const m = data?.metrics ?? DEFAULT_METRICS;
  return {
    displayName: user?.displayName ?? data?.displayName ?? 'Terp',
    email:       user?.email       ?? data?.email       ?? '',
    metrics: {
      activity_level:      m.activity_level      ?? DEFAULT_METRICS.activity_level,
      age:                 m.age                 ?? DEFAULT_METRICS.age,
      current_weight_lbs:  m.current_weight_lbs  ?? DEFAULT_METRICS.current_weight_lbs,
      goal_type:           m.goal_type           ?? DEFAULT_METRICS.goal_type,
      height_in:           m.height_in           ?? DEFAULT_METRICS.height_in,
      sex:                 m.sex                 ?? DEFAULT_METRICS.sex,
      target_weight_lbs:   m.target_weight_lbs   ?? DEFAULT_METRICS.target_weight_lbs,
    },
    createdAt:          data?.createdAt,
    onboarding_complete: data?.onboarding_complete ?? false,
    updatedAt:          data?.updatedAt,
  };
}

// ── Food items ────────────────────────────────────────────────────────────────

export function mapItemDoc(id: string, data: Record<string, any>): FoodItem {
  const rawLoc = firstLocation(data.locations);
  // Try exact match then uppercased; scraper always uses caps ("Y","SOUTH","251")
  const diningHallId = LOCATION_TO_HALL[rawLoc] ?? LOCATION_TO_HALL[rawLoc.toUpperCase()] ?? rawLoc.toLowerCase();
  return {
    id,
    name:        data.name        ?? 'Unknown item',
    calories:    Math.round(Number(data.calories       ?? 0)),
    protein:     Number(data.protein_g    ?? data.protein ?? 0),
    carbs:       Number(data.total_carbs_g ?? data.carbs   ?? 0),
    fat:         Number(data.total_fat_g   ?? data.fat     ?? 0),
    diningHallId,
    mealTime:    currentMealTime(),
    dietaryTag:  null,
    station:     data.serving_size ?? '',
    servingSize: data.serving_size,
  };
}

/**
 * Fetch all food items from Firestore `items` collection.
 * Falls back to mock data only if the collection is empty.
 * Throws on Firestore permission errors so callers can show the real error.
 *
 * NOTE: If you see permission errors in the console, you need to update your
 * Firestore security rules to allow public reads on `items`:
 *
 *   match /items/{itemId} {
 *     allow read: if true;
 *   }
 */
export async function fetchFoodItems(): Promise<FoodItem[]> {
  const snapshot = await getDocs(query(collection(db, 'items'), orderBy('name')));
  if (snapshot.empty) {
    console.warn('[Firestore] items collection is empty — has the scraper run yet?');
    return mockFoodItems;
  }
  return snapshot.docs.map((d) => mapItemDoc(d.id, d.data() as Record<string, any>));
}

// ── User profile ──────────────────────────────────────────────────────────────

/**
 * Read the user's Firestore profile doc.
 * Creates it (with defaults) if it doesn't exist yet.
 * Returns { profile, needsOnboarding }.
 *
 * Firestore rules required:
 *   match /users/{userId} {
 *     allow read, write: if request.auth != null && request.auth.uid == userId;
 *   }
 */
export async function ensureUserProfile(user: User): Promise<{ profile: UserProfile; needsOnboarding: boolean }> {
  // Force-refresh the ID token so Firestore receives an up-to-date auth credential.
  // Without this, brand-new sign-ins occasionally get a permissions error because
  // the token hasn't propagated yet.
  await user.getIdToken(true);

  const userRef  = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.exists() ? (snapshot.data() as Partial<UserProfile>) : undefined;
  const profile  = normalizeProfile(existing, user);

  // Merge into Firestore — preserves any existing fields the user has edited.
  await setDoc(
    userRef,
    {
      displayName:         profile.displayName,
      email:               profile.email,
      metrics:             existing?.metrics ?? profile.metrics,
      onboarding_complete: existing?.onboarding_complete ?? false,
      createdAt:           existing?.createdAt ?? serverTimestamp(),
      updatedAt:           serverTimestamp(),
    },
    { merge: true },
  );

  const needsOnboarding = !(existing?.onboarding_complete ?? false);
  return { profile, needsOnboarding };
}

/** Returns a profile populated with defaults, using Firebase Auth user data when available. */
export function getDefaultProfile(user?: { displayName?: string | null; email?: string | null } | null): UserProfile {
  return normalizeProfile(undefined, user as any);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return normalizeProfile(
    snapshot.exists() ? (snapshot.data() as Partial<UserProfile>) : undefined,
  );
}

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName:         profile.displayName,
      email:               profile.email,
      metrics:             profile.metrics,
      onboarding_complete: true,
      updatedAt:           serverTimestamp(),
    },
    { merge: true },
  );
}

// ── Daily logs ────────────────────────────────────────────────────────────────

export async function fetchDailyLogs(userId: string, date = todayKey()): Promise<DailyLogEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'dailyLogs'),
      where('userId', '==', userId),
      where('date',   '==', date),
    ),
  );
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id:              d.id,
      userId,
      foodItemId:      data.foodItemId  ?? d.id,
      foodName:        data.foodName    ?? 'Unknown',
      calories:        Number(data.calories  ?? 0),
      protein:         Number(data.protein   ?? 0),
      carbs:           Number(data.carbs     ?? 0),
      fat:             Number(data.fat       ?? 0),
      mealTime:        data.mealTime         ?? 'Dinner',
      diningHallName:  data.diningHallName   ?? '',
      loggedAt:        data.loggedAt         ?? '',
      quantity:        Number(data.quantity  ?? 1),
      servingSize:     data.servingSize,
      date,
      loggedAtTimestamp: data.loggedAtTimestamp,
      rating:          data.rating           ?? 0,
    } satisfies DailyLogEntry;
  });
}

export async function fetchUserLogs(userId: string): Promise<DailyLogEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, 'dailyLogs'), where('userId', '==', userId), limit(500)),
  );
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id:              d.id,
      userId,
      foodItemId:      data.foodItemId  ?? d.id,
      foodName:        data.foodName    ?? 'Unknown',
      calories:        Number(data.calories  ?? 0),
      protein:         Number(data.protein   ?? 0),
      carbs:           Number(data.carbs     ?? 0),
      fat:             Number(data.fat       ?? 0),
      mealTime:        data.mealTime         ?? 'Dinner',
      diningHallName:  data.diningHallName   ?? '',
      loggedAt:        data.loggedAt         ?? '',
      quantity:        Number(data.quantity  ?? 1),
      servingSize:     data.servingSize,
      date:            data.date             ?? todayKey(),
      loggedAtTimestamp: data.loggedAtTimestamp,
      rating:          data.rating           ?? 0,
    } satisfies DailyLogEntry;
  });
}

export function weeklyCaloriesFromLogs(logs: DailyLogEntry[], today = new Date()): number[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(todayKey(d));
  }
  return days.map((date) =>
    logs
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.calories, 0),
  );
}

export async function addDailyLog(
  userId: string,
  item: FoodItem,
  quantity: number,
  mealTime: MealTime,
): Promise<void> {
  await addDoc(collection(db, 'dailyLogs'), {
    userId,
    foodItemId:     item.id,
    foodName:       item.name,
    calories:       Math.round(item.calories * quantity),
    protein:        Number((item.protein * quantity).toFixed(1)),
    carbs:          Number((item.carbs   * quantity).toFixed(1)),
    fat:            Number((item.fat     * quantity).toFixed(1)),
    quantity,
    servingSize:    item.servingSize ?? item.station ?? null,
    mealTime,
    diningHallName: HALL_NAMES[item.diningHallId] ?? item.diningHallId,
    date:           todayKey(),
    loggedAt:       new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    loggedAtTimestamp: serverTimestamp(),
    rating:         0,
  });
}

export async function updateLogRating(logId: string, rating: number): Promise<void> {
  await updateDoc(doc(db, 'dailyLogs', logId), { rating });
}

export async function removeDailyLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, 'dailyLogs', logId));
}
