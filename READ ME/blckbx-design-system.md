# BLCK BX - Design System

## Typography

**Primary Font:** Noto Serif (styled/display variant)

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap');

font-family: 'Noto Serif', serif;
```

**Usage:**
- Headings: Noto Serif, weight 600-700
- Body: Noto Serif, weight 400
- UI elements: Can use system font or Noto Serif weight 400-500

---

## Color Palette

### Base Colors

| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Backgrounds, cards |
| Base Black | `#1C1C1B` | Primary text, headers |
| Black | `#000000` | Absolute black (rare) |

### CTA (Call to Action)

| Name | Hex | Usage |
|------|-----|-------|
| CTA | `#E7C51C` | Primary buttons, highlights, accent |

### Sand (Warm Neutrals)

| Name | Hex | Usage |
|------|-----|-------|
| Sand 100 | `#FAF9F8` | Page backgrounds (light mode) |
| Sand 200 | `#F5F3F0` | Card backgrounds, sections |
| Sand 300 | `#E8E5E0` | Borders, dividers |
| Sand 400 | `#D0D0D0` | Disabled states |
| Sand 500 | `#C0C79E` | Muted elements |
| Sand 600 | `#C0BA6E` | - |
| Sand 700 | `#AAA458` | - |
| Sand 800 | `#88B259` | - |
| Sand 900 | `#D2C029` | - |
| Sand 1000 | `#282624` | Dark text on light |
| Sand 1100 | `#232220` | - |
| Sand 1200 | `#1D1C1B` | Near black |
| Sand 1300 | `#171615` | Darkest sand |

### Grey (Cool Neutrals)

| Name | Hex | Usage |
|------|-----|-------|
| Grey 100 | `#F8F8F8` | Light backgrounds |
| Grey 200 | `#C0BDB0` | Borders |
| Grey 300 | `#989787` | Muted text |
| Grey 400 | `#686868` | Secondary text |
| Grey 500 | `#424242` | Body text |
| Grey 600 | `#2E2E2E` | Dark UI elements |
| Grey 700 | `#121212` | Near black |

### Mint (Accent)

| Name | Hex | Usage |
|------|-----|-------|
| Mint 1 | `#F6F8F8` | Light mint background |
| Mint 200 | `#C0BDB0` | Mint accent |
| Mint Pale 100 | `#B9B7B7` | Pale mint |
| Mint Pale 200 | `#B9B7B7` | Pale mint |

### Assistant (Purple Accent)

| Name | Hex | Usage |
|------|-----|-------|
| Assistant Light | `#D6FEFF` | AI chat bubbles (light) |
| Assistant Dark | `#274346` | AI chat bubbles (dark) |

### States (Feedback Colors)

| Name | Hex | Usage |
|------|-----|-------|
| Green Light | `#5BBE46` | Success background |
| Green | `#1EA668` | Success, confirmed |
| Orange Light | `#FFBB95` | Warning background |
| Orange | `#F4A658` | Warning, pending |
| Orange Dark | `#EB7C2F` | Warning emphasis |
| Orange Text | `#C0AA01` | Warning text |
| Error | `#E33737` | Error, destructive |

### Gradients

**Sand Gradient - Light Mode (App Background):**
```css
background: linear-gradient(to bottom, #F5F3F0, #E8E5E0);
/* Sand 100 → Sand 300 */
```

**Sand Gradient - Dark Mode (App Background):**
```css
background: linear-gradient(to bottom, #121212, #000000);
/* Grey 600 → Black */
```

---

