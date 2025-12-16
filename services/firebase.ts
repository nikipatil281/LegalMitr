
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCUpmg1Px4BZVrlJ5iVboxbG7csHH_Csy4",
  authDomain: "legalmitr-2025.firebaseapp.com",
  projectId: "legalmitr-2025",
  storageBucket: "legalmitr-2025.firebasestorage.app",
  messagingSenderId: "844874956796",
  appId: "1:844874956796:web:0f3a119c58e46c372cfc79",
  measurementId: "G-FED3XKDDYF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let analytics;
// Initialize analytics only if supported (prevents errors in some environments)
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

export { analytics };
