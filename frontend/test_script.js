import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCVUZ45f23y5kgfGI8b33pwqCVB3h4poYI',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'neeks-bitcamp-2026.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'neeks-bitcamp-2026',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'neeks-bitcamp-2026.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '263060087857',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:263060087857:web:cfd59c16fbbf552163e110',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const itemsRef = collection(db, 'items');
    const itemsSnap = await getDocs(itemsRef);
    if (itemsSnap.empty) {
      console.log('No items in DB.');
      return;
    }
    const item = itemsSnap.docs[0];
    const itemId = item.id;
    const userId = "testuser123";
    
    console.log(`Writing to items/${itemId}/ratings/${userId}...`);
    const ratingRef = doc(db, 'items', itemId, 'ratings', userId);
    await setDoc(ratingRef, {
      userId,
      rating: 5,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('Write resolved!');
    const written = await getDoc(ratingRef);
    console.log('Written doc:', dictToJSON(written.data()));
  } catch (err) {
    console.error('ERROR WRITING:', err);
  }
}

function dictToJSON(obj) {
  try { return JSON.stringify(obj); } catch (e) { return obj.toString(); }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
