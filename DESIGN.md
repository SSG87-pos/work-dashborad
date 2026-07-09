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
- Apple-inspired operational styling may be used as a full component grammar, not only a color reference: use a white sidebar against the `#f5f5f7` parchment work canvas, `#0066cc` Action Blue for primary actions/selection, `#ffffff` cards with `#e0e0e0` hairlines, 44px pill primary/secondary buttons, 38px pearl utility capsules, 44px pill search, and no decorative shadows on common dashboard chrome. Keep operational cards at the dashboard's compact 8px radius even though `DESIGN-apple.md` includes larger marketing-card radii. Do not apply Apple marketing-page patterns such as full-viewport product tiles, photography-first heroes, ultra-thin 12px nav, or negative letter spacing to this work dashboard.
- Avoid nested-card buildup in the simplified shell. Full workflow controls, filter groups, board/timeline containers, and lane shells should read as flat operational bands; frame the actual information objects such as the briefing panel, side widgets, detail panels, and task cards. Briefing rows should use separators rather than row cards.
- Use motion only as short functional feedback. Subtle point motion can confirm selection, saving, or Canvas linking, but should not become a looping decorative layer across operational screens.
- Preferred dashboard micro-motion examples are task-card selection pulse, status-chip pop after a status change, and sidebar active-indicator glide. Avoid adding graph-like decoration to top insight cards unless it becomes a real reporting requirement.
- Preserve enough whitespace for scanning, but do not reserve empty detail areas before the user clicks something.
- Korean text should break by word, not inside words, whenever possible.
- Desktop and tablet remain the primary work surfaces, but phone layout must stay usable for quick checking, filtering, reading detail, and lightweight updates without page-level horizontal overflow.
- Common notebook layouts should treat Notebook L at 100 percent browser zoom as a desktop baseline. Notebook L at roughly 81 percent can be used as a density reference, but the app should not require users to zoom out to avoid tablet-style composition. Keep desktop and landscape-tablet composition until about 980px, then apply tablet/portrait compaction below that point.
- Phone layout is intentionally more selective than desktop/tablet: keep the top area to search plus primary task creation, compress insight cards to number/label chips, show team members as short name selectors without avatar/initial badges, hide the long personal greeting, hide briefing side widgets and advanced workflow filters by default, and shorten briefing/task/update cards so mobile users can reach the actual work faster. Calendar should prioritize month/event checking on phone while keeping schedule registration behind a compact collapsed `일정등록` action, and Highlights should prioritize report/read surfaces over export/copy controls.
- On phone widths, show team members only once in the top navigation area as equal short-name chips, matching the portrait-tablet name-chip behavior; do not repeat the workspace team strip below the title/search area.

## Current Layout Contract

### POSLAB Entry Landing

- The entry landing appears before the dashboard body in the current browser session.
- The page is an internal entry gate, not a marketing landing page.
- Use a bright POSCO-inspired radial background that connects to the dashboard's blue/teal/slate palette.
- `POSLAB` should read as the entry brand. `Work Hub` should reuse the dashboard title gradient grammar.
- The small kicker above the main title should read `POSCO`, and the supporting line should read `함께 보는 업무, 함께 만드는 흐름, 함께 성장하는 팀`.
- The left visual should stay focused on the POSLAB lanyard card; do not show the former `연구기획그룹-전략` mark because it overlaps the strap on common laptop viewports.
- The lanyard card should use the React Bits-style original card/clip/clamp model, but the strap must be logo-free and tuned to the POSCO-blue dashboard palette.
- The POSLAB card face follows the selected `Executive Blue` direction: solid high-contrast POSCO-blue badge, restrained diagonal pattern, clean white `POSLAB` text placed above the subtle center rule, and no fake border strokes that fight the GLB UV mapping.
- The card face may use subtle texture-drawn highlights and shadows to feel dimensional, but avoid heavy 3D text effects that make the badge feel game-like or dated.
- The POSLAB card face must be readable on first load and must not collapse into a short top-only canvas, clip the card body, wash out against the pale background, or rotate so far that the text reads as a partial word.
- On portrait tablet and phone widths, the POSLAB lanyard card can be hidden so the entry action and assistant panel stay in the first screen; when it is hidden, the entry panel should be centered rather than left-weighted.
- The primary action is `대시보드로 들어가기`; future SSO can replace this action without changing the dashboard body.
- Keep the entry screen visually separate from real backend security claims. Do not imply SSO is implemented until it is actually connected.

