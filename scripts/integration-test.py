#!/usr/bin/env python3
"""
BPLTC Box League — Live Integration Test Suite
Tests every tRPC procedure against the live Heroku deployment.

Usage:
  python3 scripts/integration-test.py [--base-url URL]

Default base URL: https://bpltc-box-league-155ff8f71204.herokuapp.com
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BASE_URL = "https://bpltc-box-league-155ff8f71204.herokuapp.com"
ADMIN_EMAIL = "jim@gridsoftsolutions.co.uk"
ADMIN_PASSWORD = "!OBicus123"
TEST_USER_EMAIL = "integration-test@bpltc-test.invalid"
TEST_USER_PASSWORD = "IntTest456!"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

results = []

def trpc_date(dt: datetime) -> str:
    """Serialise a datetime as an ISO string (superjson Date)."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def build_superjson_payload(payload) -> dict:
    """Build a superjson-compatible payload with meta for Date string fields."""
    if not isinstance(payload, dict):
        return {"json": payload}
    # Find keys whose values are ISO date strings (from trpc_date)
    date_keys = [k for k, v in payload.items() if isinstance(v, str) and len(v) == 24 and v.endswith("Z") and "T" in v]
    if not date_keys:
        return {"json": payload}
    meta_values = {k: ["Date"] for k in date_keys}
    return {"json": payload, "meta": {"values": meta_values}}

def trpc(procedure: str, payload=None, method="GET", cookies: dict = None) -> dict:
    """Make a tRPC call and return the parsed response."""
    url = f"{BASE_URL}/api/trpc/{procedure}"
    headers = {"Content-Type": "application/json"}
    if cookies:
        headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())

    if method == "GET":
        if payload is not None:
            encoded = urllib.parse.quote(json.dumps({"0": {"json": payload}}))
            url += f"?batch=1&input={encoded}"
        else:
            url += "?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D"
        req = urllib.request.Request(url, headers=headers, method="GET")
    else:
        inner = build_superjson_payload(payload)
        body = json.dumps({"0": inner}).encode()
        url += "?batch=1"
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode()
            data = json.loads(raw)
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                if "error" in item:
                    return {"__error": item["error"]["json"]["message"], "__code": item["error"]["json"]["data"]["code"]}
                return item.get("result", {}).get("data", {}).get("json", item)
            return data
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            data = json.loads(raw)
            if isinstance(data, list) and data:
                msg = data[0].get("error", {}).get("json", {}).get("message", str(e))
                code = data[0].get("error", {}).get("json", {}).get("data", {}).get("code", "HTTP_ERROR")
                return {"__error": msg, "__code": code}
        except Exception:
            pass
        return {"__error": str(e), "__code": "HTTP_ERROR"}
    except Exception as e:
        return {"__error": str(e), "__code": "NETWORK_ERROR"}

import urllib.parse

def check(name: str, result, expect_error: str = None, skip_if_error: str = None) -> bool:
    """Record a test result."""
    # Lists and non-dicts are always success
    if not isinstance(result, dict):
        if expect_error:
            detail = f"Expected error '{expect_error}' but got success"
            print(f"  {RED}FAIL{RESET}  {name} — {detail}")
            results.append({"name": name, "status": "FAIL", "detail": detail})
            return False
        print(f"  {GREEN}PASS{RESET}  {name}")
        results.append({"name": name, "status": "PASS"})
        return True
    has_error = "__error" in result
    error_code = result.get("__code", "")
    error_msg = result.get("__error", "")

    if skip_if_error and has_error and skip_if_error.lower() in error_msg.lower():
        print(f"  {YELLOW}SKIP{RESET}  {name} — {error_msg[:80]}")
        results.append({"name": name, "status": "SKIP", "detail": error_msg})
        return True

    if expect_error:
        if has_error and expect_error.lower() in error_msg.lower():
            print(f"  {GREEN}PASS{RESET}  {name} (expected error: {error_msg[:60]})")
            results.append({"name": name, "status": "PASS"})
            return True
        else:
            detail = error_msg if has_error else f"Expected error '{expect_error}' but got success"
            print(f"  {RED}FAIL{RESET}  {name} — {detail[:80]}")
            results.append({"name": name, "status": "FAIL", "detail": detail})
            return False

    if has_error:
        print(f"  {RED}FAIL{RESET}  {name} — {error_msg[:80]}")
        results.append({"name": name, "status": "FAIL", "detail": error_msg})
        return False

    print(f"  {GREEN}PASS{RESET}  {name}")
    results.append({"name": name, "status": "PASS"})
    return True

def get_cookie(resp_headers) -> dict:
    """Extract session cookie from response headers."""
    cookies = {}
    for header, value in resp_headers:
        if header.lower() == "set-cookie":
            parts = value.split(";")[0].split("=", 1)
            if len(parts) == 2:
                cookies[parts[0].strip()] = parts[1].strip()
    return cookies

