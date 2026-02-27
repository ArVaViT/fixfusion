<p align="center">
  <img src="assets/logo.svg" alt="FixFusion Logo" width="320" />
</p>

<h1 align="center">FixFusion</h1>

<p align="center">
  <strong>Premium Construction &amp; Renovation — Indiana</strong>
</p>

<p align="center">
  <a href="https://www.fixfusionbuild.com">
    <img src="https://img.shields.io/badge/Website-fixfusionbuild.com-c1a47d?style=flat-square" alt="Website" />
  </a>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=000" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
</p>

---

## Overview

**FixFusion** is a high-performance, mobile-first landing page for a premium construction company based in Indiana. Built with zero frameworks — just clean, hand-crafted HTML, CSS, and JavaScript.

### Key Features

| Feature | Details |
|---------|---------|
| **Mobile-first responsive** | Pixel-perfect on every screen from 320px to 4K |
| **Multi-step quote form** | 3-step wizard with real-time validation & email delivery via [Web3Forms](https://web3forms.com) |
| **Scroll animations** | IntersectionObserver-powered reveal, counters, parallax |
| **Accessibility** | ARIA landmarks, skip-link, focus-visible, prefers-reduced-motion, keyboard navigation |
| **Security** | CSP meta header, input sanitization, honeypot spam protection, rate-limiting |
| **SEO** | Open Graph, JSON-LD structured data, semantic HTML5, canonical URL |
| **Performance** | No frameworks, preloaded assets, lazy-loaded images, `will-change` hints |

---

## Project Structure

```
fixfusion/
├── assets/              # Images, SVG icons, logos
│   ├── icons/           # Service icons (1.svg – 9.svg)
│   ├── banner.png       # Hero background (desktop)
│   ├── mobile_logo.png  # Hero background (mobile)
│   ├── logo.svg         # Main logo
│   ├── logo2.svg        # Navigation logo
│   └── ...
├── tests/               # Jest unit tests
│   └── script.test.js
├── index.html           # Single-page HTML
├── styles.css           # All styles (mobile-first)
├── script.js            # All interactivity (strict mode, IIFE)
├── package.json         # Dev dependencies (Jest)
├── .gitignore
└── README.md
```

---

## Getting Started

No build step needed. Open `index.html` in any browser.

### Local development

```bash
# Clone
git clone https://github.com/ArvavTheMan/fixfusion.git
cd fixfusion

# Open in browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Run tests

```bash
npm install
npm test
```

---

## Tech Stack

- **HTML5** — Semantic markup, ARIA roles, structured data
- **CSS3** — Custom properties, `clamp()`, CSS Grid, Flexbox, keyframe animations
- **JavaScript** — ES5+ in strict-mode IIFE, IntersectionObserver, Fetch API
- **Web3Forms** — Serverless form submission → email delivery
- **Jest** — Unit testing with jsdom

---

## Form & Email

The quote form submits to [Web3Forms](https://web3forms.com). No backend needed. Submissions are delivered to the configured email address.

**Security layers:**
- HTML5 `pattern` + `minlength` / `maxlength` attributes
- Client-side validation per step (name, phone, email format)
- Input sanitization (HTML entity encoding)
- Honeypot field to block bots
- Rate-limiting (5 s cooldown between submits)
- Content Security Policy restricts `connect-src` to `api.web3forms.com`

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome  | 90+     |
| Firefox | 88+     |
| Safari  | 14+     |
| Edge    | 90+     |
| iOS Safari | 14+  |
| Samsung Internet | 14+ |

---

## License

This project is proprietary software owned by **FixFusion LLC**. All rights reserved.

---

<p align="center">
  Made with precision for <strong>FixFusion</strong>
</p>