### Sidebar

- Left sidebar stays persistent.
- Brand mark uses a meaningful simple symbol, not a generic text square.
- Navigation text must be readable and moderately weighted.
- Team list order is `그룹장`, `팀장`, then 가나다 order.
- Team list label should be plain Korean such as `팀원`, not English product copy.
- Team member row shows centered name and role only, without emoji/avatar/initial badges; treat it as a centered team selector, not a profile/avatar surface.
- Selected team member should feel active but not flashy.
- In the simplified dashboard shell, the sidebar brand divider and `전략 TEAM` sublabel should be neutral, not another blue/green decorative accent. Preserve the main top title gradient instead.
- In the Apple-inspired simplified shell, sidebar selection should not look like a filled card or boxed control. Use quiet text/icon emphasis plus a thin Action Blue navigation indicator for the active page; selected team members should use text color/weight only, without a boxed background or left rail.

### Top Bar

- The common page header should keep only the `Strategy Work Hub` title; do not show repeated explanatory subtitles below it.
- The title can be slightly larger than the surrounding toolbar controls, but should remain compact enough for 1366px desktop layouts.
- Search input is compact; placeholder text should not dominate the page.
- The top search should feel broad even though it stays visually quiet: it searches task title/description, tags, 담당자/배정자/작성자, status/priority, 상위 업무흐름, dates, checklist detail, update logs, change history, related links, 업무 노트/posts, attachment evidence text, and calendar event title/note/owner metadata where that view can use it.
- The top bar may include a compact `넓게/기본` viewing-density toggle for demo-room and low-legibility monitor conditions. It should adjust readability and detail width without changing the dashboard's approved navigation, color, or card structure.
- On phone widths, secondary top-bar actions such as alert, density, home, and account detail can be hidden from the main row so `검색`, compact `🤖 AI`, and `업무 추가` stay touch-safe. The AI entry point should remain visible across responsive sizes.
- Account button shows name and role only in the top bar, without a leading avatar/initial badge.
- Admin indication belongs in the top account area, not in every team list row.
- Account modal stays focused on account switching and personal profile edits.
- Admin-only operational management belongs in the sidebar `관리자` tab, not inside the account modal.
- The dashboard floating AI window should keep the robot mark on the left of the `Work-Hub AI` header title, use a slightly wider desktop default than the compact entry panel, and still shrink to the viewport on tablet/phone.
- In the dashboard floating AI window, conversation answers should read above the prompt input, with the input held at the bottom like a familiar chat surface.
- The dashboard AI conversation thread should size to its actual messages and must not stretch empty vertical space into oversized message rows.

### Admin

- The `관리자` sidebar tab is visible only to users with `permissionRole: admin`.
- The admin page groups operational management into `사람 관리`, `태그 관리`, `업무흐름 관리`, and `Note 유형 관리`.
- `사람 관리` owns roster add/edit, permission role, team display, and active-state controls.
- `태그 관리` should use a compact tree/editor layout: Category folders on the left, tag-file rows under each folder, and a right-side editor for the selected Category or tag.
- Admins can collapse/expand Category folders, click tags to rename/delete them, and drag tags between Category folders to keep the tag dictionary scannable as the list grows.
- `업무흐름 관리` should use the same compact tree/editor pattern: current `상위 업무흐름` labels on the left, selected-flow details on the right, and similar-flow review candidates inside the selected detail panel. In FastAPI mode, DB-evidence suggestions can use title, description, tags, updates, and 업무 노트 as supporting signals. Renaming a flow can intentionally merge tasks under one label.
- `Note 유형 관리` owns the shared type/category labels used by Today Briefing `업무 Note` records and task-detail `업무 Note`, such as `메일`, `회의록`, `아이디어`, `리스크`, `참고자료`, `할일`, `메모`, `결정사항`, `중요문서`, `다음 확인`, and `기억할 점`. Admins can rename labels, choose a tone color, and hide a type from write dialogs without deleting existing notes.
- Non-admin users must not see the `관리자` tab, and stale persisted admin routes should return to a normal workflow view.

### Today Briefing