## Tailwind Configuration

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Noto Serif', 'Georgia', 'serif'],
      },
      colors: {
        // Base
        'base-black': '#1C1C1B',
        
        // CTA
        'cta': '#E7C51C',
        
        // Sand palette
        'sand': {
          100: '#FAF9F8',
          200: '#F5F3F0',
          300: '#E8E5E0',
          400: '#D0D0D0',
          500: '#C0C79E',
          600: '#C0BA6E',
          700: '#AAA458',
          800: '#88B259',
          900: '#D2C029',
          1000: '#282624',
          1100: '#232220',
          1200: '#1D1C1B',
          1300: '#171615',
        },
        
        // Grey palette
        'grey': {
          100: '#F8F8F8',
          200: '#C0BDB0',
          300: '#989787',
          400: '#686868',
          500: '#424242',
          600: '#2E2E2E',
          700: '#121212',
        },
        
        // Mint
        'mint': {
          100: '#F6F8F8',
          200: '#C0BDB0',
          'pale-100': '#B9B7B7',
          'pale-200': '#B9B7B7',
        },
        
        // Assistant
        'assistant': {
          light: '#D6FEFF',
          dark: '#274346',
        },
        
        // States
        'success': {
          light: '#5BBE46',
          DEFAULT: '#1EA668',
        },
        'warning': {
          light: '#FFBB95',
          DEFAULT: '#F4A658',
          dark: '#EB7C2F',
          text: '#C0AA01',
        },
        'error': '#E33737',
      },
    },
  },
};
```

---

## CSS Variables (Alternative)

```css
:root {
  /* Base */
  --color-white: #FFFFFF;
  --color-base-black: #1C1C1B;
  --color-black: #000000;
  
  /* CTA */
  --color-cta: #E7C51C;
  
  /* Sand */
  --color-sand-100: #FAF9F8;
  --color-sand-200: #F5F3F0;
  --color-sand-300: #E8E5E0;
  --color-sand-400: #D0D0D0;
  --color-sand-500: #C0C79E;
  --color-sand-600: #C0BA6E;
  --color-sand-700: #AAA458;
  --color-sand-800: #88B259;
  --color-sand-900: #D2C029;
  --color-sand-1000: #282624;
  --color-sand-1100: #232220;
  --color-sand-1200: #1D1C1B;
  --color-sand-1300: #171615;
  
  /* Grey */
  --color-grey-100: #F8F8F8;
  --color-grey-200: #C0BDB0;
  --color-grey-300: #989787;
  --color-grey-400: #686868;
  --color-grey-500: #424242;
  --color-grey-600: #2E2E2E;
  --color-grey-700: #121212;
  
  /* Mint */
  --color-mint-100: #F6F8F8;
  --color-mint-200: #C0BDB0;
  
  /* Assistant */
  --color-assistant-light: #D6FEFF;
  --color-assistant-dark: #274346;
  
  /* States */
  --color-success-light: #5BBE46;
  --color-success: #1EA668;
  --color-warning-light: #FFBB95;
  --color-warning: #F4A658;
  --color-warning-dark: #EB7C2F;
  --color-warning-text: #C0AA01;
  --color-error: #E33737;
  
  /* Typography */
  --font-serif: 'Noto Serif', Georgia, serif;
}
```

---

## Component Color Mapping

### Buttons

```css
/* Primary Button (CTA) */
.btn-primary {
  background-color: #E7C51C;  /* CTA */
  color: #1C1C1B;             /* Base Black */
}

.btn-primary:hover {
  background-color: #D4B419;  /* Slightly darker CTA */
}

/* Secondary Button */
.btn-secondary {
  background-color: #F5F3F0;  /* Sand 200 */
  color: #1C1C1B;             /* Base Black */
  border: 1px solid #E8E5E0;  /* Sand 300 */
}

/* Destructive Button */
.btn-destructive {
  background-color: #E33737;  /* Error */
  color: #FFFFFF;
}
```

### Cards

```css
/* Light mode card */
.card {
  background-color: #FFFFFF;
  border: 1px solid #E8E5E0;  /* Sand 300 */
  border-radius: 8px;
}

/* Highlighted card section */
.card-highlight {
  background-color: #F5F3F0;  /* Sand 200 */
}
```

### Flight Card (Specific)

```css
.flight-card-header {
  background-color: #1C1C1B;  /* Base Black */
  color: #FFFFFF;
}

