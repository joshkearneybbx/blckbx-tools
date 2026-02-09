# BLCK BX Design System Documentation

## Overview

The BLCK BX design system uses a **Dark Sand + Yellow CTA** color palette, creating a warm, sophisticated aesthetic perfect for a luxury travel service.

- **Background**: Rich warm sand (`#CDBCAD`)
- **CTA**: Warm gold/yellow (`#E7C51C`)
- **Typography**: EB Garamond (headings) + Maison Neue (body)

---

## Color Tokens

### Primary CTA (Yellow/Gold)

```css
--cta: 48 96% 51%;           /* #E7C51C - Main CTA */
--cta-hover: 45 95% 46%;     /* #D4B419 - Hover state */
--cta-foreground: 28 6% 12%; /* #1C1C1B - Text on CTA */
```

**Usage**: Primary buttons, links, key interactive elements

### Base Colors

```css
--base-black: 28 6% 12%;     /* #1C1C1B - Near black for text */
--base-white: 0 0% 100%;     /* Pure white */
```

### Sand Palette (Darker, Richer Tones)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--sand-50` | 40 20% 97% | #FAF9F8 | Lightest accents |
| `--sand-100` | 40 18% 94% | #EDE8E2 | Light backgrounds |
| `--sand-200` | 38 20% 88% | #DDD3C4 | Secondary backgrounds, buttons |
| `--sand-300` | 36 22% 82% | #CDBCAD | **Main app background** |
| `--sand-400` | 36 24% 72% | #B8A68C | Borders, dividers |
| `--sand-500` | 35 26% 62% | #938670 | Badges, accents |
| `--sand-600` | 34 28% 52% | #726956 | Muted elements |
| `--sand-700` | 33 30% 42% | #524C3E | Dark accents |
| `--sand-800` | 32 32% 32% | #363229 | Flight badges, UI elements |
| `--sand-900` | 30 34% 22% | #26241D | Darkest sand |

### Semantic Colors

```css
/* Success - Warm green */
--success: 152 62% 42%;      /* #1EA668 */
--success-light: 152 62% 92%;
--success-foreground: 0 0% 100%;

/* Warning - Warm orange */
--warning: 32 90% 55%;       /* #F4A658 */
--warning-light: 32 80% 90%;
--warning-foreground: 28 6% 12%;

/* Error - Clear red */
--error: 0 72% 51%;          /* #E33737 */
--error-light: 0 72% 92%;
--error-foreground: 0 0% 100%;

/* AI/Assistant colors */
--assistant-light: 180 60% 96%; /* #D6FEFF */
--assistant-dark: 192 35% 30%;  /* #274346 */
```

### Foreground Colors

```css
--foreground: 28 6% 12%;        /* #1C1C1B - Primary text */
--foreground-muted: 28 6% 40%;  /* #5C5853 - Secondary text */
--foreground-subtle: 36 20% 45%; /* #726B5D - Tertiary text */
```

### Surface Colors

```css
--background: 36 22% 88%;     /* #CDBCAD - Main app background */
--surface: 0 0% 100%;         /* White for cards */
--surface-alt: 40 18% 94%;    /* #EDE8E2 - Alternative card bg */
```

---

## Typography Tokens

### Font Families

```css
--font-sans: "Maison Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-serif: "EB Garamond", "Georgia", "Times New Roman", serif;
--font-mono: "Maison Neue Mono", "SF Mono", Menlo, Monaco, monospace;
```

### Typography Scale

| Element | Font | Size | Weight | Line-height |
|---------|------|------|--------|-------------|
| H1 | EB Garamond | clamp(2rem, 5vw, 3.5rem) | 600 | 1.1 |
| H2 | EB Garamond | clamp(1.5rem, 4vw, 2.5rem) | 600 | 1.2 |
| H3 | EB Garamond | clamp(1.25rem, 3vw, 1.75rem) | 600 | 1.3 |
| Body | Maison Neue | 1rem | 400 | 1.6 |
| Small | Maison Neue | 0.875rem | 400 | 1.5 |

---

## Spacing Tokens

```css
--radius: 0.5rem;      /* 8px - Default border radius */
--radius-sm: 0.375rem; /* 6px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
```

---

## Shadow Tokens

```css
--shadow-sm:   0 1px 2px 0 rgba(28, 28, 27, 0.06);
--shadow:      0 1px 3px 0 rgba(28, 28, 27, 0.10);
--shadow-md:   0 4px 6px -1px rgba(28, 28, 27, 0.12);
--shadow-lg:   0 10px 15px -3px rgba(28, 28, 27, 0.14);
--shadow-xl:   0 20px 25px -5px rgba(28, 28, 27, 0.16);
--shadow-2xl:  0 25px 50px -12px rgba(28, 28, 27, 0.22);
```

---

## Animation Tokens

