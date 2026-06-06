# Company Supabase Review Brief

## One-Line Summary

`연구기획그룹-전략` 업무 대시보드는 현재 Supabase/Postgres/Auth 기반의 내부 검토용 데모 단계다. 회사 승인 전에는 실제 업무 데이터, 실제 팀원 auth 계정 연결, 외부 배포 URL 운영을 보류한다. 1차 내부 확인은 임시 URL 없이 회사 포트/로컬 네트워크 방식으로 진행한다.

## What The App Does

주요 화면:

- My Desk: 개인 오늘 브리핑, 내 업무 흐름, 오늘 일정, 메모
- Team Flow: 팀 업무 보드, 타임라인, 반복 업무, 보관함
- Calendar: 팀 일정, 개인 일정, 업무 종료일 확인
- Updates: 최근 업데이트 로그
- Highlights: 주간/월간/분기/연간 업무실적 리포트

## Current Demo Data Position

현재 내부 1차 시연은 실명 데모로 진행한다.

현재 visible roster:

- 소슬기 / 수석 / admin
- 박경수 / 팀장 / lead
- 류강묵 / 수석 / member
- 장형민 / 차장 / member
- 박관욱 / 수석 / member
- 조원태 / 수석 / member

주의:

- 실제 업무 비밀이나 민감한 링크는 넣지 않는다.
- 부서 외 공유 또는 보안 검토 단계에서는 익명 roster 데모를 별도로 준비한다.
- 기존 로컬 JSON 업무 이관은 현재 launch path에서 제외한다. 팀은 Supabase에 새 데이터로 시작한다.

## Data Stored In Supabase

현재 또는 계획된 저장 범위:

| Area | Examples | Notes |
| --- | --- | --- |
| User/profile | 이름, 직책, profile emoji, permission role, active/team flags | `admin`, `lead`, `member` 권한 모델 |
| Team roster | 가입 전 담당자 row, expected email, auth link | 실제 팀원 auth 연결은 현재 보류 |
| Tasks | 제목, 설명, 담당자, 상태, 중요도, 날짜, 태그, 보관/삭제 상태 | 실제 업무 데이터는 승인 전 입력 금지 |
| Task details | 상세 checklist, links, update logs, status history | 운영 기록이 될 수 있으므로 민감도 확인 필요 |
| Calendar | 팀 일정, 개인 일정, 업무 종료일 derived view | 개인 일정은 공유 캘린더에 보이는 정책 |
| Tags/categories | 공유 태그, Category groups | 모든 사용자가 추가 가능, rename/delete는 admin |
| Dashboard memos | page-scoped shared memo for `my` and `team` | 현재 shared memo 정책은 추가 검토 대상 |
| Preferences | last selected page/view/filter/timeline mode | 개인화 UI 상태 |

Do not store before approval:

- 실제 업무 기밀
- 민감한 경영/투자/인사 정보
- 외부 공개 불가 파일 링크
- 실제 팀원 개인 일정 중 민감한 내용
- 회사 보안 정책상 외부 SaaS에 저장할 수 없는 데이터

## Current Security State

Already done:

- Supabase project connected locally.
- Initial schema/RLS policies and Data API grants are applied.
- First admin user exists.
- Task, tag, calendar, memo, profile, roster, recurring rule write paths are partially wired.
- Advisor preflight low-risk items were handled:
  - `touch_updated_at` fixed `search_path`
  - missing FK covering indexes added
- SECURITY DEFINER helper exposure and shared memo policy hardening were handled through live migration `014_private_rls_helpers_and_memo_policy`.
- Performance-focused RLS read/manage policy split was handled through live migration `015_split_read_manage_rls_policies`.
- Security advisor now only reports leaked password protection disabled.
- Performance advisor now only reports unused-index info until real traffic accumulates.

Still approval-bound:

- Supabase Auth leaked password protection setting.
- Actual lead/member signup and auth account linking.
- Temporary internet deployment URL.
- Real operational data entry.

Reference plan: `docs/supabase-security-next-pass.md`.
Auth dashboard checklist: `docs/supabase-auth-security-checklist.md`.

## Permission Model To Explain

| Role | Intended capability |
| --- | --- |
| admin | manage users/roles/tags/all tasks/all shared data |
| lead | assign and manage team tasks, team schedule, team reports |
| member | manage own work, add logs to visible work, read public team flow |

Important nuance:

- UI restrictions alone are not treated as security.
- Backend RLS and grants must enforce the same rules.
- Shared calendar makes team/personal blocks visible for coordination, but edit/delete is permission-limited.

## Internal Port Demo Decision

Current decision:

- 임시 URL은 현재 제외한다.
- 회사에서 포트/로컬 네트워크를 활용해 먼저 확인한다.
- 외부 배포 플랫폼, 임시 인터넷 주소, 운영 배포는 지금 준비하지 않는다.
- 실행 절차는 `docs/internal-port-demo-runbook.md`를 따른다.

Use no URL when:

- 슬기님 노트북으로 회의실에서만 보여준다.
- localhost/dev server로 충분하다.
- 회사가 외부 SaaS/배포 URL 검토 전이다.
- 같은 회사망에서 host/port 접근을 허용해 내부자가 확인할 수 있다.

Revisit a temporary URL only if:

- 여러 사람이 각자 PC에서 클릭해 봐야 한다.
- 보안팀/IT팀이 실제 접속 URL을 확인해야 한다.
- 모바일/노트북 등 다양한 환경에서 접근성을 봐야 한다.

Before creating a temporary URL:

- Decide real-name demo vs anonymized demo.
- Confirm no real sensitive data is seeded.
- Confirm allowed deployment target.
- Configure only public frontend env vars such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Never expose service role keys, DB password, or admin secrets in frontend deployment.

## Company Questions

Ask company IT/security:

1. Supabase managed Postgres/Auth 사용이 가능한가?
2. 현재 project region `ap-northeast-1` 사용이 허용되는가?
3. 업무 제목/상태/일정/메모/링크를 외부 SaaS DB에 저장할 수 있는가?
4. 이메일/password pilot이 가능한가, 아니면 SSO가 먼저 필요한가?
5. RLS, audit, password policy, account lifecycle에 대한 최소 요구사항은 무엇인가?
6. 내부 포트/로컬 네트워크 방식으로 시연해도 되는가? 별도 임시 URL이 필요한가?
7. 실제 운영 전환 전에 필요한 보안 검토 산출물은 무엇인가?

## Recommended Next Step

회사 확인 전:

1. 내부 실명 데모를 로컬 또는 슬기님 PC에서 시연한다.
2. 이 문서와 `docs/company-demo-readiness-checklist.md`를 기준으로 Supabase 사용 가능 여부를 문의한다.
3. 내부 포트 방식으로 먼저 확인한다. 임시 URL이 필요하다는 결정이 나면, 그때 익명화 여부와 배포 플랫폼을 정한다.
4. 회사가 Supabase 사용을 허용하면 Supabase Auth leaked password protection과 실제 사용자 계정 연결/SSO 기준을 확인한다.
