import { db, serverTimestamp } from './firebase-init.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export async function createUserBusinessProfile(uid, profile) {
  const userDocRef = doc(db, 'users', uid);

  const payload = {
    businessName: profile.businessName,
    phone: profile.phone || '',
    address1: profile.address1 || '',
    city: profile.city || '',
    state: profile.state || '',
    zip: profile.zip || '',
    logoUrl: '',
    createdAt: serverTimestamp(),
    membersEnabled: true,
    ownerUid: uid
  };

  await setDoc(userDocRef, payload);
  return payload;
}

export async function getUserBusinessProfile(uid) {
  const userDocRef = doc(db, 'users', uid);
  const userSnapshot = await getDoc(userDocRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.data();
}

// Renter and ledger operations are intentionally stubbed for upcoming prompts.
export async function fetchRentersForUser(uid) {
  return { uid, renters: [] };
}

export async function saveRenter(uid, renter) {
  return { uid, renter };
}

export async function fetchLedgerForRenter(uid, renterId, monthKey) {
  return { uid, renterId, monthKey, entries: [] };
}
