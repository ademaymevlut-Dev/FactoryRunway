# 00 - Development Rules

This document defines the required coding rules for Factory Runway.
Every new feature, UI screen, component, and refactor must follow these rules.

---

## 1. Main Principle

Factory Runway is not a normal website.
It is a web-based business simulation game.

The main game experience must stay inside the `/game` route.

The player should remain inside the factory map experience.
Do not create separate route pages for normal game modules such as orders, production, staff, finance, reports, factory upgrades, notifications, or shift results.

Use the main Game Shell architecture.

---

## 2. Main Game Architecture

The main game screen must follow this structure:

```txt
/game
  GameShell
    FactoryMap
    DockMenu
    TopStatusBar
    ShiftControlBar
    NotificationCenter
    OverlayLayerManager
```

The factory map must remain visible as the main background experience.

Game modules must open as panels, modals, side panels, bottom sheets, or fullscreen layers over the map.

---

## 3. Routing Rules

Do not create new routes for normal gameplay panels.

Allowed separate routes:

```txt
/auth
/onboarding
/tutorial
/admin
/settings
/profile
/help
```

Not allowed as separate routes:

```txt
/game/orders
/game/production
/game/staff
/game/finance
/game/reports
/game/factory
```

These must be implemented as components opened inside `/game`.

---

## 4. Panel System Rules

All gameplay panels must be opened through the central panel system.

Use:

```txt
OverlayLayerManager
panelRegistry
game-ui-store
```

Do not define large panel components directly inside `page.tsx`.

Do not create one-off inline components inside a page just to finish a task quickly.

Each panel must live in its own feature folder.

Example:

```txt
features/orders/components/OrdersPanel.tsx
features/orders/components/OrderDetailPanel.tsx
features/production/components/ProductionPanel.tsx
features/staff/components/StaffPanel.tsx
```

Panel opening must use the UI store:

```ts
openPanel("orders")
openPanel("orderDetail", { orderId })
openPanel("lineDetail", { lineId })
```

---

## 5. Component Rules

Components must be reusable, isolated, and placed in the correct folder.

Do not write large UI blocks directly inside route files.

Route files should only load data and render the main shell or page-level component.

Good:

```tsx
export default async function GamePage() {
  const snapshot = await getGameSnapshot();

  return <GameShell initialSnapshot={snapshot} />;
}
```

Bad:

```tsx
export default function GamePage() {
  function OrdersPanel() {
    // large inline component
  }

  return (
    // huge page with all UI logic inside
  );
}
```

---

## 6. Styling Rules

Use Tailwind CSS utility classes for styling.

Use shadcn/ui components when possible.

Do not add feature-specific styles to `globals.css`.

`globals.css` may only be used for:

```txt
global CSS variables
theme tokens
base body styles
font smoothing
very general reusable animations
global reset-like rules
```

Do not put page-specific, panel-specific, card-specific, or button-specific styles in `globals.css`.

Bad:

```css
.orders-panel-card {
  background: ...
}
```

Good:

```tsx
<div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl">
```

If a style is repeated often, create a reusable component or utility function.
Do not move it to `globals.css` unless it is truly global.

---

## 7. shadcn/ui Rules

Use existing shadcn/ui components before creating custom base components.

Preferred components:

```txt
Button
Card
Badge
Dialog
Sheet
Tabs
ScrollArea
Tooltip
Popover
Separator
Progress
```

If a needed shadcn component is missing, add it properly instead of recreating it manually.

Do not duplicate shadcn components under random folders.

---

## 8. UI State Rules

Temporary UI state must be stored in the game UI store.

Examples of UI state:

```txt
active panel
panel stack
selected factory line
hovered department
map zoom
map pan
open modal
dock badge visibility
```

Use Zustand or the existing project store pattern.

Do not store temporary UI state in the database.

Do not mix UI state with simulation state.

---

## 9. Game Data Rules

Real game state must come from the database or server-side game services.

Examples of real game state:

```txt
player
factory
orders
production lines
departments
staff
finance
current game day
shift status
order progress
machine status
```

Do not hardcode real game data inside components.

Temporary mock data is allowed only if clearly marked and isolated.

---

## 10. Simulation Logic Rules

Do not write simulation calculations inside React components.

The following logic must live under `lib/game/` or feature service folders:

```txt
capacity calculations
shift simulation
order progress calculation
delivery risk calculation
bottleneck detection
finance calculations
staff shortage effects
machine breakdown effects
```

React components should display results, not calculate the game economy.

Good:

```ts
const risk = calculateDeliveryRisk(order, factoryState);
```

Bad:

```tsx
// 80 lines of delivery risk math inside OrderDetailPanel.tsx
```

---

## 11. Feature Folder Structure

Each major module must use a feature-based structure.

Example:

```txt
features/orders/
  components/
  actions/
  services/
  types/
```

Example:

```txt
features/production/
  components/
  actions/
  services/
  types/
```

Shared UI components must go under:

```txt
components/game/
components/ui/
```

Game-specific shared components should go under:

```txt
components/game/
```

Generic shadcn components should remain under:

```txt
components/ui/
```

---

## 12. Dock Menu Rules

Dock menu buttons must not navigate to separate gameplay routes.

Dock buttons must open panels.

Example:

```ts
openPanel("orders")
openPanel("production")
openPanel("staff")
openPanel("finance")
openPanel("reports")
```

Dock badges must come from a central badge system, not from random local calculations inside each dock button.

---

## 13. Badge and Notification Rules

Badges should represent real game state.

Examples:

```txt
new order count
production risk
staff shortage
finance warning
report ready
machine issue
```

Badge calculations should be centralized.

Do not hardcode badge numbers inside UI components.

Use a shared type similar to:

```ts
type DockBadge = {
  target: "orders" | "production" | "staff" | "factory" | "finance" | "reports";
  type: "info" | "warning" | "danger" | "success";
  count?: number;
  label?: string;
};
```

---

## 14. Server and Client Component Rules

Use Server Components for data loading where possible.

Use Client Components only when interaction is required.

Client components are required for:

```txt
opening panels
dock menu interactions
map pan and zoom
drag interactions
animations
local UI state
```

Do not mark a component with `"use client"` unless it actually needs client-side behavior.

---

## 15. Animation Rules

Use Tailwind transitions for simple hover, scale, glow, opacity, and movement effects.

Use GSAP only for more advanced game animations such as:

```txt
factory map movement
production flow animation
batch movement
shift simulation animation
complex timeline animation
```

Do not add animation CSS randomly into `globals.css`.

---

## 16. Code Quality Rules

Before finishing any task, check:

```txt
No large inline components inside page files
No feature-specific CSS added to globals.css
No unnecessary routes created for gameplay panels
No simulation math inside React components
No hardcoded real game data
No duplicated shadcn components
No unnecessary "use client"
No broken folder structure
```

Every new feature must fit the Game Shell and panel-based architecture.

---

## 17. Required Final Check

At the end of every coding task, verify and report:

```txt
1. Which files were created or changed
2. Whether any global CSS was added
3. Whether any new route was added
4. Whether the feature uses the panel system correctly
5. Whether the code follows this development rules document
```

If a requested implementation conflicts with this document, stop and explain the conflict before coding.
