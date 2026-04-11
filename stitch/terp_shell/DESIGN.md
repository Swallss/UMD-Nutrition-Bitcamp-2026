# Design System Strategy: The Kinetic Collegiate Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Heritage."** 

We are moving away from the "standard university portal" aesthetic—which often feels academic, static, and cluttered—and moving toward a high-end editorial experience. This system interprets "Terp Pride" not as a collection of logos, but as an energetic, high-contrast movement. We utilize **intentional asymmetry**, heavy typographic scaling, and a "layered-glass" depth model to make the University of Maryland’s digital presence feel as fast-paced and prestigious as its campus life.

By breaking the rigid grid with overlapping elements and using the Maryland flag patterns as deconstructed, large-scale background textures rather than small icons, we create a sense of scale and institutional "soul."

---

## 2. Colors & Surface Philosophy
This system leverages a high-contrast palette rooted in tradition but executed with modern depth.

### The "No-Line" Rule
**Structural borders are strictly prohibited.** To define sections, designers must use background color shifts or tonal transitions. For example, a card component should never have a 1px stroke; it should be defined by sitting a `surface-container-lowest` card atop a `surface-container-low` background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
*   **Base:** `surface` (#f9f9f9)
*   **Sectioning:** Use `surface-container-low` (#f3f3f3) for secondary content areas.
*   **Elevation:** Use `surface-container-lowest` (#ffffff) for the highest priority cards to create a natural "lift."

### The "Glass & Gradient" Rule
To inject "soul" into the interface, primary CTAs and Hero sections should utilize subtle gradients rather than flat fills. Use a transition from `primary` (#b61825) to `primary-container` (#d9353a) at a 135-degree angle. For floating navigation or modals, apply **Glassmorphism**: use semi-transparent `surface` colors with a `backdrop-blur` of 20px to allow the Maryland Gold or Red brand accents to bleed through from the background.

---

## 3. Typography
We use **Plus Jakarta Sans** as our signature typeface. It offers a more contemporary, geometric rhythm than standard sans-serifs, providing the "Modern & Sleek" vibe requested.

*   **Display (lg/md/sm):** Reserved for high-impact "Terp Pride" moments. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an editorial, "poster-like" feel.
*   **Headline (lg/md/sm):** Used for primary page headers. These should be bold and authoritative, anchoring the page.
*   **Title (lg/md/sm):** For card titles and section headers. 
*   **Body (lg/md/sm):** Optimized for readability. Use `body-lg` (1rem) for general content to maintain a "student-friendly" and accessible feel.
*   **Labels:** Use `label-md` (0.75rem) in all-caps with increased letter-spacing (+0.05em) for category tags or overlines.

---

## 4. Elevation & Depth
We eschew traditional drop shadows in favor of **Tonal Layering** and **Ambient Light.**

*   **The Layering Principle:** Depth is achieved by stacking. A `primary-container` element should sit on a `surface` background to provide immediate visual hierarchy without needing a border.
*   **Ambient Shadows:** If a floating element (like a FAB) is required, use a high-spread, low-opacity shadow. 
    *   *Shadow Color:* A tinted version of `on-surface` at 4% opacity. 
    *   *Blur:* 40px to 60px.
*   **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use the `outline-variant` token at **10% opacity**. Never use a 100% opaque border.
*   **Flag Pattern Integration:** The Maryland flag patterns should be used as "watermarks." Place deconstructed Calvert or Crossland patterns at 5% opacity behind content layers, creating a sense of "layered history."

---

## 5. Components

### Buttons
*   **Primary:** High-energy. Use the `primary` to `primary-container` gradient. Corner radius: `full` (9999px) for an energetic, mobile-first feel.
*   **Secondary:** Use `secondary-container` (#fdd000). This provides the "Maryland Gold" punch without the visual weight of the Red.
*   **Tertiary:** Ghost style. No background, `on-surface` text, with a subtle `surface-variant` hover state.

### Cards & Lists
*   **The Divider Ban:** Do not use line dividers between list items. Use 16px to 24px of vertical whitespace (Spacing Scale) or subtle background shifts (`surface-container`) to separate content blocks.
*   **Corners:** Apply `xl` (1.5rem) or `lg` (1rem) roundedness to all cards to keep the vibe friendly and modern.

### Chips (Action & Filter)
*   **Style:** Use `secondary-fixed` (#ffe07c) for active states. Use `surface-container-high` (#e8e8e8) for inactive states. This creates a tactile, button-like interface that encourages exploration.

### Inputs & Text Fields
*   **Style:** Soft-filled. Use `surface-container-highest` (#e2e2e2) as the background fill with no border. On focus, transition the background to `white` and add a 2px "Ghost Border" of `primary`.

### Signature Component: The "Heritage Banner"
A full-bleed horizontal element using the Maryland Flag pattern deconstructed into a subtle, monochromatic grey/white texture, overlaid with a `primary` (#b61825) gradient at 80% opacity. Use this for major section breaks.

---

## 6. Do’s and Don’ts

### Do
*   **Do** embrace asymmetry. Let a large `display-lg` headline bleed off the edge of a container or overlap a photo.
*   **Do** use "Maryland Gold" (`secondary`) sparingly as a tactical highlight (icons, chips, active states) rather than a background fill.
*   **Do** prioritize whitespace. The "Modern" feel comes from the "breathing room" between high-contrast elements.

### Don't
*   **Don't** use 1px black borders. It cheapens the brand and creates visual noise.
*   **Don't** stack Red text on Black backgrounds. Maintain accessibility by using `on-primary` (White) on `primary` (Red) surfaces.
*   **Don't** use the Maryland flag pattern in its full-color, high-detail form as a background for text; it creates too much "visual vibration." Deconstruct it or use it as a subtle watermark.
*   **Don't** use standard "Drop Shadows." Stick to Tonal Layering and high-blur Ambient Shadows.