```css
/* Easing functions */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Available Animation Classes

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-fade-in` | Fade from opacity 0 to 1 | 0.5s |
| `animate-slide-up` | Slide up + fade in | 0.6s |
| `animate-slide-down` | Slide down + fade in | 0.6s |
| `animate-scale-in` | Scale from 0.95 to 1 | 0.4s |
| `skeleton` | Shimmer loading effect | 2s |

### Stagger Delays

```css
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }
.delay-600 { animation-delay: 0.6s; }
```

### Micro-interactions

| Class | Effect |
|-------|--------|
| `hover-elevate` | Subtle overlay on hover |
| `hover-scale` | Scale to 1.02 with shadow |
| `button-press` | Scale to 0.97 on active |
| `toggle-elevate` | Background when toggled |

---

## Component-Specific Tokens

### Buttons

```css
/* Primary (Yellow CTA) */
bg-[hsl(var(--cta))]
text-[hsl(var(--cta-foreground))]
border-[hsl(var(--primary-border))]

/* Secondary (Sand) */
bg-[hsl(var(--sand-200))]
text-[hsl(var(--foreground))]
border-[hsl(var(--secondary-border))]

/* Destructive (Red) */
bg-[hsl(var(--error))]
text-[hsl(var(--error-foreground))]
```

### Cards

```css
bg-card: white
text-card-foreground: [hsl(var(--foreground))]
border-card: [hsl(var(--sand-200))]
```

### Badges

| Type | Background | Text |
|------|------------|------|
| Published (Itinerary) | Yellow CTA | Near black |
| Draft | Sand 300 | Muted |
| List | Assistant Light | Assistant Dark |
| Template | Sand 500 | White |
| Itinerary | Sand 200 | Foreground |

---

## Usage Examples

### Primary Button

```tsx
<Button variant="default">
  Create New
</Button>
```

### Secondary Button

```tsx
<Button variant="secondary">
  Cancel
</Button>
```

### Destructive Button

```tsx
<Button variant="destructive">
  Delete
</Button>
```

### Card with Animation

```tsx
<Card className="hover-scale animate-slide-up">
  <CardHeader>
    <CardTitle className="font-serif">Title</CardTitle>
  </CardHeader>
</Card>
```

### Text Colors

```tsx
<p className="text-foreground">Primary text</p>
<p className="text-foreground-muted">Secondary text</p>
<p className="text-foreground-subtle">Tertiary text</p>
```

### Background Colors

```tsx
<div className="bg-background">Main app bg</div>
<div className="bg-surface">White card</div>
<div className="bg-surface-alt">Light sand card</div>
```

---

## Dark Mode

All tokens automatically invert in dark mode while maintaining warmth:

```css
.dark {
  --background: 28 4% 10%;     /* Very dark warm grey */
  --surface: 28 5% 14%;        /* Dark sand */
  --foreground: 40 20% 96%;    /* Off-white text */
}
```

The yellow CTA (`--cta`) remains consistent across both modes for brand recognition.

---

## Custom Properties Reference

### Interaction States

```css
--elevate-1: rgba(28, 28, 27, 0.04);  /* Light overlay */
--elevate-2: rgba(28, 28, 27, 0.08);  /* Medium overlay */
--button-outline: rgba(28, 28, 27, 0.12);
--badge-outline: rgba(28, 28, 27, 0.08);
```

### Border Calculations

```css
--opaque-button-border-intensity: -6; /* Light mode */
/* Automatically calculates darker borders for buttons */
```

---

## Design Principles

1. **Warmth First**: Use sand tones as the foundation, not grays
2. **Yellow CTAs**: Use the yellow/gold CTA for primary actions only
3. **Elegant Typography**: EB Garamond for headings creates editorial feel
4. **Subtle Depth**: Use shadows and elevation, not heavy borders
5. **Smooth Motion**: Use `ease-out` timing for natural animations
6. **Responsive Scale**: Typography uses `clamp()` for fluid scaling

---

## Accessibility

- All color combinations meet WCAG AA standards
- Focus rings use yellow CTA color for consistency
- Supports `prefers-reduced-motion` for accessibility
- Semantic HTML with proper ARIA labels

---

## Migration Notes

When migrating components:

1. Replace hard-coded hex values with `hsl(var(--token-name))`
2. Add entrance animations: `animate-slide-up`
3. Add hover effects: `hover-scale` for cards
4. Use semantic color names: `--foreground-subtle` instead of `--gray-500`
5. Test in both light and dark modes

---

## File Locations

- **Main CSS**: `client/src/index.css`
- **Button Component**: `client/src/components/ui/button.tsx`
- **Design Tokens**: This file

---

## Changelog

### v2.0 - Dark Sand + Yellow CTA (Current)
- Changed from purple to yellow CTA
- Darkened sand background from #F5F3F0 to #CDBCAD
- Added comprehensive animation system
- Added semantic foreground colors
- Improved dark mode support

### v1.0 - Original Purple + Light Sand
- Purple primary (#6B1488)
- Light sand background (#F5F3F0)