def login(email: str, password: str) -> dict:
    """Login and return session cookies."""
    url = f"{BASE_URL}/api/trpc/auth.login?batch=1"
    body = json.dumps({"0": {"json": {"email": email, "password": password}}}).encode()
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            cookies = {}
            for key, val in resp.getheaders():
                if key.lower() == "set-cookie":
                    parts = val.split(";")[0].split("=", 1)
                    if len(parts) == 2:
                        cookies[parts[0].strip()] = parts[1].strip()
            raw = resp.read().decode()
            data = json.loads(raw)
            if isinstance(data, list) and data:
                item = data[0]
                if "error" in item:
                    return {"__error": item["error"]["json"]["message"]}
                return {"cookies": cookies, "user": item.get("result", {}).get("data", {}).get("json", {})}
    except Exception as e:
        return {"__error": str(e)}
    return {"__error": "Unknown login error"}

def register_user(name: str, email: str, password: str) -> dict:
    """Register a new user."""
    url = f"{BASE_URL}/api/trpc/auth.register?batch=1"
    body = json.dumps({"0": {"json": {"name": name, "email": email, "password": password}}}).encode()
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            cookies = {}
            for key, val in resp.getheaders():
                if key.lower() == "set-cookie":
                    parts = val.split(";")[0].split("=", 1)
                    if len(parts) == 2:
                        cookies[parts[0].strip()] = parts[1].strip()
            raw = resp.read().decode()
            data = json.loads(raw)
            if isinstance(data, list) and data:
                item = data[0]
                if "error" in item:
                    return {"__error": item["error"]["json"]["message"]}
                return {"cookies": cookies, "user": item.get("result", {}).get("data", {}).get("json", {})}
    except Exception as e:
        return {"__error": str(e)}
    return {"__error": "Unknown register error"}

# ── Main test runner ─────────────────────────────────────────────────────────

