# Supabase Security Next Pass

이 문서는 실제 팀원 계정 연결을 제외한 상태에서 진행한 Supabase 보안 패스와 남은 보안 항목을 기록합니다.

## Current Advisor Context

이미 처리된 항목:

- `touch_updated_at` fixed `search_path`
- FK covering indexes from `supabase/migrations/013_advisor_preflight_hardening.sql`
- SECURITY DEFINER RLS helper functions moved behind `private` schema policy calls via `supabase/migrations/014_private_rls_helpers_and_memo_policy.sql`
- Direct `EXECUTE` revoked from public helper/trigger functions for `public`, `anon`, and `authenticated`
- `dashboard_memos` broad `FOR ALL USING true` policy replaced with active-user select/insert/update policies
- RLS `auth.uid()` policy calls in the touched policies wrapped with `(select auth.uid())`

남은 검토 항목:

- leaked password protection setting
- performance advisor `unused_index` info until real traffic accumulates

2026-06-06 apply status:

- Prepared local migration `supabase/migrations/014_private_rls_helpers_and_memo_policy.sql`.
- Live DB `BEGIN ... ROLLBACK` rehearsal passed with the current admin auth id:
  - direct blanket `EXECUTE` revoke alone failed because existing RLS policies also need helper function execution
  - private-schema helper migration passed authenticated role smoke checks for users, roster, tasks, memos, and dashboard memo update
- After explicit approval, live apply succeeded on project `nbefvcrcfwacvnohtsmy` as migration `20260606091558 014_private_rls_helpers_and_memo_policy`.
- Post-apply function ACL check confirmed public helper/trigger functions are executable only by `postgres`; private helper functions are executable by `authenticated` for RLS policy evaluation.
- Post-apply policy check confirmed `dashboard_memos` now has separate active-user select/insert/update policies.
- Post-apply authenticated-role smoke check passed for users, roster, tasks, memos, and dashboard memo update inside a rolled-back transaction.
- Post-apply security advisor now only reports leaked password protection disabled.
- Post-apply performance advisor no longer reports the prior `auth_rls_initplan` warnings.
- Browser QA was not completed in this pass because the in-app browser reload was blocked by Browser URL policy.

2026-06-06 follow-up prep:

- Added `docs/supabase-auth-security-checklist.md` for the remaining Auth dashboard leaked-password/password-policy decision.
- Prepared local migration `supabase/migrations/015_split_read_manage_rls_policies.sql`.
- Live DB `BEGIN ... ROLLBACK` rehearsal passed for splitting broad `FOR ALL` manage policies into write-specific insert/update/delete policies on:
  - `personal_notes`
  - `subtasks`
  - `task_links`
  - `task_tags`

2026-06-06 follow-up apply:

- After explicit approval, live apply succeeded on project `nbefvcrcfwacvnohtsmy` as migration `20260606093846 015_split_read_manage_rls_policies`.
- Policy check confirmed `personal_notes`, `subtasks`, `task_links`, and `task_tags` now keep one `SELECT` read policy plus separate `INSERT`, `UPDATE`, and `DELETE` write policies.
- Authenticated-role smoke check passed inside a rolled-back transaction:
  - visible rows: `personal_notes 0`, `subtasks 3`, `task_links 1`, `task_tags 3`
  - no-op updates passed for `subtasks`, `task_links`, and `task_tags`
- Post-apply security advisor still only reports leaked password protection disabled.
- Post-apply performance advisor no longer reports the multiple-permissive-policy warnings for `personal_notes`, `subtasks`, `task_links`, or `task_tags`; remaining performance advisor items are unused-index info until real traffic accumulates.

## Supabase Guidance Checked

- Supabase database function docs state that functions can be executed by any role by default, recommend `security invoker` by default, require explicit `search_path` when using `security definer`, and show revoking/granting function `execute` privileges.
- Supabase troubleshooting notes that security definer functions used only inside RLS policies do not need to be in exposed schemas, as long as policies reference the schema explicitly.
- Supabase API security docs recommend bundling grants with RLS setup and controlling function access through `execute` grants because RLS does not apply to functions.

## Current Functions

Security definer/helper functions in current migrations:

