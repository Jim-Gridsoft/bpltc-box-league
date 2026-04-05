# BPLTC Doubles Ladder Tournament — TODO

- [x] Scaffold full-stack project (React + tRPC + DB + Stripe)
- [x] Generate hero image for tournament landing page
- [x] Design BPLTC green/gold theme (CSS variables, fonts)
- [x] Database schema: entrants + set_reports tables
- [x] Push schema to database (pnpm db:push)
- [x] Tournament DB query helpers (tournament.db.ts)
- [x] Tournament tRPC router (register, checkout, reportSet, leaderboard, etc.)
- [x] Stripe Checkout integration (£20 entry fee)
- [x] Stripe webhook handler (marks entrant as paid on checkout.session.completed)
- [x] Home landing page (hero, how-it-works, rules, CTA)
- [x] Leaderboard page (live rankings with progress bars)
- [x] Player Dashboard (register, pay, report sets, set history)
- [x] Shared navigation component
- [x] App.tsx routing (/, /leaderboard, /dashboard)
- [x] Vitest tests for tournament router (9 tests passing)

## New Features — Round 2

- [x] Admin panel: list all entrants, payment status, set report verification/deletion
- [x] Admin panel: manually mark entrant as paid, view all set reports
- [x] Email notification: owner notification on payment (via notifyOwner)
- [x] Email notification: completion notification when player reaches 50 sets
- [x] Partner pairing: players can post availability (date, time, court preference)
- [x] Partner pairing: browse available partners and send a match request
- [x] Partner pairing: accept/decline match requests
- [x] Partner pairing: view incoming/outgoing requests with status
- [x] Navigation: add Admin and Partner Finder links for appropriate users
- [x] Vitest tests for new routers (21 tests passing)

## Round 3 — Full Seasonal Box League Rebuild

- [ ] Schema: seasons, boxes, box_members, matches, year_points tables
- [ ] Push new schema to database
- [ ] Backend: season management (create, open/close, seed boxes by ability)
- [ ] Backend: match reporting with rotating partner validation
- [ ] Backend: points calculation (2 pts win / 1 pt loss) + year accumulator
- [ ] Backend: promotion/relegation logic between seasons
- [ ] Backend: admin procedures (manage seasons, boxes, verify results)
- [ ] Backend: partner availability and match arrangement
- [ ] Frontend: Home page with seasonal structure and competition overview
- [ ] Frontend: My Season page (box, fixtures, results, points)
- [ ] Frontend: Leaderboard (seasonal box standings + year-long accumulator)
- [ ] Frontend: Partner Finder (post availability, rotating partner rule enforced)
- [ ] Frontend: Admin panel (season setup, box seeding, result management)
- [ ] Vitest tests for all new routers

## Round 4 — Box League Copy & UI Update

- [ ] Home page: update hero, stats bar, how it works section, full rules, awards
- [ ] Leaderboard page: rename to Box League Standings, update column headers and descriptions
- [ ] Dashboard page: update registration form, match reporting, my results section
- [ ] PartnerFinder page: update copy to reference box matches and seasonal context
- [ ] Admin page: update season management, box management, and entrant management copy
- [ ] TournamentNav: update site title and nav labels

## Round 5 — Sandbox / Demo Mode

- [ ] Backend: sandboxRegister procedure (free registration, marks paid=true, no Stripe)
- [ ] Backend: sandboxSeedPlayers procedure (bulk create N test players in a season)
- [ ] Backend: sandboxReset procedure (wipe all test data for a season)
- [ ] Frontend: Demo Mode banner visible on all pages
- [ ] Frontend: Dashboard — "Register Free (Demo)" button alongside normal Stripe button
- [ ] Frontend: Admin — "Seed Test Players" panel with count selector and reset button
- [ ] Tests updated for new sandbox procedures

## Round 6 — Box Creation, Fixtures & Season Auto-Seed

- [x] Backend: adminAutoCreateBoxes procedure (ability-seeded grouping of paid entrants)
- [x] Backend: adminGenerateFixtures procedure (round-robin schedule per box)
- [x] Backend: getBoxFixtures query (fetch fixtures for a box)
- [x] Backend: seasonFixtures query (all fixtures for a season, grouped by box)
- [x] Backend: seed Spring 2026 season on server startup if no seasons exist
- [x] Admin UI: Create Boxes panel with ability seeding preview and confirm button
- [x] Admin UI: Fixture schedule display per box with match dates
- [x] Dashboard: My Fixtures tab showing upcoming and completed matches
- [x] Tests: cover new procedures

## Round 7 — Match Result Entry from Fixtures

