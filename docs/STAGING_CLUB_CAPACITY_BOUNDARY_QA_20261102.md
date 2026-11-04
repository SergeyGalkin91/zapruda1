# STAGING club capacity verification — 2026-11-02

## Executed test
In Supabase STAGING `yudtbifopfnjtjanaqrd`, executed a single SQL transaction with rollback:
- Inserted one temporary social group;
- Inserted 15 temporary auth.users + memberships (1 accepted, 14 pending);
- Asserted occupied slots = 15;
- Attempted insert of a 16th pending member, caught SQLSTATE check_violation, asserted it was rejected;
- ROLLBACK of all test data.

**PASS:** boundary test 15 allowed / 16th refused.

Verified post-test: `social_groups=0`, `social_group_members=0`, `auth.users=2`. No user changes or test rows persisted.

## NOT TESTED / do not claim complete
- Concurrent independently connected transactions attempting to take the 15th slot. The trigger uses a per-group FOR UPDATE lock, but race-free behavior under client concurrency must be verified separately with two SQL sessions.
- Ownership-included limit behavior (owner membership must be counted) and complete authenticated JWT API flow; temporary data was created under SQL privileged transaction.
- End-to-end club payment: no provider confirmation or production charges tested.
- PR #54 GitHub CI was SUCCESS at time of check; that does not prove payment or concurrency.

## Production issue
Read-only SQL confirmed `anon` and `authenticated` have TRUNCATE on three partner trip tables. Proposed fix isolated in separate review-only PR #55. Never apply without owner authorization.
