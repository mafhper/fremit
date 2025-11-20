# Fremit

A modern web tool for creating beautiful browser window mockups with custom backgrounds and styling options. Perfect for showcasing websites, applications, and designs in a professional format.

## Live Demo

Access the live application at: [https://mafhper.github.io/fremit/](https://mafhper.github.io/fremit/)

## Features

- **Multiple Input Methods**: Upload local images or paste URLs (direct images or website links)
- **Automatic Screenshot Generation**: Fetches OpenGraph images or screenshots from website URLs
- **Browser Window Styles**: Choose between macOS, Windows, or no window chrome
- **Customizable Backgrounds**: Solid colors, linear/radial gradients, or custom images
- **Dark/Light Mode**: Toggle between dark and light window themes
- **Export Options**: Download as PNG or JPEG at 2x resolution (Retina quality)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Theme Support**: System-wide theme detection and manual override

## Technologies Used

### Core Stack
- **React 18.2** - UI framework
- **TypeScript 5.9** - Type-safe development
- **Vite 7.2** - Build tool and dev server
- **Zustand 5.0** - Lightweight state management

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing and autoprefixing
- **Radix UI** - Accessible component primitives

### Image Processing
- **html-to-image 1.11** - Screenshot generation
- **colorthief 2.6** - Automatic color palette extraction
- **images.weserv.nl** - CORS proxy for external images
- **microlink.io API** - Website metadata and screenshot extraction

### UI Components
- **Lucide React** - Icon library
- **class-variance-authority** - Component variant management
- **tailwind-merge** - Utility class merging

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mafhper/fremit.git
cd fremit
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist` directory.

### Deploying to GitHub Pages

This project is configured for automatic deployment via GitHub Actions.

**Automatic Deployment:**

1. Push your code to the `main` branch:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

2. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:
   - Install dependencies
   - Build the project
   - Deploy to GitHub Pages

3. Enable GitHub Pages in your repository settings:
   - Go to Settings > Pages
   - Source: Choose "GitHub Actions"

The site will be available at `https://[username].github.io/fremit/`

**Manual Deployment:**

If you prefer to deploy manually:

```bash
npm run build
# Then deploy the dist folder to your hosting provider
```

## Project Structure

```
fremit/
├── public/              # Static assets
│   ├── favicon.svg     # Adaptive favicon
│   └── icon.svg        # App icon
├── src/
│   ├── components/     # React components
│   │   ├── editor/    # Editor controls (sidebar)
│   │   ├── layout/    # Layout components
│   │   ├── preview/   # Preview area components
│   │   └── ui/        # Reusable UI primitives
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions
│   ├── store/         # Zustand state management
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Root component
│   ├── index.css      # Global styles and themes
│   └── main.tsx       # App entry point
├── index.html         # HTML template
├── package.json       # Dependencies and scripts
├── tailwind.config.js # Tailwind configuration
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## How It Works

1. **Image Input**: Users can upload local images or paste URLs. The system automatically detects image URLs vs. website URLs.

2. **Metadata Extraction**: For website URLs, Fremit uses the microlink.io API to fetch OpenGraph images and page titles, with fallback to screenshots.

3. **Color Extraction**: The ColorThief library analyzes uploaded images and automatically generates complementary gradient backgrounds.

4. **CORS Handling**: External images are proxied through images.weserv.nl to avoid CORS issues during both preview and export.

5. **Export**: The html-to-image library captures the preview area as a PNG or JPEG, with double-rendering to prevent artifacts.

## Configuration

### Theme Customization

Edit `src/index.css` to modify the color scheme. The theme uses CSS custom properties for easy customization:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 6%;
  --primary: 0 0% 6%;
  /* ... */
}
```

### Default Settings

Modify `src/store/useStore.ts` to change default values:

```typescript
windowType: 'mac',        // Browser window style
windowShadow: 'xl',       // Shadow size
darkMode: true,           // Dark/light window
bgType: 'gradient',       // Background type
padding: 64,              // Default padding
// ...
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Known Limitations

- Screenshot quality for some websites may vary depending on microlink.io availability
- Very large images may take longer to export
- Some websites may not provide OpenGraph images

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Inspired by modern design tools and mockup generators
- Built with open-source technologies and APIs