- [x] Dashboard: Add "Record Result" inline form on each scheduled fixture card
- [x] Dashboard: Pre-populate partner and opponent names from fixture data
- [x] Dashboard: Score entry (e.g. 6-4 6-3), winner selection, date picker
- [x] Dashboard: Submit result calls reportMatch procedure and marks fixture as played
- [x] Backend: Update reportMatch to accept optional fixtureId and mark fixture status=played
- [x] Backend: Ensure fixture status is updated when a match result is submitted
- [x] Tests: cover fixture-linked match reporting

## Round 8 — Dedicated Match Results Page

- [x] Create /results page showing only the logged-in user's own fixtures (from myFixtures query)
- [x] Add "Results" link to TournamentNav
- [x] Show all user's fixtures grouped by round with Record Result button on each scheduled fixture
- [x] Show match history below fixtures
- [x] Register the /results route in App.tsx

## Round 9 — Best-of-3 Sets Score Format

- [x] Replace freeform score input with per-set game score inputs (Set 1, Set 2, optional Set 3)
- [x] Auto-determine winner from set scores (2 sets wins the match)
- [x] Validate scores: tiebreak at 5-5 (set ends 6-5), valid scores 6-0 to 6-5, same rule all sets
- [x] Format stored score string as "6-4 3-6 6-5" from individual set inputs
- [x] Update both Results page and Dashboard fixture cards

## Round 10 — Points Calculation Correctness

- [x] Audit reportMatch DB function: verify all 4 players get correct points (2 for win, 1 for loss)
- [x] Verify season_entrants.points is updated for all 4 players after a result
- [x] Verify box_members.points is updated for all 4 players after a result (box standings read from season_entrants via join)
- [x] Verify year_points table is updated for all 4 players after a result
- [x] Verify Standings (leaderboard) page reflects updated points (added staleTime:0 and cache invalidation)
- [x] Verify box league standings reflect updated points (invalidate seasonBoxes + boxDetail on result submit)
- [x] Add tests covering points update for all 4 players

## Round 11 — Delete Season

- [x] Backend: deleteSeason DB function (cascade delete: matches, fixtures, box_members, boxes, season_entrants, year_points adjustments, then season)
- [x] Backend: adminDeleteSeason tRPC procedure (admin-only)
- [x] Admin UI: Delete button on each season card with confirmation dialog
- [x] Admin UI: Prevent deletion of the active season (button disabled + warning shown)
- [x] Tests: cover adminDeleteSeason procedure (28/28 pass)

## Round 12 — Box-Wide Fixture View on Results Page

- [ ] Backend: myBoxFixtures query — returns all fixtures for the user's box with player names
- [ ] Results page: show all fixtures in the user's box grouped by round
- [ ] Results page: Record Result button only on fixtures the logged-in user is a player in
- [ ] Results page: view-only display for other pairs' fixtures in the same box
- [ ] Tests: cover myBoxFixtures procedure

## Round 13 — Admin Match Management

- [ ] Admin UI: Matches tab shows all submitted results for the active season
- [ ] Admin UI: Each match row has a Delete button with inline confirmation
- [ ] Backend: adminDeleteMatch procedure (admin-only, reverses points)
- [ ] Tests: cover adminDeleteMatch procedure

## Round 14 — Season Status Change in Admin

- [ ] Admin UI: Season cards have a status dropdown to change status inline
- [ ] Admin UI: Confirm dialog before changing to/from active
- [ ] Tests: cover adminUpdateSeasonStatus (already exists, verify)

## Round 15 — Admin Access Restriction

- [x] TournamentNav: hide Admin link for non-admin users (check user.role === 'admin')
- [x] Admin page: redirect non-admin users to home with an error message
- [x] Tests: verify admin-only guard

## Round 16 — Admin User Management

- [x] Backend: getAllUsers query (id, name, email, role, createdAt) — admin only
- [x] Backend: setUserRole mutation (promote/demote) — admin only, cannot demote self
- [x] Admin UI: new "Admins" tab showing all current admins with revoke button
- [x] Admin UI: search/select any registered user to promote to admin
- [x] Tests: cover setUserRole procedure

## Round 17 — Contact Administrator / Dispute Resolution

- [x] Backend: disputes.submit procedure — stores dispute in DB + notifyOwner notification
- [x] Frontend: /contact-admin page with dispute form (subject, description, optional match/fixture reference)
- [x] Frontend: Add "Contact Admin" link in TournamentNav for authenticated users
- [x] Frontend: Success confirmation screen after submission
- [x] Tests: cover disputes procedures (28/28 pass)

