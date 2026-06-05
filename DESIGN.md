# DESIGN.md

## Purpose

This document preserves the approved design direction for the `연구기획그룹-전략` work dashboard. Use it before changing UI, layout, typography, chips, task detail, timeline, calendar, updates, or performance reporting.

The product is an internal work dashboard, not a landing page. It should feel modern, calm, structured, and useful for daily repeated work.

## Design Principles

- Personal-first entry, public team visibility.
- Show the user's own daily briefing first; keep full team workflow one click away.
- Prefer dense but readable operational layouts over marketing-style hero sections.
- Use quiet surfaces, thin borders, compact chips, and clear hierarchy.
- Avoid visual noise from too many colors, oversized stickers, or overly bold text.
- Preserve enough whitespace for scanning, but do not reserve empty detail areas before the user clicks something.
- Korean text should break by word, not inside words, whenever possible.
- Desktop and tablet are the main targets; phone layout is lower priority.

## Current Layout Contract

### Sidebar

- Left sidebar stays persistent.
- Brand mark uses a meaningful simple symbol, not a generic text square.
- Navigation text must be readable and moderately weighted.
- Team list order is `그룹장`, `팀장`, then 가나다 order.
- Team member row shows emoji/profile symbol, name, and role on one line when space allows.
- Selected team member should feel active but not flashy.

### Top Bar

- Search input is compact; placeholder text should not dominate the page.
- Account button shows emoji/profile, name, and role on one line when possible.
- Admin indication belongs in the top account area, not in every team list row.

### Today Briefing

- `오늘 브리핑` is the first meaningful screen.
- Personal mode emphasizes the selected user's own work.
- Team mode summarizes the public team flow.
- The left briefing list owns most of the width; side widgets must not squeeze task titles.
- The current approved split is approximately 60 percent briefing list and 40 percent side panel.
- The side panel contains `오늘 일정` and `메모`, not `오늘 업무 큐`.
- `오늘 일정` and `메모` are equal-width within the side area.
- `메모` is page-scoped shared memo: `오늘 브리핑` and `전체 업무흐름` have independent memo values.
- If the briefing list grows, agenda/memo can grow up to an internal scroll cap.

Briefing rows:

- One-item rows should not look taller than multi-item rows.
- Multi-item groups show each task line separately.
- Due labels such as today, D-minus, and D-plus use one fixed right-side rail.
- If a group has multiple tasks, each task gets its own due label.
- If a group has one task, clicking it should give soft selection feedback and open the task detail.
- Task titles should be more readable than helper captions; do not make them too thin.

Greetings:

- Use a warm, gentle greeting.
- 07:00-09:59 should feel like a morning greeting.
- 17:00 onward should shift to wrap-up or closing tone.
- Include one appropriate emoji in greeting copy when it helps warmth.
- Personal greetings may include a short hint from current briefing state: overdue, due today, start today, or focus work.

## Emoji Picker Contract

- Emoji selection is a shared interaction for profile settings, memo, calendar notes, and update logs.
- The prototype uses a lightweight searchable popover without installing a full emoji package.
- Popover content must render above cards/panels and must not be clipped by parent overflow.
- Emoji options should show the emoji only; helper names belong in `title` or accessible labels, not visible text under each emoji.
- In production implementation, replace the prototype picker with `emoji-picker-react` so the full emoji set, search, categories, and recent emojis are available.
- Do not put emoji pickers on structured fields such as task title, tags, dates, status, or priority unless the product scope explicitly changes.

## Workflow Views

### Board

- Board order is fixed: `검토/대기`, `계획`, `진행중`, `완료`, `보류`.
- Card titles should be readable but not heavy enough to fight the page title.
- Board cards do not show long description text; description belongs in task detail.
- Owner initials must remain clear on team workflow cards.
- If the user cannot manage the task, hide unavailable status controls instead of showing disabled gray controls.
- Archive/edit actions stay grouped tightly.
- Repeat marker appears on the task-title row, icon-only.

### Timeline

