# Browser PDF Editor

A browser-only visual PDF editor prototype. It supports arbitrary PDFs, multiple pages, text overlays, whiteout rectangles, checkmarks, draggable/resizable PNG/JPG images, locally saved signature presets, zoom, delete/undo, and export to a new PDF.

## Deploy on Vercel
1. Create a GitHub repository and upload all files/folders in this project.
2. Import the repository in Vercel.
3. Framework preset: **Vite** (normally detected automatically).
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

## Local development
`npm install` then `npm run dev`.

## Privacy / clinical use
PDF processing and signature presets are implemented in the browser; this project has no application backend. Signature presets use browser localStorage. However, hosting, browser extensions, enterprise monitoring, third-party dependencies, and organizational policy can still matter. Do not use it for live patient data until your organization's IT/information-governance team approves the deployment and workflow.

## Editing model
This is a visual editor, not a full Acrobat text-reflow engine. Existing PDF content is preserved. To replace existing text, place a Whiteout rectangle over it and add new text. Export flattens the added objects onto the original PDF.
