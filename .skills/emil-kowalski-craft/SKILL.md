---
name: emil-kowalski-craft
description: |
  UI/UX design craft, micro-interactions, spring animations, polished component interaction design, Framer Motion best practices, fluid gestures, sound/haptics, layout transitions, typography, spacing, depth, and spatial details inspired by Emil Kowalski (Creator of Sonner, Vaul, Animations.dev).

  Trigger whenever:
  - Designing or refining React UI components requiring top-tier micro-interactions and polish.
  - Adding animations, drawers, toasts, popovers, smooth drag interactions, or page transitions.
  - Implementing physics-based motion (stiffness, damping, mass) instead of basic CSS transitions.
  - Polishing typography, border glows, noise backgrounds, tactile button presses, or dark mode depth.
---

# Emil Kowalski UI Craft & Motion Skill

A masterclass guide and execution blueprint for building world-class, hyper-polished web interfaces inspired by Emil Kowalski (Creator of **Sonner**, **Vaul**, and **Animations.dev**).

---

## 1. Core Principles of Interface Craft

### A. Physics Over Duration
- **Never use fixed duration easing** (`transition: all 0.3s ease`) for natural UI elements.
- **Always prefer spring physics**:
  - **Quick & Snappy** (Buttons, Toggles): `stiffness: 400`, `damping: 30`, `mass: 0.8`
  - **Fluid & Smooth** (Modals, Drawers): `stiffness: 250`, `damping: 25`, `mass: 1`
  - **Bouncy & Playful** (Badges, Micro-popovers): `stiffness: 500`, `damping: 15`

### B. Tactile Feedback & Micro-Interactions
- **Active / Press States**: Scale elements down slightly on press to simulate physical resistance (`whileTap={{ scale: 0.96 }}`).
- **Hover States**: Subtle elevation, subtle brightness change (+5% lightness), or a 1px border highlight rather than drastic color changes.
- **Cursor Sensitivity**: Smooth hover-follow gradients or spotlight effects on cards.

### C. Spatial Depth & Layering
- **Borders over Shadows**: High-end dark modes use subtle 1px border highlights (`border: 1px solid rgba(255, 255, 255, 0.08)`) and inner highlights rather than heavy drop shadows.
- **Glassmorphism & Blur**: Use `backdrop-filter: blur(12px) saturate(180%)` paired with semi-transparent backgrounds (`rgba(18, 18, 20, 0.75)`).
- **Tabular Numbers**: Always use `font-variant-numeric: tabular-nums` for counters, timers, and prices to eliminate layout jitter.

---

## 2. Key Component Craft Patterns

### A. Drawers (Vaul Style)
- **Physics**: Drag gestures with rubber-band effect when pulled past limits.
- **Background Scaling**: Scale down the underlying page content (`scale(0.95)` with `border-radius: 12px`) as the drawer opens.
- **Velocity Tracking**: Snap open/closed based on release velocity rather than distance threshold alone.

### B. Toasts (Sonner Style)
- **Stacking Mechanics**: Stack toasts with vertical offset, scaling older toasts down (`scale(0.95)`, `scale(0.9)`) and reducing opacity.
- **Expand on Hover**: Hovering over the toast stack smoothly expands all toasts into a full visible list using Framer Motion `layout` animation.
- **Swipe-to-Dismiss**: Drag toast horizontally or vertically to dismiss with velocity-based fling out.

### C. Shared Element Layout Transitions (`layoutId`)
- Use Framer Motion `layoutId` for tabs, magic nav hover indicators, and expanded card views:
```tsx
{isActive && (
  <motion.div
    layoutId="active-indicator"
    className="absolute inset-0 bg-white/10 rounded-lg"
    transition={{ type: "spring", stiffness: 380, damping: 30 }}
  />
)}
```

---

## 3. High-Craft CSS & Animation Checklist

1. **GPU Acceleration**: Always animate `transform` (`scale`, `translate3d`) and `opacity`. Avoid animating `width`, `height`, `top`, or `margin`.
2. **Will-Change Strategy**: Add `will-change: transform` only during active drag/animation to prevent memory leaks.
3. **Smooth Scroll**: Native momentum scrolling `-webkit-overflow-scrolling: touch` with customized scrollbars.
4. **Keyboard & Focus**:
   - Subtle customized focus ring: `outline: 2px solid rgba(255,255,255,0.4)`, `outline-offset: 2px`.
   - Never suppress outline without providing a visible custom focus ring.

---

## 4. Implementation Snippets

### Snappy Button Press Component
```tsx
import { motion } from "framer-motion";

export const CraftButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="relative px-4 py-2 rounded-xl bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-sm hover:border-neutral-700 active:bg-neutral-800 transition-colors text-sm font-medium"
    >
      {children}
    </motion.button>
  );
};
```