- `오늘 브리핑` is the first meaningful screen.
- For the simplified dashboard direction approved on 2026-07-09 and corrected after browser review, the first `나의 업무` screen should not add a four-button 작은 안내판 above the work list. It should show `오늘 브리핑`/오늘 할 일 first, then offer one quiet `전체 업무 보기` action for users who need board, filters, timeline, materials, mindmap, recurring work, or archive.
- `전체 업무 보기` is intentionally a secondary action. It should help 40대 이상 and non-specialist users discover the fuller workflow without making the first screen look like another dashboard/control center. The duplicated four-card workflow summary (`내 진행 업무`, `3일 내 마감`, `지연 업무`, `완료 업무`) should stay hidden because it repeats the briefing.
- On the default `나의 업무` first screen, keep persistent controls to the minimum: search, compact `AI`, account, `업무 추가`, and the quiet `전체 업무 보기` affordance. Keep the AI entry point visible, but use a quieter treatment than the full workflow toolbar. Hide secondary utilities such as density toggle and entry-return unless the user leaves the simple first-screen state; show notification only when there is unread work.
- Keep the `전체 업무 보기` affordance as a button only; do not add adjacent helper text explaining that board/filter/timeline are hidden.
- Hide the duplicated workspace team-member strip on the default first screen; the persistent sidebar team list is enough there.
- Keep the visible briefing header minimal: show `오늘 브리핑` only. Do not show greeting/helper copy under it, and do not show count/status stickers such as `자동 선별 n건`.
- On the default `나의 업무` first screen, hide empty `오늘 일정` and empty `업무 Note`/`팀 체크` side widgets so the briefing list can use the width. Show those side widgets again when they contain actual records or when the user opens the full workflow.
- Keep `오늘 브리핑` rows recognizable with their existing compact icon/category/task/due structure; do not over-simplify that surface unless a later review proves it is the main source of confusion.
- For the simplified dashboard shell, avoid decorative gradients and card shadows on AI/account controls, selected team rows, sidebar decoration, and common cards, while preserving the top title gradient as the product's primary identity signal. Prefer white or soft-gray surfaces, thin borders, and one restrained active accent.
- Use plain Korean labels over product jargon. Top-level user-facing navigation should prefer `나의 업무`, `팀 업무`, `일정`, and `자료/보고` over English labels where practical.
- Legacy top insight cards should not render on the simplified `나의 업무` workflow because they duplicate `오늘 브리핑`. If a future screen reintroduces summary filters, they should stay number-first, compact, and secondary to the briefing.
- Insight hover previews list only the relevant tasks; do not repeat the summary card title inside the hover panel.
- Clicking a top insight card should naturally bring the board result area into view, especially when the briefing content is long.
- Zero-value insight cards should feel quieter than active cards and should not imply an available click action.
- Personal mode emphasizes the selected user's own work.
- Team mode summarizes the public team flow.
- The left briefing list owns most of the width; side widgets must not squeeze task titles.
- The current approved split is approximately 56 percent briefing list and 44 percent side panel on standard desktop widths.
- On narrow desktop/notebook widths where the side panel would squeeze task titles, move `오늘 일정` and `팀 체크`/`업무 Note` below the briefing list in two columns before allowing important task titles to truncate.
- The side panel contains `오늘 일정` and a capture area, not `오늘 업무 큐`.
- My Desk uses `업무 Note` for each person's private structured remembered context. When users record a note beside `오늘 일정`, they can link it directly to one of their current active tasks or choose `기타/참고` for context that should remain unlinked. Switching the selected person should show that person's own notes, not a shared team note area.
- Team Flow uses `팀 체크` for small shared todo-style items. Checking an item marks it done; clicking the title/text box opens the larger detail dialog; editing or deleting happens from that dialog, with delete confirmation because deletion removes the shared record.
- The briefing capture area is title-first and compact: use the available `오늘 브리핑` side-panel height to show as many recent records as comfortably fit, reveal older records through a compact `전체` button beside `추가/기록` in the header, open a larger dialog for writing/reading/editing long content, and expose full long titles through native hover tooltips. The small rows should not show inline edit/delete icons.
- Capture records should keep title, body, type, status, URL, author, and date as structured data so later AI/LLM features can use them as evidence.
- If the briefing list grows, agenda can use an internal scroll cap, but capture rows should remain a height-aware preview plus the `전체` list dialog instead of adding a bottom button that consumes row space.

Briefing rows:

- One-item rows should not look taller than multi-item rows.
- Multi-item groups show each task line separately.
- Due labels such as today, D-minus, and D-plus use one fixed right-side rail.
- If a group has multiple tasks, each task gets its own due label.
- On phone widths, briefing rows still keep the fixed icon/content/due columns so the due label does not wrap below the task content.
- On extra-narrow phone widths and the narrowest portrait-tablet boundary, the briefing tag chip may be hidden so the owner, task title, and due rail remain readable.
- If a group has one task, clicking it should give soft selection feedback and open the task detail.
- Task titles should be more readable than helper captions; do not make them too thin.

