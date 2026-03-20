'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { onValue, ref, update } from 'firebase/database'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import {
  getUserProfile,
  isPremiumActive,
  logoutUser,
  type UserProfile,
} from '@/lib/auth-service'

interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isPremium: boolean
  isAdmin: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTO_ADMIN_LOGINS = new Set(['foxyz'])
const AUTO_ADMIN_EMAILS = new Set(['darkingkey@gmail.com'])

const shouldForceAdmin = (login: string, email: string) => {
  return AUTO_ADMIN_LOGINS.has((login || '').trim().toLowerCase()) ||
    AUTO_ADMIN_EMAILS.has((email || '').trim().toLowerCase())
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      setUser(null)
      setUserProfile(null)
      setLoading(false)
      return
    }

    const authInstance = auth
    const dbInstance = db

    let unsubscribeProfile: (() => void) | undefined

    const unsubAuth = onAuthStateChanged(authInstance, async (nextUser) => {
      setUser(nextUser)

      if (unsubscribeProfile) {
        unsubscribeProfile()
        unsubscribeProfile = undefined
      }

      if (!nextUser) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      const profile = await getUserProfile(nextUser.uid)
      setUserProfile(profile)
      setLoading(false)

      const userRef = ref(dbInstance, `users/${nextUser.uid}`)
      unsubscribeProfile = onValue(userRef, (snapshot) => {
        if (!snapshot.exists()) {
          setUserProfile(null)
          return
        }

        const val = snapshot.val()
        const isAdminRaw = val.isAdmin
        const login = String(val.login || '')
        const email = String(val.email || nextUser.email || '')
        const isAdminBoolean = isAdminRaw === true || isAdminRaw === 'true'

        // Self-heal admin flag for whitelisted accounts so Firebase Rules checks pass.
        if (shouldForceAdmin(login, email) && isAdminRaw !== true) {
          update(userRef, { isAdmin: true }).catch(() => undefined)
        }

        setUserProfile({
          uid: nextUser.uid,
          email,
          login,
          isAdmin: isAdminBoolean,
          premiumUntil: Number(val.premiumUntil || 0),
          createdAt: Number(val.createdAt || 0),
        })
      })
    })

    return () => {
      if (unsubscribeProfile) unsubscribeProfile()
      unsubAuth()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(user)
    const isAdmin = Boolean(userProfile?.isAdmin)
    const isPremium = isAdmin || isPremiumActive(userProfile)

    return {
      user,
      userProfile,
      loading,
      isAuthenticated,
      isPremium,
      isAdmin,
      logout: logoutUser,
    }
  }, [user, userProfile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth trebuie folosit în AuthProvider')
  }
  return context
}
