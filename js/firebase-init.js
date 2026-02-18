import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  getFirestore,
  serverTimestamp as firebaseServerTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Keep all Firebase configuration in one place.
// Replace these placeholder values with your Firebase project's web config.
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_API_KEY',
  authDomain: 'REPLACE_WITH_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function serverTimestamp() {
  return firebaseServerTimestamp();
}

export { app, auth, db, serverTimestamp };
