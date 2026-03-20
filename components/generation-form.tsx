'use client'

import { useState } from 'react'
import { DISCIPLINES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Loader2, Sparkles } from 'lucide-react'

interface GenerationFormProps {
  topic: string
  discipline: string
  canGenerate: boolean
  generationProgress: number
  generationElapsedSeconds: number
  generationError?: string
  onTopicChange: (topic: string) => void
  onDisciplineChange: (discipline: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function GenerationForm({
  topic,
  discipline,
  canGenerate,
  generationProgress,
  generationElapsedSeconds,
  generationError,
  onTopicChange,
  onDisciplineChange,
  onGenerate,
  isGenerating
}: GenerationFormProps) {
  const CUSTOM_DISCIPLINE_VALUE = '__custom__'
  const isCustomDiscipline = Boolean(discipline) && !DISCIPLINES.includes(discipline)
  const selectValue = isCustomDiscipline ? CUSTOM_DISCIPLINE_VALUE : discipline
  const [showCustomDisciplineInput, setShowCustomDisciplineInput] = useState(isCustomDiscipline)
  const displaySelectValue = showCustomDisciplineInput ? CUSTOM_DISCIPLINE_VALUE : selectValue

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="sr-only">Generator de Referate</h1>
        <p className="sr-only">Completeaza campurile pentru generare</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic" className="sr-only">Tema referatului</Label>
          <Textarea
            id="topic"
            placeholder="Exemplu: Drepturile fundamentale ale omului in contextul european"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discipline" className="sr-only">Disciplina</Label>
          <Select
            value={displaySelectValue}
            onValueChange={(value) => {
              if (value === CUSTOM_DISCIPLINE_VALUE) {
                setShowCustomDisciplineInput(true)
                onDisciplineChange('')
                return
              }
              setShowCustomDisciplineInput(false)
              onDisciplineChange(value)
            }}
          >
            <SelectTrigger id="discipline">
              <SelectValue placeholder="Exemplu: Drept constitutional" />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_DISCIPLINE_VALUE}>Alta (Scrie singur)</SelectItem>
            </SelectContent>
          </Select>

          {(showCustomDisciplineInput || isCustomDiscipline) && (
            <Input
              value={discipline}
              onChange={(e) => onDisciplineChange(e.target.value)}
              placeholder="Exemplu: Drept constitutional"
            />
          )}
        </div>

        <Button
          onClick={onGenerate}
          disabled={!topic.trim() || !discipline || isGenerating || !canGenerate}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Se creeaza referatul...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Creaza referat
            </>
          )}
        </Button>

        {isGenerating && (
          <p className="text-xs text-muted-foreground">
            Progres: {generationProgress}% • Timp: {generationElapsedSeconds}s
          </p>
        )}

        {generationError && !isGenerating && (
          <p className="text-xs text-destructive">{generationError}</p>
        )}

        {!canGenerate && (
          <p className="text-xs text-amber-600">
            Generarea referatelor este disponibilă doar pentru premium. Pentru acces: Telegram @Foxyz666
          </p>
        )}
      </div>
    </div>
  )
}
