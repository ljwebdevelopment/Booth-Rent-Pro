import { auth } from './firebase-init.js';
import { createUserBusinessProfile } from './db.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

export function listenToAuthChanges(onUserChanged) {
  return onAuthStateChanged(auth, onUserChanged);
}

export async function signUpUser({ email, password, businessProfile }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await createUserBusinessProfile(uid, businessProfile);
    return userCredential.user;
  } catch (error) {
    throw new Error(mapAuthErrorToMessage(error));
  }
}

export async function signInUser({ email, password }) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(mapAuthErrorToMessage(error));
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw new Error('Sign out failed. Please try again.');
  }
}

function mapAuthErrorToMessage(error) {
  const authCode = error?.code || '';

  if (authCode.includes('email-already-in-use')) {
    return 'This email is already in use. Please sign in instead.';
  }

  if (authCode.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (authCode.includes('weak-password')) {
    return 'Password must be at least 6 characters.';
  }

  if (authCode.includes('invalid-credential') || authCode.includes('wrong-password') || authCode.includes('user-not-found')) {
    return 'Email or password is incorrect.';
  }

  return 'We could not complete that request right now. Please try again.';
}