Greetings:

- The default `나의 업무` briefing header no longer shows a visible greeting; reserve this guidance for future surfaces that explicitly need greeting copy.
- Use a warm, gentle greeting.
- 07:00-09:59 should feel like a morning greeting.
- 17:00 onward should shift to wrap-up or closing tone.
- Include one appropriate emoji in greeting copy when it helps warmth.
- Personal greetings may include a short hint from current briefing state: overdue, due today, start today, or focus work.

## Emoji Picker Contract

- Emoji selection is a shared interaction for `업무 Note` body text, calendar notes, and update logs.
- Do not expose profile/team-member emoji selection in the simplified dashboard shell; the sidebar team selector and top account button should stay text-first and avoid avatar/initial badges.
- The shared picker now uses `emoji-picker-react` for the full emoji set, search, categories, and recent emojis.
- Load the picker only when the popover opens, so the main dashboard bundle stays light.
- Use native emoji rendering rather than image/CDN emoji styles for company-network reliability.
- Popover content must render above cards/panels and must not be clipped by parent overflow.
- Emoji options should show the emoji only; helper names belong in `title` or accessible labels, not visible text under each emoji.
- Do not put emoji pickers on structured fields such as task title, tags, dates, status, or priority unless the product scope explicitly changes.

## Workflow Views

### Board

- Board order is fixed: `검토/대기`, `계획`, `진행중`, `완료`, `보류`.
- My Desk board status lanes should start expanded so the selected person's work is visible immediately. Team Flow board status lanes should start collapsed so busy team boards remain scannable. Clicking the lane header expands/collapses that status.
- Board expansion has two modes. When multiple status lanes are open, keep them in comparable status columns so users can scan status-to-status flow without large lanes dropping below each other. When only one status lane is open and no task detail is open, treat it as focus mode; if it has three or more visible cards, span the board's full available width and lay cards out in a wider responsive grid instead of forcing a narrow column. Once task detail is open beside the board, return the board to compact comparable columns so the detail panel remains the focus and the board does not force horizontal scrolling.
- Card titles should be readable but not heavy enough to fight the page title.
- Workflow task titles are primary content. In board cards and list rows, show the full title with Korean word-preserving wrapping instead of ellipsizing the title.
- Board cards do not show long description text; description belongs in task detail.
- Owner initials must remain clear on team workflow cards.
- `스팟 업무` marks short or one-time work. Board cards should use a subtle teal card edge and show one compact `스팟` chip in the top chip row. Do not duplicate `스팟` again in the card tag row.
- Board filters may include `스팟만 보기`; this filter is for board scanning only and should not replace status, tag, or owner filters.
- If the user cannot manage the task, hide unavailable status controls instead of showing disabled gray controls.
- Archive/edit actions stay grouped tightly.
- Repeat marker appears on the task-title row, icon-only.

### Workflow Filters

- `보드`, `리스트`, `타임라인`, `업무자료`, `마인드맵`, `반복 업무`, and `보관함` should share the same primary filters: tags, owner, priority, and spot-work scope.
- Owner filtering must include `미지정` because some tasks may intentionally have no owner yet.
- Filter controls should stay compact and use short labels such as `사람`, `태그`, `중요`, and `스팟`; avoid oversized select boxes that crowd the workflow toolbar.

### List

- `리스트` sits between `보드` and `타임라인` as a compact table-style workflow view.
- Status sections follow the same order as the board: `검토/대기`, `계획`, `진행중`, `완료`, `보류`. In My Desk, list sections with at least one visible task should start expanded and empty status sections should stay collapsed. Team Flow list sections should start collapsed.
- Expanded sections should stay denser and quieter than cards: thin separators, compact rows, restrained chips, and no decorative card spacing.
- Rows should show enough scanning context in one line: task title with compact priority/spot/repeat/schedule markers, owner name only when in team scope, calm tag chips, period, and progress. Do not repeat the row status inside each row because the expanded section header already owns that context.
- Clicking a row opens the same workflow-side task detail as board/timeline/recurring/archive.
- If the table cannot fit in a narrow workflow area, the table body may scroll horizontally inside the view rather than causing page-level horizontal overflow.

### Mindmap

