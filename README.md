# PV Datasheet Converter

[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-0e7c61)](https://abdullah-sabbah.github.io/pv-datasheet-converter/)
[![No backend](https://img.shields.io/badge/processing-browser--only-1f6f5b)](#privacy)

Convert photovoltaic module datasheet PDFs into structured, editable Excel workbooks directly in the browser.

## What it does

Upload a manufacturer PDF through drag-and-drop or the file picker. The app uses PDF.js to read the document locally, detects multi-rating electrical tables such as 440–470 W columns, and creates one editable module preview per rated power. Missing or uncertain fields are highlighted for review. SheetJS then exports one formatted worksheet per module.

The preview follows the reference workbook grouping: General, Electrical Data – STC, Electrical Data – NOCT, Temperature & Application, Mechanical Data, and Warranty. Shared values are repeated across module sheets.

## Privacy

There is no backend and no API key. The PDF and extracted values remain in the browser tab. PDF.js and the SheetJS-compatible bundle are loaded from public CDNs when the page opens.

## Live site

Open the deployed tool at **https://abdullah-sabbah.github.io/pv-datasheet-converter/**.

## Local use

Serve the repository over HTTP (rather than opening `index.html` directly) so browser modules and CDN assets work reliably:

```bash
python3 -m http.server 3000
```

Then visit `http://localhost:3000/`.

## Netlify deployment

The `dist` folder is a ready-to-drop static artifact. Drag `dist` into [Netlify Drop](https://app.netlify.com/drop), or connect the full repository; `netlify.toml` already points Netlify to `dist` with no build command.

## Technology

This is a static HTML/CSS/JavaScript site using PDF.js for client-side PDF text extraction and SheetJS-compatible `xlsx-js-style` for formatted `.xlsx` generation. It has no framework, backend, database, or secrets.

## License

MIT. See [LICENSE](LICENSE).
