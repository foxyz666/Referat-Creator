'use client'

import { TitlePageSettings } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CHISINAU_UNIVERSITIES,
  CITY_OPTIONS,
  MINISTRY_OPTIONS,
  type FacultyOption,
} from '@/lib/chisinau-institutions'

interface TitlePageEditorProps {
  settings: TitlePageSettings
  onChange: (settings: TitlePageSettings) => void
}

export function TitlePageEditor({ settings, onChange }: TitlePageEditorProps) {
  const CUSTOM_VALUE = '__custom__'

  const updateField = <K extends keyof TitlePageSettings>(
    key: K,
    value: TitlePageSettings[K]
  ) => {
    onChange({ ...settings, [key]: value })
  }

  const selectedUniversity = CHISINAU_UNIVERSITIES.find((item) => item.name === settings.academy)
  const facultyOptions = selectedUniversity?.faculties || []
  const selectedFaculty = facultyOptions.find((item) => item.name === settings.faculty)
  const departmentOptions = selectedFaculty?.departments || []

  const isKnownMinistry = MINISTRY_OPTIONS.includes(settings.ministry)
  const isKnownAcademy = CHISINAU_UNIVERSITIES.some((item) => item.name === settings.academy)
  const isKnownFaculty = facultyOptions.some((item) => item.name === settings.faculty)
  const isKnownDepartment = departmentOptions.includes(settings.department)
  const isKnownCity = CITY_OPTIONS.includes(settings.city)

  const handleAcademyChange = (academy: string) => {
    const found = CHISINAU_UNIVERSITIES.find((item) => item.name === academy)
    const firstFaculty = found?.faculties[0]
    const firstDepartment = firstFaculty?.departments[0] || ''

    onChange({
      ...settings,
      academy,
      faculty: firstFaculty?.name || '',
      department: firstDepartment,
      city: 'Chisinau',
    })
  }

  const handleFacultyChange = (facultyName: string) => {
    const found = facultyOptions.find((item: FacultyOption) => item.name === facultyName)
    const firstDepartment = found?.departments[0] || ''

    onChange({
      ...settings,
      faculty: facultyName,
      department: firstDepartment,
    })
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Pagina de Titlu
      </h3>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ministry" className="sr-only">Minister</Label>
          <Select
            value={isKnownMinistry ? settings.ministry : CUSTOM_VALUE}
            onValueChange={(value) => {
              if (value === CUSTOM_VALUE) {
                updateField('ministry', '')
                return
              }
              updateField('ministry', value)
            }}
          >
            <SelectTrigger id="ministry" className="h-9 text-sm">
              <SelectValue placeholder="Exemplu: Ministerul Educatiei si Cercetarii" />
            </SelectTrigger>
            <SelectContent>
              {MINISTRY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>Alta (Scrie singur)</SelectItem>
            </SelectContent>
          </Select>
          {!isKnownMinistry && (
            <Input
              value={settings.ministry}
              onChange={(e) => updateField('ministry', e.target.value)}
              className="h-9 text-sm"
              placeholder="Exemplu: Ministerul Educatiei si Cercetarii"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="academy" className="sr-only">Academia / Universitatea</Label>
          <Select
            value={isKnownAcademy ? settings.academy : CUSTOM_VALUE}
            onValueChange={(value) => {
              if (value === CUSTOM_VALUE) {
                onChange({ ...settings, academy: '', faculty: '', department: '' })
                return
              }
              handleAcademyChange(value)
            }}
          >
            <SelectTrigger id="academy" className="h-9 text-sm">
              <SelectValue placeholder="Exemplu: Universitatea de Stat din Moldova" />
            </SelectTrigger>
            <SelectContent>
              {CHISINAU_UNIVERSITIES.map((option) => (
                <SelectItem key={option.name} value={option.name}>{option.name}</SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>Alta (Scrie singur)</SelectItem>
            </SelectContent>
          </Select>
          {!isKnownAcademy && (
            <Input
              value={settings.academy}
              onChange={(e) => updateField('academy', e.target.value)}
              className="h-9 text-sm"
              placeholder="Exemplu: Universitatea de Stat din Moldova"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="faculty" className="sr-only">Facultatea</Label>
          <Select
            value={isKnownFaculty ? settings.faculty : CUSTOM_VALUE}
            onValueChange={(value) => {
              if (value === CUSTOM_VALUE) {
                onChange({ ...settings, faculty: '', department: '' })
                return
              }
              handleFacultyChange(value)
            }}
            disabled={!isKnownAcademy || facultyOptions.length === 0}
          >
            <SelectTrigger id="faculty" className="h-9 text-sm">
              <SelectValue placeholder="Exemplu: Facultatea de Drept" />
            </SelectTrigger>
            <SelectContent>
              {facultyOptions.map((option) => (
                <SelectItem key={option.name} value={option.name}>{option.name}</SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>Alta (Scrie singur)</SelectItem>
            </SelectContent>
          </Select>
          {!isKnownFaculty && (
            <Input
              value={settings.faculty}
              onChange={(e) => updateField('faculty', e.target.value)}
              className="h-9 text-sm"
              placeholder="Exemplu: Facultatea de Drept"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department" className="sr-only">Catedra</Label>
          <Select
            value={isKnownDepartment ? settings.department : CUSTOM_VALUE}
            onValueChange={(value) => {
              if (value === CUSTOM_VALUE) {
                updateField('department', '')
                return
              }
              updateField('department', value)
            }}
            disabled={!isKnownFaculty || departmentOptions.length === 0}
          >
            <SelectTrigger id="department" className="h-9 text-sm">
              <SelectValue placeholder="Exemplu: Drept public" />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>Alta (Scrie singur)</SelectItem>
            </SelectContent>
          </Select>
          {!isKnownDepartment && (
            <Input
              value={settings.department}
              onChange={(e) => updateField('department', e.target.value)}
              className="h-9 text-sm"
              placeholder="Exemplu: Drept public"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="author" className="sr-only">A elaborat (Numele, Prenumele)</Label>
          <Input
            id="author"
            value={settings.author}
            onChange={(e) => updateField('author', e.target.value)}
            className="h-9 text-sm"
            placeholder="Exemplu: Popescu Ion"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supervisor" className="sr-only">Conducator stiintific</Label>
          <Input
            id="supervisor"
            value={settings.supervisor}
            onChange={(e) => updateField('supervisor', e.target.value)}
            className="h-9 text-sm"
            placeholder="Exemplu: Dr. Ionescu Maria"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="sr-only">Localitate</Label>
            <Select
              value={isKnownCity ? settings.city : CUSTOM_VALUE}
              onValueChange={(value) => {
                if (value === CUSTOM_VALUE) {
                  updateField('city', '')
                  return
                }
                updateField('city', value)
              }}
            >
              <SelectTrigger id="city" className="h-9 text-sm">
                <SelectValue placeholder="Exemplu: Chisinau" />
              </SelectTrigger>
              <SelectContent>
                {CITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
                <SelectItem value={CUSTOM_VALUE}>Alta (Scrie singur)</SelectItem>
              </SelectContent>
            </Select>
            {!isKnownCity && (
              <Input
                value={settings.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="h-9 text-sm"
                placeholder="Exemplu: Chisinau"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year" className="sr-only">Anul</Label>
            <Input
              id="year"
              value={settings.year}
              onChange={(e) => updateField('year', e.target.value)}
              className="h-9 text-sm"
              placeholder="Exemplu: 2026"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