- Mindmap is a workflow peer of board, timeline, recurring work, and archive.
- The first mindmap mode is `업무 구조`: an automatically generated structure from `상위 업무흐름` and visible tasks.
- `상위 업무흐름` is the conceptual first branch. Category and tags should stay as secondary chips/context on task nodes rather than separate tree layers, so the map stays readable when a task has multiple tags.
- When a task has no confirmed `상위 업무흐름`, the app may recommend one from the task title first and tags second.
- Title-derived workstream names should keep the meaningful core phrase and should not automatically append generic suffixes such as `추진`.
- Scope modes separate active work from all historical work. `현재 진행업무` keeps richer task cards, while `전체 진행업무` uses a dense title-first/list-like node style because completed and archived work can become large.
- `현재 진행업무` can also offer a compact node-size mode for scanning many boxes without switching to the historical/all-work scope.
- The mindmap should auto-generate from the currently visible My/Team task scope and calculate layout positions to avoid node overlap.
- The mindmap canvas should grow the page vertically as the generated map grows; avoid a separate internal scrollbar for the mindmap area.
- Provide a visible center/home action for the generated mindmap so users can return to the top/fitted view after scrolling through a long map.
- Local/prototype mindmap may expose a small `샘플` action so users can add workflow-shaped demo tasks and verify workstream grouping without importing external data.
- Each task node should render only once per workstream so multi-Category tasks do not look duplicated.
- Multi-Category task classification should not appear as a visible count badge on mindmap nodes. Keep the visible node focused on status/progress, and reserve classification context for hover/detail surfaces.
- Group nodes are filter actions: clicking them applies the workstream's tag context where available and returns the user to the board result.
- Task nodes open the same right-side workflow task detail as board/timeline/recurring/archive.
- Mindmap task status chips should use the same calm status color meaning as the timeline (`계획`, `진행중`, `검토/대기`, `완료`, `보류`), and task importance should use the existing square priority sticker grammar.
- In card-style mindmap task nodes, spot work should replace the priority sticker position with the same compact `스팟` chip used on board cards.
- In compact mindmap mode, task nodes should stay small but show a clearly visible status-colored dot and the owner name so users can scan state and responsibility without opening the card.
- In compact mindmap mode, task nodes may grow horizontally by title length and should keep status dot, task title, and owner on one line whenever possible. Keep count/owner metadata right-aligned inside each box, but avoid a large fixed minimum width; short labels should stay compact, and only long labels should widen the box.
- The mindmap header should include a compact status-color legend when status dots are shown.
- The currently generated mindmap work structure can be exported as a Markdown file from the mindmap header. The export should reflect the current `현재 진행업무`/`전체 진행업무` scope and preserve workstream headings, task status, owner, due date, priority, progress, tags, and classification context.
- Do not reserve a blank detail column before a task node is selected.

### Canvas

- `Canvas` is its own main navigation area below `Highlights`, not a mode inside the workflow mindmap.
- The `Canvas` area starts with only the default `생각 정리` tab. Other canvases should be created freely by users, not shipped as fixed tabs.
- Users can add Canvas tabs for additional shared thinking spaces. In signed-in Supabase mode, Canvas tabs, nodes, and direct links use shared team storage; in local/offline mode, they remain local prototype state.
- Keep the `Canvas` page heading compact; do not duplicate the visible `Canvas` label in a large header card because the working area needs the vertical space.
- Use this area for user-created/freeform thought sharing, while the workflow mindmap remains an automatically generated structured view.
- Current implementation supports shared draft editing: add nodes, edit node text, delete nodes, and drag nodes inside the current tab.
- Canvas nodes can create child nodes directly, show connector lines, and run automatic tree-style arrangement for quick cleanup.
- Existing Canvas nodes can be directly connected by selecting a source node and then a target node. Parent-child links remain tree/arrangement links in data and render as solid lines; direct related-node links are layout hints, remain separate from hierarchy data, and render as dashed lines so the difference is visible.
- When a direct Canvas link is newly created, a short beam highlight may run along that link once as functional confirmation. Do not keep the link animated continuously.
- Canvas uses a scrollable large plane. Nodes should stay compact enough for many ideas, with template variants such as memo, question, decision, action, todo, evidence, and risk.
- Todo nodes show an editable checklist in card mode. Keep checklist rows compact and structured because they are stored as `todoItems` for later task-detail/checklist linking.
- Canvas node action icons should remain visible in card mode for ease of use. In compact mode, hide actions until hover/focus so the node reads as a title-only chip.
- Canvas `카드/작게` mode is a true density switch: card mode shows editable title/body/template, while compact mode shows title-only nodes and auto-arrange recalculates for the smaller size.
- The current tab can be exported to Markdown by copy or file download. This remains an export affordance even though signed-in Canvas state is now persisted separately.
- Live cursors, simultaneous-edit conflict handling, task-linking, and change-history views are not implemented yet; do not imply those behaviors until approved.

