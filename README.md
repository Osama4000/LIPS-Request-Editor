# Browser PDF Editor V4

A browser-only PDF editor prototype for GitHub/Vercel. PDFs and signature images are processed in the browser.

## V4 changes
- Existing printed PDF text is no longer shown as a highlighted text layer. Invisible hover targets let you click a detected line and replace it inline.
- Native AcroForm text fields, checkboxes, radio buttons and dropdowns are interactive when present in the PDF.
- Add text anywhere for printed empty boxes.
- Add check/X marks, whiteouts, rectangles, signatures/images, drag/resize, presets, zoom, pages and export.

## Run / deploy
`npm install` then `npm run dev`, or import this folder/repository into Vercel. Vite build command: `npm run build`; output directory: `dist`.

## Important PDF limitation
PDFs are page-description files, not Word documents. For non-form printed text, V4 detects text coordinates, covers the original area, and writes the replacement on export. Scanned/image-only PDFs do not contain editable text unless OCR is added. Empty printed boxes are not semantic form fields, so use Add text or Check/X inside them.

For real patient data, obtain your organisation's information-governance/IT approval before clinical use.
