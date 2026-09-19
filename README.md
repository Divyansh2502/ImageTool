# ImageTools

A privacy-first, mobile-first image utility that compresses images, resizes images, and creates PDFs entirely in the browser. There is no backend, account, database, image upload endpoint, or analytics.

## Features

- English and Hindi interface, with the chosen language stored locally
- JPEG, PNG, and WebP validation by MIME type and actual browser decoding
- Maximum-size compression (KB/MB) using a quality binary search in a Web Worker
- Percentage compression that targets an approximate final size and reports the real reduction
- Separate resize workflow with proportion lock enabled by default
- Local multi-image PDF generation, reordering controls, page size, orientation, and margins
- Responsive, keyboard-friendly interface with large controls and reduced-motion support

## Architecture

`app/page.tsx` contains the guided React workflows. Shared validation/download helpers live in `src/utils/image.ts`. The compression and resize canvas work runs in `src/workers/image.worker.ts` through `src/services/imageService.ts`, keeping the main UI responsive. PDF generation is browser-local and embeds canvas-rendered JPEG pages in a standards-based PDF Blob.

Images are limited to 25 MB, 8,000 pixels per side, and 32 megapixels. SVG is intentionally excluded. Object URLs are revoked after use, decoded worker bitmaps are closed, and workers terminate after every request.

## Compression behavior

Maximum-size compression encodes at a tested quality, measures its Blob, and uses nine binary-search iterations to select the highest practical quality at or below the requested size. It never intentionally changes dimensions. PNG offers an explicit choice to retain PNG or convert to WebP; transparency is retained by WebP.

Percentage mode uses the original file size to calculate an approximate target, then applies the same size-target search. The result screen shows the actual result instead of claiming an exact percentage.

## Security and privacy

User-controlled filenames are rendered by React, never inserted as HTML. File extensions are not trusted. The app validates allowed MIME types, file size, decoded dimensions, and pixel count before processing. `public/_headers` prepares a restrictive CSP plus type-sniffing, referrer, and permissions headers for compatible Cloudflare deployments.

## Development

```bash
npm ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Limitations

Browser canvas encoding support varies slightly by browser. Extremely small size targets may not be attainable without an unusable image; the app explains this and asks for a larger target. PDF images are converted to JPEG to keep PDF generation client-side and dependable, so transparency is flattened against the default canvas background.