### Timeline

- Timeline is a workflow peer of the board.
- Spot tasks should replace the first visible timeline category/tag slot with `⚡ 스팟`, while board cards keep spot as the top chip only.
- It should use soft solid status colors matching the legend, not strong saturated gradients.
- The timeline container, toolbar, legend, grid, and empty state must keep the same rounded-card grammar as the board and other workflow panels.
- Monthly timeline excludes weekends.
- Toolbar, legend, and date axis should stay readable while the timeline scrolls.
- Task bars show tag, task title, progress percent, and repeat/risk markers when applicable.
- If a task spans outside the visible period, communicate that through tooltip/edge treatment rather than clipped-looking text.
- Timeline hover/focus previews should float above the page as an overlay, not reserve large empty space inside the timeline grid.
- Clicking a timeline task opens the same right-side workflow task detail as board/recurring/archive.

### Recurring Work

- Recurring tab previews scheduled work; it should not flood the board with far-future tasks.
- Future instances appear in board/briefing only when the relevant start date arrives or an instance is manually created.
- Automatic generation is bounded: only unarchived recurring source tasks whose next occurrence start date is on or before the dashboard's current date can materialize, and existing `recurringTemplateId + dueDate` pairs must not duplicate.
- Schedule preview shows one compact line; overflow becomes hidden/truncated.
- Future occurrence chips should make the manual action explicit with compact copy such as `회차 생성`; they are not background automation.
- Use `미수행 반복 일정 삭제` for removing future unstarted recurring schedules.
- Repeated instances copy detailed task items but reset completion checks, logs, history, and completion metadata.
- Repeat marker is icon-only across board, detail, timeline, calendar, and legend.

### Archive

- Completed and held tasks can be archived.
- Archived tasks disappear from main board/briefing but remain searchable in archive and usable in reporting.
- Archive should favor a sectioned table/list over cards because records can accumulate over time.
- Archive table columns should stay compact for high-volume records: task, owner, category, tags, archive date, and restore action.
- Do not repeat a status column in archive tables when section grouping and status dots already communicate completed/held state.
- Completed archived work and held archived work should be separated into clear sections.
- Completed/held archive sections should be collapsible and start collapsed by default, so users can jump to the section they need without scrolling through accumulated records.
- In Team Flow archive, owner is the primary collapsed filter and period is the secondary collapsed filter. Period options are `전체기간`, `1분기`, `2분기`, `3분기`, and `4분기`.
- Restoring a held archived task returns it to the main board's `보류` column, where it can later move back into active statuses.
- Local prototype may expose an obvious demo-fill control so accumulated completed/held archive rows can be reviewed without live operational data.
- Archive restore uses the common task detail actions.

## Task Detail Contract

Task detail is contextual and appears only after explicit selection.

