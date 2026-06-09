# Multi-Workspace Expansion Plan

이 문서는 현재 `연구기획그룹-전략` 팀용 대시보드를 나중에 여러 그룹이 함께 쓰는 형태로 확장할 때의 기준을 정리합니다.

작성 기준일: 2026-06-09

## 먼저 결론

지금은 우리 팀 10명 내외 사용을 안정화하는 것이 우선입니다.

다른 팀이나 그룹으로 확장할 때는 지금 구조를 그대로 복사해서 함께 쓰는 것이 아니라, 데이터와 권한을 `workspace` 기준으로 분리하는 멀티 워크스페이스 구조로 전환해야 합니다.

규모별 권장 방향:

| 규모 | 권장 구조 |
| --- | --- |
| 우리 팀 10명 내외 | 현재 팀 전용 구조 안정화 |
| 30명 정도 1개 그룹 | `workspace + unit + visibility` 구조 |
| 30명 그룹 10개 이상 | `workspace_id` 기반 멀티 워크스페이스 필수 |

기술적으로 30명 그룹이 10개 이상이어도 Supabase/Postgres로 충분히 감당할 수 있습니다. 다만 `workspace_id`, RLS, 인덱스, 관리자 권한, 그룹별 설정 분리가 없으면 데이터 섞임과 권한 문제가 생길 수 있습니다.

## 용어

| 용어 | 의미 |
| --- | --- |
| workspace | 하나의 그룹 또는 부서 단위. 예: 연구기획그룹, 설비기술그룹 |
| unit | workspace 안의 팀/파트/TF 단위. 예: 전략팀, 기획팀, 운영파트 |
| membership | 사용자가 어떤 workspace/unit에 속하는지 나타내는 관계 |
| visibility | 데이터 공개 범위. 예: `private`, `unit`, `workspace` |
| system_admin | 전체 시스템 관리자 |
| workspace_admin | 특정 workspace 관리자 |
| unit_lead | 특정 unit 리더 |

## 기본 모델

나중 확장 시에는 아래 테이블이 필요합니다.

```text
workspaces
workspace_memberships
workspace_units
```

기존 공유 데이터에는 `workspace_id`가 붙어야 합니다.

```text
tasks.workspace_id
task_updates.workspace_id 또는 tasks를 통해 확인
task_change_history.workspace_id 또는 tasks를 통해 확인
task_posts.workspace_id 또는 tasks를 통해 확인
canvas_tabs.workspace_id
canvas_nodes.workspace_id 또는 canvas_tabs를 통해 확인
canvas_links.workspace_id 또는 canvas_tabs를 통해 확인
tags.workspace_id
tag_groups.workspace_id
task_post_categories.workspace_id
calendar_events.workspace_id
dashboard_memos.workspace_id
```

30명 규모의 한 그룹 안에서 팀/파트까지 나누려면 `unit_id`도 함께 사용합니다.

```text
tasks.unit_id
calendar_events.unit_id
canvas_tabs.unit_id
dashboard_memos.unit_id
```

## 공개 범위

30명 이상이 한 workspace를 쓰면 모든 데이터를 완전 공개로 두기보다 공개 범위를 나누는 것이 좋습니다.

권장 visibility:

| 값 | 의미 |
| --- | --- |
| private | 개인만 보는 데이터 |
| unit | 같은 팀/파트/TF에서 보는 데이터 |
| workspace | 그룹 전체가 보는 데이터 |

예:

- 개인 메모: `private`
- 팀 업무: `unit`
- 그룹 공통 보고/공유 업무: `workspace`
- Canvas: `unit` 또는 `workspace`
- 업무 노트: 부모 업무의 visibility를 따름

## 그룹별 설정

각 그룹이 하는 일이 다르면 태그, 업무흐름, 게시글 유형도 그룹별로 달라져야 합니다.

분리해야 하는 설정:

- 태그
- 태그 묶음 또는 Category
- 업무흐름
- 게시글 유형
- 업무 템플릿
- 보고서 양식 일부
- 기본 Canvas 탭 또는 공유 공간

권장 DB 규칙:

```sql
unique (workspace_id, tag_name)
unique (workspace_id, workstream_name)
unique (workspace_id, post_category_label)
```

이렇게 하면 A그룹과 B그룹이 같은 이름의 `리스크`, `KPI`, `회의록`을 써도 서로 충돌하지 않습니다. 이름 중복은 같은 workspace 안에서만 막으면 됩니다.

## 권한 모델

나중 확장 시 권한은 현재 `admin`, `lead`, `member`보다 조금 더 나눠야 합니다.

권장 역할:

| 역할 | 범위 |
| --- | --- |
| system_admin | 전체 시스템 설정과 모든 workspace 관리 |
| workspace_admin | 자기 workspace 구성원/설정/데이터 관리 |
| unit_lead | 자기 unit 업무 관리 |
| member | 자기 workspace/unit의 업무 작성/수정 |
| viewer | 조회 전용 |

중요한 점:

- `workspace_admin`은 자기 workspace만 관리해야 합니다.
- A그룹 관리자가 B그룹 태그, 업무흐름, 게시글 유형을 바꾸면 안 됩니다.
- system admin은 최소 인원만 둡니다.
- AI/HERmes 같은 읽기 도구도 같은 workspace 권한을 따라야 합니다.

## RLS 원칙

화면에서 숨기는 것만으로는 부족합니다. Supabase RLS에서 다른 workspace 데이터를 읽지 못하게 막아야 합니다.

