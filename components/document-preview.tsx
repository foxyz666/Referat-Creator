'use client'

import { useState } from 'react'
import { DocumentSection, DocumentSettings } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DocumentPreviewProps {
  sections: DocumentSection[]
  settings: DocumentSettings
  onExpandSelection?: (sectionId: string, selectedText: string) => Promise<void> | void
  isExpandingSelection?: boolean
}

export function DocumentPreview({
  sections,
  settings,
  onExpandSelection,
  isExpandingSelection = false,
}: DocumentPreviewProps) {
  const [selectedSnippet, setSelectedSnippet] = useState<{ sectionId: string; text: string } | null>(null)

  const pageStyle = {
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}pt`,
    lineHeight: settings.lineSpacing,
    letterSpacing: `${settings.letterSpacing}px`,
    wordSpacing: `${settings.wordSpacing}px`
  }

  const renderTitlePage = () => {
    const tp = settings.titlePage
    return (
      <div className="a4-page flex flex-col justify-between text-center py-8" style={pageStyle}>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase">{tp.ministry}</p>
          <p className="text-lg font-bold uppercase">{tp.academy}</p>
          <p className="text-base">{tp.faculty}</p>
          <p className="text-sm text-muted-foreground">{tp.department}</p>
        </div>
        
        <div className="space-y-4 my-auto">
          <p className="text-sm uppercase tracking-wider">Referat</p>
          <p className="text-xl font-bold px-8">{tp.topic || settings.topic}</p>
          <p className="text-sm text-muted-foreground">la disciplina: {settings.discipline}</p>
        </div>
        
        <div className="text-right pr-16 space-y-1">
          <p className="text-sm">A elaborat: {tp.author}</p>
          <p className="text-sm">Conducător științific: {tp.supervisor}</p>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm">{tp.city} {tp.year}</p>
        </div>
      </div>
    )
  }

  const renderContentsPage = () => {
    const contentSections = sections.filter(s => s.type !== 'title' && s.type !== 'contents')
    return (
      <div className="a4-page" style={pageStyle}>
        <h2 className="text-center font-bold text-lg mb-8 uppercase">Cuprins</h2>
        <div className="space-y-2">
          {contentSections.map((section, idx) => (
            <div key={section.id} className="flex justify-between items-end">
              <span className="flex-1">
                {section.type === 'introduction' ? 'Introducere' : 
                 section.type === 'conclusion' ? 'Concluzii și recomandări' :
                 section.type === 'bibliography' ? 'Bibliografie' :
                 section.title}
              </span>
              <span className="border-b border-dotted border-muted-foreground flex-grow mx-2" />
              <span>{section.pageNumber || idx + 2}</span>
            </div>
          ))}
        </div>
        {settings.showPageNumbers && (
          <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
            1
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: DocumentSection, pageNum: number) => {
    const getTitle = () => {
      switch (section.type) {
        case 'introduction': return 'Introducere'
        case 'conclusion': return 'Concluzii și recomandări'
        case 'bibliography': return 'Bibliografie'
        default: return section.title
      }
    }

    return (
      <div key={section.id} className="a4-page relative" style={pageStyle}>
        <h2 className={cn(
          "font-bold mb-4",
          section.type === 'introduction' || section.type === 'conclusion' ? 'text-lg uppercase text-center' : 'text-base text-center'
        )}>
          {getTitle()}
        </h2>
        <div>
          {section.content.split('\n\n').filter((paragraph) => paragraph.trim()).map((paragraph, idx) => (
            <p
              key={`${section.id}-${idx}`}
              data-section-id={section.id}
              className={cn(
                'whitespace-pre-wrap text-justify indent-8',
                settings.showParagraphSpacing ? 'mb-4' : 'mb-0'
              )}
            >
              {paragraph.trim()}
            </p>
          ))}
        </div>
        {settings.showPageNumbers && (
          <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
            {pageNum}
          </div>
        )}
      </div>
    )
  }

  let pageCounter = 2

  const handlePreviewMouseUp = () => {
    if (typeof window === 'undefined') return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelectedSnippet(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setSelectedSnippet(null)
      return
    }

    const range = selection.getRangeAt(0)
    const sourceNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element)

    const paragraphElement = sourceNode?.closest('[data-section-id]') as HTMLElement | null
    const sectionId = paragraphElement?.dataset.sectionId

    if (!sectionId) {
      setSelectedSnippet(null)
      return
    }

    setSelectedSnippet({ sectionId, text })
  }

  const handleExpandClick = async () => {
    if (!selectedSnippet || !onExpandSelection) return
    await onExpandSelection(selectedSnippet.sectionId, selectedSnippet.text)
    setSelectedSnippet(null)
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-8" onMouseUp={handlePreviewMouseUp}>
      {renderTitlePage()}
      {renderContentsPage()}
      {sections
        .filter(s => s.type !== 'title' && s.type !== 'contents')
        .map((section) => {
          const page = renderSection(section, pageCounter)
          pageCounter++
          return page
        })}

      {selectedSnippet && onExpandSelection && (
        <div className="sticky bottom-4 z-20 w-full max-w-3xl rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <p className="mb-2 text-xs text-muted-foreground">
            Text selectat: "{selectedSnippet.text.slice(0, 140)}{selectedSnippet.text.length > 140 ? '...' : ''}"
          </p>
          <Button size="sm" onClick={handleExpandClick} disabled={isExpandingSelection}>
            {isExpandingSelection ? 'Se extinde cu AI...' : 'Extinde selectie cu AI'}
          </Button>
        </div>
      )}
    </div>
  )
}
