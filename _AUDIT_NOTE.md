# Audit Note — AiRegulatoryCompliance

## Original audit recommendations (batch_07.md §14)

**Missing AI endpoints:** `/compliance-gap-finder`, `/vendor-risk-scorer`, `/policy-conflict-detector`, `/control-effectiveness-assessment`, `/remediation-planner`, `/board-readiness-report`.

**Missing non-AI features:** workflow automation, DLP/CASB integration, policy version control, compliance calendar, incident response playbooks.

**Custom suggestions:** continuous compliance monitoring, remediation workflow automation, AI-generated audit documentation, policy-to-control mapping, third-party compliance exchange, board executive dashboards.

## Implemented this pass (3 mechanical)
1. `POST /api/ai/compliance-gap-finder` — JSON gap report mapping current controls to a target framework.
2. `POST /api/ai/vendor-risk-scorer` — multi-dimension numeric vendor risk score with reassessment cadence.
3. `POST /api/ai/remediation-planner` — violation → owner-tagged remediation steps with deadlines, mitigations, success metrics.

All persisted to `ai_analysis_history`, reusing `makeOpenRouterRequest` and `cleanAIResponse` helpers, `authMiddleware`. Syntax-checked.

## Backlog (prioritized)
1. `POST /api/ai/policy-conflict-detector` (mechanical follow-up).
2. `POST /api/ai/control-effectiveness-assessment` (mechanical follow-up).
3. `POST /api/ai/board-readiness-report` (mechanical follow-up).
4. Workflow automation engine for tasks/deadlines (NEEDS-PRODUCT-DECISION).
5. Compliance calendar with regulator deadlines (mechanical, needs source choice).
6. DLP/CASB integration (NEEDS-CREDS).

## Apply pass 3 (frontend)

**Action: LEFT-AS-IS** — `frontend/src/pages/ComplianceGapFinder.js`, `VendorRiskScorer.js`, and `RemediationPlanner.js` already exist and call the respective `/ai/*` endpoints via the JWT-aware `services/api` helper. All three pages added in apply pass 2 already have FE counterparts. Idempotent.

## Apply pass 4 (mechanical backlog)

Cleared the 3 mechanical follow-ups from the backlog. Each pairs a BE endpoint that 503s on missing OPENROUTER_API_KEY with a FE page in the AI Features sidebar group.

### Backend (`backend/src/services/aiService.js` + `backend/src/routes/ai.js`)
- `POST /api/ai/policy-conflict-detector` — surfaces contradictions, redundancies, and gaps across policies. Requires `policies:[{name,content}]` (>=2). 400 on invalid input.
- `POST /api/ai/control-effectiveness-assessment` — design + operational effectiveness scores per control with residual-risk band and improvement recommendations.
- `POST /api/ai/board-readiness-report` — executive briefing JSON: posture rating, key metrics, top risks, regulatory exposure, decisions required.

All three reuse `makeOpenRouterRequest`/`cleanAIResponse`, persist to `ai_analysis_history` (best-effort `.catch(() => null)`), gated by `authMiddleware`. Each service method explicitly checks `OPENROUTER_API_KEY` and throws `{code:'NO_AI_KEY'}` which the route handler maps to `503 {"error":"AI service unavailable: OPENROUTER_API_KEY not configured"}`. `node --check` passes.

### Frontend (`frontend/src/pages/`)
- `PolicyConflictDetector.js` — multi-policy textarea (split on `---`), conflict cards with severity, priority resolutions list.
- `ControlEffectivenessAssessment.js` — pipe-delimited controls input, per-control effectiveness scoring, weakness/strength lists.
- `BoardReadinessReport.js` — JSON org-data input, metrics + top risks + regulatory exposure + decisions-required cards.

All three use the existing `services/api` axios instance (auto-attaches JWT from localStorage), handle 503 with a dedicated message, render via `useToast`, match the styling of `ComplianceGapFinder`/`RemediationPlanner` (form-group / card / btn-primary / Sparkles+Loader+AlertTriangle icons).

`App.js` and `components/Layout.js` updated to register routes `/policy-conflict-detector`, `/control-effectiveness-assessment`, `/board-readiness-report` and add them to the AI Features sidebar group.

### Smoke test (port 5601, OPENROUTER_API_KEY="" )
1. `lsof -ti :5601 | xargs kill -9` → free.
2. `nohup env OPENROUTER_API_KEY= PORT=5601 node src/index.js & disown` → server up.
3. `POST /api/auth/login` admin@compliance.com/password123 → 200 with JWT.
4. `POST /api/ai/policy-conflict-detector` (bearer) → `503 {"error":"AI service unavailable: OPENROUTER_API_KEY not configured"}`.
5. `POST /api/ai/control-effectiveness-assessment` (bearer) → 503 (same).
6. `POST /api/ai/board-readiness-report` (bearer) → 503 (same).
7. Validation `POST /api/ai/policy-conflict-detector` `{"policies":[]}` → 400 with explanatory error.
8. `kill -9` → port 5601 freed.

### Constraints honored
- No `npm install`, no new dependencies (uses already-bundled axios on FE; existing `https`/`pg`/`express`/`jsonwebtoken`/`bcryptjs` on BE).
- `node --check` passes for `routes/ai.js` and `services/aiService.js`.
- All new JSX validates via `@babel/parser` (already in node_modules) for App.js, Layout.js, and the 3 new pages.
- No working code touched (only additions to existing files; new pages stand alone).
