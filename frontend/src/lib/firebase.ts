// Firebase 初期化（環境変数から設定を読み込む）
// APIキーが未設定の場合は開発用モードとして動作する
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// APIキーが未設定の場合はデモ用の設定を使う（実際の認証は動作しない）
const isDemoMode = !firebaseConfig.apiKey

let app: FirebaseApp

if (isDemoMode) {
  console.warn('[うちの子ファクトリー] Firebase APIキーが未設定です。frontend/.env を作成してください。')
  // デモ用のダミー設定（Firebase初期化のクラッシュを防ぐ）
  app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: 'demo.firebaseapp.com',
    projectId: 'demo-project',
    storageBucket: 'demo.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000',
  })
} else {
  app = initializeApp(firebaseConfig)
}

export { app, isDemoMode }
export const auth = getAuth(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
