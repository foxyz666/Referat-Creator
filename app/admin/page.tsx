'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  createPromoCode,
  deactivatePromoCode,
  extendPromoCodeUses,
  formatRemainingTime,
  grantPremiumHours,
  getPremiumRemainingMs,
  isPremiumActive,
  listPromoActivations,
  listPromoCodes,
  listUsers,
  type PromoActivation,
  type PromoCodeRecord,
  type UserProfile,
} from '@/lib/auth-service'
import {
  DEFAULT_AI_MODELS,
  loadAdminAiSettings,
  saveAdminAiSettings,
  type AiProvider,
  type AdminAiSettings,
} from '@/lib/admin-ai-config'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('ro-RO')
}

const premiumHoursLeft = (premiumUntil: number) => {
  const diff = premiumUntil - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (60 * 60 * 1000))
}

export default function AdminPage() {
  const { user, userProfile, loading, isAuthenticated, isAdmin } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([])
  const [promoActivations, setPromoActivations] = useState<PromoActivation[]>([])

  const [promoCode, setPromoCode] = useState('')
  const [promoType, setPromoType] = useState<'premium' | 'admin'>('premium')
  const [promoHours, setPromoHours] = useState('24')
  const [managePromoCode, setManagePromoCode] = useState('')
  const [extendUsesBy, setExtendUsesBy] = useState('1')
  const [activationFilterCode, setActivationFilterCode] = useState('')

  const [targetUid, setTargetUid] = useState('')
  const [grantAmount, setGrantAmount] = useState('24')
  const [grantUnit, setGrantUnit] = useState<'hours' | 'days' | 'minutes'>('hours')
  const [showUsersList, setShowUsersList] = useState(true)

  const [aiSettings, setAiSettings] = useState<AdminAiSettings | null>(null)
  const [aiEditorProvider, setAiEditorProvider] = useState<Exclude<AiProvider, 'auto'>>('claude')
  const [aiEditorModel, setAiEditorModel] = useState(DEFAULT_AI_MODELS.claude)
  const [aiEditorKey, setAiEditorKey] = useState('')
  const [aiTestMessage, setAiTestMessage] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const loadData = async () => {
    setError('')
    try {
      const [userList, codeList, activationList] = await Promise.all([
        listUsers(),
        listPromoCodes(),
        listPromoActivations(activationFilterCode),
      ])
      setUsers(userList)
      setPromoCodes(codeList)
      setPromoActivations(activationList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-au putut încărca datele admin.')
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    loadData()
  }, [isAdmin, activationFilterCode])

  useEffect(() => {
    if (!isAdmin) return
    const settings = loadAdminAiSettings()
    setAiSettings(settings)
  }, [isAdmin])

  useEffect(() => {
    if (!aiSettings) return
    const config = aiSettings.configs[aiEditorProvider]
    setAiEditorModel(config?.model || DEFAULT_AI_MODELS[aiEditorProvider])
    setAiEditorKey(config?.apiKey || '')
  }, [aiEditorProvider, aiSettings])

  const canCreatePromo = useMemo(
    () => promoCode.trim().length >= 4 && (promoType === 'admin' || Number(promoHours) > 0),
    [promoCode, promoHours, promoType]
  )

  const canGrantPremium = useMemo(
    () => targetUid.trim().length > 0 && Number(grantAmount) > 0,
    [targetUid, grantAmount]
  )

  const convertToHours = (amount: number) => {
    if (grantUnit === 'days') return amount * 24
    if (grantUnit === 'minutes') return Math.max(1, Math.ceil(amount / 60))
    return amount
  }

  const handleCreatePromo = async () => {
    if (!user || !canCreatePromo) return

    setBusy(true)
    setError('')
    setMessage('')
    try {
      await createPromoCode({
        code: promoCode,
        grantType: promoType,
        premiumHours: promoType === 'premium' ? Number(promoHours) : 0,
        maxUses: 1,
        createdBy: user.uid,
      })
      setMessage('Promo cod creat cu succes.')
      setPromoCode('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut crea codul.')
    } finally {
      setBusy(false)
    }
  }

  const handleGrantPremium = async () => {
    if (!user || !canGrantPremium) return

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const amount = Number(grantAmount)
      await grantPremiumHours({
        uid: targetUid.trim(),
        hours: convertToHours(amount),
        grantedBy: user.uid,
      })
      setMessage('Premium adăugat utilizatorului.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut adăuga premium.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivatePromo = async () => {
    if (!managePromoCode.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await deactivatePromoCode(managePromoCode)
      setMessage('Promo cod dezactivat.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut dezactiva promo codul.')
    } finally {
      setBusy(false)
    }
  }

  const handleExtendPromo = async () => {
    if (!managePromoCode.trim() || Number(extendUsesBy) <= 0) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await extendPromoCodeUses(managePromoCode, Number(extendUsesBy))
      setMessage('Promo cod extins cu utilizări noi.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut extinde promo codul.')
    } finally {
      setBusy(false)
    }
  }

  const handleGrantToUser = async (uid: string) => {
    if (!user || Number(grantAmount) <= 0) return
    setTargetUid(uid)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await grantPremiumHours({
        uid,
        hours: convertToHours(Number(grantAmount)),
        grantedBy: user.uid,
      })
      setMessage(`Premium adăugat utilizatorului ${uid}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut adăuga premium.')
    } finally {
      setBusy(false)
    }
  }

  const persistAiSettings = (next: AdminAiSettings) => {
    setAiSettings(next)
    saveAdminAiSettings(next)
  }

  const handleSaveAiConfig = () => {
    if (!aiSettings) return

    const next: AdminAiSettings = {
      ...aiSettings,
      configs: {
        ...aiSettings.configs,
        [aiEditorProvider]: {
          apiKey: aiEditorKey.trim(),
          model: aiEditorModel.trim() || DEFAULT_AI_MODELS[aiEditorProvider],
        },
      },
      selectedProvider: aiEditorProvider,
      updatedAt: Date.now(),
    }

    persistAiSettings(next)
    setMessage(`Setarile AI pentru ${aiEditorProvider.toUpperCase()} au fost salvate.`)
    setError('')
  }

  const handleSetDefaultProvider = (provider: AiProvider) => {
    if (!aiSettings) return
    const next = { ...aiSettings, selectedProvider: provider, updatedAt: Date.now() }
    persistAiSettings(next)
  }

  const handleTestAiConfig = async () => {
    if (!aiEditorKey.trim()) {
      setAiTestMessage('Introdu cheia API pentru test.')
      return
    }

    setAiBusy(true)
    setAiTestMessage('')
    try {
      const response = await fetch('/api/admin/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiEditorProvider,
          model: aiEditorModel.trim() || DEFAULT_AI_MODELS[aiEditorProvider],
          apiKey: aiEditorKey.trim(),
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Testul AI a esuat.')
      }

      setAiTestMessage(`Conectare reusita (${aiEditorProvider.toUpperCase()}): ${payload.message || 'OK'}`)
    } catch (err) {
      setAiTestMessage(err instanceof Error ? err.message : 'Testul AI a esuat.')
    } finally {
      setAiBusy(false)
    }
  }

  if (loading) {
    return <div className="p-8">Se încarcă...</div>
  }

  if (!isAuthenticated || !userProfile) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p>Trebuie să fii autentificat.</p>
        <Button asChild>
          <Link href="/">Înapoi</Link>
        </Button>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p>Acces interzis. Rolul admin se acordă doar din Firebase.</p>
        <Button asChild>
          <Link href="/">Înapoi</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUsersList((prev) => !prev)}>
            {showUsersList ? 'Ascunde lista utilizatori' : 'Lista persoanelor înregistrate'}
          </Button>
          <Button variant="outline" onClick={loadData}>Refresh</Button>
          <Button asChild variant="outline">
            <Link href="/">Înapoi la generator</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Creează promo cod</CardTitle>
            <CardDescription>
              Promo codurile sunt single-use (expiră după prima activare). Pot oferi premium sau admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="COD-UNIQUE"
            />
            <div className="space-y-2">
              <Label>Tip promo</Label>
              <Select value={promoType} onValueChange={(value) => setPromoType(value as 'premium' | 'admin')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium (ore)</SelectItem>
                  <SelectItem value="admin">Admin (Owner)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {promoType === 'premium' && (
              <Input
                type="number"
                min={1}
                value={promoHours}
                onChange={(e) => setPromoHours(e.target.value)}
                placeholder="Ore premium"
              />
            )}
            <Button onClick={handleCreatePromo} disabled={!canCreatePromo || busy}>
              Creează cod
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adaugă premium la user</CardTitle>
            <CardDescription>Introdu UID-ul utilizatorului și orele de premium.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder="UID utilizator"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="Cantitate"
              />
              <Select value={grantUnit} onValueChange={(value) => setGrantUnit(value as 'hours' | 'days' | 'minutes')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minute</SelectItem>
                  <SelectItem value="hours">Ore</SelectItem>
                  <SelectItem value="days">Zile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGrantPremium} disabled={!canGrantPremium || busy}>
              Adaugă premium
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestionare promo existent</CardTitle>
          <CardDescription>Dezactivează codul sau extinde numărul de activări.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={managePromoCode}
            onChange={(e) => setManagePromoCode(e.target.value.toUpperCase())}
            placeholder="COD EXISTENT"
          />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDeactivatePromo} disabled={!managePromoCode.trim() || busy}>
              Dezactivează promo
            </Button>
            <Input
              type="number"
              min={1}
              value={extendUsesBy}
              onChange={(e) => setExtendUsesBy(e.target.value)}
              placeholder="+ utilizări"
              className="max-w-36"
            />
            <Button onClick={handleExtendPromo} disabled={!managePromoCode.trim() || Number(extendUsesBy) <= 0 || busy}>
              Extinde promo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setari AI pentru generator</CardTitle>
          <CardDescription>
            Disponibil doar pentru admin. Alege providerul, seteaza cheia si modelul, apoi testeaza conexiunea.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Provider configurat</Label>
              <Select
                value={aiEditorProvider}
                onValueChange={(value) => setAiEditorProvider(value as Exclude<AiProvider, 'auto'>)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="g4f">G4F.dev</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={aiEditorModel}
                onChange={(e) => setAiEditorModel(e.target.value)}
                placeholder="Ex: gpt-4o-mini"
              />
            </div>

            <div className="space-y-2">
              <Label>Provider implicit in generator</Label>
              <Select
                value={aiSettings?.selectedProvider || 'auto'}
                onValueChange={(value) => handleSetDefaultProvider(value as AiProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="g4f">G4F.dev</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cheie API</Label>
            <Input
              type="password"
              value={aiEditorKey}
              onChange={(e) => setAiEditorKey(e.target.value)}
              placeholder="Introdu cheia API pentru providerul selectat"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleTestAiConfig} disabled={aiBusy}>
              {aiBusy ? 'Se testeaza...' : 'Test conexiune'}
            </Button>
            <Button onClick={handleSaveAiConfig} disabled={aiBusy}>
              Salveaza setarile AI
            </Button>
          </div>

          {aiTestMessage && <p className="text-sm text-muted-foreground">{aiTestMessage}</p>}
        </CardContent>
      </Card>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {showUsersList && (
        <Card>
          <CardHeader>
            <CardTitle>Utilizatori</CardTitle>
            <CardDescription>Baza de date useri din Firebase Realtime Database.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Login</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Timp rămas</TableHead>
                  <TableHead>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.uid}>
                    <TableCell>{item.login}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell className="max-w-52 truncate" title={item.uid}>{item.uid}</TableCell>
                    <TableCell>{item.isAdmin ? 'Admin' : 'User'}</TableCell>
                    <TableCell>{isPremiumActive(item) ? 'Activ' : 'Expirat'}</TableCell>
                    <TableCell>{item.isAdmin ? 'Nelimitat' : formatRemainingTime(getPremiumRemainingMs(item))}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleGrantToUser(item.uid)} disabled={busy}>
                        Oferă premium
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Promo coduri</CardTitle>
          <CardDescription>Coduri create și statusul lor.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Ore</TableHead>
                <TableHead>Utilizări</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Folosit de</TableHead>
                <TableHead>Folosit la</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map((code) => (
                <TableRow key={code.code}>
                  <TableCell>{code.code}</TableCell>
                  <TableCell>{code.grantType === 'admin' ? 'Admin' : 'Premium'}</TableCell>
                  <TableCell>{code.premiumHours}</TableCell>
                  <TableCell>{code.usedCount}/{code.maxUses}</TableCell>
                  <TableCell>{code.active ? 'Activ' : 'Inactiv'}</TableCell>
                  <TableCell>{code.usedBy || '-'}</TableCell>
                  <TableCell>{formatDateTime(code.usedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Persoane care au activat promo coduri</CardTitle>
          <CardDescription>Vezi exact cine a activat un anumit promo cod.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={activationFilterCode}
              onChange={(e) => setActivationFilterCode(e.target.value.toUpperCase())}
              placeholder="Filtru cod promo (opțional)"
            />
            <Button variant="outline" onClick={loadData}>Caută</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Activat la</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoActivations.map((entry) => (
                <TableRow key={`${entry.code}-${entry.uid}-${entry.activatedAt}`}>
                  <TableCell>{entry.code}</TableCell>
                  <TableCell>{entry.login || '-'}</TableCell>
                  <TableCell>{entry.email || '-'}</TableCell>
                  <TableCell className="max-w-52 truncate" title={entry.uid}>{entry.uid}</TableCell>
                  <TableCell>{formatDateTime(entry.activatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
