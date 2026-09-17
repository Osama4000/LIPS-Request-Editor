# Browser PDF Editor V3

A client-side PDF editor intended for static hosting (GitHub Pages, Vercel, etc.).

## V3 features
- Open arbitrary PDFs in the browser
- Detect normal PDF text and click it to create an in-place replacement
- Detect AcroForm fields and edit text fields / dropdowns / checkboxes directly
- Add text, whiteout rectangles, boxes, checkmarks and images
- Drag and resize signatures/images
- Save reusable signature presets in browser localStorage
- Multi-page navigation and zoom
- Export edits to a new PDF

## Important limitation
PDFs do not have a universal "edit text" model. For ordinary page text, V3 detects the rendered text and replaces it by covering the original area and writing new text at the same position. Real AcroForm fields are edited natively. Text inside scanned images is not editable by this version.

## Deploy to Vercel
1. Upload this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: Vite (normally auto-detected).
4. Build command: `npm run build`
5. Output directory: `dist`

## Privacy
The application itself has no backend and processes PDFs in the browser. Hosting/organizational policies still apply; obtain approval before using it with patient data.
