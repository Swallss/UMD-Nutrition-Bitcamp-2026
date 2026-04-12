import { Platform } from 'react-native';
import type { FoodItem } from '@/lib/mockData';

export type PhotoEstimateItem = {
  foodItemId: string;
  estimatedServingMultiplier: number;
  confidence: number;
  visualRationale: string;
};

export type PhotoEstimateResponse = {
  items: PhotoEstimateItem[];
  overallConfidence: number;
  warnings: string[];
};

type EstimateMealPhotoInput = {
  imageUri: string;
  selectedItems: FoodItem[];
  idToken: string;
};

const REQUEST_TIMEOUT_MS = 30_000;

function getApiBaseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
  if (__DEV__ && url.includes('localhost')) {
    console.warn(
      '[photoEstimateApi] EXPO_PUBLIC_API_URL is not set — using localhost, which will not work on a physical device. ' +
        'Set EXPO_PUBLIC_API_URL in frontend/.env to your backend IP (e.g. http://192.168.x.x:8000).',
    );
  }
  return url;
}

function getFileName(uri: string) {
  const fallback = 'meal-photo.jpg';
  return uri.split('/').pop()?.split('?')[0] || fallback;
}

function getMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function estimateMealPhoto({
  imageUri,
  selectedItems,
  idToken,
}: EstimateMealPhotoInput): Promise<PhotoEstimateResponse> {
  const formData = new FormData();
  formData.append(
    'selected_items_json',
    JSON.stringify(
      selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        servingSize: item.servingSize,
        station: item.station,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    ),
  );
  if (Platform.OS === 'web') {
    // On web, FormData requires a real Blob — fetch the URI to convert it.
    const blobResponse = await fetch(imageUri);
    const blob = await blobResponse.blob();
    formData.append('image', blob, getFileName(imageUri));
  } else {
    // React Native's fetch understands this {uri, name, type} shorthand.
    formData.append('image', {
      uri: imageUri,
      name: getFileName(imageUri),
      type: getMimeType(imageUri),
    } as unknown as Blob);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/photo-estimate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Make sure the backend is running and EXPO_PUBLIC_API_URL is set to your server IP.');
    }
    throw new Error('Could not reach the server. Make sure EXPO_PUBLIC_API_URL is set to your backend IP (e.g. http://192.168.x.x:8000).');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = `Photo estimate failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<PhotoEstimateResponse>;
}
