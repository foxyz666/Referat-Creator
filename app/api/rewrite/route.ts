export const maxDuration = 60

interface RewriteBody {
  text?: string
  sectionContent?: string
  topic?: string
  discipline?: string
  mode?: 'expand' | 'rewrite'
}

function fallbackExpand(text: string): string {
  const seed = text.trim()
  if (!seed) return text

  return [
    seed,
    'In plus, aceasta idee poate fi dezvoltata printr-o analiza mai aplicata, care evidentiaza relatia dintre conceptul teoretic si efectele sale practice in cadrul disciplinei.',
    'Prin urmare, extinderea argumentului sustine o intelegere mai profunda a subiectului si ofera o baza mai solida pentru concluzii academice coerente.',
  ].join(' ')
}

function isClaudeCreditError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('credit balance is too low') || lower.includes('plans & billing')
}

async function expandWithClaude(params: {
  text: string
  sectionContent: string
  topic: string
  discipline: string
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return fallbackExpand(params.text)
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

  const prompt = [
    'Extinde fragmentul selectat in limba romana, stil academic.',
    'Pastraza ideea initiala, adauga explicatii si detalii utile, fara repetitii inutile.',
    'Intoarce doar textul final extins, fara JSON, fara markdown, fara explicatii meta.',
    '',
    `Tema generala: ${params.topic}`,
    `Disciplina: ${params.discipline}`,
    '',
    'Contextul sectiunii (pentru coerenta):',
    params.sectionContent,
    '',
    'Fragment selectat pentru extindere:',
    params.text,
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
      max_tokens: 900,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errorText}`)
  }

  const raw = await response.json()
  const contentBlocks = Array.isArray(raw?.content) ? raw.content : []
  const rewrittenText = contentBlocks
    .filter((block: { type?: string; text?: string }) => block?.type === 'text')
    .map((block: { text?: string }) => block.text || '')
    .join('\n')
    .trim()

  if (!rewrittenText) {
    return fallbackExpand(params.text)
  }

  return rewrittenText
}

async function expandWithDeepSeek(params: {
  text: string
  sectionContent: string
  topic: string
  discipline: string
}): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return fallbackExpand(params.text)
  }

  const useOpenRouter = apiKey.startsWith('sk-or-')
  const apiUrl = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.deepseek.com/chat/completions'
  const model = useOpenRouter
    ? process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat'
    : process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const prompt = [
    'Extinde fragmentul selectat in limba romana, stil academic.',
    'Pastraza ideea initiala, adauga explicatii si detalii utile, fara repetitii inutile.',
    'Intoarce doar textul final extins, fara JSON, fara markdown, fara explicatii meta.',
    '',
    `Tema generala: ${params.topic}`,
    `Disciplina: ${params.discipline}`,
    '',
    'Contextul sectiunii (pentru coerenta):',
    params.sectionContent,
    '',
    'Fragment selectat pentru extindere:',
    params.text,
  ].join('\n')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  if (useOpenRouter) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    headers['X-Title'] = 'referat-generator'
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: 'system', content: 'Esti un redactor academic in limba romana.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    return fallbackExpand(params.text)
  }

  const raw = await response.json()
  const content = String(raw?.choices?.[0]?.message?.content || '').trim()
  return content || fallbackExpand(params.text)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RewriteBody
    const text = String(body.text || '').trim()
    const sectionContent = String(body.sectionContent || '').trim()
    const topic = String(body.topic || '').trim()
    const discipline = String(body.discipline || '').trim()
    const mode = body.mode || 'rewrite'

    if (!text) {
      return Response.json({ error: 'Textul selectat este obligatoriu.' }, { status: 400 })
    }

    if (mode === 'expand') {
      let rewrittenText = ''
      try {
        rewrittenText = await expandWithClaude({
          text,
          sectionContent,
          topic,
          discipline,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Eroare Claude necunoscuta.'
        if (isClaudeCreditError(message)) {
          rewrittenText = await expandWithDeepSeek({
            text,
            sectionContent,
            topic,
            discipline,
          })
        } else {
          rewrittenText = fallbackExpand(text)
        }
      }

      return Response.json({ rewrittenText })
    }

    return Response.json({ rewrittenText: text })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare la rescriere.'
    return Response.json({ error: message }, { status: 500 })
  }
}
