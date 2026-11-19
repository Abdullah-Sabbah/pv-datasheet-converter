# Delivery outcomes

- [x] Users can upload a PV module datasheet PDF through drag-and-drop or a file picker.
- [x] PDF.js extracts general, STC, NOCT, temperature, application, and mechanical data entirely in the browser with no backend or API keys.
- [x] Multi-rating datasheet columns are detected and represented as separate module records/sheets named by rated power.
- [x] Each module preview uses the reference workbook's grouped sections, parameter names, order, and units, with shared values repeated.
- [x] The preview is editable and visually flags fields that are missing or need review instead of silently leaving them blank.
- [x] SheetJS exports a formatted `.xlsx` workbook through a Download Excel action.
- [x] The interface is clean and responsive on desktop and mobile and includes Netlify deployment notes.
