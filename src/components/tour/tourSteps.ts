// src/components/tour/tourSteps.ts
//
// The first-time guided tour's content — kept as plain data separate
// from the rendering logic (TourOverlay.tsx) so the copy can be scanned
// and edited without touching component code. targetSelector matches a
// data-tour="..." attribute added at each step's real location — see
// Sidebar.tsx (NavItem's tourId), TopBar.tsx (wraps NotificationBell),
// and dashboard/page.tsx (the stat grid).

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard-overview",
    targetSelector: '[data-tour="dashboard-overview"]',
    title: "Your dashboard",
    body: "This is home base — your wedding countdown, budget spent, checklist progress and confirmed guests, all at a glance. Check in here anytime you want the current state of your planning without digging through every tool.",
  },
  {
    id: "nav-budget",
    targetSelector: '[data-tour="nav-budget"]',
    title: "Budget tracker",
    body: "Set a total budget, break it into categories like venue, catering and attire, and track what's actually been spent against each. Knowing where you stand early is what keeps a wedding budget from quietly running away from you.",
  },
  {
    id: "nav-guests",
    targetSelector: '[data-tour="nav-guests"]',
    title: "Guest list",
    body: "Track every guest, which side they're on, and their RSVP status — or import an existing spreadsheet in seconds instead of retyping it. Your confirmed headcount feeds straight into catering and seating decisions later.",
  },
  {
    id: "nav-checklist",
    targetSelector: '[data-tour="nav-checklist"]',
    title: "Checklist & timeline",
    body: "A Ghana-relevant checklist, automatically timed against your real wedding date, plus a calendar view of the same tasks. It tells you what actually needs attention now versus what can wait.",
  },
  {
    id: "nav-vendors",
    targetSelector: '[data-tour="nav-vendors"]',
    title: "Vendor marketplace",
    body: "Browse real local vendors by category and city, track booking status, and keep enquiry messages in one place. It's the fastest way to go from \"we need a caterer\" to a shortlist worth calling.",
  },
  {
    id: "nav-bisaai",
    targetSelector: '[data-tour="nav-bisaai"]',
    title: "BisaAI",
    body: "Your planning assistant — ask it anything about budget, timelines, guests or etiquette and it answers using your actual wedding data, not generic advice. It also proactively flags things worth your attention.",
  },
  {
    id: "notifications",
    targetSelector: '[data-tour="notifications"]',
    title: "Notifications",
    body: "Anything that needs your attention — a task coming due, a vendor update — shows up here first. One place to check instead of hunting across every page for what changed.",
  },
  {
    id: "nav-settings",
    targetSelector: '[data-tour="nav-settings"]',
    title: "Profile & settings",
    body: "Manage your account and your Wedding Pass status, and export your plan as a PDF. You can also restart this tour from here anytime you want a refresher.",
  },
];
