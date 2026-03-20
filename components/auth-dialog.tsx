'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  FIREBASE_SETUP_ERROR,
  loginWithEmailOrLogin,
  previewPromoCode,
  type PromoPreview,
  registerWithEmailLoginPassword,
} from '@/lib/auth-service'
import { isFirebaseConfigured } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerLogin, setRegisterLogin] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [usePromo, setUsePromo] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoInfo, setPromoInfo] = useState<PromoPreview | null>(null)
  const [promoChecking, setPromoChecking] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const showSetupWarning = !isFirebaseConfigured
  const showError = error && error !== FIREBASE_SETUP_ERROR

  const canLogin = useMemo(
    () => loginIdentifier.trim().length > 0 && loginPassword.length >= 6,
    [loginIdentifier, loginPassword]
  )

  const canRegister = useMemo(
    () =>
      registerLogin.trim().length >= 3 &&
      registerEmail.includes('@') &&
      registerPassword.length >= 6 &&
      (!usePromo || Boolean(promoInfo)),
    [registerLogin, registerEmail, registerPassword, usePromo, promoInfo]
  )

  const clearState = () => {
    setError('')
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!canLogin) return

    clearState()
    setLoading(true)
    try {
      await loginWithEmailOrLogin(loginIdentifier, loginPassword)
      onOpenChange(false)
      setLoginPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentificare eșuată.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!canRegister) return

    clearState()
    setLoading(true)
    try {
      await registerWithEmailLoginPassword({
        login: registerLogin,
        email: registerEmail,
        password: registerPassword,
        promoCode: usePromo ? promoCode.trim().toUpperCase() : undefined,
      })
      onOpenChange(false)
      setRegisterPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Înregistrare eșuată.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return

    setError('')
    setPromoChecking(true)

    try {
      const preview = await previewPromoCode(promoCode)
      setPromoInfo(preview)
    } catch (err) {
      setPromoInfo(null)
      setError(err instanceof Error ? err.message : 'Promo cod invalid.')
    } finally {
      setPromoChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cont utilizator</DialogTitle>
          <DialogDescription>
            Înregistrează-te sau conectează-te pentru acces premium la generarea referatelor.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Logare</TabsTrigger>
            <TabsTrigger value="register">Registrare</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-identifier">Email sau login</Label>
              <Input
                id="login-identifier"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="exemplu@email.com sau login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Parolă</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleLogin} disabled={!canLogin || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se autentifică...
                </>
              ) : (
                'Logare'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label htmlFor="register-login">Login</Label>
              <Input
                id="register-login"
                value={registerLogin}
                onChange={(e) => setRegisterLogin(e.target.value)}
                placeholder="nume_utilizator"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="email@exemplu.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Parolă</Label>
              <Input
                id="register-password"
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="register-use-promo"
                checked={usePromo}
                onCheckedChange={(checked) => {
                  const enabled = Boolean(checked)
                  setUsePromo(enabled)
                  if (!enabled) {
                    setPromoCode('')
                    setPromoInfo(null)
                  }
                }}
              />
              <Label htmlFor="register-use-promo">Am promo cod</Label>
            </div>

            {usePromo && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <Label htmlFor="register-promo">Promo cod</Label>
                <div className="flex gap-2">
                  <Input
                    id="register-promo"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase())
                      setPromoInfo(null)
                    }}
                    placeholder="OWNER-1X"
                  />
                  <Button type="button" variant="outline" onClick={handleApplyPromo} disabled={promoChecking || !promoCode.trim()}>
                    {promoChecking ? 'Verific...' : 'Apply Promo'}
                  </Button>
                </div>
                {promoInfo && (
                  <p className="text-sm text-green-700">
                    Promo valid: {promoInfo.grantType === 'admin' ? 'oferă rol ADMIN' : `oferă ${promoInfo.premiumHours} ore premium`}.
                  </p>
                )}
              </div>
            )}
            <Button onClick={handleRegister} disabled={!canRegister || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se creează contul...
                </>
              ) : (
                'Registrare'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {showSetupWarning && (
          <p className="text-sm text-amber-600">
            Firebase nu este configurat. Completează variabilele NEXT_PUBLIC_FIREBASE_* în .env.local.
          </p>
        )}

        {showError ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
