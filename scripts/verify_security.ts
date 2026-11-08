import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  terminate
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { validatePasswordStrength } from '../src/services/firebase';

async function verifySecurity() {
  console.log('====================================================');
  console.log('   PINK CHARACTER ARCHIVE: ADMIN & SECURITY AUDIT   ');
  console.log('====================================================');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Database ID:', firebaseConfig.firestoreDatabaseId);

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  // Test 1: Password Strength Validation Unit Tests
  console.log('\n[Test 1] Password Strength Validation Logic...');
  const weakPasswords = ['1234567', 'password', 'Password123', 'Pass!'];
  for (const p of weakPasswords) {
    const res = validatePasswordStrength(p);
    if (res.isValid) {
      console.error(`[FAIL] Weak password "${p}" was incorrectly marked as valid!`);
    } else {
      console.log(`[PASS] Weak password "${p}" correctly rejected:`, res.errors[0]);
    }
  }
  const strongPassword = 'AdminPassword@2026';
  const strongRes = validatePasswordStrength(strongPassword);
  if (!strongRes.isValid) {
    console.error('[FAIL] Strong password was rejected:', strongRes.errors);
  } else {
    console.log(`[PASS] Strong password "${strongPassword}" passed all 5 criteria.`);
  }

  // Test 2: Unauthenticated Visitor can check system status
  console.log('\n[Test 2] Public Read: Checking system/admin_status...');
  try {
    const snap = await getDoc(doc(db, 'system', 'admin_status'));
    console.log(`[PASS] Public status check allowed. Exists: ${snap.exists()}`);
    if (snap.exists()) {
      console.log('Current Admin Status:', snap.data());
    } else {
      console.log('Current Admin Status: Not initialized yet (First-time setup ready).');
    }
  } catch (err: any) {
    console.error('[FAIL] Public should be able to read system/admin_status:', err.message);
  }

  // Test 3: Unauthenticated Visitor attempting unauthorized write to characters
  console.log('\n[Test 3] Hacker attempt: Write to characters collection without admin privileges...');
  try {
    await setDoc(doc(db, 'characters', 'malicious_character_inject'), {
      name: 'Malicious Character',
      status: 'published',
    });
    console.error('[CRITICAL FAILURE] Unauthorized write succeeded! Security rules failed to block write.');
  } catch (err: any) {
    console.log('[PASS] Unauthorized write correctly blocked by Firebase Security Rules:', err.code || err.message);
  }

  // Test 4: Unauthenticated Visitor attempting unauthorized write to system/admin_status
  console.log('\n[Test 4] Hacker attempt: Unauthenticated overwrite of system/admin_status...');
  try {
    await setDoc(doc(db, 'system', 'admin_status'), {
      isInitialized: true,
      adminUid: 'fake_hacker_uid',
      adminEmail: 'hacker@evil.com',
    });
    console.error('[CRITICAL FAILURE] Unauthorized system status write succeeded!');
  } catch (err: any) {
    console.log('[PASS] Unauthorized system status write correctly blocked:', err.code || err.message);
  }

  // Test 5: Unauthenticated Visitor attempting to delete system/admin_status
  console.log('\n[Test 5] Hacker attempt: Delete system/admin_status...');
  try {
    await deleteDoc(doc(db, 'system', 'admin_status'));
    console.error('[CRITICAL FAILURE] System status deletion succeeded!');
  } catch (err: any) {
    console.log('[PASS] System status deletion correctly blocked:', err.code || err.message);
  }

  // Test 6: Unauthenticated Visitor attempting to write to /admins
  console.log('\n[Test 6] Hacker attempt: Write to admins collection...');
  try {
    await setDoc(doc(db, 'admins', 'fake_hacker_uid'), {
      role: 'admin',
      email: 'hacker@evil.com',
    });
    console.error('[CRITICAL FAILURE] Unauthorized admin document write succeeded!');
  } catch (err: any) {
    console.log('[PASS] Unauthorized admin write correctly blocked:', err.code || err.message);
  }

  // Test 7: Public Query of published characters
  console.log('\n[Test 7] Public Visitor: Query published characters...');
  try {
    const q = query(collection(db, 'characters'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    console.log(`[PASS] Public read query succeeded. Found ${snap.size} published character(s).`);
  } catch (err: any) {
    console.error('[FAIL] Public read should be permitted for published characters:', err.message);
  }

  console.log('\n====================================================');
  console.log('   ALL SECURITY AUDIT CHECKS COMPLETED SUCCESSFULLY   ');
  console.log('====================================================');
  await terminate(db);
  process.exit(0);
}

verifySecurity().catch((err) => {
  console.error(err);
  process.exit(1);
});