def run_tests():
    print(f"\n{BOLD}{CYAN}BPLTC Box League — Live Integration Tests{RESET}")
    print(f"Target: {BASE_URL}")
    print(f"Time:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    admin_cookies = {}
    user_cookies = {}
    season_id = None
    box_id = None
    fixture_id = None
    match_id = None
    entrant_id = None

    # ── 1. Public endpoints ───────────────────────────────────────────────────
    print(f"{BOLD}── Public Endpoints ──────────────────────────────────────────{RESET}")

    r = trpc("tournament.seasons", method="GET")
    check("tournament.seasons — list all seasons", r)
    if not isinstance(r, dict) or "__error" not in r:
        seasons = r if isinstance(r, list) else []
        if seasons:
            season_id = seasons[0]["id"]

    r = trpc("tournament.currentSeason", method="GET")
    check("tournament.currentSeason — get open season", r)
    if not isinstance(r, dict) or "__error" not in r:
        if isinstance(r, dict) and r.get("id"):
            season_id = r["id"]

    r = trpc("tournament.yearLeaderboard", {"year": 2026}, method="GET")
    check("tournament.yearLeaderboard — public leaderboard", r)

    # ── 2. Auth — registration ────────────────────────────────────────────────
    print(f"\n{BOLD}── Auth: Registration & Login ────────────────────────────────{RESET}")

    # Register test user (may already exist)
    reg = register_user("Integration Tester", TEST_USER_EMAIL, TEST_USER_PASSWORD)
    if "__error" in reg:
        if "already" in reg["__error"].lower() or "exists" in reg["__error"].lower() or "409" in reg["__error"] or "conflict" in reg["__error"].lower():
            print(f"  {YELLOW}SKIP{RESET}  auth.register — test user already exists")
            results.append({"name": "auth.register", "status": "SKIP", "detail": "already exists"})
        else:
            check("auth.register — create test user", reg)
    else:
        check("auth.register — create test user", reg)
        user_cookies = reg.get("cookies", {})

    # Login as test user
    login_r = login(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    if "__error" not in login_r:
        user_cookies = login_r.get("cookies", {})
        check("auth.login — test user", login_r)
    else:
        check("auth.login — test user", login_r)

    # auth.me
    r = trpc("auth.me", method="GET", cookies=user_cookies)
    check("auth.me — get current user", r)

    # Login as admin
    print(f"\n{BOLD}── Auth: Admin Login ─────────────────────────────────────────{RESET}")
    admin_login = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if "__error" in admin_login:
        # Try to register admin if not found
        admin_reg = register_user("Jim Admin", ADMIN_EMAIL, ADMIN_PASSWORD)
        if "__error" not in admin_reg:
            admin_cookies = admin_reg.get("cookies", {})
            print(f"  {YELLOW}NOTE{RESET}  Admin registered — may not have admin role yet")
        else:
            print(f"  {RED}FAIL{RESET}  Cannot login or register as admin: {admin_login['__error']}")
            results.append({"name": "admin login", "status": "FAIL", "detail": admin_login["__error"]})
    else:
        admin_cookies = admin_login.get("cookies", {})
        check("auth.login — admin user", admin_login)

    # ── 3. Season management (admin) ──────────────────────────────────────────
    print(f"\n{BOLD}── Admin: Season Management ──────────────────────────────────{RESET}")

    now = datetime.now(timezone.utc)
    new_season_payload = {
        "name": "Integration Test Season",
        "year": 2099,
        "quarter": "spring",
        "startDate": trpc_date(now + timedelta(days=1)),
        "endDate": trpc_date(now + timedelta(days=90)),
        "registrationDeadline": trpc_date(now + timedelta(days=30)),
        "status": "registration",
    }
    r = trpc("tournament.adminCreateSeason", new_season_payload, method="POST", cookies=admin_cookies)
    check("tournament.adminCreateSeason — create test season", r, skip_if_error="FORBIDDEN")
    test_season_id = None
    if "__error" not in r and isinstance(r, dict):
        test_season_id = r.get("id")

    if test_season_id:
        r = trpc("tournament.adminUpdateSeasonStatus",
                 {"seasonId": test_season_id, "status": "upcoming"},
                 method="POST", cookies=admin_cookies)
        check("tournament.adminUpdateSeasonStatus — set upcoming", r)

        r = trpc("tournament.adminUpdateSeasonStatus",
                 {"seasonId": test_season_id, "status": "registration"},
                 method="POST", cookies=admin_cookies)
        check("tournament.adminUpdateSeasonStatus — set registration", r)

    # Use season_id from earlier for most tests
    if not season_id and test_season_id:
        season_id = test_season_id

    if season_id:
        r = trpc("tournament.adminSeasonEntrants", {"seasonId": season_id}, method="GET", cookies=admin_cookies)
        check("tournament.adminSeasonEntrants — list entrants", r)
        if isinstance(r, list) and r:
            entrant_id = r[0]["id"]

        r = trpc("tournament.seasonBoxes", {"seasonId": season_id}, method="GET", cookies=admin_cookies)
        check("tournament.seasonBoxes — list boxes", r)
        if isinstance(r, list) and r:
            box_id = r[0]["id"]

    # ── 4. Box management (admin) ─────────────────────────────────────────────
    print(f"\n{BOLD}── Admin: Box Management ─────────────────────────────────────{RESET}")

    if season_id:
        r = trpc("tournament.adminAutoCreateBoxes",
                 {"seasonId": season_id, "targetBoxSize": 4},
                 method="POST", cookies=admin_cookies)
        check("tournament.adminAutoCreateBoxes — auto create boxes", r,
              skip_if_error="Need at least 2 paid entrants")
        if "__error" not in r and isinstance(r, list) and r:
            box_id = r[0]["boxId"]

        if not box_id and season_id:
            r = trpc("tournament.adminCreateBox",
                     {"seasonId": season_id, "name": "Test Box", "level": 1},
                     method="POST", cookies=admin_cookies)
            check("tournament.adminCreateBox — manual create box", r)
            if "__error" not in r:
                box_id = r.get("id")

    # ── 5. Fixture management (admin) ─────────────────────────────────────────
    print(f"\n{BOLD}── Admin: Fixture Management ─────────────────────────────────{RESET}")

    if season_id:
        r = trpc("tournament.adminGenerateFixtures",
                 {"seasonId": season_id},
                 method="POST", cookies=admin_cookies)
        check("tournament.adminGenerateFixtures — generate fixtures", r,
              skip_if_error="No boxes")

        r = trpc("tournament.adminAllFixtures", {"seasonId": season_id}, method="GET", cookies=admin_cookies)
        check("tournament.adminAllFixtures — list all fixtures", r)
        if isinstance(r, list) and r:
            first = r[0]
            fixture_id = first.get("id") or first.get("fixtureId")

        r = trpc("tournament.fixtureBalanceSummary", {"seasonId": season_id}, method="GET", cookies=admin_cookies)
        check("tournament.fixtureBalanceSummary — balance summary", r)

    # ── 6. Match management (admin) ───────────────────────────────────────────
    print(f"\n{BOLD}── Admin: Match Management ───────────────────────────────────{RESET}")

    if season_id:
        r = trpc("tournament.adminSeasonMatches", {"seasonId": season_id}, method="GET", cookies=admin_cookies)
        check("tournament.adminSeasonMatches — list matches", r)
        if isinstance(r, list) and r:
            match_id = r[0]["id"]

    if match_id:
        r = trpc("tournament.adminVerifyMatch", {"matchId": match_id}, method="POST", cookies=admin_cookies)
        check("tournament.adminVerifyMatch — verify match", r)

    # ── 7. User-facing tournament procedures ──────────────────────────────────
    print(f"\n{BOLD}── User: Tournament Procedures ───────────────────────────────{RESET}")

    if season_id:
        r = trpc("tournament.myEntry", {"seasonId": season_id}, method="GET", cookies=user_cookies)
        check("tournament.myEntry — get my entry", r)

        r = trpc("tournament.myBox", {"seasonId": season_id}, method="GET", cookies=user_cookies)
        check("tournament.myBox — get my box", r)

        r = trpc("tournament.myMatches", {"seasonId": season_id}, method="GET", cookies=user_cookies)
        check("tournament.myMatches — get my matches", r)

        r = trpc("tournament.myFixtures", {"seasonId": season_id}, method="GET", cookies=user_cookies)
        check("tournament.myFixtures — get my fixtures", r)

        r = trpc("tournament.myBoxFixtures", {"seasonId": season_id}, method="GET", cookies=user_cookies)
        check("tournament.myBoxFixtures — get box fixtures", r)

    # ── 8. Partner slots ──────────────────────────────────────────────────────
    print(f"\n{BOLD}── User: Partner Slots ───────────────────────────────────────{RESET}")

    r = trpc("tournament.partnerSlots", method="GET", cookies=user_cookies)
    check("tournament.partnerSlots — list open slots", r)

    r = trpc("tournament.myPartnerSlots", method="GET", cookies=user_cookies)
    check("tournament.myPartnerSlots — list my slots", r)

    r = trpc("tournament.incomingRequests", method="GET", cookies=user_cookies)
    check("tournament.incomingRequests — list incoming", r)

    r = trpc("tournament.outgoingRequests", method="GET", cookies=user_cookies)
    check("tournament.outgoingRequests — list outgoing", r)

    # ── 9. Admin user management ──────────────────────────────────────────────
    print(f"\n{BOLD}── Admin: User Management ────────────────────────────────────{RESET}")

    r = trpc("adminUsers.list", method="GET", cookies=admin_cookies)
    check("adminUsers.list — list all users", r)

    # ── 10. Disputes ──────────────────────────────────────────────────────────
    print(f"\n{BOLD}── User: Disputes ────────────────────────────────────────────{RESET}")

    r = trpc("disputes.submit",
             {"subject": "Integration Test Dispute", "description": "This is an automated integration test dispute submission to verify the endpoint works correctly."},
             method="POST", cookies=user_cookies)
    check("disputes.submit — submit dispute", r)

    r = trpc("disputes.list", method="GET", cookies=admin_cookies)
    check("disputes.list — admin list disputes", r)

    # ── 11. Admin sandbox procedures ──────────────────────────────────────────
    print(f"\n{BOLD}── Admin: Sandbox / Testing Procedures ───────────────────────{RESET}")

    if season_id:
        r = trpc("tournament.sandboxRegister",
                 {"seasonId": season_id, "displayName": "Test Admin Player", "abilityRating": 3},
                 method="POST", cookies=admin_cookies)
        check("tournament.sandboxRegister — admin free register", r,
              skip_if_error="already registered")

        r = trpc("tournament.sandboxSeedPlayers",
                 {"seasonId": season_id, "count": 2},
                 method="POST", cookies=admin_cookies)
        check("tournament.sandboxSeedPlayers — seed test players", r)

    # ── 12. Cleanup: delete test season ──────────────────────────────────────
    print(f"\n{BOLD}── Cleanup ───────────────────────────────────────────────────{RESET}")

    if test_season_id:
        r = trpc("tournament.adminUpdateSeasonStatus",
                 {"seasonId": test_season_id, "status": "upcoming"},
                 method="POST", cookies=admin_cookies)
        r = trpc("tournament.adminDeleteSeason",
                 {"seasonId": test_season_id},
                 method="POST", cookies=admin_cookies)
        check("tournament.adminDeleteSeason — delete test season", r)

    # ── Summary ───────────────────────────────────────────────────────────────
    passed  = sum(1 for r in results if r["status"] == "PASS")
    failed  = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")
    total   = len(results)

    print(f"\n{BOLD}{'─'*60}{RESET}")
    print(f"{BOLD}Results: {GREEN}{passed} passed{RESET}  {RED}{failed} failed{RESET}  {YELLOW}{skipped} skipped{RESET}  ({total} total){RESET}")

    if failed > 0:
        print(f"\n{BOLD}{RED}Failed tests:{RESET}")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  ✗ {r['name']}")
                if r.get("detail"):
                    print(f"    {r['detail'][:120]}")

    print()
    return failed == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()
    BASE_URL = args.base_url

    success = run_tests()
    sys.exit(0 if success else 1)
