export const maxDuration = 60

interface BibliographyEntry {
  author: string
  title: string
  source: string
  year: string
  url: string
}

interface GeneratedPayload {
  introduction: { content: string }
  chapters: Array<{
    title: string
    content: string
    subchapters?: Array<{ title: string; content: string }>
  }>
  conclusion: { content: string }
  bibliography: BibliographyEntry[]
}

interface GenerateRequestBody {
  topic: string
  discipline: string
  pageCount: number
  bibliographySourceCount?: number
  extendedContent?: boolean
}

function isClaudeCreditError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('credit balance is too low') || lower.includes('plans & billing')
}

function extractJsonCandidate(rawContent: string): string {
  const content = rawContent.trim()

  if (!content) return content

  if (content.startsWith('{') && content.endsWith('}')) {
    return content
  }

  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const start = content.indexOf('{')
  if (start === -1) return content

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < content.length; i += 1) {
    const char = content[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return content.slice(start, i + 1).trim()
      }
    }
  }

  return content
}

function normalizePayload(payload: Partial<GeneratedPayload>, requestedSources: number): GeneratedPayload {
  const safeSources = Math.min(Math.max(requestedSources, 3), 25)

  const bibliography = (payload.bibliography || [])
    .slice(0, safeSources)
    .map((entry) => ({
      author: String(entry.author || 'Autor necunoscut'),
      title: String(entry.title || 'Titlu necunoscut'),
      source: String(entry.source || 'Sursa necunoscuta'),
      year: String(entry.year || new Date().getFullYear()),
      url: String(entry.url || 'https://example.com'),
    }))

  return {
    introduction: {
      content: String(payload.introduction?.content || ''),
    },
    chapters: Array.isArray(payload.chapters)
      ? payload.chapters.map((chapter, idx) => ({
          title: String(chapter.title || `Capitol ${idx + 1}`),
          content: String(chapter.content || ''),
          subchapters: (chapter.subchapters || []).map((sub, subIdx) => ({
            title: String(sub.title || `${idx + 1}.${subIdx + 1} Subcapitol`),
            content: String(sub.content || ''),
          })),
        }))
      : [],
    conclusion: {
      content: String(payload.conclusion?.content || ''),
    },
    bibliography,
  }
}

