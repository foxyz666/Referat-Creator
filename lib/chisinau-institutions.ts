export interface FacultyOption {
  name: string
  departments: string[]
}

export interface UniversityOption {
  name: string
  faculties: FacultyOption[]
}

export const MINISTRY_OPTIONS = [
  'Ministerul Educatiei si Cercetarii al Republicii Moldova',
  'Ministerul Afacerilor Interne al Republicii Moldova',
  'Ministerul Sanatatii al Republicii Moldova',
  'Ministerul Culturii al Republicii Moldova',
]

export const CHISINAU_UNIVERSITIES: UniversityOption[] = [
  {
    name: 'Academia de Studii Economice din Moldova',
    faculties: [
      {
        name: 'Facultatea de Drept',
        departments: ['Departamentul Drept Public', 'Departamentul Drept Privat'],
      },
      {
        name: 'Facultatea de Business si Administrarea Afacerilor',
        departments: ['Departamentul Management', 'Departamentul Marketing si Logistica'],
      },
      {
        name: 'Facultatea de Finante',
        departments: ['Departamentul Finante si Asigurari', 'Departamentul Banci si Investitii'],
      },
      {
        name: 'Facultatea de Contabilitate',
        departments: ['Departamentul Contabilitate, Audit si Analiza Economica'],
      },
    ],
  },
  {
    name: 'Universitatea de Stat din Moldova',
    faculties: [
      {
        name: 'Facultatea de Drept',
        departments: ['Departamentul Drept Public', 'Departamentul Drept Privat'],
      },
      {
        name: 'Facultatea de Stiinte Economice',
        departments: ['Departamentul Economie, Marketing si Turism'],
      },
      {
        name: 'Facultatea de Matematica si Informatica',
        departments: ['Departamentul Informatica', 'Departamentul Matematica Aplicata'],
      },
      {
        name: 'Facultatea de Litere',
        departments: ['Departamentul Limba Romana', 'Departamentul Limbi Straine'],
      },
    ],
  },
  {
    name: 'Universitatea Tehnica a Moldovei',
    faculties: [
      {
        name: 'Facultatea Calculatoare, Informatica si Microelectronica',
        departments: ['Departamentul Software si Automatizare', 'Departamentul Informatica Aplicata'],
      },
      {
        name: 'Facultatea Urbanism si Arhitectura',
        departments: ['Departamentul Arhitectura', 'Departamentul Urbanism si Design'],
      },
      {
        name: 'Facultatea Inginerie Mecanica, Industriala si Transporturi',
        departments: ['Departamentul Inginerie Mecanica', 'Departamentul Transporturi'],
      },
    ],
  },
  {
    name: 'Universitatea de Stat de Medicina si Farmacie Nicolae Testemitanu',
    faculties: [
      {
        name: 'Facultatea de Medicina nr. 1',
        departments: ['Departamentul Medicina Interna', 'Departamentul Chirurgie'],
      },
      {
        name: 'Facultatea de Stomatologie',
        departments: ['Departamentul Terapie Stomatologica', 'Departamentul Chirurgie Oro-Maxilo-Faciala'],
      },
      {
        name: 'Facultatea de Farmacie',
        departments: ['Departamentul Farmacie Sociala', 'Departamentul Tehnologie Farmaceutica'],
      },
    ],
  },
  {
    name: 'Universitatea Pedagogica de Stat Ion Creanga',
    faculties: [
      {
        name: 'Facultatea de Psihologie si Stiintele Educatiei',
        departments: ['Departamentul Psihologie', 'Departamentul Stiinte ale Educatiei'],
      },
      {
        name: 'Facultatea de Filologie si Istorie',
        departments: ['Departamentul Limba si Literatura Romana', 'Departamentul Istorie si Geografie'],
      },
      {
        name: 'Facultatea de Limbi si Literaturi Straine',
        departments: ['Departamentul Limba Engleza', 'Departamentul Limba Franceza'],
      },
    ],
  },
  {
    name: 'Academia Stefan cel Mare a MAI',
    faculties: [
      {
        name: 'Facultatea de Drept, Ordine si Securitate Publica',
        departments: ['Catedra Drept Public', 'Catedra Proceduri Penale si Criminalistica'],
      },
      {
        name: 'Facultatea Securitate si Management',
        departments: ['Catedra Management Politienesc', 'Catedra Securitate Publica'],
      },
    ],
  },
  {
    name: 'Universitatea Libera Internationala din Moldova',
    faculties: [
      {
        name: 'Facultatea de Drept',
        departments: ['Catedra Drept Public', 'Catedra Drept Privat'],
      },
      {
        name: 'Facultatea Stiinte Economice',
        departments: ['Catedra Economie si Business', 'Catedra Finante si Banci'],
      },
      {
        name: 'Facultatea Informatica, Inginerie si Design',
        departments: ['Catedra Informatica Aplicata', 'Catedra Tehnologii Informationale'],
      },
    ],
  },
]

export const CITY_OPTIONS = ['Chisinau']