- Briefing selections open detail beside the briefing.
- Board, timeline, recurring, and archive selections open detail beside the clicked workflow area.
- Calendar task selections open the same common task detail style in the calendar side panel.
- Do not reserve a blank right column before detail is opened.
- Include a close action.
- Task detail should be readable on common 1280-1366px desktop monitors. The default detail column can be wider than the earlier compact prototype width, and `넓게 보기` may widen it further when there is enough screen width.
- `넓게 보기` should favor detail text, update logs, change history, and calendar detail readability. It must avoid page-level horizontal overflow; workflow boards may keep their existing internal horizontal scroll behavior if the detail panel is open.
- Updates log rows, Highlights performance summaries, and compact mindmap nodes should stay readable on standard office monitors. If these areas feel low-resolution or overly small, prefer small font-size/spacing adjustments over changing the approved component structure.
- A task-level `업무 Note` surface may sit inside task detail as a contextual notes/posts area for decisions, remembered context, reference URLs, risks, meeting notes, and future lookup. In local/demo mode, task notes are real local dashboard state saved with the task data; shared Supabase persistence still uses the task post table model. In the narrow task-detail panel, show the selected task's latest three title-first rows below `다음 액션 추천`, with a nearby `Note 작성` action and a compact more/less control for additional notes from that same task only. Do not add a separate explanatory card above the list; the section title and rows should carry the meaning. Because the task-detail panel is narrow, clicking a note row should open a larger read dialog. Writing and editing also open a larger dialog, and writing should allow emoji insertion in the body field.
- Future task posts should be task-linked first and workstream-aggregatable second, so a later `업무흐름 피드` can collect posts from every task under the same `상위 업무흐름`.
- Task-post attachments may show compact image thumbnails that open into a larger lightbox when clicked. Real implementation should store image metadata separately from post text and avoid loading large original images in the normal task-detail reading path.
- The workflow tab order is `보드`, `리스트`, `타임라인`, `업무자료`, `마인드맵`, `반복 업무`, `보관함`. The lightweight `업무자료` tab should provide `업무별 노트` and `유형별` views. `업무별 노트` groups the currently filtered tasks with linked Today Briefing `업무 Note`, task-detail `업무 Note`, and update logs, with an additional `기타/참고` group for notes that are not linked to a task. `유형별` groups the same notes by the shared Note type dictionary, so users can scan `메일`, `회의록`, `아이디어`, `리스크`, and similar types. The tab should support local material search and state filters for `진행`, `계획`, `완료`, `검토`, `보류`, `기타`, and `보관`; state sections and task groups should start collapsed by default. Note type stickers should reuse the same calm chip sizing and tone across both entry points. On phone widths, log rows and note records should stack metadata above text when needed so initials/date chips never overlap the record title. In My Desk, personal notes must stay scoped to the selected person; in Team Flow, do not expose private notes and use shared team-check records only.
- Highlights may include `업무자료 모음`, which groups task notes/materials by `상위 업무흐름`. Keep it in Highlights because it is a broader lookup/review surface, while workflow `업무자료` stays task-by-task for daily lookup. Workstream groups should start collapsed, be sorted by each group's latest note date, and expanded rows should show 게시날짜, 상태, 해당 업무, 담당자, and 게시자 in the row summary. It should support the same material search and state filters as workflow `업무자료`, including `보관` records. Clicking a row opens the body inline; the expanded body should avoid repeating scope/workstream metadata already visible in the row/group and focus on body text, URL, and attachment. Inside an expanded workstream, the sort controls should use short labels only: `날짜`, `사람`, `구분`, and `업무`. Task detail should not show notes from other tasks simply because they share the same workstream.
- Update logs should sit above related links in task detail. Show the latest three logs by default and reveal older logs through a compact more/less control; management actions should remain hidden behind the existing management toggle.

Header:

- `업무 상세` label remains visible.
- Action icons align to the card's right edge.
- Title should use available width and break by word, not inside words.
- Title weight should be strong but not oversized.
- Status, priority, delay, new, archive, and repeat indicators should be compact.
- Importance uses the square/priority grammar; do not switch it to a circular tag style.

Main content:

- Tags sit under the task title and use the same tag chip grammar as the rest of the app.
- `상위 업무흐름` appears as compact metadata and is used for mindmap/performance grouping, not as a multi-select tag.
- In the task form, the `상위 업무흐름` label should carry inline help explaining that it is recommended after entering the task name, can be manually edited, and is used to group performance/mindmap work.
- In the task form, `업무 성격` may distinguish `일반 업무` from `스팟 업무`. Keep this separate from priority because spot work is a reporting/scope rule, not an importance score.
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
- Logs should stay read-first by default. If correction is needed, show update-log edit/delete actions only after the user clicks the compact management button beside the `업데이트 로그` heading.

Metadata and history:

- Metadata is supporting information. Keep it compact.
- Change history should use table-like rows with date, actor, and change text on one line.
- Long change text may truncate but should be readable through hover/focus tooltip.
- Change-history edit/delete actions should be hidden by default so the `처리내용` column keeps enough width. Users who can manage the task may click the compact management button beside `변경 이력` to reveal row actions. Editing changes only the displayed memo/note, and deleting a row must not change the task's current status or completion metadata.
- Calendar task detail history should remain readable and inside the table columns.

## Calendar Contract