- Timeline is a workflow peer of the board.
- It should use soft solid status colors matching the legend, not strong saturated gradients.
- The timeline container, toolbar, legend, grid, and empty state must keep the same rounded-card grammar as the board and other workflow panels.
- Monthly timeline excludes weekends.
- Toolbar, legend, and date axis should stay readable while the timeline scrolls.
- Task bars show tag, task title, progress percent, and repeat/risk markers when applicable.
- If a task spans outside the visible period, communicate that through tooltip/edge treatment rather than clipped-looking text.
- Clicking a timeline task opens the same right-side workflow task detail as board/recurring/archive.

### Recurring Work

- Recurring tab previews scheduled work; it should not flood the board with far-future tasks.
- Future instances appear in board/briefing only when the relevant start date arrives or an instance is actually created.
- Schedule preview shows one compact line; overflow becomes hidden/truncated.
- Use `미수행 반복 일정 삭제` for removing future unstarted recurring schedules.
- Repeated instances copy detailed task items but reset completion checks, logs, history, and completion metadata.
- Repeat marker is icon-only across board, detail, timeline, calendar, and legend.

### Archive

- Completed and held tasks can be archived.
- Archived tasks disappear from main board/briefing but remain searchable in archive and usable in reporting.
- Archive restore uses the common task detail actions.

## Task Detail Contract

Task detail is contextual and appears only after explicit selection.

- Briefing selections open detail beside the briefing.
- Board, timeline, recurring, and archive selections open detail beside the clicked workflow area.
- Calendar task selections open the same common task detail style in the calendar side panel.
- Do not reserve a blank right column before detail is opened.
- Include a close action.

Header:

- `업무 상세` label remains visible.
- Action icons align to the card's right edge.
- Title should use available width and break by word, not inside words.
- Title weight should be strong but not oversized.
- Status, priority, delay, new, archive, and repeat indicators should be compact.
- Importance uses the square/priority grammar; do not switch it to a circular tag style.

Main content:

- Tags sit under the task title and use the same tag chip grammar as the rest of the app.
- Progress bar is important and must remain visible.
- `상세 업무 내용` is the main checklist and should feel more important than metadata.
- Progress is calculated from completed detail checklist items.
- At least one detail item should exist for meaningful progress tracking.
- Task description appears as `설명:` in a compact description box.
- `다음 액션 추천` should be natural and derived from subtasks, logs, links, state, and timing. Avoid stiff generic phrases.

Related links:

- Related links are important enough to add directly from task detail.
- Inline link creation should be compact and not require opening the full edit modal.
- Existing links remain in simple rows with title and type.

Update logs:

- Update log input should be larger than the submit button.
- `남기기` button should be compact.
- Logs show author, date, and text in a readable but not overly bold style.

Metadata and history:

- Metadata is supporting information. Keep it compact.
- Change history should use table-like rows with date, actor, and change text on one line.
- Long change text may truncate but should be readable through hover/focus tooltip.
- Calendar task detail history should remain readable and inside the table columns.

## Calendar Contract

- Calendar distinguishes `팀 일정`, `개인 일정`, and `업무 일정`.
- Legend order is `팀 일정`, `개인 일정`, `업무 일정`.
- `업무 일정` means planned task end date.
- Weekend dates should feel like holidays through red text only, not heavy red backgrounds.
- Calendar task click opens the common task detail, not a separate reduced task card.
- Personal or team event detail should emphasize the event note/details more than metadata.
- Event detail does not need to repeat type or person when color/context already communicates it.
- Event edit mode should not keep the old event title as a separate large heading above the form.
- In event edit mode, `일정명` belongs at the top, then `구분/대상자`, then `시작일/종료일`, then `일정 세부내용`.
- Calendar event edit inputs, selects, and action buttons must use matching heights, font size, and visual weight.
- `팀 일정` and `개인 일정` labels should stay on one line in the calendar detail panel.

## Updates Contract

