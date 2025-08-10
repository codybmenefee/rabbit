# YouTube Analytics Intelligence Platform

A modern, AI-powered analytics dashboard for YouTube viewing history analysis. Built with Next.js, TypeScript, and advanced data visualizations.

## Features

🎯 **Comprehensive Analytics**
- Total watch time, videos watched, channel diversity metrics
- Year-over-year creator comparison and trending analysis
- Topic-based heatmaps showing interest evolution over time

📊 **Advanced Visualizations**
- Stream graphs showing topic evolution
- Creator loyalty matrix with engagement patterns
- Event correlation detection and impact analysis
- Interactive heatmaps and scatter plots

🤖 **AI-Powered Insights**
- Automatic pattern detection
- Event correlation analysis
- Personalized viewing behavior insights
- Predictive trend analysis

🎨 **Modern Design**
- Glass morphism UI with vibrant gradients
- Dark theme with neon accents
- Smooth animations and micro-interactions
- Responsive design for all devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **UI Components**: Custom shadcn/ui implementation

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Data Structure

The app is designed to process YouTube Takeout data with the following structure:

```typescript
interface VideoWatch {
  id: string
  title: string
  channel: string
  category: string
  duration: number
  watchedAt: Date
  watchedDuration: number
  url: string
}
```

## Architecture

The project is structured for easy backend integration:

- `types/` - TypeScript interfaces for all data models
- `lib/mock-data.ts` - Mock data generator (replace with API calls)
- `components/dashboard/` - Visualization components
- `app/` - Next.js app router pages

## Customization

### Adding New Visualizations

1. Create a new component in `components/dashboard/`
2. Add required data types to `types/index.ts`
3. Update mock data generator in `lib/mock-data.ts`
4. Import and use in the main dashboard page

### Color Schemes

Colors are defined in `tailwind.config.js` and `app/globals.css`. The design uses:
- Deep black/purple backgrounds
- Vibrant gradient accents (purple, pink, cyan)
- Glass morphism effects with backdrop blur

### Data Integration

Replace mock data functions in `lib/mock-data.ts` with actual API calls:

```typescript
// Replace this
export function getMockWatchHistory(): VideoWatch[] {
  return generateRandomWatchHistory()
}

// With this
export async function getWatchHistory(): Promise<VideoWatch[]> {
  const response = await fetch('/api/watch-history')
  return response.json()
}
```

## Performance

- Uses React 19 with concurrent features
- Recharts for optimized chart rendering
- Framer Motion for smooth animations
- Tailwind for minimal CSS bundle size

## Future Enhancements

- Real-time data processing
- Export capabilities (PDF, CSV)
- Advanced filtering and time range selection
- Social comparison features
- Mobile app companion
- YouTube API integration for live data

## License

MIT License - feel free to use for personal or commercial projects.