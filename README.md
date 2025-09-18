# 🐰 Rabbit - Data Analytics Platform

A comprehensive data analytics platform for media consumption insights across multiple platforms. Rabbit helps users understand their media consumption patterns through beautiful visualizations and intelligent insights.

## 🎯 Vision

Rabbit transforms raw media consumption data into actionable insights, starting with YouTube and expanding to podcasts, music, audiobooks, and other platforms. Our goal is to help users understand their digital consumption habits and make more intentional choices about their media consumption.

## 🏗️ Architecture

Rabbit is built as a monorepo with a platform-agnostic core and platform-specific implementations:

```
rabbit/
├── apps/web/                    # Next.js web application
├── packages/core/               # Platform-agnostic core logic
│   ├── types/                   # Shared type definitions
│   ├── parsers/                 # Data parsing engines
│   ├── analytics/               # Analytics engines
│   └── storage/                 # Data storage abstractions
├── platforms/                   # Platform-specific implementations
│   ├── youtube/                 # YouTube platform
│   ├── spotify/                 # Future: Spotify platform
│   └── podcast/                 # Future: Podcast platform
├── packages/ui/                 # Shared UI components
└── tools/                       # Development tools
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rabbit.git
cd rabbit

# Install dependencies
npm install

# Configure environment for the web app
cp apps/web/.env.example apps/web/.env.local
# Fill in Clerk + Convex keys in apps/web/.env.local

# Start Convex (in another terminal)
cd apps/web && npx convex dev

# Start the Next.js development server (from repo root)
cd -
npm run dev
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📊 Supported Platforms

### ✅ YouTube (Current)
- Google Takeout HTML parsing
- Watch history analysis
- Channel and topic insights
- Viewing pattern analysis
- Year-over-year comparisons

### 🔄 Coming Soon
- **Spotify**: Music listening history and insights
- **Podcasts**: Podcast consumption patterns
- **Audiobooks**: Reading/listening habits
- **More platforms**: As data sources become available

## 🧩 Core Features

### Data Processing
- **Multi-format parsing**: HTML, JSON, CSV support
- **Data validation**: Comprehensive error checking and data integrity
- **Deduplication**: Smart duplicate detection and removal
- **Normalization**: Consistent data structure across platforms

### Analytics Engine
- **KPI calculations**: Total consumption, unique creators, topics
- **Trend analysis**: Time-based patterns and growth metrics
- **Comparative analytics**: Year-over-year, quarter-over-quarter
- **Insight generation**: AI-powered consumption insights

### Visualization
- **Interactive dashboards**: Beautiful, responsive charts
- **Real-time filtering**: Dynamic data exploration
- **Export capabilities**: PDF reports, CSV exports
- **Mobile responsive**: Works on all devices

## 🛠️ Development

### Adding a New Platform

1. **Create platform directory**:
   ```bash
   mkdir platforms/new-platform
   ```

2. **Implement platform types**:
   ```typescript
   // platforms/new-platform/types/index.ts
   export interface NewPlatformRecord extends BaseMediaRecord {
     platform: 'NewPlatform'
     // platform-specific fields
   }
   ```

3. **Create parser**:
   ```typescript
   // platforms/new-platform/parsers/new-platform-parser.ts
   export class NewPlatformParser implements BaseParser<NewPlatformRecord> {
     // implement parser interface
   }
   ```

4. **Add analytics**:
   ```typescript
   // platforms/new-platform/analytics/new-platform-analytics.ts
   export class NewPlatformAnalytics extends BaseAggregations {
     // implement platform-specific analytics
   }
   ```

### Code Organization

- **Core packages**: Platform-agnostic logic that works across all platforms
- **Platform packages**: Platform-specific implementations
- **UI packages**: Shared components and design system
- **Apps**: Application-specific code (web, mobile, etc.)

## 📚 Documentation

- [Architecture Guide](docs/architecture/)
- [Platform Development](docs/platforms/)
- [API Reference](docs/api/)
- [Contributing Guide](docs/development/)

## 🚢 Deployment

- Web app (Vercel): see `apps/web/DEPLOYMENT.md`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts by [Recharts](https://recharts.org/)
- Icons by [Lucide](https://lucide.dev/)

---

**Rabbit** - Making sense of your digital consumption 🐰