## Round 18 — Admin Panel Extensions

- [x] Admin: Disputes tab — list all disputes with status badge, admin notes field, resolve/close button
- [x] Admin: Matches tab — list all season match results with delete button (auto-reverses points)
- [x] Admin: Season status dropdown — inline status change on each season card (upcoming/registration/active/completed)
- [x] Tests: verify new admin procedures (28/28 pass)

## Round 19 — Points Calculation Bug Fix

- [x] Audit SetScoreEntry component: verify winner determination logic (which team wins each set)
- [x] Audit Results.tsx: fix incorrect winner flip (removed erroneous fixture-perspective conversion)
- [x] Audit reportMatch DB function: confirmed player1Id = submitter = Team A, winner=A means submitter won
- [x] Audit fixture player ordering: confirmed backend ignores fixture team assignment, always uses submitter as Team A
- [x] Fix mismatch: removed winner flip in both Results.tsx and Dashboard.tsx
- [x] Tests: 28/28 pass after fix

## Round 20 — Promotion & Relegation

- [x] Backend: endSeason DB function — rank players in each box by seasonPoints, set outcome (promoted/stayed/relegated), update abilityRating for next season seeding
- [x] Backend: adminEndSeason tRPC procedure (admin-only, marks season completed + runs outcomes)
- [x] Backend: promotion rules — top player in each box promoted (abilityRating +1), bottom player relegated (abilityRating -1), middle players stay
- [x] Backend: handle edge cases — top box (no promotion), bottom box (no relegation), ties handled by matchesWon then matchesPlayed
- [x] Admin UI: "End Season" button on each active season card with outcome preview table after confirming
- [x] Admin UI: Show outcome badges (promoted/stayed/relegated) in the Entrants tab per player
- [x] Dashboard: Show outcome badge on user's box standings table (promoted/stayed/relegated) after season ends
- [x] Dashboard: Show outcome badge with explanation (promoted/stayed/relegated) in My Box standings
- [x] Tests: cover endSeason procedure (28/28 pass)

## Round 21 — Points System Update

- [x] Backend: update reportMatch points logic (2=win, 1=won a set but lost, 0=lost 2-0)
- [x] Backend: update deleteMatch points reversal to match new logic
- [x] Home page: update stats bar and rules section with new scoring
- [x] Leaderboard/Standings page: update points description
- [x] Dashboard: update any points explanation text
- [x] Tests: cover new points calculation (11 new tests, 39 total passing)

## Round 22 — Admin Result Entry for All Boxes

- [x] Backend: adminGetAllFixtures query — all fixtures for a season with player names, grouped by box
- [x] Backend: adminReportMatch procedure — admin-only, calls reportMatch on behalf of any fixture
- [x] Admin UI: Matches tab — add "Scheduled Fixtures" section showing all unplayed fixtures across all boxes
- [x] Admin UI: Each scheduled fixture row has an inline "Enter Result" form with SetScoreEntry
- [x] Admin UI: Fixtures grouped by box name with round labels
- [x] Admin UI: After result entry, fixture moves from scheduled to completed section
- [x] Tests: cover adminGetAllFixtures and adminReportMatch procedures (44/44 passing)

## Round 23 — Balanced Fixture Generation

- [ ] Design balanced doubles scheduling algorithm for any box size (4, 5, 6, 7, 8+ players)
- [ ] Add `isBalancer` boolean column to fixtures schema (non-points-scoring match)
- [ ] Implement new algorithm in tournament.db.ts replacing the broken circle method
- [ ] Update UI to show balancer matches with a visual indicator (no points awarded)
- [ ] Update reportMatch / deleteMatch to skip points for balancer fixtures
- [ ] Tests: verify equal match counts for boxes of 4, 5, 6, 7, 8 players

## Round 24 — Approach A: Per-Player Point Eligibility in Balancer Fixtures

- [x] Schema: add balancerEligiblePlayers column (JSON array of userIds who score points)
- [x] Algorithm: populate balancerEligiblePlayers when creating balancer fixtures
- [x] reportMatch: skip points for players NOT in balancerEligiblePlayers on balancer fixtures
- [x] UI: update balancer badge/notice to explain which players score and which do not
- [x] Tests: cover per-player eligibility logic (22 new tests, 55 total passing)

## Round 25 — Fix Fixture Generation Failure

- [x] Diagnose fixture generation error: migration timing issue — balancerEligiblePlayers column not yet in remote DB
- [x] Fix root cause: ran pnpm db:push to apply migration, restarted server
- [x] Verified: 0 TypeScript errors, 55/55 tests passing, server running cleanly