기본 원칙:

```text
로그인 사용자가 workspace_memberships에 속한 workspace_id의 데이터만 SELECT 가능
```

예시 개념:

```sql
exists (
  select 1
  from public.workspace_memberships wm
  where wm.workspace_id = tasks.workspace_id
    and wm.user_id = auth.uid()
    and wm.active = true
)
```

쓰기 정책도 같은 원칙을 따라야 합니다.

```text
workspace_admin: 자기 workspace 설정 관리
unit_lead: 자기 unit 업무 관리
member: 권한 있는 업무 작성/수정
viewer: 읽기만
```

## 성능 원칙

300명 정도는 큰 규모가 아니지만, workspace 필터와 인덱스가 없으면 느려질 수 있습니다.

필수 인덱스:

```sql
create index on public.tasks(workspace_id, status);
create index on public.tasks(workspace_id, owner_id);
create index on public.tasks(workspace_id, due_date);
create index on public.task_updates(task_id, created_at desc);
create index on public.task_posts(task_id, created_at desc);
create index on public.tags(workspace_id, name);
create index on public.canvas_tabs(workspace_id, sort_order);
```

화면 원칙:

- 기본 화면은 내 workspace 또는 내 unit 데이터만 읽습니다.
- Highlights/보고서는 기간과 workspace 필터를 반드시 둡니다.
- Canvas는 한 번에 모든 workspace 데이터를 읽지 않습니다.
- 관리자 화면은 선택한 workspace 기준으로만 설정을 읽습니다.

## UI 확장 방향

현재 메뉴를 갑자기 크게 바꾸기보다, 단계적으로 확장합니다.

30명 그룹 1개:

```text
My Desk
Team Flow 또는 Unit Flow
Group Flow
Calendar
Updates
Highlights
Canvas
관리자
```

여러 workspace:

```text
상단 workspace 선택
내 업무
내 소속 unit
workspace 전체
관리자
```

관리자 화면에는 나중에 아래 탭을 추가합니다.

- Workspace 관리
- 구성원 관리
- Unit/파트 관리
- 태그 관리
- 업무흐름 관리
- 게시글 유형 관리
- 보고서 양식 관리

## 단계별 전환 계획

### Phase 0. 우리 팀 안정화

현재 우선순위입니다.

- `release/company-fastapi-postgres` 기준으로 우리 팀 운영 검증
- FastAPI/PostgreSQL 연결
- 업무 노트/Canvas/보고서 흐름 안정화
- 실제 팀 roster와 권한 검증

### Phase 1. 다팀 확장 설계

아직 구현하지 않고 설계만 확정합니다.

- workspace/unit/visibility 용어 확정
- 어느 데이터가 workspace별 설정인지 결정
- API 권한 정책과 DB 제약 초안 작성
- migration 영향 범위 산정

### Phase 2. DB 전환

기존 팀 전용 데이터를 workspace 구조로 옮깁니다.

- `workspaces` 생성
- `workspace_memberships` 생성
- 주요 테이블에 `workspace_id` 추가
- 필요 테이블에 `unit_id`, `visibility` 추가
- 기존 데이터 backfill
- workspace RLS 적용
- workspace별 unique 제약 적용

### Phase 3. UI 전환

- workspace 선택 또는 고정 workspace 컨텍스트 추가
- 관리자 화면에 workspace/unit 관리 추가
- 태그/업무흐름/게시글 유형을 workspace별로 관리
- 보고서/Highlights에 workspace/unit 필터 추가

### Phase 4. 파일럿 확장

- 다른 그룹 1곳만 먼저 파일럿
- 그 그룹의 태그/업무흐름/게시글 유형을 별도 설정
- A그룹 사용자가 B그룹 데이터를 볼 수 없는지 RLS 검증
- 성능과 화면 복잡도 확인

### Phase 5. 여러 그룹 운영

- workspace별 관리자 지정
- 운영 tag와 release 절차 정리
- 백업/복구/감사 로그 체계화
- AI 읽기 도구도 workspace 필터 적용

## 구현 전 체크리스트

다팀 확장 구현을 시작하기 전 아래 질문에 답해야 합니다.

- workspace는 그룹 단위인가, 부서 단위인가?
- 한 사용자가 여러 workspace에 속할 수 있는가?
- 그룹 전체 조회가 필요한 사람은 누구인가?
- unit 간 업무를 공유할 수 있는가?
- 태그/업무흐름/게시글 유형은 workspace별로 완전히 독립인가?
- 공통 태그 사전이 필요한가?
- 보고서는 workspace별인가, 상위 조직 통합 보고서도 필요한가?
- system admin은 누가 맡는가?
- 내부 Git 기준 운영에서 각 workspace의 배포/설정 변경 권한은 누가 갖는가?

## 지금은 하지 않을 일

우리 팀 안정화 전에는 아래를 구현하지 않습니다.

- workspace 전환 UI
- 다그룹 RLS migration
- system admin 화면
- 그룹별 billing/사용량 관리
- AI 쓰기 권한
- 여러 그룹 통합 보고서 자동 발행

## 한 줄 정리

우리 팀에서 먼저 안정화한 뒤, 다른 그룹으로 확장할 때는 `workspace_id`로 데이터를 분리하고, `unit_id`와 `visibility`로 그룹 안의 팀/파트 공개 범위를 조절하며, 태그/업무흐름/게시글 유형은 각 workspace 관리자가 독립적으로 관리하도록 전환하는 것이 가장 안전합니다.
