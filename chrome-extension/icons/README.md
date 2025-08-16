# Willi-Mako Chrome Extension Icons

This directory should contain the following icon files for the Chrome Extension:

## Required Icons

- `icon16.png` - 16x16 pixels - Used in the extension toolbar
- `icon32.png` - 32x32 pixels - Used in extension management
- `icon48.png` - 48x48 pixels - Used in extension management and Chrome Web Store
- `icon128.png` - 128x128 pixels - Used in Chrome Web Store and installation

## Design Guidelines

All icons should follow the Willi-Mako branding:

### Colors
- Primary: #147a50 (Willi-Mako green)
- Secondary: #ffffff (white)
- Accent: #f0f9ff (light blue)

### Design Elements
- Energy/lightning bolt symbol
- Clean, modern design
- High contrast for visibility
- Consistent with web application design

### Icon Content
- Base: Energy/lightning bolt icon
- Background: Willi-Mako green (#147a50)
- Symbol: White lightning/energy symbol
- Optional: Small "W" or "WM" monogram

## How to Create Icons

1. Use vector graphics software (Inkscape, Adobe Illustrator)
2. Create at highest resolution (128x128) first
3. Scale down to smaller sizes
4. Export as PNG with transparent background (if desired)
5. Test visibility at all sizes

## Installation

Place the PNG files in this directory with the exact names:
- icon16.png
- icon32.png  
- icon48.png
- icon128.png

The manifest.json file is already configured to reference these files.
