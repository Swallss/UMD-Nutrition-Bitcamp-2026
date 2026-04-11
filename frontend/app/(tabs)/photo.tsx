import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import { addDailyLog, fetchFoodItems } from '@/lib/firestore';
import { estimateMealPhoto, type PhotoEstimateItem } from '@/lib/photoEstimateApi';
import { formatFoodName, getCurrentMealTime, type FoodItem } from '@/lib/mockData';

type EstimateByFoodId = Record<string, PhotoEstimateItem>;

const SEARCH_RESULT_LIMIT = 8;

export default function PhotoScreen() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, FoodItem>>({});
  const [estimates, setEstimates] = useState<EstimateByFoodId>({});
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedList = useMemo(() => Object.values(selectedItems), [selectedItems]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return foodItems
      .filter((item) => !selectedItems[item.id])
      .filter((item) => item.name.toLowerCase().includes(normalizedQuery))
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [foodItems, query, selectedItems]);

  const canEstimate = Boolean(imageUri) && selectedList.length > 0 && !isEstimating;
  const canSave = selectedList.length > 0 && selectedList.every((item) => estimates[item.id]) && !isSaving;

  useEffect(() => {
    fetchFoodItems()
      .then(setFoodItems)
      .catch((error) => {
        Alert.alert('Could not load menu', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => setIsLoadingMenu(false));
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri ?? null);
      setEstimates({});
      setOverallConfidence(null);
      setWarnings([]);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Please allow camera access to take a meal photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri ?? null);
      setEstimates({});
      setOverallConfidence(null);
      setWarnings([]);
    }
  }, []);

  const addSelectedItem = useCallback((item: FoodItem) => {
    setSelectedItems((current) => ({ ...current, [item.id]: item }));
    setQuery('');
    setEstimates((current) => {
      const { [item.id]: _, ...rest } = current;
      return rest;
    });
  }, []);

  const removeSelectedItem = useCallback((itemId: string) => {
    setSelectedItems((current) => {
      const { [itemId]: _, ...rest } = current;
      return rest;
    });
    setEstimates((current) => {
      const { [itemId]: _, ...rest } = current;
      return rest;
    });
  }, []);

  const updateMultiplier = useCallback((foodItemId: string, value: string) => {
    const multiplier = Number(value);
    if (!Number.isFinite(multiplier)) return;
    setEstimates((current) => ({
      ...current,
      [foodItemId]: {
        ...(current[foodItemId] ?? {
          foodItemId,
          confidence: 0.5,
          visualRationale: 'Edited manually.',
        }),
        estimatedServingMultiplier: Math.max(0.1, Math.min(multiplier, 5)),
      },
    }));
  }, []);

  const handleEstimate = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !imageUri) {
      Alert.alert('Missing info', 'Choose a photo and make sure you are signed in.');
      return;
    }
    try {
      setIsEstimating(true);
      const idToken = await user.getIdToken(true);
      const result = await estimateMealPhoto({
        imageUri,
        selectedItems: selectedList,
        idToken,
      });
      setEstimates(
        result.items.reduce<EstimateByFoodId>((groups, estimate) => {
          groups[estimate.foodItemId] = estimate;
          return groups;
        }, {}),
      );
      setOverallConfidence(result.overallConfidence);
      setWarnings(result.warnings);
    } catch (error) {
      Alert.alert('Could not estimate meal', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsEstimating(false);
    }
  }, [imageUri, selectedList]);

  const handleSave = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before saving food logs.');
      return;
    }
    try {
      setIsSaving(true);
      await user.getIdToken(true);
      const mealTime = getCurrentMealTime();
      await Promise.all(
        selectedList.map((item) => {
          const multiplier = estimates[item.id]?.estimatedServingMultiplier ?? 1;
          return addDailyLog(user.uid, item, multiplier, mealTime);
        }),
      );
      setImageUri(null);
      setSelectedItems({});
      setEstimates({});
      setOverallConfidence(null);
      setWarnings([]);
      Alert.alert('Meal logged', 'Your photo estimate was added to today\'s log.');
    } catch (error) {
      Alert.alert('Could not save meal', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [estimates, selectedList]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Photo Log</Text>
        <Text style={styles.subtitle}>Estimate servings from a meal photo, then review before saving.</Text>
      </View>

      <View style={styles.photoCard}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.mealImage} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <MaterialIcons name="photo-camera" size={42} color={Colors.surfaceContainerHigh} />
            <Text style={styles.photoEmptyText}>Add a meal photo</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto} activeOpacity={0.85}>
            <MaterialIcons name="photo-camera" size={18} color={Colors.onPrimary} />
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} activeOpacity={0.85}>
            <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foods on the Plate</Text>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color={Colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
            placeholder={isLoadingMenu ? 'Loading menu...' : 'Search menu items...'}
            placeholderTextColor={Colors.onSurfaceVariant}
            autoCorrect={false}
          />
        </View>
        {filteredItems.length > 0 && (
          <View style={styles.searchResults}>
            {filteredItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.searchResult} onPress={() => addSelectedItem(item)}>
                <View style={styles.searchResultText}>
                  <Text style={styles.searchResultName}>{formatFoodName(item.name)}</Text>
                  <Text style={styles.searchResultMeta}>{item.calories} cal per serving</Text>
                </View>
                <MaterialIcons name="add" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.selectedList}>
          {selectedList.length === 0 ? (
            <Text style={styles.emptyText}>Select each food item that appears in the photo.</Text>
          ) : (
            selectedList.map((item) => (
              <View key={item.id} style={styles.selectedItem}>
                <View style={styles.selectedMain}>
                  <Text style={styles.selectedName}>{formatFoodName(item.name)}</Text>
                  <Text style={styles.selectedMeta}>{item.calories} cal - {item.servingSize ?? item.station}</Text>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeSelectedItem(item.id)}>
                  <MaterialIcons name="close" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.estimateButton, !canEstimate && styles.buttonDisabled]}
        onPress={handleEstimate}
        disabled={!canEstimate}
        activeOpacity={0.9}
      >
        <MaterialIcons name="auto-awesome" size={18} color={Colors.onPrimary} />
        <Text style={styles.estimateButtonText}>{isEstimating ? 'Estimating...' : 'Estimate Servings'}</Text>
      </TouchableOpacity>

      {selectedList.length > 0 && Object.keys(estimates).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review Estimates</Text>
          {overallConfidence !== null && (
            <Text style={styles.confidenceText}>Overall confidence: {Math.round(overallConfidence * 100)}%</Text>
          )}
          {warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>{warning}</Text>
          ))}
          <View style={styles.reviewList}>
            {selectedList.map((item) => {
              const estimate = estimates[item.id];
              const multiplier = estimate?.estimatedServingMultiplier ?? 1;
              return (
                <View key={item.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{formatFoodName(item.name)}</Text>
                    <Text style={styles.reviewConfidence}>
                      {estimate ? `${Math.round(estimate.confidence * 100)}%` : 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.reviewMeta}>{estimate?.visualRationale ?? 'No estimate yet.'}</Text>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Servings</Text>
                    <TextInput
                      value={String(Number(multiplier.toFixed(2)))}
                      onChangeText={(value) => updateMultiplier(item.id, value)}
                      keyboardType="decimal-pad"
                      style={[styles.quantityInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
                    />
                  </View>
                  <Text style={styles.macroLine}>
                    {Math.round(item.calories * multiplier)} cal - {Math.round(item.protein * multiplier)}g protein - {Math.round(item.carbs * multiplier)}g carbs - {Math.round(item.fat * multiplier)}g fat
                  </Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.9}
          >
            <MaterialIcons name="check" size={18} color={Colors.onPrimary} />
            <Text style={styles.estimateButtonText}>{isSaving ? 'Saving...' : 'Add to Food Log'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4 },
  title: { fontFamily: FONTS.extraBold, fontSize: 26, color: Colors.onSurface },
  subtitle: { fontFamily: FONTS.medium, fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19 },
  photoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  mealImage: { width: '100%', height: 240, borderRadius: Radii.innerCard },
  photoEmpty: {
    height: 220,
    borderRadius: Radii.innerCard,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoEmptyText: { fontFamily: FONTS.bold, fontSize: 14, color: Colors.onSurfaceVariant },
  photoActions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: { fontFamily: FONTS.extraBold, fontSize: 13, color: Colors.onPrimary },
  secondaryButton: {
    flex: 1,
    backgroundColor: `${Colors.primary}12`,
    borderRadius: Radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { fontFamily: FONTS.extraBold, fontSize: 13, color: Colors.primary },
  section: { gap: 10 },
  sectionTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: Colors.onSurface },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
  },
  searchResults: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radii.innerCard, overflow: 'hidden' },
  searchResult: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  searchResultText: { flex: 1, gap: 2 },
  searchResultName: { fontFamily: FONTS.bold, fontSize: 13, color: Colors.onSurface },
  searchResultMeta: { fontFamily: FONTS.medium, fontSize: 11, color: Colors.onSurfaceVariant },
  selectedList: { gap: 8 },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard,
    padding: 12,
    gap: 10,
  },
  selectedMain: { flex: 1, gap: 2 },
  selectedName: { fontFamily: FONTS.extraBold, fontSize: 13, color: Colors.onSurface },
  selectedMeta: { fontFamily: FONTS.medium, fontSize: 11, color: Colors.onSurfaceVariant },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 12,
  },
  estimateButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  estimateButtonText: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onPrimary },
  buttonDisabled: { opacity: 0.45 },
  confidenceText: { fontFamily: FONTS.bold, fontSize: 12, color: Colors.primary },
  warningText: { fontFamily: FONTS.medium, fontSize: 12, color: Colors.error },
  reviewList: { gap: 8 },
  reviewCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radii.innerCard, padding: 12, gap: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reviewName: { flex: 1, fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onSurface },
  reviewConfidence: { fontFamily: FONTS.extraBold, fontSize: 12, color: Colors.primary },
  reviewMeta: { fontFamily: FONTS.medium, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 17 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quantityLabel: { fontFamily: FONTS.bold, fontSize: 12, color: Colors.onSurface },
  quantityInput: {
    width: 92,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  macroLine: { fontFamily: FONTS.bold, fontSize: 12, color: Colors.onSurface },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
