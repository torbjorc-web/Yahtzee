import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

interface FirebaseContext {
  app: FirebaseApp
  db: Firestore
}

let context: FirebaseContext | null = null

function getFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`)
  }

  return config
}

export function getFirebaseContext() {
  if (context) {
    return context
  }

  const config = getFirebaseConfig()
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(config)
  const db = getFirestore(app)
  context = { app, db }
  return context
}
