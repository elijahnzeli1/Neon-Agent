# Neon Agent Icon Generation

## SVG to PNG Conversion

The Neon Agent extension requires a PNG icon (128x128 pixels) for VS Code marketplace compatibility.

### Method 1: Using Online Converters (Recommended)
1. Go to any online SVG to PNG converter (e.g., https://cloudconvert.com/svg-to-png)
2. Upload the `images/icon.svg` file
3. Set dimensions to 128x128 pixels
4. Download as `icon.png` and place in `images/` directory

### Method 2: Using Node.js Script (if you have sharp installed)
```bash
npm install sharp
node scripts/convert-icon.js
```

### Method 3: Manual Creation using Design Tools
If you prefer to create manually:
- Use any graphics editor (GIMP, Photoshop, Figma, etc.)
- Create a 128x128 pixel canvas
- Design based on the concept in icon.svg:
  - Blue/cyan gradient background circle
  - Neural network nodes and connections
  - White coding brackets `<` and `/>`
  - Binary digits "01", "10", "11"
  - "AI" and "ML" text
- Export as PNG with transparent background

### Quick Alternative: Use a Simple Design
For immediate testing, you can create a simple 128x128 PNG with:
- Blue gradient background
- White "AI" text in center
- Coding brackets around it

The SVG file provides the complete design reference for manual recreation.

## Requirements
- Format: PNG
- Size: 128x128 pixels
- Location: `images/icon.png`
- Style: Represents AI coding assistant theme
