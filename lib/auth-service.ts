import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  get,
  remove,
  ref,
  runTransaction,
  set,
  update,
} from 'firebase/database'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'

export interface UserProfile {
  uid: string
  email: string
  login: string
  isAdmin: boolean
  premiumUntil: number
  createdAt: number
}

export interface PromoCodeRecord {
  code: string
  grantType: 'premium' | 'admin'
  premiumHours: number
  maxUses: number
  usedCount: number
  active: boolean
  createdBy: string
  createdAt: number
  usedBy?: string
  usedAt?: number
}

export interface PromoPreview {
  code: string
  grantType: 'premium' | 'admin'
  premiumHours: number
  remainingUses: number
  active: boolean
}

export interface PromoActivation {
  code: string
  uid: string
  login: string
  email: string
  activatedAt: number
}

export interface SavedReferat {
  id: string
  topic: string
  discipline: string
  pageCount: number
  createdAt: number
}

const normalizeLogin = (login: string) => login.trim().toLowerCase()
const AUTO_ADMIN_LOGINS = new Set(['foxyz'])
const AUTO_ADMIN_EMAILS = new Set(['darkingkey@gmail.com'])

const FIREBASE_SETUP_ERROR =
  'Firebase nu este configurat. Completează variabilele NEXT_PUBLIC_FIREBASE_* în .env.local.'

function ensureFirebase() {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error(FIREBASE_SETUP_ERROR)
  }
  return { auth, db }
}

export async function saveReferat(uid: string, params: {
  topic: string
  discipline: string
  pageCount: number
  settings: Record<string, unknown>
  sections: Record<string, unknown>[]
}): Promise<string> {
  const { db } = ensureFirebase()
  const referatId = Date.now().toString()
  const path = `users/${uid}/referats/${referatId}`
  
  await set(ref(db, path), {
    id: referatId,
    topic: params.topic,
    discipline: params.discipline,
    pageCount: params.pageCount,
    createdAt: Date.now(),
    settings: params.settings,
    sections: params.sections,
  })
  
  return referatId
}

export async function getSavedReferats(uid: string): Promise<SavedReferat[]> {
  const { db } = ensureFirebase()
  const snap = await get(ref(db, `users/${uid}/referats`))
  
  if (!snap.exists()) return []
  
  const data = snap.val() as Record<string, unknown>
  return Object.values(data).map(ref => ({
    id: String((ref as Record<string, unknown>).id || ''),
    topic: String((ref as Record<string, unknown>).topic || ''),
    discipline: String((ref as Record<string, unknown>).discipline || ''),
    pageCount: Number((ref as Record<string, unknown>).pageCount || 0),
    createdAt: Number((ref as Record<string, unknown>).createdAt || 0),
  })).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getReferat(uid: string, referatId: string): Promise<any> {
  const { db } = ensureFirebase()
  const snap = await get(ref(db, `users/${uid}/referats/${referatId}`))
  
  if (!snap.exists()) return null
  return snap.val()
}

export async function deleteReferat(uid: string, referatId: string): Promise<void> {
  const { db } = ensureFirebase()
  await remove(ref(db, `users/${uid}/referats/${referatId}`))
}

function mapFirebaseError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('auth/configuration-not-found') || lower.includes('auth/operation-not-allowed')) {
    return new Error(
      'Email/Password nu este activat in Firebase Authentication. Mergi la Authentication > Sign-in method > Email/Password > Enable.'
    )
  }
  if (message.toLowerCase().includes('permission_denied')) {
    return new Error('Permission denied din Firebase Rules. Verifică regulile Realtime Database.')
  }
  return error instanceof Error ? error : new Error(message)
}

