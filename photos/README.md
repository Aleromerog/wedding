# Wedding Photos

Place your wedding photos in this folder. The carousel will automatically pick them up.

## Supported Formats
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

## Tips for Best Results
- **Landscape orientation** works best (16:9 or similar)
- **High resolution** (at least 1920×1080) for sharp display on large screens
- Name your files in the order you want them to appear:  
  e.g. `001_ceremony.jpg`, `002_kiss.jpg`, `003_reception.jpg`

## How It Works
The carousel reads all image files from this folder automatically when you open `index.html` in a browser (via a local server) or visit the GitHub Pages URL. There's no need to edit any HTML or JavaScript.

> ⚠️ **Note:** Due to browser security restrictions, images only load automatically when the page is served via HTTP/HTTPS (e.g. GitHub Pages or a local server like `npx serve .`). If you open `index.html` directly as a file (`file://`), you'll need to list your images manually in `js/carousel.js`.
