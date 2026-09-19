# ImageTools

ImageTools is a privacy-first image utility with two independent applications:

```text
ImageTools/
├── frontend/  React + TypeScript + Vite + Tailwind
└── backend/   Node.js + Express + TypeScript
```

## Privacy model

Compression, resizing, previews, PDF creation, and downloads happen locally in the browser. Images are validated, decoded, processed in a Web Worker, and returned as local Blobs. They are never posted to Express or any third-party service.

The Express backend is deliberately minimal: `GET /api/health` returns `{ "status": "ok" }`. It has no upload, image, storage, database, or authentication routes.

## Frontend capabilities

- English/Hindi interface with local language preference
- JPEG, PNG, and WebP validation, file-size, dimension, and pixel limits
- Maximum-size and percentage compression via binary search over actual encoded Blob sizes
- Side-by-side original/compressed preview before download
- Independent resize workflow with proportion locking
- Local multi-image PDF creation, arrangement, page size, orientation, and margins
- Responsive mobile-first layout and browser security headers

## Development

Install each application independently:

```bash
cd frontend && npm install
cd ../backend && npm install
```

Run the frontend at `http://localhost:5173`:

```bash
npm run dev:frontend
```

In a second terminal, run the backend at `http://localhost:5000`:

```bash
npm run dev:backend
```

Copy `frontend/.env.example` and `backend/.env.example` to local `.env` files only when configuration needs to differ from the defaults.

## Build

```bash
npm run build
```

The Vite static site is written to `frontend/dist/`; the compiled Express service is written to `backend/dist/`.

## Security

SVG is excluded. The frontend validates MIME type and actual browser decoding before processing, limits source dimensions and pixels, avoids raw HTML injection, revokes object URLs, and keeps heavy canvas work in a Web Worker. Express allows requests only from the configured `FRONTEND_URL`, not a wildcard CORS origin.
