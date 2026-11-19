# PV Datasheet Converter

A browser-only static site that turns PV module datasheet PDFs into editable, structured Excel workbooks. PDF.js extracts text locally and SheetJS creates the `.xlsx`; no PDF or extracted data is uploaded.

## Deploy on Netlify

1. Drag the entire project folder into [Netlify Drop](https://app.netlify.com/drop), or connect the folder/repository in Netlify.
2. Leave the build command empty. Set the publish directory to the project root (`.`).
3. Open the site, drop a datasheet PDF, review highlighted fields, edit any values, and click **Download Excel**.

The app loads PDF.js and the SheetJS-compatible `xlsx-js-style` bundle from public CDNs, so an internet connection is needed when the page first loads. The PDF processing itself remains in the browser.
