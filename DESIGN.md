---
version: alpha
name: DocuFlow-design-system
description: "A clean, professional document-tool canvas built on near-white surfaces with a single deep-indigo accent (#4F46E5). The system combines Vercel's typographic precision (tight negative tracking, pill CTAs), Linear's minimal chrome, and Notion's warm pastel feature cards. Display type uses Inter at 600–700 weight with aggressive negative letter-spacing. Cards are soft-surface panels with 12px corners and hairline borders. The hero section uses a subtle indigo-to-sky gradient mesh. All processing badges are semantic-colored pills. The design is light-first — dark canvas is not used — because document tools are print-oriented and reading-optimized."

colors:
  primary: "#4F46E5"
  primary-hover: "#6366F1"
  primary-focus: "#4338CA"
  primary-soft: "#EEF2FF"
  primary-muted: "#C7D2FE"
  on-primary: "#ffffff"
  ink: "#111827"
  ink-secondary: "#374151"
  ink-muted: "#6B7280"
  ink-subtle: "#9CA3AF"
  canvas: "#FFFFFF"
  canvas-soft: "#F9FAFB"
  canvas-muted: "#F3F4F6"
  surface: "#FFFFFF"
  surface-raised: "#FFFFFF"
  hairline: "#E5E7EB"
  hairline-strong: "#D1D5DB"
  accent-emerald: "#059669"
  accent-emerald-soft: "#D1FAE5"
  accent-amber: "#D97706"
  accent-amber-soft: "#FEF3C7"
  accent-rose: "#E11D48"
  accent-rose-soft: "#FFE4E6"
  accent-sky: "#0284C7"
  accent-sky-soft: "#E0F2FE"
  accent-violet: "#7C3AED"
  accent-violet-soft: "#EDE9FE"
  accent-fuchsia: "#C026D3"
  accent-fuchsia-soft: "#FAE8FF"
  gradient-hero-start: "#312E81"
  gradient-hero-mid: "#1E3A5F"
  gradient-hero-end: "#0C4A6E"
  semantic-success: "#059669"
  semantic-success-soft: "#D1FAE5"
  semantic-warning: "#D97706"
  semantic-error: "#DC2626"
  semantic-error-soft: "#FEE2E2"

typography:
  display-xl:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -2.5px
  display-lg:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -1.5px
  display-md:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.0px
  heading-1:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: -0.3px
  heading-3:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.2px
  body-lg:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: 0
  body-md:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.1px
  caption:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  caption-strong:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 0.2px
  button:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  button-lg:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  mono:
    fontFamily: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  eyebrow:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0.5px
    textTransform: uppercase

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
  hero: 120px

components:
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 64px
    border-bottom: "1px solid {colors.hairline}"
  nav-link:
    textColor: "{colors.ink-muted}"
    hoverTextColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-badge-free:
    backgroundColor: "{colors.accent-emerald-soft}"
    textColor: "{colors.accent-emerald}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-focus:
    backgroundColor: "{colors.primary-focus}"
    textColor: "{colors.on-primary}"
    boxShadow: "0 0 0 3px {colors.primary-soft}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    border: "1px solid {colors.hairline-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    hoverTextColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
    border: "1px solid {colors.hairline}"
  card-tool:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "24px"
    border: "1px solid {colors.hairline}"
    shadow: "0 1px 3px rgba(0,0,0,0.04)"
  card-tool-hover:
    translateY: -4px
    shadow: "0 12px 24px rgba(0,0,0,0.08)"
    borderColor: "{colors.primary-muted}"
  card-feature:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "32px"
  card-feature-tint-peach:
    backgroundColor: "#FFF7ED"
  card-feature-tint-sky:
    backgroundColor: "{colors.accent-sky-soft}"
  card-feature-tint-emerald:
    backgroundColor: "{colors.accent-emerald-soft}"
  card-feature-tint-violet:
    backgroundColor: "{colors.accent-violet-soft}"
  badge-processing:
    typography: "{typography.caption-strong}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-browser:
    backgroundColor: "{colors.accent-sky-soft}"
    textColor: "{colors.accent-sky}"
  badge-server:
    backgroundColor: "{colors.accent-violet-soft}"
    textColor: "{colors.accent-violet}"
  badge-external:
    backgroundColor: "{colors.accent-amber-soft}"
    textColor: "{colors.accent-amber}"
  hero-section:
    backgroundColor: "linear-gradient(135deg, {colors.gradient-hero-start}, {colors.gradient-hero-mid}, {colors.gradient-hero-end})"
    textColor: "{colors.canvas}"
    padding: "120px 24px"
  hero-badge:
    backgroundColor: "rgba(255,255,255,0.12)"
    textColor: "rgba(255,255,255,0.90)"
    border: "1px solid rgba(255,255,255,0.20)"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  hero-stat-card:
    backgroundColor: "rgba(255,255,255,0.08)"
    textColor: "{colors.canvas}"
    border: "1px solid rgba(255,255,255,0.12)"
    rounded: "{rounded.xl}"
    padding: "20px"
  section-heading:
    typography: "{typography.display-md}"
    textColor: "{colors.ink}"
  section-description:
    typography: "{typography.body-lg}"
    textColor: "{colors.ink-muted}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.caption}"
    border-top: "1px solid {colors.hairline}"
    padding: "48px 24px"
  footer-link:
    textColor: "{colors.ink-muted}"
    hoverTextColor: "{colors.primary}"
    typography: "{typography.body-sm}"
  form-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  form-input-focus:
    borderColor: "{colors.primary}"
    boxShadow: "0 0 0 3px {colors.primary-soft}"

layout:
  max-width: 1280px
  content-max-width: 1024px
  nav-height: 64px
  section-gap: 80px
  card-gap: 24px
  grid-cols-mobile: 1
  grid-cols-tablet: 2
  grid-cols-desktop: 4

motion:
  default-duration: 200ms
  default-easing: cubic-bezier(0.4, 0, 0.2, 1)
  hover-translateY: -4px
  hover-duration: 200ms
  card-shadow-transition: 200ms

design-principles:
  - "Light canvas, single accent: White/gray surfaces with deep-indigo (#4F46E5) as the only chromatic accent."
  - "Pill CTAs, tight tracking: Vercel-inspired pill buttons with Inter display at -1.0 to -2.5px tracking."
  - "Pastel-tinted cards: Notion-inspired soft-tinted feature cards for visual variety without visual noise."
  - "Semantic processing badges: Blue for browser, violet for server, amber for external — always pills."
  - "Minimal chrome: The UI frame is thin and quiet; the tool content is the hero."
  - "Document-first: Print-oriented light surfaces, high contrast text, reading-optimized typography."
