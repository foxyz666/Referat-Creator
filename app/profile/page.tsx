'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  formatRemainingTime,
  getPremiumDaysLeft,
  getPremiumRemainingMs,
  redeemPromoCode,
  getSavedReferats,
  getReferat,
  deleteReferat,
  type SavedReferat,
} from '@/lib/auth-service'
import { exportToWord } from '@/lib/export-docx'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Download } from 'lucide-react'

export default function ProfilePage() {
  const { user, userProfile, loading, isAuthenticated, isAdmin, isPremium } = useAuth()
  const [promoCode, setPromoCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())
  const [savedReferats, setSavedReferats] = useState<SavedReferat[]>([])
  const [loadingReferats, setLoadingReferats] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user && isAuthenticated) {
      loadReferats()
    }
  }, [user, isAuthenticated])

  const loadReferats = async () => {
    if (!user) return
    setLoadingReferats(true)
    try {
      const referats = await getSavedReferats(user.uid)
      setSavedReferats(referats)
    } catch {
      // Silent fail
    } finally {
      setLoadingReferats(false)
    }
  }

  const handleDeleteReferat = async (referatId: string) => {
    if (!user || !confirm('Ești sigur că vrei să ștergi referatul?')) return
    
    setDeletingId(referatId)
    try {
      await deleteReferat(user.uid, referatId)
      setSavedReferats(prev => prev.filter(r => r.id !== referatId))
    } catch {
      alert('Eroare la ștergerea referatului.')
    } finally {
      setDeletingId('')
    }
  }

  const handleDownloadReferat = async (referatId: string) => {
    if (!user) return
    
    try {
      const referat = await getReferat(user.uid, referatId)
      if (!referat) {
        alert('Referatul nu a mai putut fi găsit.')
        return
      }

      // Download as DOCX using export function
      await exportToWord(referat.sections, referat.settings)
    } catch {
      alert('Eroare la descărcarea referatului.')
    }
  }


  const premiumDaysLeft = useMemo(() => getPremiumDaysLeft(userProfile), [userProfile])
  const premiumMsLeft = useMemo(
    () => Math.max(0, getPremiumRemainingMs(userProfile) - (Date.now() - nowTick)),
    [userProfile, nowTick]
  )

  const handleRedeem = async () => {
    if (!user || !promoCode.trim()) return

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await redeemPromoCode(user.uid, promoCode)
      setMessage('Promo cod activat cu succes. Premium actualizat.')
      setPromoCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut activa promo codul.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8">Se încarcă profilul...</div>
  }

  if (!isAuthenticated || !userProfile) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Profil utilizator</h1>
        <p>Trebuie să fii autentificat pentru a vedea profilul.</p>
        <Button asChild>
          <Link href="/">Înapoi la pagina principală</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profilul meu</h1>
        <Button asChild variant="outline">
          <Link href="/">Înapoi la generator</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date cont</CardTitle>
          <CardDescription>Informații stocate în baza ta de date Firebase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-semibold">Login:</span> {userProfile.login}</p>
          <p><span className="font-semibold">Email:</span> {userProfile.email || user?.email || '-'}</p>
          <p><span className="font-semibold">Rol:</span> {isAdmin ? 'Admin' : 'User'}</p>
          <p><span className="font-semibold">Premium activ:</span> {isPremium ? 'Da' : 'Nu'}</p>
          <p><span className="font-semibold">Zile premium rămase:</span> {isAdmin ? 'Nelimitat (admin)' : premiumDaysLeft}</p>
          <p><span className="font-semibold">Timp premium rămas:</span> {isAdmin ? 'Nelimitat (admin)' : formatRemainingTime(premiumMsLeft)}</p>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Activează promo cod</CardTitle>
            <CardDescription>Introdu codul promo și primești ore de premium.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="EXEMPLU-COD"
            />
            <Button onClick={handleRedeem} disabled={!promoCode.trim() || isSubmitting}>
              {isSubmitting ? 'Se activează...' : 'Activează codul'}
            </Button>
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Referatele tale</CardTitle>
          <CardDescription>Referatele generate sunt salvate și pot fi descărcate oricând.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReferats ? (
            <p className="text-sm text-muted-foreground">Se încarcă referatele...</p>
          ) : savedReferats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu ai nici un referat generat încă.</p>
          ) : (
            <div className="space-y-3">
              {savedReferats.map((referat) => {
                const createdDate = new Date(referat.createdAt).toLocaleDateString('ro-RO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <div key={referat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{referat.topic}</p>
                      <p className="text-sm text-muted-foreground">{referat.discipline} • {referat.pageCount} pagini • {createdDate}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReferat(referat.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descarcă
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDeleteReferat(referat.id)}
                        disabled={deletingId === referat.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
