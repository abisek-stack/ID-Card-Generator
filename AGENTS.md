# ID Card Generator — AGENTS.md

Instructions for any AI coding agent working on this repo. Read this whole file before writing code.

## What we are building

A studio prints 100–1,000 ID cards a day. Today he opens one template and retypes each person's
name, father's name, symbol number and photo by hand. This app does that automatically:

1. He uploads his **template** once: a PDF (best) or a high-resolution PNG/JPG. It can have a back side.
2. He draws **field boxes** on it: Name, Father's name, Symbol no., Photo, and so on.
3. He gives the **people**: an Excel/CSV file plus a ZIP or folder of photos.
4. He clicks **Generate** and gets one print-ready PDF with every card.

**The promise: every card is identical to his template; only the field contents change.** He is a
professional and cannot accept any loss in quality or colour. Read "Quality rules" below.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest (`tests/**/*.test.ts`) |

Run lint, typecheck, test and build before every commit. CI runs all four.

## Stack (already installed — don't swap libraries without a reason)

- **Vite 8 + React 19 + TypeScript + Tailwind v4** (`@tailwindcss/vite`; theme tokens in `src/index.css`).
- **pdf-lib** + **@pdf-lib/fontkit**: builds the output PDF. Embed the template, draw text, photos and cut marks.
- **harfbuzzjs**: text shaping (WASM). Needed for correct Nepali (Devanagari) conjuncts and matras.
- **pdfjs-dist**: renders the template on screen in the editor, and powers the golden tests.
- **xlsx** (SheetJS, installed from cdn.sheetjs.com; the npm registry copy is outdated): reads Excel and CSV.
- **fflate**: reads the photos ZIP.
- **bwip-js**: QR codes and barcodes (optional field type).
- **idb**: saves templates in IndexedDB.

**No backend.** Everything runs in the browser: people's names and photos never leave the studio computer.

## Folder layout

```
src/
  engine/   Pure TypeScript, NO React. Units, template embedding, text shaping, Preeti,
            layout/imposition, generate(). Everything here must be unit-testable in Node.
  editor/   Template upload, canvas preview (pdf.js), draggable/resizable field boxes, properties panel.
  data/     Excel/CSV import, column → field mapping, photo matching, problems report.
  worker/   Web Worker that runs engine.generate() with progress messages (UI must never freeze).
  ui/       Shared UI pieces (buttons, inputs, sheets).
tests/      Vitest tests. tests/fixtures/ holds FAKE sample templates/data only.
```

## Quality rules (the core promise — never break these)

1. **A PDF template is embedded as vector** (`PDFDocument.embedPdf`/`embedPage`, then `drawPage`). Never
   rasterize it. Its colours, including CMYK, must come through unchanged.
2. **An image template is embedded from its original bytes**: `embedJpg` passes JPG through untouched;
   PNG stays lossless. Never resize, re-compress or draw it through a canvas.
3. **Embed the template once** and reuse it on every card, so 1,000 cards stay a small PDF.
4. **Text is vector.** Draw shaped glyph outlines as paths (from harfbuzzjs), or embedded-font text,
   never text rendered to an image.
5. **Photos are cropped with a PDF clip path**, not by re-encoding: cover/contain inside the frame.
   Downscale only very large photos (above ~600 DPI at their printed size) to keep the file sane.
6. **Units:** store everything in millimetres; convert to PDF points only in the engine (`pt = mm / 25.4 * 72`).
   A CR80 card is 85.6 × 54 mm.
7. Text colour can be given in **CMYK** (pdf-lib `cmyk()`) so it matches his printer's colours, or hex.

## Nepali text (most likely place to get it wrong)

- **Unicode Devanagari must be shaped.** pdf-lib alone draws characters one by one, which breaks conjuncts
  (क्ष, श्र, त्र) and vowel signs. Shape with **harfbuzzjs**, then draw the glyph outlines as paths.
  Test with: "श्रीकृष्ण", "क्षेत्री", "त्रिभुवन", "ज्ञानेन्द्र", "पृथ्वी".
- **Preeti** is a legacy font: plain ASCII codes mapped to Nepali shapes. It needs **no shaping**; draw the
  string with the uploaded Preeti TTF as-is.
- Add a **Unicode ↔ Preeti converter** (`src/engine/preeti.ts`), because the Excel file may be typed in
  Unicode while the template uses Preeti, or the other way round. Use a well-known mapping table and test
  round trips on real names.
- Bundle open fonts (Noto Sans Devanagari, Mukta; OFL licence) and let him upload his own TTF/OTF fonts
  (Preeti, Kalimati…). Uploaded fonts stay in the browser (IndexedDB), never in the repo.

## Features (v1)

1. **Template**: upload PDF/PNG/JPG. Card size comes from the file, or a preset (CR80). Optional back side.
2. **Field editor**: drag and resize boxes on the template preview. Field types:
   - **Text**: column, font, size, colour (CMYK/hex), align, **auto-shrink to fit** (never overflow),
     max lines, UPPERCASE option, fixed prefix/suffix.
   - **Photo**: cover/contain, corner radius.
   - **QR/Barcode** (bwip-js) from a column.
   - **Static text** shared by all cards (e.g. issue date).
3. **Data**:
   - Import Excel/CSV, or paste a table. Pick the header row, then map columns to fields.
   - Photos come as a ZIP or a folder, matched by filename to a chosen column (e.g. `1023.jpg` ↔ symbol no.).
   - A **problems report** flags missing photos, text that had to shrink a lot, and empty required fields.
4. **Preview**: step through every person; flagged cards are marked.
5. **Generate** in the Web Worker, with a progress bar. Output modes:
   - **Single**: one card per page at exact card size (PVC card printers), backs interleaved for duplex.
   - **A4 sheet**: N cards per page, with gap, optional bleed and **cut marks**. Backs are placed mirrored
     so they line up when printed double-sided.
6. **Save/load**: templates and field layouts in IndexedDB, plus export/import as one `.idcard` file
   (JSON + embedded template and font bytes) for backup or another PC.

## Build order

1. Engine:
   - `units.ts`;
   - template embedding;
   - text: shaping, auto-shrink, alignment;
   - photo clip;
   - `layout.ts` (single + A4 imposition, cut marks);
   - `generate()`.
   Unit tests for each.
2. Preeti converter + tests.
3. Editor UI (template upload, pdf.js preview, field boxes, properties).
4. Data import, mapping, photo matching, problems report, preview.
5. Worker generation with progress → download PDF.
6. IndexedDB save/load + `.idcard` export/import.
7. Deploy as a static site. Cloudflare Pages is free and allows commercial use.

## Testing

- **Unit:**
  - mm ↔ pt conversion;
  - imposition grid and cut marks;
  - auto-shrink;
  - Preeti round trips;
  - column mapping;
  - photo matching.
- **Golden:** generate from fixture templates, render with pdf.js, compare with reference PNGs. Template
  pixels **outside** field boxes must be identical to the original template.
- **Scale:** 1,000 rows with photos generate in under ~30 s without freezing the UI.

## Design

Premium monochrome:
- warm white background (`--bg`), white cards, ink-black text;
- colour only for meaning (red = problem, green = OK);
- clean and calm, big clear buttons; it's a tool used all day.

Keep it fast: no heavy animations or blur.

## Privacy and the repo

This repo is **public**. Never commit real people's names, photos, Excel files or the studio's real
templates and fonts. `.gitignore` already blocks `samples/`, `private/`, `photos/`, `*.xlsx`, `*.csv`
(except `tests/fixtures/`). Put the studio's real files in `samples/` locally for testing.
