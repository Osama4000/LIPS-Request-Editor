# Browser PDF Editor V6

V6 changes existing-text replacement so it no longer exports a white rectangle over the original field. It uses MuPDF in WebAssembly to remove text content only while preserving line art and images, then writes the replacement text back into the PDF.

## Features
- Open arbitrary PDFs in the browser
- Click detected existing text and replace it
- Original box borders/background graphics are preserved during text replacement
- Native PDF form text fields, checkboxes, radio buttons and dropdowns when present
- Add text, whiteout, rectangles and marks
- Upload, drag and resize signature images
- Persistent signature presets stored locally in IndexedDB
- Multi-page navigation and zoom
- Export edited PDF

## Deploy to Vercel
1. Upload this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Important
This is a prototype. Test exported files carefully. Existing-text replacement is strongest on digitally generated PDFs with extractable text. Some PDFs use unusual encodings, clipping, vectorized letters, or scanned images and cannot be edited as normal text.

PDF and signature processing is client-side. Signature presets are stored in that browser profile/device. Obtain organizational approval before using patient-identifiable documents.
