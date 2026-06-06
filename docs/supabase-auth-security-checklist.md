# Supabase Auth Security Checklist

이 체크리스트는 회사 내부 pilot 전에 Supabase Auth 대시보드에서 확인할 보안 설정입니다.

## Current Status

- Project: `work-dashboard`
- Project ref: `nbefvcrcfwacvnohtsmy`
- Region: `ap-northeast-1`
- Database status: active/healthy
- RLS/function hardening: migration `014_private_rls_helpers_and_memo_policy` live-applied
- Remaining security advisor warning: leaked password protection disabled

## Required Dashboard Check

Supabase Auth leaked password protection is a dashboard Auth setting, not a SQL migration in this repo.

Official guidance:

- Configure password strength and leaked password protection in project Auth settings.
- Supabase uses HaveIBeenPwned Pwned Passwords API to reject known leaked passwords.
- Leaked password protection is available on the Supabase Pro Plan and above.

Dashboard path:

1. Open Supabase project `work-dashboard`.
2. Go to `Authentication` > `Providers` > `Email`, or the project Auth settings page for password security.
3. Confirm whether the current plan supports leaked password protection.
4. Enable leaked password protection if available.
5. Keep minimum password length at least 8 characters.
6. Prefer requiring digits, lowercase letters, uppercase letters, and symbols unless company password policy says otherwise.
7. Re-run the Supabase security advisor after saving.

## Company Questions

- Is Supabase Pro Plan allowed or already active for this project?
- Does company password policy require a stricter minimum length than 8?
- Should the pilot stay email/password, or must SSO be required before real operational data entry?
- Does company policy require MFA/CAPTCHA before broad team rollout?

## After Enabling

Record the result in:

- `docs/company-supabase-review-brief.md`
- `docs/supabase-security-next-pass.md`
- `TODO.md`
- `HANDOFF.md`

Then re-run:

- Supabase security advisor
- signed-in browser CRUD smoke QA
