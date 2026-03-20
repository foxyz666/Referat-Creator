import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Footer,
  Header,
  NumberFormat,
  TableOfContents,
  StyleLevel,
  PageBreak,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'
import { DocumentSection, DocumentSettings } from './types'

export async function exportToWord(
  sections: DocumentSection[],
  settings: DocumentSettings
) {
  const tp = settings.titlePage
  
  // Title page paragraphs
  const titlePageContent = [
    new Paragraph({
      children: [new TextRun({ text: tp.ministry, bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: tp.academy, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: tp.faculty, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: tp.department, size: 24, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'REFERAT', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: tp.topic || settings.topic, bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `la disciplina: ${settings.discipline}`, size: 24, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `A elaborat: ${tp.author}`, size: 24 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Conducător științific: ${tp.supervisor}`, size: 24 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 2400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${tp.city} ${tp.year}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200 },
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ]

  // Table of Contents
  const tocContent = [
    new Paragraph({
      children: [new TextRun({ text: 'CUPRINS', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new TableOfContents("Cuprins", {
      hyperlink: true,
      headingStyleRange: "1-3",
      stylesWithLevels: [
        new StyleLevel("Heading1", 1),
        new StyleLevel("Heading2", 2),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ]

  // Document sections
  const documentContent: Paragraph[] = []
  
  sections.forEach((section, index) => {
    const headingLevel = section.type === 'content' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_1
    const title = section.type === 'introduction' ? 'INTRODUCERE' :
                  section.type === 'conclusion' ? 'CONCLUZII ȘI RECOMANDĂRI' :
                  section.type === 'bibliography' ? 'BIBLIOGRAFIE' :
                  section.title
    
    // Section title
    documentContent.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 28 })],
        heading: headingLevel,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
      })
    )

    // Section content - split by paragraphs
    const paragraphs = section.content.split('\n\n')
    paragraphs.forEach(para => {
      if (para.trim()) {
        documentContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                size: settings.fontSize * 2, // docx uses half-points
                font: settings.fontFamily,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              line: settings.lineSpacing * 240, // 240 twips = single line
              after: settings.showParagraphSpacing ? 200 : 0,
            },
            indent: {
              firstLine: convertInchesToTwip(0.492),
            },
          })
        )
      }
    })

    // Add page break after each section except the last
    if (index < sections.length - 1) {
      documentContent.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      )
    }
  })

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: settings.fontFamily,
            size: settings.fontSize * 2,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.591),
              right: convertInchesToTwip(0.787),
              bottom: convertInchesToTwip(0.591),
              left: convertInchesToTwip(0.787),
            },
          },
        },
        headers: settings.showPageNumbers ? {
          default: new Header({
            children: [],
          }),
        } : undefined,
        footers: settings.showPageNumbers ? {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        } : undefined,
        children: [...titlePageContent, ...tocContent, ...documentContent],
      },
    ],
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  const filename = `referat-${(tp.topic || settings.topic).slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.docx`
  saveAs(blob, filename)
}
