// Firebase Auth のリアクティブな状態を取得するカスタムフック
import { useState, useEffect } from 'react'
import { type User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
