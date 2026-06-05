# Performance Report Rules

This note defines how the `업무실적` tab should turn existing dashboard data into weekly, monthly, quarterly, and yearly report text.

## Purpose

The report should reduce manual weekly and monthly status writing. It should prioritize readable work evidence by person, not numeric scoring.

## Included Source Data

Use these records as report evidence:

- Tasks owned by the person.
- Task updates written during the selected period.
- Subtasks completed during the selected period when completion dates exist later.
- Current completed subtasks as supporting detail until completion dates are implemented.
- Task status, due date, and archive state.
- Recurring task instances, merged by recurring template and normalized title.

Do not include personal notes or personal calendar events in 업무실적 unless the user explicitly exports them into a task update later.

## Period Rules

### Weekly

Weekly reports show the most detail because they replace manual weekly writing.

For each person, include:

- Completed work with completion date when available.
- In-progress work with completed detail and next planned detail.
- Issues, holds, or requests from update logs.
- Short content/detail rows when update logs explain meaningful progress.

Date label format:

- Weekly: `6/2`
- Weekly title: `['26.6.1~6.7] 업무실적 정리`

### Monthly

Monthly reports should be compact and focus on completed and planned outcomes.

For each person, include:

- Completed work and main deliverable.
- Planned or in-progress work that continues into the next period.
- Issues only when the status is `보류`, overdue, or update logs contain issue words.

Date label format:

- Monthly: `6월`
- Monthly title: `['26.6월] 업무실적 정리`

### Quarterly

Quarterly reports group each person by month in a table-like layout.

For each month, include:

- Completed outcomes.
- Continuing plans.
- Recurring work merged into one row, for example `보고 (4월~6월 반복)`.

Avoid heavy boxes for each row because quarterly content can grow quickly.

### Yearly

Yearly reports group each person by quarter.

For each quarter, include:

- Major completed outcomes.
- Continuing or planned work.
- Recurring work merged by quarter range, for example `보고 (1~3분기 반복)`.

Yearly reports should stay compact and avoid log-level detail unless the user opens a task detail.

## Status Rules

Use these status labels in report text:

- `[완료]`: task status is 완료, task progress is 100%, or all subtasks are done.
- `[진행]`: task is 진행중 or has updates/progress in the period.
- `[계획]`: task is 계획 and starts or is due in the selected period.
- `[검토]`: task status is 검토/대기.
- `[보류]`: task status is 보류 or update logs mention blocked/hold/external dependency.

If multiple rules apply, prefer this order:

1. 보류
2. 완료
3. 검토
4. 진행
5. 계획

## Detail Rules

For each report row:

- `완료`: completed subtasks or completion update text.
- `계획`: incomplete subtasks or next action text.
- `이슈`: update logs containing `보류`, `확인 필요`, `지연`, `요청`, `대기`, `리스크`.
- `내용`: meaningful update text that is not already represented by 완료/계획/이슈.

Keep rows short enough to scan. The task detail remains the source of full history.

## Recurring Work Rules

Recurring templates are not repeated as separate report rows when multiple instances exist in the period.

Merge rows when they share:

- recurring frequency
- recurring detail
- normalized task title
- owner

Generated instances can be completed, archived, or updated independently. The report should use instance-level status and updates, then display a merged recurrence label.

## Export Rules

Current export is Markdown through `Markdown 복사` and `파일 저장`.

Recommended section order:

1. Period title.
2. Person cards or person sections in team order.
3. Per-person rows grouped by month or quarter when applicable.
4. Source appendix only if requested.

Current export options:

- `근거 업무 포함`: appends a `근거 업무` Markdown appendix with source task ids, owner, status, period, tags, and in-period update references.
- `긴 기간 이슈/내용`: available for monthly, quarterly, and yearly modes. When enabled, long-period reports include issue/content/update detail that is otherwise hidden to keep those reports compact.

Every generated row should retain source task ids and update ids internally or in the optional appendix so the text can be explained later.
