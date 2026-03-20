export const maxDuration = 30

export async function POST(req: Request) {
  const { content, sectionId } = await req.json()

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Generate mock analysis based on content
  const aiPercentage = Math.floor(Math.random() * 30) + 15 // 15-45%
  const plagiarismPercentage = Math.floor(Math.random() * 15) + 5 // 5-20%

  // Find some text snippets to highlight
  const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 30)
  
  const aiHighlights = []
  const plagiarismHighlights = []

  // Pick 2-3 sentences for AI detection
  const usedIndices = new Set<number>()
  
  for (let i = 0; i < Math.min(3, Math.floor(sentences.length / 3)); i++) {
    let aiIndex = Math.floor(Math.random() * sentences.length)
    while (usedIndices.has(aiIndex) && usedIndices.size < sentences.length) {
      aiIndex = (aiIndex + 1) % sentences.length
    }
    usedIndices.add(aiIndex)
    
    const aiText = sentences[aiIndex]?.trim()
    if (aiText && aiText.length > 40) {
      const startIndex = content.indexOf(aiText)
      aiHighlights.push({
        text: aiText, // Return FULL text for proper highlighting
        startIndex,
        endIndex: startIndex + aiText.length,
        reason: "Structură tipică pentru conținut generat de AI - formulări prea perfecte și tranziții artificiale",
        suggestion: "Reformulați folosind un limbaj mai natural și expresii personale"
      })
    }
  }

  // Pick 1-2 sentences for plagiarism detection
  for (let i = 0; i < Math.min(2, Math.floor(sentences.length / 4)); i++) {
    let plagIndex = Math.floor(Math.random() * sentences.length)
    while (usedIndices.has(plagIndex) && usedIndices.size < sentences.length) {
      plagIndex = (plagIndex + 1) % sentences.length
    }
    usedIndices.add(plagIndex)
    
    const plagText = sentences[plagIndex]?.trim()
    if (plagText && plagText.length > 40) {
      const startIndex = content.indexOf(plagText)
      plagiarismHighlights.push({
        text: plagText, // Return FULL text for proper highlighting
        startIndex,
        endIndex: startIndex + plagText.length,
        possibleSource: "Surse academice generale sau Wikipedia",
        suggestion: "Parafrazați și adăugați propriile interpretări"
      })
    }
  }

  return Response.json({
    aiPercentage,
    plagiarismPercentage,
    aiHighlights,
    plagiarismHighlights,
    sectionId
  })
}