| Function | Current purpose | Risk note | Candidate action |
| --- | --- | --- | --- |
| `public.current_permission_role()` | RLS helper for current user role | Direct RPC exposure is unnecessary | Move to private schema or revoke direct execute after policy test |
| `public.current_user_is_active()` | RLS/profile update helper | Direct RPC exposure is unnecessary | Move to private schema or revoke direct execute after policy test |
| `public.is_admin()` | RLS/admin helper | Direct RPC exposure is unnecessary | Move to private schema or revoke direct execute after policy test |
| `public.is_lead_or_admin()` | RLS/lead helper | Direct RPC exposure is unnecessary | Move to private schema or revoke direct execute after policy test |
| `public.can_manage_task(public.tasks)` | RLS task permission helper | Direct RPC exposure is unnecessary | Move to private schema or revoke direct execute after policy test |
| `public.handle_new_auth_user()` | Auth trigger | Must remain trigger-only | Revoke direct execute; keep trigger behavior verified |
| `public.touch_updated_at()` | Table trigger | Already has fixed search path | Revoke direct execute; keep trigger behavior verified |

## Applied Migration Direction

Applied direction:

1. Create a private helper schema such as `private`.
2. Move RLS helper functions into `private` or recreate them there.
3. Update policies to call explicit schema-qualified helpers such as `private.is_admin()`.
4. Revoke direct execute on helper/trigger functions from `public`, `anon`, and `authenticated`.
5. Keep only functions intentionally exposed through RPC in an exposed schema.
6. Run role-based smoke tests before live apply and after live apply.

The failed blanket-revoke rehearsal is intentionally kept in this note as a warning: helper execute grants and policy rewrites must move together.

## Shared Memo Policy Direction

Previous behavior:

- `dashboard_memos` are page-scoped team/shared memos for `my` and `team`.
- Current policy allows authenticated users to read and write.
- UI treats these as shared operational notes, not private notes.

Applied stricter policy:

- Keep read for authenticated team users.
- Keep write for active team members only.
- Require `updated_by = auth.uid()`.
- Limit writable page keys to `my` and `team`.

Current applied choice:

- Every active team member can read/update the shared page memos.
- The write actor is recorded through `updated_by = auth.uid()`.
- No delete policy is added; clearing a memo remains an update to an empty body.

## Leaked Password Protection

This is a Supabase Auth dashboard setting rather than a SQL migration in this repo.

Recommended next action:

- Defer leaked password protection while the project remains a private/free-plan personal Supabase demo.
- Revisit this setting before real operational data entry if the company approves Supabase as the backend, or replace this checklist with the approved company identity/SSO policy if Supabase is not used.

## Verification Completed

1. Confirm current advisor output and function list. Done on 2026-06-06 before preparing migration 014.
2. Prepare SQL in a transaction and run `BEGIN ... ROLLBACK` syntax verification. Done on 2026-06-06.
3. Applied `014_private_rls_helpers_and_memo_policy` live after explicit approval.
4. Confirmed migration history includes `20260606091558 014_private_rls_helpers_and_memo_policy`.
5. Confirmed helper function ACLs and rewritten policy definitions.
6. Confirmed authenticated-role SQL smoke test for users, roster, tasks, dashboard memos, and memo update.
7. Re-ran advisors:
   - Security: only leaked password protection remains.
   - Performance after 014: prior `auth_rls_initplan` warnings are gone; unused-index info and some multiple-permissive read/manage pairs remained.
8. Applied `015_split_read_manage_rls_policies` live after explicit approval.
9. Confirmed migration history includes `20260606093846 015_split_read_manage_rls_policies`.
10. Confirmed affected policies are split by command and authenticated-role smoke checks pass.
11. Re-ran advisors:
   - Security: only leaked password protection remains.
   - Performance: multiple-permissive-policy warnings are gone; unused-index info remains.
12. Ran local verification:
   - `git diff --check`
   - `/Users/seulgi/Library/pnpm/bin/pnpm run check:demo-readiness`
   - `/Users/seulgi/Library/pnpm/bin/pnpm run check:import-plan`
   - `/Users/seulgi/Library/pnpm/bin/pnpm run check:summary-filter`
   - `CI=true /Users/seulgi/Library/pnpm/bin/pnpm run build`

## Remaining Approval Boundary

- Supabase Auth leaked password protection is intentionally deferred for the private/free-plan demo. Enable it only if Supabase is approved for real operational use and the plan supports it, unless company identity policy requires a different login path.
- Signed-in browser CRUD QA is complete as of 2026-06-06: temporary task create, status update, detail open, quick update log, and delete cleanup all passed on `http://127.0.0.1:5173/`.
