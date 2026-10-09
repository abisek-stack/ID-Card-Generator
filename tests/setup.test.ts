import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'

// Smoke test: the PDF engine library loads and can make a card-sized page.
describe('setup', () => {
  it('creates a CR80 card-sized PDF page', async () => {
    const mm = (v: number) => (v / 25.4) * 72
    const doc = await PDFDocument.create()
    const page = doc.addPage([mm(85.6), mm(54)])
    expect(Math.round(page.getWidth())).toBe(243)
    expect(Math.round(page.getHeight())).toBe(153)
  })
})
