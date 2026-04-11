---
name: Project Overview
description: UMD Nutrition Expo app structure, tech stack, key files
type: project
---

UMD Nutrition — Bitcamp 2026 hackathon project. React Native + Expo Router app for tracking dining hall food at UMD.

**Why:** Hackathon project to help UMD students track nutrition from the dining halls.

**Stack:**
- Expo Router (file-based routing) in `frontend/`
- Firebase Auth (Google Sign-In only) + Firestore
- Scraper in `backend/` → writes food items to Firestore `items` collection
- Design system: Maryland Red (#b61825) + Gold, Plus Jakarta Sans font

**Key files:**
- `frontend/app/_layout.tsx` — root auth gate (redirects to login if not signed in)
- `frontend/app/(auth)/login.tsx` — Google Sign-In page
- `frontend/app/(auth)/onboarding.tsx` — first-time user setup
- `frontend/app/(tabs)/index.tsx` — home dashboard
- `frontend/app/(tabs)/log.tsx` — log food (merged search here, no meal filter)
- `frontend/app/(tabs)/profile.tsx` — user profile/stats
- `frontend/lib/firestore.ts` — all Firestore operations
- `frontend/lib/mockData.ts` — fallback mock data + types

**How to apply:** When editing this app, always check these files for context on the data model and routing.

**Firestore collections:**
- `users/{uid}` — UserProfile (metrics, displayName, email, onboarding_complete)
- `dailyLogs/` — per-item food log entries (userId, date, calories, protein, carbs, fat, rating)
- `items/` — food items scraped from UMD dining (name, calories, protein_g, total_carbs_g, total_fat_g, locations, serving_size)

**Known limitations:**
- Google OAuth mobile client IDs (iOS/Android) must be created in Google Cloud Console — env vars EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- Scraped food items have no meal-time info, so no meal filter
- Dietary tags removed (not available from scraper)
