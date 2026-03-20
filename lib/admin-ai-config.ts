export type AiProvider = 'auto' | 'claude' | 'deepseek' | 'openai' | 'gemini' | 'g4f'

export interface AiProviderConfig {
  apiKey: string
  model: string
}

export interface AdminAiSettings {
  selectedProvider: AiProvider
  configs: Record<Exclude<AiProvider, 'auto'>, AiProviderConfig>
  updatedAt: number
}

const STORAGE_KEY = 'admin-ai-settings-v1'

export const DEFAULT_AI_MODELS: Record<Exclude<AiProvider, 'auto'>, string> = {
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  g4f: 'gpt-4o-mini',
}

const createDefaultSettings = (): AdminAiSettings => ({
  selectedProvider: 'auto',
  configs: {
    claude: { apiKey: '', model: DEFAULT_AI_MODELS.claude },
    deepseek: { apiKey: '', model: DEFAULT_AI_MODELS.deepseek },
    openai: { apiKey: '', model: DEFAULT_AI_MODELS.openai },
    gemini: { apiKey: '', model: DEFAULT_AI_MODELS.gemini },
    g4f: { apiKey: '', model: DEFAULT_AI_MODELS.g4f },
  },
  updatedAt: Date.now(),
})

const normalizeSettings = (value: unknown): AdminAiSettings => {
  const defaults = createDefaultSettings()

  if (!value || typeof value !== 'object') return defaults

  const source = value as Partial<AdminAiSettings>
  const rawProvider = source.selectedProvider
  const selectedProvider: AiProvider =
    rawProvider === 'auto' ||
    rawProvider === 'claude' ||
    rawProvider === 'deepseek' ||
    rawProvider === 'openai' ||
    rawProvider === 'gemini' ||
    rawProvider === 'g4f'
      ? rawProvider
      : 'auto'

  const rawConfigs = source.configs || ({} as AdminAiSettings['configs'])

  return {
    selectedProvider,
    configs: {
      claude: {
        apiKey: String(rawConfigs?.claude?.apiKey || ''),
        model: String(rawConfigs?.claude?.model || DEFAULT_AI_MODELS.claude),
      },
      deepseek: {
        apiKey: String(rawConfigs?.deepseek?.apiKey || ''),
        model: String(rawConfigs?.deepseek?.model || DEFAULT_AI_MODELS.deepseek),
      },
      openai: {
        apiKey: String(rawConfigs?.openai?.apiKey || ''),
        model: String(rawConfigs?.openai?.model || DEFAULT_AI_MODELS.openai),
      },
      gemini: {
        apiKey: String(rawConfigs?.gemini?.apiKey || ''),
        model: String(rawConfigs?.gemini?.model || DEFAULT_AI_MODELS.gemini),
      },
      g4f: {
        apiKey: String(rawConfigs?.g4f?.apiKey || ''),
        model: String(rawConfigs?.g4f?.model || DEFAULT_AI_MODELS.g4f),
      },
    },
    updatedAt: Number(source.updatedAt || Date.now()),
  }
}

export function loadAdminAiSettings(): AdminAiSettings {
  if (typeof window === 'undefined') {
    return createDefaultSettings()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createDefaultSettings()
    }

    return normalizeSettings(JSON.parse(raw))
  } catch {
    return createDefaultSettings()
  }
}

export function saveAdminAiSettings(settings: AdminAiSettings): void {
  if (typeof window === 'undefined') return

  const normalized = normalizeSettings(settings)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore localStorage errors
  }
}
