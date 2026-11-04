# STAGING xAI access diagnostics — 4 November 2026 (MSK)

The actual STAGING function v13 matches PR #89's former source. The protected
run's fifth attempt (job 126197167170) received HTTP 503 with
`XAI_INVALID_API_KEY`, before the daily slot was claimed. This establishes a
provider credential rejection, not a confirmed billing/model/request failure.

## Candidate changes

- Repair common copied wrappers around the existing server secret: outer
  whitespace/quotes, `Bearer`, `XAI_API_KEY=` and `export XAI_API_KEY=`. Reject
  malformed header bytes locally. Never return a key or fragment.
- Canonicalize official global/US xAI base URLs; reject an unintended credential
  destination before sending a request. Preserve the configured model; no paid
  model substitution, balance purchase or quota reset is performed.
- Read `GET /v1/api-key` for disabled/blocked key/team flags and scoped chat/model
  ACLs, then `GET /v1/models` for the actual model/alias. Parse bounded JSON and
  return fixed states only. Do not expose account/team identifiers, key names,
  ACL strings, key fragments, provider bodies or private request text.
- A least-privilege chat key is not required to have metadata-listing permission.
  An unavailable introspection endpoint is labeled unverified; actual generation
  remains the test of completion access. Credits are explicitly **unverified**
  until a real inference response establishes otherwise.
- Authenticated confirmed STAGING users can POST `{ "action": "diagnose" }`.
  This does not claim a slot or generate text. The result includes fixed access
  states and only the caller's current daily quota state. It is unavailable
  outside STAGING.
- Return an already saved daily answer before calling the provider. Also check
  the existing failed-attempt limit/active lease first. Atomic claim/completion
  RPCs remain authoritative for new generation. Client waiting is bounded at
  45 seconds to include access checks; local rules planning remains available.

## Interpreting the live result

| Code | Required correction |
|---|---|
| `XAI_KEY_DISABLED` / `XAI_KEY_BLOCKED` | Inspect the existing key's status in its xAI team; enable/unblock if permitted. |
| `XAI_TEAM_BLOCKED` | Team administrator must resolve the team's provider restriction. |
| `XAI_ENDPOINT_DENIED` | Permit the existing key's chat endpoint (`api-key:endpoint:chat`), retaining least privilege. |
| `XAI_MODEL_DENIED` | Permit the configured model/canonical alias on this key. |
| `XAI_MODEL_UNAVAILABLE` | Verify that this team/endpoint actually offers the configured model; obtain an explicit model/cost choice before changing it. |
| `XAI_INVALID_API_KEY` | The inference service rejects the credential. Verify it is the intended team's inference API key, not a Management key; do not infer billing/ACL success. |
| `XAI_INSUFFICIENT_CREDITS` | Resolve the team's credit/spending restriction in the Console; no purchase is automated. |
| `ADVICE_FAILURE_LIMIT` / `ADVICE_IN_PROGRESS` | Existing daily quota/lease is effective. Do not reset it or switch identity to evade it. |

The diagnostic does not prove a real Grok answer or successful persistence.
Hosted acceptance must generate an actual answer under a real signed OWNER JWT,
read the caller's ready journal row, then repeat and verify the same cached
answer. Private credentials belong exclusively to `staging-e2e` secrets.

Primary references: [xAI key metadata](https://docs.x.ai/developers/rest-api-reference/inference/other),
[key ACLs](https://docs.x.ai/developers/management-api),
[inference/management separation](https://docs.x.ai/developers/rest-api-reference/inference).
