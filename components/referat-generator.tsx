'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { DocumentSettings, DocumentSection, DEFAULT_SETTINGS } from '@/lib/types'
import { loadAdminAiSettings, type AiProvider } from '@/lib/admin-ai-config'
import { exportToWord } from '@/lib/export-docx'
import {
  formatRemainingTime,
  getPremiumDaysLeft,
  getPremiumRemainingMs,
  userDisplayName,
  saveReferat,
} from '@/lib/auth-service'
import { DocumentPreview } from '@/components/document-preview'
import { AuthDialog } from '@/components/auth-dialog'
import { useAuth } from '@/components/auth-provider'
import { FormattingPanel } from '@/components/formatting-panel'
import { TitlePageEditor } from '@/components/title-page-editor'
import { GenerationForm } from '@/components/generation-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Download, LogIn, LogOut, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReferatGenerator() {
  const { user, userProfile, loading, isAuthenticated, isPremium, isAdmin, logout } = useAuth()
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS)
  const [sections, setSections] = useState<DocumentSection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0)
  const [generationError, setGenerationError] = useState('')
  const [isExpandingSelection, setIsExpandingSelection] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [streamedContent, setStreamedContent] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())
  const [selectedAiProvider, setSelectedAiProvider] = useState<AiProvider>('auto')

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    const saved = loadAdminAiSettings()
    setSelectedAiProvider(saved.selectedProvider || 'auto')
  }, [isAdmin])

  const canGenerate = !loading && isAuthenticated && (isPremium || isAdmin)
  const premiumDaysLeft = getPremiumDaysLeft(userProfile)
  const displayName = userDisplayName(userProfile, user)
  const premiumTimeLeftLabel = formatRemainingTime(getPremiumRemainingMs(userProfile) - (Date.now() - nowTick))

  const userNameClass = cn(
    'font-semibold',
    isAdmin ? 'admin-glow' : isPremium ? 'premium-glow' : ''
  )

  const normalizeChapterTitle = (title: string) => {
    return title
      .replace(/^\s*capitol(?:ul)?\s*\d+[\s.:\-–—]+/i, '')
      .replace(/^\s*\d+(?:\.\d+)*[\s.:\-–—]+/, '')
      .trim()
  }

  const handleGenerate = useCallback(async () => {
    if (!settings.topic.trim() || !settings.discipline || !canGenerate) return

    setIsGenerating(true)
    setGenerationError('')
    setGenerationProgress(0)
    setGenerationElapsedSeconds(0)
    setSections([])
    setStreamedContent('')

    const timer = setInterval(() => {
      setGenerationElapsedSeconds((prev) => prev + 1)
      setGenerationProgress((prev) => {
        if (prev >= 90) return prev
        return Math.min(90, prev + 7)
      })
    }, 1000)

    try {
      const adminAiSettings = isAdmin ? loadAdminAiSettings() : null
      const selectedProviderConfig =
        selectedAiProvider !== 'auto' && adminAiSettings
          ? adminAiSettings.configs[selectedAiProvider]
          : undefined

      if (isAdmin && selectedAiProvider !== 'auto' && !selectedProviderConfig?.apiKey?.trim()) {
        throw new Error('Providerul selectat nu are cheie API salvata in Admin Panel.')
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: settings.topic,
          discipline: settings.discipline,
          pageCount: settings.pageCount,
          bibliographySourceCount: settings.bibliographySourceCount,
          extendedContent: settings.extendedContent,
          aiProvider: isAdmin ? selectedAiProvider : 'auto',
          aiModel: selectedProviderConfig?.model || '',
          aiApiKey: selectedProviderConfig?.apiKey || '',
        })
      })

      if (!response.ok) {
        let message = 'Generation failed'
        try {
          const errorPayload = await response.json()
          message = String(errorPayload?.error || message)
        } catch {
          // ignore parse errors
        }
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += decoder.decode(value, { stream: true })
          setStreamedContent(fullContent)
          setGenerationProgress((prev) => Math.min(95, prev + 2))
        }
      }

      setGenerationProgress(97)

      // Parse the generated content
      try {
        const parsed = JSON.parse(fullContent)
        const newSections: DocumentSection[] = []

        // Introduction
        if (parsed.introduction) {
          newSections.push({
            id: 'intro',
            type: 'introduction',
            title: 'Introducere',
            content: parsed.introduction.content,
            pageNumber: 2
          })
        }

        // Chapters
        if (parsed.chapters) {
          parsed.chapters.forEach((chapter: { title: string; content: string; subchapters?: { title: string; content: string }[] | null }, idx: number) => {
            let chapterContent = chapter.content
            if (chapter.subchapters) {
              chapter.subchapters.forEach((sub: { title: string; content: string }) => {
                chapterContent += `\n\n${sub.title}\n${sub.content}`
              })
            }
            newSections.push({
              id: `chapter-${idx}`,
              type: 'content',
              title: normalizeChapterTitle(chapter.title),
              content: chapterContent,
              pageNumber: 3 + idx
            })
          })
        }

        // Conclusion
        if (parsed.conclusion) {
          newSections.push({
            id: 'conclusion',
            type: 'conclusion',
            title: 'Concluzii și recomandări',
            content: parsed.conclusion.content,
            pageNumber: newSections.length + 2
          })
        }

        // Bibliography
        if (parsed.bibliography) {
          const bibContent = parsed.bibliography
            .map((entry: { author: string; title: string; source: string; year: string; url: string; accessedAt?: string }, idx: number) => 
              `${idx + 1}. ${entry.author}. "${entry.title}". ${entry.source}, ${entry.year}. URL: ${entry.url}${entry.accessedAt ? ` (accesat: ${entry.accessedAt})` : ''}`
            )
            .join('\n\n')
          
          newSections.push({
            id: 'bibliography',
            type: 'bibliography',
            title: 'Bibliografie',
            content: bibContent,
            pageNumber: newSections.length + 2
          })
        }

        setSections(newSections)
        setGenerationProgress(100)
        
        // Save referat to Firebase
        if (user && (isPremium || isAdmin)) {
          try {
            await saveReferat(user.uid, {
              topic: settings.topic,
              discipline: settings.discipline,
              pageCount: settings.pageCount,
              settings: settings,
              sections: newSections,
            })
          } catch {
            // Silent fail on save
          }
        }
      } catch {
        // Failed to parse generated content
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare la generare.'
      setGenerationError(message)
    } finally {
      clearInterval(timer)
      setIsGenerating(false)
      setTimeout(() => {
        setGenerationProgress(0)
        setGenerationElapsedSeconds(0)
      }, 1000)
    }
  }, [settings, canGenerate])

  const handleLogout = async () => {
    await logout()
  }



  const handleDownload = async () => {
    try {
      await exportToWord(sections, settings)
    } catch (error) {
      // Fallback to text download if Word export fails
      let content = `${settings.titlePage.topic || settings.topic}\n\n`
      sections.forEach(section => {
        content += `${section.title}\n\n${section.content}\n\n`
      })
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `referat-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleExpandSelection = async (sectionId: string, selectedText: string) => {
    if (!selectedText.trim()) return

    setIsExpandingSelection(true)
    try {
      const targetSection = sections.find((section) => section.id === sectionId)
      if (!targetSection) {
        throw new Error('Nu am gasit sectiunea selectata.')
      }

      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          sectionContent: targetSection.content,
          topic: settings.topic,
          discipline: settings.discipline,
          mode: 'expand',
        }),
      })

      const payload = (await response.json()) as { rewrittenText?: string; error?: string }
      if (!response.ok || !payload.rewrittenText) {
        throw new Error(payload.error || 'Nu am putut extinde textul selectat.')
      }

      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== sectionId) return section

          const replacement = section.content.replace(selectedText, payload.rewrittenText as string)
          if (replacement === section.content) {
            return {
              ...section,
              content: `${section.content}\n\n${payload.rewrittenText}`,
            }
          }

          return {
            ...section,
            content: replacement,
          }
        })
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare la extinderea textului selectat.'
      setGenerationError(message)
    } finally {
      setIsExpandingSelection(false)
    }
  }

  return (
    <div className="min-h-screen bg-background md:flex md:h-[100dvh]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "border-border bg-card flex flex-col border-b md:border-b-0 md:border-r md:transition-all md:duration-300 md:min-h-0",
          "w-full md:w-auto",
          sidebarOpen ? "md:w-[30rem]" : "md:w-0 md:overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Setări Referat</h2>
        </div>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pb-10 space-y-6">
            <GenerationForm
              topic={settings.topic}
              discipline={settings.discipline}
              canGenerate={canGenerate}
              generationProgress={generationProgress}
              generationElapsedSeconds={generationElapsedSeconds}
              generationError={generationError}
              isAdmin={isAdmin}
              aiProvider={selectedAiProvider}
              onTopicChange={(topic) => setSettings(s => ({ ...s, topic, titlePage: { ...s.titlePage, topic } }))}
              onDisciplineChange={(discipline) => setSettings(s => ({ ...s, discipline }))}
              onAiProviderChange={setSelectedAiProvider}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />

            <Tabs defaultValue="format" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="format">Formatare</TabsTrigger>
                <TabsTrigger value="title">Titlu</TabsTrigger>
              </TabsList>
              <TabsContent value="format" className="mt-4">
                <FormattingPanel settings={settings} onChange={setSettings} />
              </TabsContent>
              <TabsContent value="title" className="mt-4">
                <TitlePageEditor 
                  settings={settings.titlePage} 
                  onChange={(titlePage) => setSettings(s => ({ ...s, titlePage }))}
                />
              </TabsContent>
            </Tabs>

          </div>
        </ScrollArea>
      </aside>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-lg border border-border bg-card p-1.5 transition-colors hover:bg-muted md:block"
        style={{ left: sidebarOpen ? '480px' : '0' }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 md:min-h-0">
        {/* Toolbar */}
        <header className="min-h-14 border-b border-border bg-card px-4 py-2 md:h-14 md:py-0">
          <div className="flex flex-wrap items-center justify-between gap-2 md:h-full">
            <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground">
              {sections.length > 0 
                ? `${sections.length + 2} pagini generate`
                : 'Niciun document generat'}
            </span>
            {!canGenerate && (
              <Badge variant="outline" className="text-amber-700 border-amber-500/50">
                Premium necesar pentru generare
              </Badge>
            )}
            </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className={userNameClass}>{displayName}</span>
                <Badge variant="secondary">
                  {isAdmin
                    ? 'Admin'
                    : isPremium
                      ? `Premium ${premiumDaysLeft} zile (${premiumTimeLeftLabel})`
                      : 'Fără premium'}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">
                    <UserRound className="h-4 w-4 mr-2" />
                    Profil
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin">Admin Panel</Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Delogare
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
                <LogIn className="h-4 w-4 mr-2" />
                Logare / Registrare
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={sections.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Descarcă
            </Button>
          </div>
          </div>
        </header>

        {/* Document Preview Area */}
        <ScrollArea className="flex-1 min-h-0 bg-muted/50">
          <div className="p-8 pb-12">
            {!canGenerate && (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-amber-900">
                Pentru a cumpăra acces la crearea referatelor adresați-vă pe Telegram la @Foxyz666
              </div>
            )}
            {sections.length > 0 ? (
              <DocumentPreview
                sections={sections}
                settings={settings}
                onExpandSelection={handleExpandSelection}
                isExpandingSelection={isExpandingSelection}
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="w-48 h-64 bg-card rounded-lg shadow-lg border border-border mx-auto" />
                  <p className="text-muted-foreground">Se generează referatul...</p>
                  {streamedContent && (
                    <p className="text-xs text-muted-foreground max-w-md truncate">
                      {streamedContent.slice(0, 100)}...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-48 h-64 bg-card rounded-lg shadow-lg border border-border flex items-center justify-center mb-4">
                  <span className="text-4xl text-muted-foreground/30">A4</span>
                </div>
                <p className="text-muted-foreground">
                  Completează tema și disciplina pentru a genera un referat
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}