async function generateWithClaude(params: {
  topic: string
  discipline: string
  pageCount: number
  bibliographySourceCount: number
  extendedContent: boolean
}): Promise<GeneratedPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY este lipsa. Configureaza cheia in .env.local.')
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

  const requestedChapters = params.extendedContent
    ? Math.max(2, Math.ceil((params.pageCount - 2) / 2))
    : Math.max(2, params.pageCount - 2)
  const requestedSources = Math.min(Math.max(params.bibliographySourceCount, 3), 25)

  const minSubchapterWords = params.extendedContent ? 430 : 140
  const maxSubchapterWords = params.extendedContent ? 650 : 260
  const minIntroWords = params.extendedContent ? 220 : 100
  const maxIntroWords = params.extendedContent ? 320 : 180
  const minConclusionWords = params.extendedContent ? 220 : 100
  const maxConclusionWords = params.extendedContent ? 320 : 180

  const systemPrompt = [
    'Esti un asistent academic in limba romana.',
    'Generezi continut original, coerent si bine structurat pentru un referat universitar.',
    'Raspunzi strict JSON valid, fara markdown si fara text suplimentar.',
  ].join(' ')

  const userPrompt = [
    `Tema: ${params.topic}`,
    `Disciplina: ${params.discipline}`,
    `Numar capitole dorit: ${requestedChapters}`,
    `Numar surse in bibliografie: ${requestedSources}`,
    '',
    'Returneaza un JSON cu schema exacta:',
    '{',
    '  "introduction": { "content": "string" },',
    '  "chapters": [',
    '    {',
    '      "title": "string",',
    '      "content": "string",',
    '      "subchapters": [',
    '        { "title": "string", "content": "string" }',
    '      ]',
    '    }',
    '  ],',
    '  "conclusion": { "content": "string" },',
    '  "bibliography": [',
    '    { "author": "string", "title": "string", "source": "string", "year": "string", "url": "string" }',
    '  ]',
    '}',
    '',
    'Reguli:',
    `- Fiecare subcapitol: ${minSubchapterWords}-${maxSubchapterWords} cuvinte.`,
    `- Introducere: ${minIntroWords}-${maxIntroWords} cuvinte.`,
    `- Concluzie: ${minConclusionWords}-${maxConclusionWords} cuvinte.`,
    `- Capitole: exact ${requestedChapters}.`,
    '- Subcapitole: 2 per capitol.',
    `- Surse bibliografice: exact ${requestedSources}, cu URL complet https://...`,
    '- Stil: academic, clar, fara repetitii inutile.',
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: params.extendedContent ? 4500 : 2500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errorText}`)
  }

  const raw = await response.json()
  const contentBlocks = Array.isArray(raw?.content) ? raw.content : []
  const textContent = contentBlocks
    .filter((block: { type?: string; text?: string }) => block?.type === 'text')
    .map((block: { text?: string }) => block.text || '')
    .join('\n')
    .trim()

  if (!textContent) {
    throw new Error('Claude nu a returnat continut valid.')
  }

  let parsed: Partial<GeneratedPayload>
  try {
    parsed = JSON.parse(extractJsonCandidate(textContent))
  } catch {
    throw new Error('Raspunsul Claude nu este JSON valid.')
  }

  return normalizePayload(parsed, requestedSources)
}

async function generateWithDeepSeek(params: {
  topic: string
  discipline: string
  pageCount: number
  bibliographySourceCount: number
  extendedContent: boolean
}): Promise<GeneratedPayload> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY este lipsa. Configureaza cheia in .env.local.')
  }

  const useOpenRouter = apiKey.startsWith('sk-or-')
  const apiUrl = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.deepseek.com/chat/completions'

  const model = useOpenRouter
    ? process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat'
    : process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const requestedChapters = params.extendedContent
    ? Math.max(2, Math.ceil((params.pageCount - 2) / 2))
    : Math.max(2, params.pageCount - 2)
  const requestedSources = Math.min(Math.max(params.bibliographySourceCount, 3), 25)

  const minSubchapterWords = params.extendedContent ? 430 : 140
  const maxSubchapterWords = params.extendedContent ? 650 : 260
  const minIntroWords = params.extendedContent ? 220 : 100
  const maxIntroWords = params.extendedContent ? 320 : 180
  const minConclusionWords = params.extendedContent ? 220 : 100
  const maxConclusionWords = params.extendedContent ? 320 : 180

  const systemPrompt = [
    'Esti un asistent academic in limba romana.',
    'Generezi continut original, coerent si bine structurat pentru un referat universitar.',
    'Raspunzi strict JSON valid, fara markdown si fara text suplimentar.',
  ].join(' ')

  const userPrompt = [
    `Tema: ${params.topic}`,
    `Disciplina: ${params.discipline}`,
    `Numar capitole dorit: ${requestedChapters}`,
    `Numar surse in bibliografie: ${requestedSources}`,
    '',
    'Returneaza un JSON cu schema exacta:',
    '{',
    '  "introduction": { "content": "string" },',
    '  "chapters": [',
    '    {',
    '      "title": "string",',
    '      "content": "string",',
    '      "subchapters": [',
    '        { "title": "string", "content": "string" }',
    '      ]',
    '    }',
    '  ],',
    '  "conclusion": { "content": "string" },',
    '  "bibliography": [',
    '    { "author": "string", "title": "string", "source": "string", "year": "string", "url": "string" }',
    '  ]',
    '}',
    '',
    'Reguli:',
    `- Fiecare subcapitol: ${minSubchapterWords}-${maxSubchapterWords} cuvinte.`,
    `- Introducere: ${minIntroWords}-${maxIntroWords} cuvinte.`,
    `- Concluzie: ${minConclusionWords}-${maxConclusionWords} cuvinte.`,
    `- Capitole: exact ${requestedChapters}.`,
    '- Subcapitole: 2 per capitol.',
    `- Surse bibliografice: exact ${requestedSources}, cu URL complet https://...`,
    '- Stil: academic, clar, fara repetitii inutile.',
  ].join('\n')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  if (useOpenRouter) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    headers['X-Title'] = 'referat-generator'
  }

  const payload: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: params.extendedContent ? 6000 : 3200,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  if (!useOpenRouter) {
    payload.response_format = { type: 'json_object' }
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
  }

  const raw = await response.json()
  const content = raw?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('DeepSeek nu a returnat continut valid.')
  }

  let parsed: Partial<GeneratedPayload>
  try {
    parsed = JSON.parse(extractJsonCandidate(String(content)))
  } catch {
    throw new Error('Raspunsul DeepSeek nu este JSON valid.')
  }

  return normalizePayload(parsed, requestedSources)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequestBody

    const topic = String(body.topic || '').trim()
    const discipline = String(body.discipline || '').trim()
    const pageCount = Number(body.pageCount || 10)
    const bibliographySourceCount = Number(body.bibliographySourceCount || 8)
    const extendedContent = body.extendedContent !== false

    if (!topic || !discipline) {
      return Response.json({ error: 'Tema si disciplina sunt obligatorii.' }, { status: 400 })
    }

    let generated: GeneratedPayload
    try {
      generated = await generateWithClaude({
        topic,
        discipline,
        pageCount,
        bibliographySourceCount,
        extendedContent,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eroare Claude necunoscuta.'
      if (!isClaudeCreditError(message)) {
        throw error
      }

      generated = await generateWithDeepSeek({
        topic,
        discipline,
        pageCount,
        bibliographySourceCount,
        extendedContent,
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const jsonString = JSON.stringify(generated)
        const chunkSize = 120

        for (let i = 0; i < jsonString.length; i += chunkSize) {
          controller.enqueue(encoder.encode(jsonString.slice(i, i + chunkSize)))
          await new Promise((resolve) => setTimeout(resolve, 12))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare necunoscuta la generare.'
    return Response.json({ error: message }, { status: 500 })
  }
}
