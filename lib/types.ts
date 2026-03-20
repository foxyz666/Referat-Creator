export interface DocumentSettings {
  topic: string
  discipline: string
  pageCount: number
  bibliographySourceCount: number
  extendedContent: boolean
  showPageNumbers: boolean
  fontFamily: string
  fontSize: number
  lineSpacing: number
  showParagraphSpacing: boolean
  letterSpacing: number
  wordSpacing: number
  titlePage: TitlePageSettings
}

export interface TitlePageSettings {
  ministry: string
  academy: string
  faculty: string
  department: string
  topic: string
  author: string
  supervisor: string
  city: string
  year: string
}

export interface DocumentSection {
  id: string
  type: 'title' | 'contents' | 'introduction' | 'content' | 'conclusion' | 'bibliography'
  title: string
  content: string
  pageNumber?: number
}

export interface AnalysisResult {
  aiPercentage: number
  plagiarismPercentage: number
  aiHighlights: HighlightedText[]
  plagiarismHighlights: HighlightedText[]
}

export interface HighlightedText {
  id: string
  text: string
  startIndex: number
  endIndex: number
  sectionId: string
  suggestion?: string
}

export interface GeneratedDocument {
  sections: DocumentSection[]
  analysis: AnalysisResult
  bibliography: BibliographyEntry[]
}

export interface BibliographyEntry {
  id: string
  author: string
  title: string
  source: string
  year: string
  url: string
  accessedAt: string
}

export interface SavedReferat {
  id: string
  topic: string
  discipline: string
  pageCount: number
  createdAt: number
  settings: DocumentSettings
  sections: DocumentSection[]
}

export const DEFAULT_TITLE_PAGE: TitlePageSettings = {
  ministry: 'MINISTERUL EDUCATIEI SI CERCETARII AL REPUBLICII MOLDOVA',
  academy: 'UNIVERSITATEA DE STAT DIN MOLDOVA',
  faculty: 'FACULTATEA DE CHIMIE SI TEHNOLOGIE CHIMICA',
  department: 'DEPARTAMENTUL CHIMIE',
  topic: '',
  author: 'Numele Prenumele studentului',
  supervisor: 'RUSNAC Roman, doctor in stiinte chimice, lector universitar',
  city: 'Chișinău',
  year: new Date().getFullYear().toString()
}

export const DEFAULT_SETTINGS: DocumentSettings = {
  topic: 'Transformarile catalitice si starea redox a mediului ambiant',
  discipline: 'Chimie',
  pageCount: 10,
  bibliographySourceCount: 10,
  extendedContent: true,
  showPageNumbers: true,
  fontFamily: 'Times New Roman',
  fontSize: 12,
  lineSpacing: 1.5,
  showParagraphSpacing: false,
  letterSpacing: 0,
  wordSpacing: 0,
  titlePage: DEFAULT_TITLE_PAGE
}

export const FONT_OPTIONS = [
  'Times New Roman',
  'Arial',
  'Georgia',
  'Calibri',
  'Verdana',
  'Cambria'
]

export const DISCIPLINES = [
  'Drept Civil',
  'Drept Penal',
  'Drept Constituțional',
  'Drept Administrativ',
  'Drept Comercial',
  'Drept Internațional',
  'Drept Fiscal',
  'Drept al Muncii',
  'Economia',
  'Finanțe',
  'Management',
  'Marketing',
  'Chimie',
  'Informatica',
  'Istorie',
  'Filosofie',
  'Psihologie',
  'Sociologie',
  'Altele'
]
