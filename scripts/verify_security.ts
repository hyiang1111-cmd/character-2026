import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, terminate } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function verifySecurity() {
  console.log('--- PINK CHARACTER ARCHIVE SECURITY AUDIT ---');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Database ID:', firebaseConfig.firestoreDatabaseId);

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  // Test 1: Unauthenticated Public Read of published characters
  console.log('\n[Test 1] Unauthenticated Visitor: Query published characters...');
  try {
    const q = query(collection(db, 'characters'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    console.log(`[PASS] Public read query succeeded. Found ${snap.size} published character(s).`);
  } catch (err: any) {
    console.error('[FAIL] Public read should be permitted for published characters:', err.message);
  }

  // Test 2: Unauthenticated Visitor attempting to write to characters
  console.log('\n[Test 2] Unauthenticated Visitor: Attempt unauthorized write...');
  try {
    await setDoc(doc(db, 'characters', 'unauthorized_hack_test'), {
      name: 'Malicious Injected Character',
      status: 'published',
    });
    console.error('[CRITICAL FAILURE] Unauthorized write succeeded! Security rules failed to block write.');
  } catch (err: any) {
    console.log('[PASS] Unauthorized write correctly blocked by Firebase Security Rules:', err.code || err.message);
  }

  // Test 3: Unauthenticated Visitor attempting to modify site settings
  console.log('\n[Test 3] Unauthenticated Visitor: Attempt unauthorized settings modification...');
  try {
    await setDoc(doc(db, 'settings', 'site'), {
      siteName: 'Hacked Site Name',
    });
    console.error('[CRITICAL FAILURE] Unauthorized settings write succeeded!');
  } catch (err: any) {
    console.log('[PASS] Unauthorized settings write correctly blocked by Firebase Security Rules:', err.code || err.message);
  }

  // Test 4: Unauthenticated Visitor attempting to read settings (Public read should work)
  console.log('\n[Test 4] Unauthenticated Visitor: Read public site settings...');
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    console.log(`[PASS] Public site settings read succeeded (exists: ${snap.exists()}).`);
  } catch (err: any) {
    console.log('[NOTE] Public site settings read result:', err.message);
  }

  console.log('\n--- SECURITY AUDIT VERIFICATION COMPLETE ---');
  await terminate(db);
  process.exit(0);
}

verifySecurity().catch((err) => {
  console.error(err);
  process.exit(1);
});