- Calendar distinguishes `팀 일정`, `개인 일정`, and `업무 일정`.
- Legend order is `팀 일정`, `개인 일정`, `업무 일정`.
- `업무 일정` means planned task end date.
- Weekend dates should feel like holidays through red text only, not heavy red backgrounds.
- Calendar task click opens the common task detail, not a separate reduced task card.
- Calendar task/event detail appears only after clicking a calendar item; do not reserve a blank right panel by default.
- On portrait tablet and phone widths, schedule registration should stay behind the compact collapsed `일정등록` action by default.
- On portrait tablet and phone widths, show calendar items as a vertical seven-day list for the selected week instead of forcing users through a horizontally scrolling month grid. The week list must provide previous/next week controls with the selected date range centered between the arrows; do not put a duplicate `오늘` action inside that week switcher because the month toolbar already owns the today shortcut. Month navigation should reset the list to the first week containing that displayed month's first day.
- Calendar item chips may truncate in tight cells, but the full title, owner/context, date range, and note should remain available through hover/focus title text.
- Multi-day event chips may show a compact date range such as `(6/4~6/8)` on the first line after the title.
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
- On phone widths, the update card header should keep the owner initials at left, show the task title up to two readable lines, and place status plus latest log date together on one compact metadata row. Avoid splitting status, date, and title into multiple isolated rows unless the content truly cannot fit.
- On phone widths, the `My`/`Team` scope toggle should sit right-aligned with a clear divider between the two choices. The `로그 업데이트` and `새로 배정된 업무` sections should start collapsed as one-line headers, with counts visible, so users can choose which list to open.
- New logs can be added directly in the update section.
- Avoid duplicate names in the same update header.

## Performance Report Contract

- `업무실적` opens in weekly mode by default.
- Highlights has an additional `업무자료 모음` tab for remembered-context notes/materials. It should group notes by `상위 업무흐름`, keep each workstream collapsed by default, show 게시날짜, 상태, 해당 업무, 담당자, and 게시자 when expanded, support material search and state filters (`진행`, `계획`, `완료`, `검토`, `보류`, `기타`, `보관`), and support short sort controls: `날짜`, `사람`, `구분`, and `업무`.
- Weekly view shows issue, description/content, completed, and planned lines.
- Weekly view remains task-oriented.
- `스팟 업무` is included in weekly and monthly performance reports. Quarterly and yearly summary reports exclude it by default to keep longer-period results focused, but `이슈/설명 포함 상세실적 보기` includes spot work again for detailed review.
- In Highlights performance cards, spot work should be marked after the visible task/workstream title with a compact lightning sticker, not a text `스팟` label.
- Monthly, quarterly, and yearly views summarize by `상위 업무흐름` inside the period grouping, with source tasks retained for copy/export evidence.
- Monthly groups by week or week-range 흐름 labels.
- Quarterly groups by month or month-range 흐름 labels.
- Yearly groups by quarter or quarter-range 흐름 labels.
- Long-period reports should be compact and table-like, not covered in nested boxes.
- Person cards can be two-column on wide screens.
- Role text stays plain next to the name, not in a large sticker.
- The person filter should remain available.
- `이슈/설명 포함 상세실적 보기` controls longer detail.
- `저장/복사 시 전체 데이터 포함` is an export/copy option, not visible report decoration.

## Tags and Filters

- Tags are shared metadata.
- Tags are search/filter metadata, while `상위 업무흐름` is a single report/mindmap grouping field.
- All users can add tags.
- Admin can rename/delete tags.
- Tags can be applied in multiples.
- Tag chips should have one shared grammar across briefing, board, detail, update, tag library, and task form.
- Tag bundle presets are filters, not real editable tags.
- The compact top tag filter is an opener/status control, not a single-select menu: it shows `전체` or `선택됨 N개` and opens the tag library.
- Actual tag filtering happens in the expanded tag library by clicking multiple Category rows or individual tags.
- Multiple selected tags use an OR filter: show work that contains at least one selected tag.
- Category preset clicks toggle all tags in that Category; they must not open the admin edit UI by themselves.
- Admin Category editing and admin tag rename/delete belong in the `관리자 > 태그 관리` surface. The compact workflow tag panel may keep small admin affordances, but it should remain primarily a filter surface.
- Admin `상위 업무흐름` cleanup belongs in `관리자 > 업무흐름 관리`, with similar-label review and rename/merge actions.
- The `전체` tag filter is the HOME/all-work filter and should be visually more prominent than normal individual tag chips.
- Tag and importance filter controls should show a clear active state whenever the selected value is not `전체`.
- The tag library below workflow filters should start collapsed as a compact header with counts, selected-filter context, and an obvious expand/collapse control.
- When expanded, the tag library should use a Category-first tag map instead of one long chip cloud: each row shows the Category name, tag count, representative tags, and a `+N개/더보기` control only when tags exceed the preview.
- Category rows and individual tags should visually show selected and partial-selected states.
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
