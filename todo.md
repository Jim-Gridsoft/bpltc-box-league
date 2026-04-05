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
