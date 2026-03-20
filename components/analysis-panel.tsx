'use client'

import { AnalysisResult, HighlightedText } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { AlertTriangle, Bot, CheckCircle, Copy, RefreshCw } from 'lucide-react'

interface AnalysisPanelProps {
  analysis: AnalysisResult | null
  isAnalyzing: boolean
  selectedHighlight: HighlightedText | null
  highlightType: 'ai' | 'plagiarism' | null
  onHighlightTypeChange: (type: 'ai' | 'plagiarism' | null) => void
  onRewrite: (highlight: HighlightedText) => void
  isRewriting: boolean
}

export function AnalysisPanel({
  analysis,
  isAnalyzing,
  selectedHighlight,
  highlightType,
  onHighlightTypeChange,
  onRewrite,
  isRewriting
}: AnalysisPanelProps) {
  if (isAnalyzing) {
    return (
      <div className="p-4 bg-card rounded-lg border border-border space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Analiză Document
        </h3>
        <div className="flex items-center gap-3">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">Se analizează documentul...</span>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-4 bg-card rounded-lg border border-border">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
          Analiză Document
        </h3>
        <p className="text-sm text-muted-foreground">
          Generează un referat pentru a vedea analiza AI și plagiat.
        </p>
      </div>
    )
  }

  const getStatusColor = (percentage: number) => {
    if (percentage < 20) return 'text-green-600'
    if (percentage < 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 20) return 'bg-green-500'
    if (percentage < 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-4 bg-card rounded-lg border border-border space-y-6">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Analiză Document
      </h3>

      <div className="space-y-4">
        <button
          onClick={() => onHighlightTypeChange(highlightType === 'ai' ? null : 'ai')}
          className={cn(
            "w-full p-3 rounded-lg border transition-colors text-left",
            highlightType === 'ai' ? 'border-amber-500 bg-amber-50' : 'border-border hover:border-amber-300'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">Conținut AI</span>
            </div>
            <span className={cn("font-bold", getStatusColor(analysis.aiPercentage))}>
              {analysis.aiPercentage}%
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all", getProgressColor(analysis.aiPercentage))}
              style={{ width: `${analysis.aiPercentage}%` }}
            />
          </div>
          {analysis.aiHighlights.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                {analysis.aiHighlights.length} secțiuni detectate:
              </p>
              {highlightType === 'ai' && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {analysis.aiHighlights.map((h, idx) => (
                    <p 
                      key={idx} 
                      className="text-xs bg-amber-100 p-1 rounded cursor-pointer hover:bg-amber-200 truncate"
                      title={h.text}
                    >
                      {idx + 1}. &quot;{h.text.slice(0, 50)}...&quot;
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </button>

        <button
          onClick={() => onHighlightTypeChange(highlightType === 'plagiarism' ? null : 'plagiarism')}
          className={cn(
            "w-full p-3 rounded-lg border transition-colors text-left",
            highlightType === 'plagiarism' ? 'border-red-500 bg-red-50' : 'border-border hover:border-red-300'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-red-600" />
              <span className="font-medium text-sm">Plagiat Potențial</span>
            </div>
            <span className={cn("font-bold", getStatusColor(analysis.plagiarismPercentage))}>
              {analysis.plagiarismPercentage}%
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all", getProgressColor(analysis.plagiarismPercentage))}
              style={{ width: `${analysis.plagiarismPercentage}%` }}
            />
          </div>
          {analysis.plagiarismHighlights.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {analysis.plagiarismHighlights.length} secțiuni detectate - click pentru a vedea
            </p>
          )}
        </button>
      </div>

      {selectedHighlight && (
        <div className="p-3 bg-muted rounded-lg space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Text selectat:</p>
              <p className="text-sm text-muted-foreground italic">
                &quot;{selectedHighlight.text.slice(0, 100)}...&quot;
              </p>
            </div>
          </div>
          
          {selectedHighlight.suggestion && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Sugestie:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedHighlight.suggestion.slice(0, 150)}...
                </p>
              </div>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => onRewrite(selectedHighlight)}
            disabled={isRewriting}
            className="w-full"
          >
            {isRewriting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Se rescrie...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rescrie Automat
              </>
            )}
          </Button>
        </div>
      )}

      {analysis.aiPercentage < 20 && analysis.plagiarismPercentage < 20 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Document verificat - calitate bună!</span>
        </div>
      )}
    </div>
  )
}
