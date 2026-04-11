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
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Terp',
  email: '',
  metrics: {
    activity_level: 'moderate',
    age: mockUser.age,
    current_weight_lbs: mockUser.weight,
    goal_type: 'lose_weight',
    height_in: mockUser.height,
    sex: mockUser.sex === 'female' ? 'female' : mockUser.sex === 'male' ? 'male' : 'other',
    target_weight_lbs: mockUser.weightTarget,
  },
  onboarding_complete: false,
};

const LOCATION_TO_HALL: Record<string, string> = {
  Y: 'yahentamitsi',
  SOUTH: 'south-campus',
  '251': '251-north',
};

const HALL_NAMES: Record<string, string> = {
  yahentamitsi: 'Yahentamitsi',
  'south-campus': 'South Campus Dining Hall',
  '251-north': '251 North Dining Hall',
};

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function firstLocation(locations: unknown): string {
  if (Array.isArray(locations) && typeof locations[0] === 'string') return locations[0];
  return 'Y';
}

function currentMealTime(): MealTime {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 17) return 'Snack';
  return 'Dinner';
}

function normalizeProfile(data: Partial<UserProfile> | undefined, user?: User): UserProfile {
  const metrics = data?.metrics ?? DEFAULT_PROFILE.metrics;
  return {
    displayName: user?.displayName ?? data?.displayName ?? DEFAULT_PROFILE.displayName,
    email: user?.email ?? data?.email ?? DEFAULT_PROFILE.email,
    metrics: {
      activity_level: metrics.activity_level ?? DEFAULT_PROFILE.metrics.activity_level,
      age: metrics.age ?? DEFAULT_PROFILE.metrics.age,
      current_weight_lbs: metrics.current_weight_lbs ?? DEFAULT_PROFILE.metrics.current_weight_lbs,
      goal_type: metrics.goal_type ?? DEFAULT_PROFILE.metrics.goal_type,
      height_in: metrics.height_in ?? DEFAULT_PROFILE.metrics.height_in,
      sex: metrics.sex ?? DEFAULT_PROFILE.metrics.sex,
      target_weight_lbs: metrics.target_weight_lbs ?? DEFAULT_PROFILE.metrics.target_weight_lbs,
    },
    createdAt: data?.createdAt,
    onboarding_complete: data?.onboarding_complete ?? false,
    updatedAt: data?.updatedAt,
  };
}

export function mapItemDoc(id: string, data: Record<string, any>): FoodItem {
  const location = firstLocation(data.locations);
  const diningHallId = LOCATION_TO_HALL[location] ?? location.toLowerCase();
  return {
    id,
    name: data.name ?? 'Unknown item',
    calories: Math.round(Number(data.calories ?? 0)),
    protein: Number(data.protein_g ?? 0),
    carbs: Number(data.total_carbs_g ?? 0),
    fat: Number(data.total_fat_g ?? 0),
    diningHallId,
    mealTime: currentMealTime(),
    dietaryTag: null,
    station: data.serving_size ?? '',
    servingSize: data.serving_size,
  };
}

export async function fetchFoodItems() {
  const snapshot = await getDocs(query(collection(db, 'items'), orderBy('name'), limit(200)));
  const items = snapshot.docs.map((itemDoc) => mapItemDoc(itemDoc.id, itemDoc.data()));
  return items.length > 0 ? items : mockFoodItems;
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const profile = normalizeProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : undefined, user);

  await setDoc(
    userRef,
    {
      ...profile,
      createdAt: profile.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { profile, needsOnboarding: !profile.onboarding_complete };
}

export async function fetchUserProfile(uid: string) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return normalizeProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : undefined);
}

export async function saveUserProfile(uid: string, profile: UserProfile) {
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName: profile.displayName,
      email: profile.email,
      metrics: profile.metrics,
      onboarding_complete: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fetchDailyLogs(userId: string, date = todayKey()) {
  const snapshot = await getDocs(
    query(collection(db, 'dailyLogs'), where('userId', '==', userId), where('date', '==', date)),
  );

  return snapshot.docs.map((logDoc) => {
    const data = logDoc.data();
    return {
      id: logDoc.id,
      userId,
      foodItemId: data.foodItemId,
      foodName: data.foodName,
      calories: Number(data.calories ?? 0),
      protein: Number(data.protein ?? 0),
      carbs: Number(data.carbs ?? 0),
      fat: Number(data.fat ?? 0),
      mealTime: data.mealTime,
      diningHallName: data.diningHallName,
      loggedAt: data.loggedAt,
      quantity: Number(data.quantity ?? 1),
      servingSize: data.servingSize,
      date,
      loggedAtTimestamp: data.loggedAtTimestamp,
    } satisfies DailyLogEntry;
  });
}

export async function fetchUserLogs(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'dailyLogs'), where('userId', '==', userId), limit(500)));
  return snapshot.docs.map((logDoc) => {
    const data = logDoc.data();
    return {
      id: logDoc.id,
      userId,
      foodItemId: data.foodItemId,
      foodName: data.foodName,
      calories: Number(data.calories ?? 0),
      protein: Number(data.protein ?? 0),
      carbs: Number(data.carbs ?? 0),
      fat: Number(data.fat ?? 0),
      mealTime: data.mealTime,
      diningHallName: data.diningHallName,
      loggedAt: data.loggedAt,
      quantity: Number(data.quantity ?? 1),
      servingSize: data.servingSize,
      date: data.date,
      loggedAtTimestamp: data.loggedAtTimestamp,
    } satisfies DailyLogEntry;
  });
}

export function weeklyCaloriesFromLogs(logs: DailyLogEntry[], today = new Date()) {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    days.push(todayKey(day));
  }

  return days.map((date) =>
    logs
      .filter((entry) => entry.date === date)
      .reduce((total, entry) => total + entry.calories, 0),
  );
}

export async function addDailyLog(userId: string, item: FoodItem, quantity: number, mealTime: MealTime) {
  await addDoc(collection(db, 'dailyLogs'), {
    userId,
    foodItemId: item.id,
    foodName: item.name,
    calories: Math.round(item.calories * quantity),
    protein: Number((item.protein * quantity).toFixed(1)),
    carbs: Number((item.carbs * quantity).toFixed(1)),
    fat: Number((item.fat * quantity).toFixed(1)),
    quantity,
    servingSize: item.servingSize ?? item.station ?? null,
    mealTime,
    diningHallName: HALL_NAMES[item.diningHallId] ?? item.diningHallId,
    date: todayKey(),
    loggedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    loggedAtTimestamp: serverTimestamp(),
  });
}

export async function updateDailyLogQuantity(logId: string, item: FoodItem, quantity: number) {
  await updateDoc(doc(db, 'dailyLogs', logId), {
    quantity,
    calories: Math.round(item.calories * quantity),
    protein: Number((item.protein * quantity).toFixed(1)),
    carbs: Number((item.carbs * quantity).toFixed(1)),
    fat: Number((item.fat * quantity).toFixed(1)),
    updatedAt: serverTimestamp(),
  });
}

export async function removeDailyLog(logId: string) {
  await deleteDoc(doc(db, 'dailyLogs', logId));
}