const mapProfileData = (uid: string, value: unknown): UserProfile => {
  const data = (value as Record<string, unknown>) || {}
  const isAdminRaw = data.isAdmin
  return {
    uid,
    email: String(data.email || ''),
    login: String(data.login || ''),
    isAdmin: isAdminRaw === true || isAdminRaw === 'true',
    premiumUntil: Number(data.premiumUntil || 0),
    createdAt: Number(data.createdAt || 0),
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = ensureFirebase()
  const snap = await get(ref(db, `users/${uid}`))
  if (!snap.exists()) return null
  return mapProfileData(uid, snap.val())
}

export async function registerWithEmailLoginPassword(params: {
  email: string
  password: string
  login: string
  promoCode?: string
}) {
  const { auth, db } = ensureFirebase()
  const email = params.email.trim().toLowerCase()
  const login = params.login.trim()
  const password = params.password
  const loginKey = normalizeLogin(login)
  const promoCode = (params.promoCode || '').trim().toUpperCase()
  const shouldAutoAdmin = AUTO_ADMIN_LOGINS.has(loginKey) || AUTO_ADMIN_EMAILS.has(email)

  if (!email || !password || !login) {
    throw new Error('Completează email, login și parolă.')
  }

  let createdUid = ''

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const uid = credential.user.uid
    createdUid = uid

    const loginRef = ref(db, `loginIndex/${loginKey}`)
    const loginTx = await runTransaction(loginRef, (current) => {
      if (current) return
      return { uid, email }
    })

    if (!loginTx.committed) {
      await deleteUser(credential.user)
      throw new Error('Login-ul este deja folosit.')
    }

    await set(ref(db, `users/${uid}`), {
      email,
      login,
      isAdmin: shouldAutoAdmin,
      premiumUntil: 0,
      createdAt: Date.now(),
    })

    if (promoCode) {
      await applyPromoForUser(uid, promoCode)
    }

    return credential.user
  } catch (error) {
    if (createdUid) {
      await remove(ref(db, `users/${createdUid}`)).catch(() => undefined)
      await remove(ref(db, `loginIndex/${loginKey}`)).catch(() => undefined)
      if (auth.currentUser?.uid === createdUid) {
        await deleteUser(auth.currentUser).catch(() => undefined)
      }
    }
    throw mapFirebaseError(error)
  }
}

