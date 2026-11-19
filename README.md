# PV Datasheet Converter

A browser-only static site that turns PV module datasheet PDFs into editable, structured Excel workbooks. PDF.js extracts text locally and SheetJS creates the `.xlsx`; no PDF or extracted data is uploaded.

## Deploy on Netlify

1. For the fastest deploy, drag the `dist` folder into [Netlify Drop](https://app.netlify.com/drop). Alternatively, connect the full project folder/repository; its `netlify.toml` already points Netlify to `dist`.
2. If configuring manually, leave the build command empty and set the publish directory to `dist`.
3. Open the site, drop a datasheet PDF, review highlighted fields, edit any values, and click **Download Excel**.

The app loads PDF.js and the SheetJS-compatible `xlsx-js-style` bundle from public CDNs, so an internet connection is needed when the page first loads. The PDF processing itself remains in the browser.
