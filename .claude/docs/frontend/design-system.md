# Design System Documentation

## Visual Identity
**Theme**: Glassmorphism with terminal aesthetics
**Inspiration**: Basedash dashboard design
**Mood**: Professional, modern, powerful

## Color System

### Primary Palette
```css
--primary-gradient: linear-gradient(to right, #9333EA, #EC4899);
--purple-600: #9333EA;
--pink-600: #EC4899;
```

### Secondary Palette
```css
--secondary-gradient: linear-gradient(to right, #06B6D4, #3B82F6);
--cyan-500: #06B6D4;
--blue-600: #3B82F6;
```

### Neutral Palette
```css
--background: #0A0A0A;
--foreground: #FAFAFA;
--card: #1C1C1C;
--card-foreground: #FAFAFA;
--border: #2C2C2C;
--muted: #2C2C2C;
--muted-foreground: #A3A3A3;
```

### Semantic Colors
```css
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

## Typography Scale

### Font Families
```css
--font-sans: system-ui, -apple-system, sans-serif;
--font-mono: 'Fira Code', 'Cascadia Code', monospace;
```

### Size Scale
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

### Font Weights
- `font-normal`: 400
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700

## Spacing System

### Base Unit: 4px (0.25rem)
- `space-0`: 0
- `space-1`: 0.25rem (4px)
- `space-2`: 0.5rem (8px)
- `space-3`: 0.75rem (12px)
- `space-4`: 1rem (16px)
- `space-6`: 1.5rem (24px)
- `space-8`: 2rem (32px)
- `space-12`: 3rem (48px)

### Standard Gaps
- Card padding: `p-6`
- Section spacing: `space-y-6`
- Grid gaps: `gap-6`
- Inline spacing: `space-x-4`

## Effects Library

### Glassmorphism
```css
.glass-card {
  @apply rounded-xl border bg-card/50 backdrop-blur-sm;
}

.glass-heavy {
  @apply bg-card/70 backdrop-blur-md;
}

.glass-light {
  @apply bg-card/30 backdrop-blur-xl;
}
```

### Shadows
```css
.shadow-glow {
  box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
}

.shadow-subtle {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Borders
```css
.border-gradient {
  border-image: linear-gradient(to right, #9333EA, #EC4899) 1;
}

.border-subtle {
  @apply border border-border/50;
}
```

### Animations
```css
.animate-fade-in {
  animation: fadeIn 0.3s ease-in;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.transition-smooth {
  @apply transition-all duration-200 ease-in-out;
}
```

## Component Variants

### Cards
- **Default**: Glass effect with border
- **Solid**: Opaque background
- **Gradient**: Gradient border/background
- **Interactive**: Hover effects

### Buttons
- **Primary**: Gradient background
- **Secondary**: Glass effect
- **Ghost**: Transparent with border
- **Destructive**: Red/warning colors

### Inputs
- **Default**: Dark background with border
- **Focus**: Purple glow
- **Error**: Red border
- **Disabled**: Reduced opacity

## Responsive Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Accessibility Guidelines

### Color Contrast
- Text on dark: minimum 4.5:1
- Large text: minimum 3:1
- Interactive elements: minimum 3:1

### Focus States
- Visible focus rings
- Keyboard navigation support
- Skip links for navigation

### Motion
- Respect `prefers-reduced-motion`
- Provide motion toggles
- Keep animations subtle

## Usage Examples

### Standard Card
```tsx
<div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
  <h3 className="text-lg font-semibold mb-4">Card Title</h3>
  <p className="text-muted-foreground">Card content</p>
</div>
```

### Gradient Button
```tsx
<button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
  Click Me
</button>
```

### Data Display
```tsx
<div className="font-mono text-sm text-muted-foreground">
  {data}
</div>
```

---
*Last Updated: December 2024*
*Maintained by: frontend-context agent*