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
