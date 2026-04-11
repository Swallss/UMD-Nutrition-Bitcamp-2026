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

function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
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
  formData.append('image', {
    uri: imageUri,
    name: getFileName(imageUri),
    type: getMimeType(imageUri),
  } as unknown as Blob);

  const response = await fetch(`${getApiBaseUrl()}/api/photo-estimate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

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
