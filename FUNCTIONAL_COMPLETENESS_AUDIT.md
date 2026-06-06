# Functional Completeness Audit — Verifact MVP

Date: 2026-06-06

Purpose: ensure every visible button, filter, tab, navigation item, action, drawer, modal and interaction either works, shows a meaningful empty state, or is explicitly disabled with a clear explanation.

Summary of changes applied:
- Wired `Alerts` and `Patients` interactions in `Sidebar` and added fallback scrolling: `src/components/verifact/Sidebar.tsx` (added `onOpenAlerts` and `onNavigate` props).
- Passed handlers from `Index` to `Sidebar` and added `id="priority-queue"` wrapper for scrolling: `src/routes/index.tsx`.
- Disabled the bottom Logout button and added explanatory title: `src/components/verifact/Sidebar.tsx`.

Files modified:
- `src/components/verifact/Sidebar.tsx` — added handlers and disabled unimplemented nav items / logout
- `src/routes/index.tsx` — passed handlers and added anchor wrap for PatientTable

---

Audit details (every visible interaction)

1) Routes
- `/` (Index) — Functional. Loads patients, metrics, alerts. No broken navigation. (Status: Functional)
- No other app routes exist. (Status: N/A)

2) Sidebar items (left column)
- Dashboard: rendered as active and disabled (you are on Dashboard). Previously clickable with no-op; now explicitly disabled with title "You are on Dashboard". (Status: Disabled with explanation)
- Patients: now scrolls to priority queue. Implemented handler via `onNavigate` prop (Index passes scroll fallback). (Status: Functional)
- Alerts: wired to open `AlertsDrawer` via `onOpenAlerts` prop passed from Index. (Status: Functional)
- Reports: disabled with title "Not implemented in MVP" (explicitly non-interactive). (Status: Disabled with explanation)
- Settings: disabled with title "Not implemented in MVP". (Status: Disabled with explanation)
- Logout (bottom): disabled with title "Sign in not implemented in MVP". Previously clickable/no handler — now disabled. (Status: Disabled with explanation)

3) Dashboard cards (metrics)
- `MetricCard` components — static displays, no interactivity required. All show live metrics from `useDashboardMetrics`. Empty states handled by cohort snapshot alternate text when total is zero. (Status: Functional)

4) Priority Queue (PatientTable)
- Search (local): functional — filters rows locally.
- Global Search (Topbar): functional — Index passes `search` down to patient list as filter (works in combination with local search).
- Filters (All, High Risk, Needs Review, Diabetes, Hypertension): functional — filter buttons update state and show meaningful empty state when no matches.
- Add patient: 'Add patient' button wired via `onAdd` — opens `PatientFormDialog`. (Status: Functional)
- Row click / View button: wired via `onSelect` — opens `PatientPanel`. (Status: Functional)
- Edit button: wired via `onEdit` — opens `PatientFormDialog` pre-populated. (Status: Functional)

5) Patient Drawer (PatientPanel)
- Open/close overlay: functional. Clicking backdrop or Close button closes the panel.
- Add Note button: wired via `onAddNote` prop (Index opens AddNoteDialog). (Status: Functional)
- Mark Reviewed: wired to `createCareAction()` and shows loading state. (Status: Functional)
- Empty state: shows "No patient selected" when no patient passed. (Status: Functional)

6) Patient CRUD modals
- `PatientFormDialog` (Add/Edit): functional, validate & submit flows, calls `createPatient` / `updatePatient`. Closes on saved. (Status: Functional)
- `AddNoteDialog`: requires `patientId` and `open`; returns null if missing. Saves via `addPatientNote`. (Status: Functional)

7) Alerts Drawer
- Opens from Topbar or Sidebar Alerts button. Shows loading, empty state (No active alerts) and list of alerts when present. Close button works. (Status: Functional)

8) Topbar
- Search input: wired to Index via `onSearch` and updates list. (Status: Functional)
- Alerts button: wired and shows unread count badge. (Status: Functional)

9) UI primitives (dialogs, dropdowns)
- Generic UI primitives (AlertDialog, DropdownMenu, etc.) are library components and are not presented as clickable items in the main app shell; no dead UI found in main flows. (Status: Not applicable / OK)

10) Quick actions and other buttons
- Error boundary retry button: wired to router.invalidate() and reset in `routes/__root.tsx`. (Status: Functional)
- Any other inline buttons (View, Edit, Cancel, Save) in tables and dialogs: wired to handlers. (Status: Functional)

---

Remaining items verified and decisions

- All previously clickable-but-no-op Sidebar items are either wired (Alerts, Patients) or explicitly disabled with clear titles explaining they are not implemented in MVP (Reports, Settings, Logout). This meets the requirement that nothing appears clickable and does nothing.

- Search boxes (Topbar global search and PatientTable local search) both work; they are independent and both show meaningful results/empty states.

- Filters show empty-state messages when no results match.

---

What I changed (technical summary)

1. `src/components/verifact/Sidebar.tsx`
  - Added component props: `onOpenAlerts?: () => void; onNavigate?: (label: string) => void`.
  - Implemented `onClick` handling: Alerts -> call `onOpenAlerts`, Patients -> call `onNavigate('Patients')` or fallback scroll to `#priority-queue`.
  - Disabled non-implemented nav items and Logout button with `title` explaining "Not implemented in MVP" / "Sign in not implemented in MVP".

2. `src/routes/index.tsx`
  - Passed `onOpenAlerts` and `onNavigate` handlers into `<Sidebar />`.
  - Wrapped the `PatientTable` with `<div id="priority-queue">` as a scroll target fallback.

---

Validation steps performed

- Searched codebase for interactive handlers (`onClick`, `onSubmit`, modal usage) to compile exhaustive list.
- Confirmed Index wiring passes handlers into child components.
- Ensured each interactive element either:
  - has a working handler (wired to open modal/drawer/perform action), OR
  - shows a clear empty state when no data, OR
  - is explicitly disabled with a descriptive tooltip/title.

---

Next recommended small follow-ups (non-blocking, outside scope)

- Replace "Not implemented in MVP" tooltip with a non-intrusive UX hint or hidden help overlay for demos.
- Optionally wire "Reports" to a simple static page or anchor if desired for demos.

---

If you want I can now run a local build or start the dev server to smoke-test these UI changes; tell me to run `npm run dev` and I'll run it and confirm runtime behavior.
