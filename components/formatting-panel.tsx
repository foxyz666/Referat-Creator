'use client'

import { DocumentSettings, FONT_OPTIONS } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FormattingPanelProps {
  settings: DocumentSettings
  onChange: (settings: DocumentSettings) => void
}

export function FormattingPanel({ settings, onChange }: FormattingPanelProps) {
  const updateSetting = <K extends keyof DocumentSettings>(
    key: K,
    value: DocumentSettings[K]
  ) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6 p-4 bg-card rounded-lg border border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Formatare Document
      </h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="font">Font</Label>
          <Select
            value={settings.fontFamily}
            onValueChange={(value) => updateSetting('fontFamily', value)}
          >
            <SelectTrigger id="font">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Dimensiune Font: {settings.fontSize}pt</Label>
          <Slider
            value={[settings.fontSize]}
            onValueChange={([value]) => updateSetting('fontSize', value)}
            min={10}
            max={18}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label>Spațiere Linii: {settings.lineSpacing}</Label>
          <Slider
            value={[settings.lineSpacing]}
            onValueChange={([value]) => updateSetting('lineSpacing', value)}
            min={1}
            max={2.5}
            step={0.1}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="paragraphSpacing">Spațiu între alineate</Label>
          <Switch
            id="paragraphSpacing"
            checked={settings.showParagraphSpacing}
            onCheckedChange={(checked) => updateSetting('showParagraphSpacing', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Spațiere Litere: {settings.letterSpacing}px</Label>
          <Slider
            value={[settings.letterSpacing]}
            onValueChange={([value]) => updateSetting('letterSpacing', value)}
            min={-1}
            max={3}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <Label>Spațiere Cuvinte: {settings.wordSpacing}px</Label>
          <Slider
            value={[settings.wordSpacing]}
            onValueChange={([value]) => updateSetting('wordSpacing', value)}
            min={0}
            max={10}
            step={0.5}
          />
        </div>

        <div className="space-y-2">
          <Label>Număr Pagini (fără titlu): {settings.pageCount}</Label>
          <Slider
            value={[settings.pageCount]}
            onValueChange={([value]) => updateSetting('pageCount', value)}
            min={8}
            max={20}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label>Număr surse în bibliografie: {settings.bibliographySourceCount}</Label>
          <Slider
            value={[settings.bibliographySourceCount]}
            onValueChange={([value]) => updateSetting('bibliographySourceCount', value)}
            min={3}
            max={20}
            step={1}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="extendedContent">Text extins (mai detaliat)</Label>
          <Switch
            id="extendedContent"
            checked={settings.extendedContent}
            onCheckedChange={(checked) => updateSetting('extendedContent', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="pageNumbers">Numerotare Pagini</Label>
          <Switch
            id="pageNumbers"
            checked={settings.showPageNumbers}
            onCheckedChange={(checked) => updateSetting('showPageNumbers', checked)}
          />
        </div>
      </div>
    </div>
  )
}
