# 🍽️ UMD Nutrition Tracker

A calorie and macro tracking mobile app built specifically for University of Maryland students. Real dining hall data, scraped fresh, so you actually know what you're eating at dining halls.

---

## What It Does

- Scrapes live nutritional data from the UMD dining website and stores it in Firebase
- Lets students log meals by dining hall, track daily macros, and set weight goals
- Calculates personalized calorie targets based on body stats and goals
- Works on iOS and Android from a single codebase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native (Expo) |
| Backend / API | Python + FastAPI |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Scraper | Python + BeautifulSoup / Playwright |
| Backend Deployment | Railway |
| Mobile Builds | Expo EAS |
| Scraper Scheduling | GitHub Actions |

---

## Project Structure

```
umd-nutrition-app/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── scraper/
│   │   ├── scrape_umd.py          # Pulls data from UMD dining site
│   │   └── scheduler.py           # Cron logic for scheduled runs
│   ├── api/
│   │   └── routes/
│   │       ├── food.py
│   │       ├── logs.py
│   │       ├── users.py
│   │       └── reviews.py
│   ├── models/
│   │   ├── food.py
│   │   ├── log.py
│   │   └── user.py
│   └── db/
│       └── firebase.py
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # Home / dashboard
│   │   │   ├── log.tsx            # Food logging
│   │   │   ├── search.tsx         # Search food items
│   │   │   └── profile.tsx        # Goals + body stats
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── FoodCard.tsx
│   │   ├── MacroRing.tsx
│   │   └── DiningHallPicker.tsx
│   ├── hooks/
│   │   └── useNutrition.ts
│   └── lib/
│       ├── api.ts                 # FastAPI client
│       └── firebase.ts            # Firebase config
├── .github/
│   └── workflows/
│       └── scrape.yml             # Scheduled scraper via GitHub Actions
└── README.md
```

---

## Firestore Collections

| Collection | Contents |
|---|---|
| `users` | Profile info, body stats, calorie/macro goals |
| `foodItems` | Scraped nutrition data + any user-submitted items |
| `dailyLogs` | Per-user, per-day food entries |
| `reviews` | Star ratings on food items (nice-to-have) |

---

## Features

### Core (v1)
- [ ] Scraper pulling nutritional data from UMD dining on a schedule
- [ ] Food logging: add, remove, adjust quantity
- [ ] User accounts with meal history
- [ ] Body archetype input: height, weight, age, sex, activity level
- [ ] Auto-calculated calorie and macro targets based on weight goals

### Nice-to-Have (post-v1)
- [ ] Photo food logging via Claude API (snap a meal, get macros estimated)
- [ ] Food recommendations based on remaining macros + live menu
- [ ] Exercise logging with Strava API integration
- [ ] Daily dining hall rankings
- [ ] 5-star food item ratings
- [ ] Business checking for dining halls

---

## Getting Started

### Prerequisites

- Node.js + npm
- Python 3.10+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Firestore + Auth enabled
- Railway account for backend deployment

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Add a `.env` file in `/backend`:

```
FIREBASE_CREDENTIALS=path/to/serviceAccountKey.json
```

Run the server:

```bash
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

Add a `.env` file in `/frontend`:

```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
```

### Running the Scraper Manually

```bash
cd backend
python scraper/scrape_umd.py
```

The scraper also runs on a schedule via `.github/workflows/scrape.yml` once deployed.

---

## Architecture Decisions

**Firebase over PostgreSQL** -- Firestore's real-time sync and built-in Auth reduce infrastructure overhead for a team of three. No need to manage a separate auth system or write real-time sync logic from scratch.

**Expo over bare React Native** -- Single codebase for iOS and Android. EAS handles builds and OTA updates without needing to touch Xcode or Android Studio day-to-day.

**FastAPI backend kept separate from Firebase** -- The scraper and any compute-heavy logic lives in Python, not Firebase Cloud Functions. This keeps scraping flexible, testable, and easy to run locally or on a cron schedule.

---

## Team

Three collaborators. See commit history.

---

## License

MIT
