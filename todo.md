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
