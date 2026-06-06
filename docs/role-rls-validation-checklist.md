# Role and RLS Validation Checklist

이 문서는 실제 팀장/팀원 auth 계정이 생성된 뒤, Supabase RLS와 앱 UI 권한이 같은 방향으로 작동하는지 확인하기 위한 운영 체크리스트입니다.

## Test Accounts

최소 3개 계정으로 검증합니다.

| Test role | Current roster target | Expected permission | Purpose |
| --- | --- | --- | --- |
| Admin | 소슬기 `seulgis@posco.com` | `admin` | 전체 관리, 태그/사용자/업무/일정 운영 |
| Lead | 박경수 `kyongsupark@posco.com` | `lead` | 팀 업무 배정/수정, 팀 일정 관리 |
| Member | 류강묵 또는 다른 팀원 expected email | `member` | 본인 업무 수정, 타인 업무 제한 |

## Signup Link Checks

1. 팀장/팀원이 expected email로 가입한다.
2. Supabase에서 `public.users.email`이 expected email과 일치하는지 확인한다.
3. `public.team_roster.auth_user_id`가 새 `public.users.id`에 연결됐는지 확인한다.
4. 앱 사이드바에 같은 사람이 중복 표시되지 않는지 확인한다.
5. 계정 버튼의 이름/직책이 roster와 같은지 확인한다.

## Role Matrix

| Scenario | Admin | Lead | Member |
| --- | --- | --- | --- |
| 모든 팀 업무 보기 | 허용 | 허용 | 허용 |
| 본인 업무 생성 | 허용 | 허용 | 허용 |
| 타인에게 업무 배정 | 허용 | 허용 | 제한 또는 요청/인계만 허용 |
| 본인/생성 업무 수정 | 허용 | 허용 | 허용 |
| 타인 업무 상태/마감/태그 수정 | 허용 | 허용 | 제한 |
| 타인 업무 보관/삭제 | 허용 | 허용 | 제한 |
| 업데이트 로그 추가 | 허용 | 허용 | 보이는 팀 업무에 허용 |
| 태그 추가 | 허용 | 허용 | 허용 |
| 태그 이름 수정/삭제 | 허용 | 제한 | 제한 |
| 팀 일정 생성/수정/삭제 | 허용 | 허용 | 본인이 만든 일정만 수정/삭제 |
| 개인 일정 보기 | 조율 목적 표시 | 조율 목적 표시 | 조율 목적 표시 |
| 개인 일정 수정/삭제 | 허용 | 허용 | 본인/생성 일정만 허용 |
| 팀 memo 수정 | 허용 | 허용 | 허용 |
| 개인 note 접근 | 지원 목적 외 제한 검토 | 제한 | 본인만 허용 |
| 사용자 권한/활성 상태 변경 | 허용 | 제한 | 제한 |

## App UI Walkthrough

각 계정으로 로그인해 아래를 확인합니다.

1. `Team Flow`에서 팀 업무가 보인다.
2. 본인 업무 카드를 열면 상태 변경, 링크, 업데이트, 세부 체크가 가능하다.
3. 타인 업무 카드를 열면 member 계정에서는 제한된 액션이 숨겨지거나 저장 실패 안내가 뜬다.
4. lead 계정에서는 타인 업무 상태/마감/태그/보관 동작이 가능하다.
5. member 계정에서 태그 추가는 가능하지만, `태그 수정` 및 삭제는 불가능해야 한다.
6. admin 계정에서 태그를 클릭하면 필터만 적용되고, `태그 수정`을 눌렀을 때만 수정/삭제 폼이 열린다.
7. `Calendar`에서 팀/개인 일정은 모두 보이지만, 수정/삭제 버튼은 권한 있는 일정에만 보인다.
8. `Updates`에서 member는 본인 관련 업데이트와 팀 업데이트 표시가 어긋나지 않는다.
9. `Highlights`에서 member는 본인 상세 실적을 보고, lead/admin은 팀 기준 실적을 볼 수 있다.

## Supabase Data Checks

아래 항목은 Supabase SQL editor나 MCP에서 읽기 전용으로 확인합니다.

```sql
select id, email, name, title, permission_role, is_team_member, is_active
from public.users
order by email;

select id, expected_email, auth_user_id, name, title, permission_role, is_team_member, is_active
from public.team_roster
order by name;
```

업무 권한 검증용으로는 테스트 업무 2-3개만 사용합니다.

```sql
select id, title, owner_id, owner_roster_id, creator_id, creator_roster_id, status, archived_at
from public.tasks
order by created_at desc
limit 20;
```

## Approval Boundaries

아래 작업은 별도 확인 후 진행합니다.

- 기존 JSON 이관이 다시 필요해진 경우 실제 Supabase로 1회 import.
- 사내 SSO 전환 시점 결정.
- 실제 lead/member auth 계정 연결.
- Supabase Auth leaked password protection 활성화.

완료된 보안 패스:

- `014_private_rls_helpers_and_memo_policy`로 SECURITY DEFINER helper private schema 이동, public helper/trigger execute revoke, `dashboard_memos` active-user 정책 적용 완료.
