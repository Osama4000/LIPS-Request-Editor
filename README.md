# Browser PDF Editor V7

Client-side PDF editor for static Vercel/GitHub deployment.

## V7 additions
- Undo/redo history and keyboard shortcuts
- Select/move/resize/duplicate/delete objects
- Better detected font size/bold matching
- Fit-to-box toggle for text
- Signature thumbnails, search, rename/delete, recent-use ordering, persistent IndexedDB storage
- Separate vector check, X and radio marks
- Ctrl/Cmd+C/V object duplication, Ctrl/Cmd+S save
- Page thumbnails and collapsible page rail
- Drag-and-drop PDF opening
- Save As uses `<original>_edited.pdf`
- Unsaved-change browser warning
- Local recovery of edit state after reopening the same PDF

## Privacy
PDF bytes are processed in the browser and are not sent to an application backend. Signature presets and recovery state are stored locally in the browser profile. Review deployment, browser, device, extension, logging, and organizational information-governance requirements before using patient-identifiable documents.

## Build
```bash
npm install
npm run build
```
Vite is configured for `esnext` because MuPDF WASM uses top-level await.
