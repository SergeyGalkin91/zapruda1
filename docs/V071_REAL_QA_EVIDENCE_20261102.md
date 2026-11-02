# v0.7.1 QA evidence — 2026-11-02

- STAGING project only: `yudtbifopfnjtjanaqrd`. PROD / main untouched.
- Executed transactional fixture with four temporary `auth.users` and matching profile creation via existing trigger; meetup bootstrap, pending invitations, owner acceptance, fourth attempted acceptance.
- Final execution: **PASS** — exactly three accepted including owner; fourth attempt raises `MEETUP_FULL`.
- Test was **sequential** within one SQL transaction, not a genuine parallel multi-connection concurrency race. Parent-row `FOR UPDATE` guard exists in source, but parallel E2E remains PENDING.
- Transaction ended in `ROLLBACK`, read-only check afterward: `meetup_posts=0`, `meetup_members=0`, `meetup_messages=0`.
- New `scripts/e2e-meetups-two-real-jwt.mjs` covers independent Auth sessions, pending/accepted GPS access and private chat; script is **not yet executed**, as protected credentials are unavailable.
- GitHub Actions `v0.7.1 Meetup security guards` static regression check: SUCCESS on commit `d60853a`. Other three standard CI checks SUCCESS on that SHA. Static guard is not browser/JWT E2E.
- Public mobile viewport checks and provider-verified club/guide payment processing are not complete; no production release approval inferred.

## Required before release
1. Configure protected disposable STAGING Auth credentials; run real JWT test and document cleanup.
2. Verify truly simultaneous third-seat acceptance from separate Postgres connections / independent JWT requests.
3. Browser mobile (320/375/430px) and desktop route E2E, network endpoint isolation.
4. Verify club/guide provider payments and commission, integrate audited Grok PRs, rerun full CI.