.flight-card-body {
  background-color: #F5F3F0;  /* Sand 200 */
}

.flight-card-notes {
  background-color: #FFBB95;  /* Warning Light / Orange */
  color: #1C1C1B;
}

.flight-card-track-btn {
  background-color: #E7C51C;  /* CTA - changed from purple */
  color: #1C1C1B;
}
```

### AI Chat Sidebar

```css
/* User message */
.chat-user {
  background-color: #F5F3F0;  /* Sand 200 */
  color: #1C1C1B;
}

/* Assistant message */
.chat-assistant {
  background-color: #D6FEFF;  /* Assistant Light */
  color: #274346;             /* Assistant Dark */
}

/* Dark mode assistant */
.dark .chat-assistant {
  background-color: #274346;  /* Assistant Dark */
  color: #D6FEFF;             /* Assistant Light */
}
```

### Form States

```css
/* Success state */
.input-success {
  border-color: #1EA668;  /* Success */
}

/* Warning state */
.input-warning {
  border-color: #F4A658;  /* Warning */
}

/* Error state */
.input-error {
  border-color: #E33737;  /* Error */
}

/* Auto-filled indicator */
.autofill-badge {
  background-color: #1EA668;  /* Success */
  color: #FFFFFF;
}
```

### Status Badges

```css
/* Published */
.badge-published {
  background-color: #1EA668;  /* Success */
  color: #FFFFFF;
}

/* Draft */
.badge-draft {
  background-color: #F5F3F0;  /* Sand 200 */
  color: #686868;             /* Grey 400 */
  border: 1px solid #E8E5E0;
}

/* List type */
.badge-list {
  background-color: #D6FEFF;  /* Assistant Light */
  color: #274346;             /* Assistant Dark */
}
```

---

## PDF Template Colors

Update the PDF template styles:

```typescript
// ItineraryPDFTemplate.tsx

const styles = StyleSheet.create({
  // Sidebar
  sidebar: {
    backgroundColor: '#1C1C1B',  // Base Black (was #1C1D1F)
    color: '#FFFFFF',
  },
  
  // Page background
  page: {
    backgroundColor: '#FAF9F8',  // Sand 100
  },
  
  // Card backgrounds
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E5E0',      // Sand 300
  },
  
  // Section backgrounds
  sectionBackground: {
    backgroundColor: '#F5F3F0',  // Sand 200
  },
  
  // Flight card header
  flightCardHeader: {
    backgroundColor: '#1C1C1B',  // Base Black
  },
  
  // Notes/reminders box
  notesBox: {
    backgroundColor: '#FFBB95',  // Warning Light
    color: '#1C1C1B',
  },
  
  // CTA button
  ctaButton: {
    backgroundColor: '#E7C51C',  // CTA Yellow
    color: '#1C1C1B',
  },
  
  // Links
  link: {
    color: '#E7C51C',            // CTA Yellow
  },
});
```

---

## Dark Mode

The design system supports dark mode with the Sand Gradient dark variant:

```css
/* Dark mode overrides */
.dark {
  --color-background: #121212;
  --color-surface: #1C1C1B;
  --color-text-primary: #FAF9F8;
  --color-text-secondary: #C0BDB0;
  --color-border: #2E2E2E;
}
```

---

## Summary of Key Changes from Previous Design

| Element | Old | New |
|---------|-----|-----|
| Primary accent | Purple `#6B1488` | Yellow CTA `#E7C51C` |
| Background | White/Light grey | Sand 100 `#FAF9F8` |
| Card backgrounds | White | Sand 200 `#F5F3F0` |
| Base black | `#1C1D1F` | `#1C1C1B` |
| Font | System/Sans-serif | Noto Serif |
| Track Flight button | Purple | Yellow CTA |
| Notes/Reminders | Orange `#F79A66` | Warning Light `#FFBB95` |