export async function loginWithEmailOrLogin(identifier: string, password: string) {
  const { auth, db } = ensureFirebase()
  const value = identifier.trim()
  if (!value || !password) {
    throw new Error('Completează datele de autentificare.')
  }

  let email = value

  try {
    if (!value.includes('@')) {
      const loginKey = normalizeLogin(value)
      const loginSnap = await get(ref(db, `loginIndex/${loginKey}`))
      if (!loginSnap.exists()) {
        throw new Error('Login inexistent.')
      }

      const loginValue = loginSnap.val() as string | { uid?: string; email?: string }
      if (typeof loginValue === 'string') {
        const userSnap = await get(ref(db, `users/${loginValue}`))
        if (!userSnap.exists()) {
          throw new Error('Contul nu mai există.')
        }
        email = String(userSnap.val().email || '')
      } else {
        email = String(loginValue.email || '')
        if (!email) {
          throw new Error('Contul nu mai există.')
        }
      }
    }

    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function logoutUser() {
  const { auth } = ensureFirebase()
  await signOut(auth)
}

export function isPremiumActive(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false
  return userProfile.premiumUntil > Date.now()
}

export function getPremiumDaysLeft(userProfile: UserProfile | null): number {
  if (!userProfile) return 0
  const diff = userProfile.premiumUntil - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function getPremiumRemainingMs(userProfile: UserProfile | null): number {
  if (!userProfile) return 0
  return Math.max(0, userProfile.premiumUntil - Date.now())
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0h 0m 0s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${minutes}m ${seconds}s`
}

export async function redeemPromoCode(uid: string, rawCode: string) {
  return applyPromoForUser(uid, rawCode)
}

export async function previewPromoCode(rawCode: string): Promise<PromoPreview> {
  const { db } = ensureFirebase()
  const code = rawCode.trim().toUpperCase()
  if (!code) throw new Error('Introdu un cod promo.')

  try {
    const publicSnap = await get(ref(db, `promoPublic/${code}`))
    if (!publicSnap.exists()) {
      throw new Error('Cod invalid sau expirat.')
    }

    const data = publicSnap.val() as Partial<PromoCodeRecord>
    const maxUses = Number(data.maxUses || 1)
    const usedCount = Number(data.usedCount || 0)
    const active = Boolean(data.active)
    const remainingUses = Math.max(maxUses - usedCount, 0)

    if (!active || remainingUses <= 0) {
      throw new Error('Cod invalid sau expirat.')
    }

    return {
      code,
      grantType: data.grantType === 'admin' ? 'admin' : 'premium',
      premiumHours: Number(data.premiumHours || 0),
      remainingUses,
      active,
    }
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

async function applyPromoForUser(uid: string, rawCode: string) {
  const { db } = ensureFirebase()
  const code = rawCode.trim().toUpperCase()
  if (!code) throw new Error('Introdu un cod promo.')

  try {
    const promoPublicRef = ref(db, `promoPublic/${code}`)

    const txResult = await runTransaction(promoPublicRef, (current: PromoCodeRecord | null) => {
      if (!current || !current.active) return

      const maxUses = Number(current.maxUses || 1)
      const usedCount = Number(current.usedCount || 0)
      if (usedCount >= maxUses) {
        return
      }

      const newUsedCount = usedCount + 1
      return {
        ...current,
        usedCount: newUsedCount,
        active: newUsedCount < maxUses,
        usedBy: uid,
        usedAt: Date.now(),
      }
    })

    if (!txResult.committed || !txResult.snapshot.exists()) {
      throw new Error('Cod invalid sau deja folosit.')
    }

    const codeData = txResult.snapshot.val() as PromoCodeRecord
    if (codeData.grantType === 'admin') {
      await update(ref(db, `users/${uid}`), { isAdmin: true })
    }

    if (codeData.grantType === 'premium') {
      const premiumHours = Number(codeData.premiumHours || 0)
      if (premiumHours <= 0) {
        throw new Error('Cod promo invalid.')
      }

      await runTransaction(ref(db, `users/${uid}/premiumUntil`), (current: number | null) => {
        const now = Date.now()
        const currentValue = Number(current || 0)
        const base = currentValue > now ? currentValue : now
        return base + premiumHours * 60 * 60 * 1000
      })
    }

    await update(ref(db, `promoCodes/${code}`), {
      usedCount: Number(codeData.usedCount || 1),
      active: Boolean(codeData.active),
      usedBy: uid,
      usedAt: Date.now(),
    }).catch(() => undefined)

    await set(ref(db, `promoRedemptions/${uid}/${code}`), Date.now())
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function createPromoCode(params: {
  code: string
  grantType: 'premium' | 'admin'
  premiumHours?: number
  maxUses?: number
  createdBy: string
}) {
  try {
    const { db } = ensureFirebase()
    const code = params.code.trim().toUpperCase()
    const grantType = params.grantType
    const premiumHours = Math.floor(params.premiumHours || 0)
    const maxUses = Math.max(1, Math.floor(params.maxUses || 1))

    if (!code) {
      throw new Error('Codul promo trebuie completat.')
    }

    if (grantType === 'premium' && premiumHours <= 0) {
      throw new Error('Pentru promo premium, orele trebuie să fie mai mari ca 0.')
    }

    const promoRef = ref(db, `promoCodes/${code}`)
    const existing = await get(promoRef)
    if (existing.exists()) {
      throw new Error('Acest cod există deja.')
    }

    const payload: PromoCodeRecord = {
      code,
      grantType,
      premiumHours: grantType === 'premium' ? premiumHours : 0,
      maxUses,
      usedCount: 0,
      active: true,
      createdBy: params.createdBy,
      createdAt: Date.now(),
    }

    await set(promoRef, payload)
    await set(ref(db, `promoPublic/${code}`), payload)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function deactivatePromoCode(codeValue: string) {
  try {
    const { db } = ensureFirebase()
    const code = codeValue.trim().toUpperCase()
    if (!code) throw new Error('Cod invalid.')

    await update(ref(db, `promoCodes/${code}`), { active: false })
    await update(ref(db, `promoPublic/${code}`), { active: false })
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function extendPromoCodeUses(codeValue: string, additionalUses: number) {
  try {
    const { db } = ensureFirebase()
    const code = codeValue.trim().toUpperCase()
    const extra = Math.floor(additionalUses)
    if (!code || extra <= 0) {
      throw new Error('Cod valid și număr de utilizări > 0 sunt necesare.')
    }

    const promoRef = ref(db, `promoCodes/${code}`)
    const publicRef = ref(db, `promoPublic/${code}`)

    const tx = await runTransaction(promoRef, (current: PromoCodeRecord | null) => {
      if (!current) return
      const usedCount = Number(current.usedCount || 0)
      const maxUses = Number(current.maxUses || 1) + extra
      return {
        ...current,
        maxUses,
        active: usedCount < maxUses,
      }
    })

    if (!tx.committed || !tx.snapshot.exists()) {
      throw new Error('Cod promo inexistent.')
    }

    const updated = tx.snapshot.val() as PromoCodeRecord
    await update(publicRef, {
      maxUses: Number(updated.maxUses || 1),
      active: Boolean(updated.active),
    })
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function grantPremiumHours(params: {
  uid: string
  hours: number
  grantedBy: string
}) {
  try {
    const { db } = ensureFirebase()
    const hours = Math.floor(params.hours)
    if (!params.uid || hours <= 0) {
      throw new Error('UID și ore valide sunt necesare.')
    }

    await runTransaction(ref(db, `users/${params.uid}/premiumUntil`), (current: number | null) => {
      const now = Date.now()
      const currentValue = Number(current || 0)
      const base = currentValue > now ? currentValue : now
      return base + hours * 60 * 60 * 1000
    })

    await update(ref(db, `premiumGrants/${params.uid}/${Date.now()}`), {
      hours,
      grantedBy: params.grantedBy,
      createdAt: Date.now(),
    })
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function listUsers() {
  try {
    const { db } = ensureFirebase()
    const snap = await get(ref(db, 'users'))
    const users: UserProfile[] = []
    if (!snap.exists()) return users

    const data = snap.val() as Record<string, unknown>
    Object.entries(data).forEach(([uid, value]) => {
      users.push(mapProfileData(uid, value))
    })

    return users.sort((a, b) => a.login.localeCompare(b.login))
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function listPromoCodes() {
  try {
    const { db } = ensureFirebase()
    const snap = await get(ref(db, 'promoCodes'))
    const promoCodes: PromoCodeRecord[] = []
    if (!snap.exists()) return promoCodes

    const data = snap.val() as Record<string, PromoCodeRecord>
    Object.values(data).forEach((value) => promoCodes.push(value))

    return promoCodes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export async function listPromoActivations(codeFilter?: string) {
  try {
    const { db } = ensureFirebase()
    const [redemptionsSnap, usersSnap] = await Promise.all([
      get(ref(db, 'promoRedemptions')),
      get(ref(db, 'users')),
    ])

    if (!redemptionsSnap.exists()) return [] as PromoActivation[]

    const users = usersSnap.exists() ? (usersSnap.val() as Record<string, Record<string, unknown>>) : {}
    const redemptions = redemptionsSnap.val() as Record<string, Record<string, number>>
    const filter = (codeFilter || '').trim().toUpperCase()

    const activations: PromoActivation[] = []

    Object.entries(redemptions).forEach(([uid, codes]) => {
      Object.entries(codes || {}).forEach(([code, ts]) => {
        if (filter && code !== filter) return
        const userData = users[uid] || {}
        activations.push({
          code,
          uid,
          login: String(userData.login || ''),
          email: String(userData.email || ''),
          activatedAt: Number(ts || 0),
        })
      })
    })

    return activations.sort((a, b) => b.activatedAt - a.activatedAt)
  } catch (error) {
    throw mapFirebaseError(error)
  }
}

export function userDisplayName(userProfile: UserProfile | null, user: User | null): string {
  if (userProfile?.login) return userProfile.login
  if (user?.email) return user.email
  return 'Vizitator'
}

export { FIREBASE_SETUP_ERROR }
