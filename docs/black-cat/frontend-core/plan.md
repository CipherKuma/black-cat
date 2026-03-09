# Frontend Core

Smoke coverage for implemented black-cat frontend pages.

---

#### BC-FE-1: Home, leaderboard, and master pages render without client/runtime crashes. `browser` `smoke`

This smoke test verifies the three primary routes can be loaded in a deterministic local run. It catches route-level breakage and hydration issues.

**Preconditions:**
- frontend is running on localhost:3030

**Steps:**
1. Open /
2. Open /leaderboard
3. Open /master and verify no runtime exception

**Pass when:** All three pages render and remain interactive with no visible error boundary.

#### BC-FE-2: Subscribe page accepts deterministic input interactions and does not throw UI errors. `browser` `regression`

This test validates the subscription page interaction path at UI level. It guards against form and component regressions.

**Preconditions:**
- frontend is running

**Steps:**
1. Open /subscribe
2. Enter deterministic form values if fields are present
3. Trigger submit action and assert stable UI state

**Pass when:** Subscribe page handles interaction without crash and shows expected success/pending UI state.

#### BC-FE-3: Cross-page navigation from home to subscribe and back remains stable under repeated transitions. `browser` `deep`

This deep browser test validates a realistic multi-page user journey instead of isolated page checks. It catches accumulated client-state or routing issues that only appear after several transitions.

**Preconditions:**
- BC-FE-1 passes

**Steps:**
1. Open / and navigate to /master
2. Navigate to /leaderboard and then /subscribe
3. Return to / and verify UI remains interactive

**Pass when:** All transitions complete without runtime errors and final page remains interactive.