- Updates tab supports `My` and `Team`.
- `My` means tasks assigned to the selected person or logs written by that person.
- `Team` means all visible team update cards.
- Show non-completed and non-archived tasks with logs from the last seven days.
- Include current status and tags in the update card header, but keep chips compact.
- New logs can be added directly in the update section.
- Avoid duplicate names in the same update header.

## Performance Report Contract

- `업무실적` opens in weekly mode by default.
- Weekly view shows issue, description/content, completed, and planned lines.
- Monthly groups by week.
- Quarterly groups by month.
- Yearly groups by quarter.
- Long-period reports should be compact and table-like, not covered in nested boxes.
- Person cards can be two-column on wide screens.
- Role text stays plain next to the name, not in a large sticker.
- The person filter should remain available.
- `이슈/설명 포함 상세실적 보기` controls longer detail.
- `저장/복사 시 전체 데이터 포함` is an export/copy option, not visible report decoration.

## Tags and Filters

- Tags are shared metadata.
- All users can add tags.
- Admin can rename/delete tags.
- Tags can be applied in multiples.
- Tag chips should have one shared grammar across briefing, board, detail, update, tag library, and task form.
- Tag bundle presets are filters, not real editable tags.
- Category preset clicks filter work immediately; they must not open the admin edit UI by themselves.
- Admin Category editing must use a separate explicit action such as `Category 수정`.
- The `전체` tag filter is the HOME/all-work filter and should be visually more prominent than normal individual tag chips.
- Preset chips may have subtle border color differences, but avoid strong filled colors.
- Importance filter applies to board, timeline, recurring, and archive workflow views.

## Typography and Chip Rules

- Avoid making every label bold.
- Task title hierarchy:
  - Page title strongest.
  - Task detail title strong.
  - Board/briefing task titles readable but calmer.
  - Metadata and helper text light.
- Chip text should be compact and medium weight.
- Status and tag chips should not compete with task titles.
- Explanatory helper text should use the shared information-marker style where appropriate.
- Search placeholder/input text should stay small and quiet.

## Color Rules

- Use restrained work-dashboard colors: blue, teal, slate, soft amber, soft red, soft green.
- Avoid one-hue domination.
- Avoid strong gradients on operational surfaces.
- Timeline bars use soft status colors.
- Tags mostly use calm gray chip styling with subtle border variation.
- Risk and overdue markers can use red, but only where attention is needed.

## Interaction Rules

- Clicks that open detail should feel contextual to the clicked area.
- One-item briefing clicks can show a brief soft selection action before opening detail.
- Multi-item briefing groups can open a selection list/detail bundle.
- Drag-and-drop card movement must keep status history and completion semantics consistent.
- Moving into `완료` sets completion metadata.
- Moving out of `완료` clears completion metadata while preserving status history.
- Due-date changes must be recorded in change history.

## Regression Watch List

Avoid reintroducing these issues:

- Empty right-side task detail space on first load.
- Timeline detail opening below the timeline.
- Calendar task detail using a different visual style from normal task detail.
- Board cards showing repeated suffix text in the title.
- Repeat marker rendered as a colored sticker box.
- Disabled gray controls for tasks the user cannot manage.
- Tags using different shapes across pages.
- Too-bold `관련 링크`, `업데이트 로그`, metadata, or helper descriptions.
- Update input smaller than the submit button.
- Search placeholder text larger than surrounding controls.
- Korean words breaking in the middle.
- Category filter clicks opening edit mode immediately.
- The `전체` tag filter shrinking back to the same size as ordinary tags.
- Empty timeline panels losing rounded corners.
- Calendar event edit forms with uneven input/select/button heights or a large stale title above the form.

## Verification Checklist

After UI changes, verify at least the affected items:

- Build passes.
- Browser loads without framework overlay.
- Console has no relevant errors or warnings.
- Briefing task title weight remains readable.
- Board, timeline, recurring, archive detail opens in the right workflow column.
- Calendar task click opens common task detail.
- Related link inline form appears in task detail.
- Quick update input is larger than `남기기`.
- Importance filter appears in workflow views.
- Tags look consistent across briefing, board, detail, updates, and tag library.
