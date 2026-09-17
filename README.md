# LIPS Radiology PDF Tool (browser-only prototype)

A static web app for the one-page LIPS Diagnostic Imaging Request Form supplied during development.

## What it does
- Opens a PDF locally in the browser.
- Overlays a replacement patient address.
- Changes payment selection and the `Other` text.
- Changes examination selection and scan description.
- Stores reusable signature image presets in browser localStorage.
- Generates a new PDF locally for download.

## Deploy to Vercel
1. Create a GitHub repository and upload `index.html` and this README.
2. In Vercel, create a New Project and import the repository.
3. Framework preset: `Other`.
4. No build command is required; deploy the repository root.

You can also use GitHub Pages because this is a static site.

## Privacy / clinical-use warning
This prototype is intentionally browser-only and has no application backend. However, external CDN resources are loaded by the page and your organisation may restrict use of unapproved web applications with patient information. Obtain appropriate IT/information-governance approval before using it with live patient data. Test generated PDFs carefully before operational use.

Signature presets are stored locally in that browser profile and are not a substitute for your organisation's signature-authorisation controls.
