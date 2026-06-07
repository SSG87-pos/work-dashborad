export const canvasTemplates = [
  { id: "memo", label: "메모", title: "새 메모", body: "메모를 입력하세요." },
  { id: "question", label: "질문", title: "확인 질문", body: "확인할 질문을 적어두세요." },
  { id: "decision", label: "결정", title: "결정 사항", body: "결정 내용과 이유를 기록하세요." },
  { id: "action", label: "액션", title: "다음 행동", body: "담당자와 다음 행동을 적어두세요." },
  { id: "todo", label: "투두", title: "할 일 목록", body: "체크할 일을 정리하세요." },
  { id: "evidence", label: "근거", title: "근거 자료", body: "자료 출처와 핵심 근거를 적어두세요." },
  { id: "risk", label: "리스크", title: "리스크", body: "리스크와 대응 방향을 적어두세요." }
];

export const templateMap = new Map(canvasTemplates.map((template) => [template.id, template]));

export const defaultCanvasTabs = [
  {
    id: "ideas",
    label: "생각 정리",
    title: "생각 정리 캔버스",
    description: "개인이 떠올린 아이디어와 판단 근거를 자유롭게 모아두는 공간입니다.",
    notes: ["상위 업무흐름 후보", "보고서 관점", "추가 조사 질문"]
  }
];

export function getTemplate(templateId) {
  return templateMap.get(templateId) ?? canvasTemplates[0];
}

export function createDefaultCanvasState() {
  return normalizeCanvasState({
    activeTabId: defaultCanvasTabs[0].id,
    tabs: defaultCanvasTabs,
    nodesByTab: Object.fromEntries(
      defaultCanvasTabs.map((tab) => [
        tab.id,
        tab.notes.map((note, index) => ({
          id: `${tab.id}-${index}`,
          title: note,
          body: canvasTemplates[index % canvasTemplates.length].body,
          template: canvasTemplates[index % canvasTemplates.length].id,
          parentId: "",
          x: 330 + index * 40,
          y: 74 + index * 96
        }))
      ])
    ),
    linksByTab: Object.fromEntries(defaultCanvasTabs.map((tab) => [tab.id, []]))
  });
}

export function normalizeCanvasState(value) {
  const source = value && typeof value === "object" ? value : {};
  const tabs = normalizeTabs(source.tabs);
  const tabIds = new Set(tabs.map((tab) => tab.id));
  const nodesByTab = {};
  const linksByTab = {};

  tabs.forEach((tab) => {
    const nodes = normalizeNodes(source.nodesByTab?.[tab.id] ?? []);
    const nodeIds = new Set(nodes.map((node) => node.id));
    nodesByTab[tab.id] = nodes.map((node) => ({
      ...node,
      parentId: node.parentId && nodeIds.has(node.parentId) ? node.parentId : ""
    }));
    linksByTab[tab.id] = normalizeLinks(source.linksByTab?.[tab.id] ?? [], nodeIds);
  });

  const activeTabId = tabIds.has(source.activeTabId) ? source.activeTabId : tabs[0].id;
  return { activeTabId, tabs, nodesByTab, linksByTab };
}

export function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("\r\n", "\n").trim();
}

export function buildCanvasMarkdown(tab, nodes, links) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map();
  const rootNodes = [];
  const linksBySource = new Map();

  nodes.forEach((node) => {
    if (node.parentId && nodesById.has(node.parentId)) {
      if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, []);
      childrenByParent.get(node.parentId).push(node);
      return;
    }
    rootNodes.push(node);
  });

  links.forEach((link) => {
    if (!nodesById.has(link.sourceId) || !nodesById.has(link.targetId)) return;
    if (!linksBySource.has(link.sourceId)) linksBySource.set(link.sourceId, []);
    linksBySource.get(link.sourceId).push(nodesById.get(link.targetId));
  });

  const lines = [`# ${tab.title}`, "", tab.description, ""];

  const visit = (node, depth) => {
    const headingLevel = Math.min(depth + 2, 6);
    const template = getTemplate(node.template);
    lines.push(`${"#".repeat(headingLevel)} ${escapeMarkdown(node.title) || template.title}`);
    lines.push(`- 유형: ${template.label}`);
    const bodyLines = escapeMarkdown(node.body).split("\n").filter(Boolean);
    if (bodyLines.length) {
      lines.push("- 내용:");
      bodyLines.forEach((line) => lines.push(`  - ${line}`));
    }
    const todoItems = normalizeTodoItems(node.todoItems);
    if (todoItems.length) {
      lines.push("- 할 일:");
      todoItems.forEach((item) => lines.push(`  - [${item.done ? "x" : " "}] ${escapeMarkdown(item.text)}`));
    }
    const linkedNodes = linksBySource.get(node.id) ?? [];
    if (linkedNodes.length) {
      lines.push(`- 연결: ${linkedNodes.map((linkedNode) => escapeMarkdown(linkedNode.title) || getTemplate(linkedNode.template).title).join(", ")}`);
    }
    lines.push("");
    (childrenByParent.get(node.id) ?? []).forEach((child) => visit(child, depth + 1));
  };

  rootNodes.forEach((node) => visit(node, 0));
  return lines.join("\n").trim() + "\n";
}

function normalizeTabs(tabs) {
  const cleanTabs = (Array.isArray(tabs) ? tabs : [])
    .map((tab, index) => ({
      id: cleanId(tab?.id),
      label: cleanText(tab?.label) || `캔버스 ${index + 1}`,
      title: cleanText(tab?.title) || `${cleanText(tab?.label) || `캔버스 ${index + 1}`} 캔버스`,
      description: cleanText(tab?.description) || "팀이 함께 정리하는 공유 캔버스입니다."
    }))
    .filter((tab) => tab.id);

  if (cleanTabs.length) return uniqueById(cleanTabs);
  return defaultCanvasTabs.map(({ notes, ...tab }) => ({ ...tab }));
}

function normalizeNodes(nodes) {
  return uniqueById(
    (Array.isArray(nodes) ? nodes : [])
      .map((node, index) => ({
        id: cleanId(node?.id) || `node-${index}`,
        title: cleanText(node?.title) || getTemplate(node?.template).title,
        body: cleanText(node?.body) || "",
        template: templateMap.has(node?.template) ? node.template : "memo",
        parentId: cleanId(node?.parentId),
        todoItems: normalizeTodoItems(node?.todoItems),
        x: normalizeCoordinate(node?.x),
        y: normalizeCoordinate(node?.y)
      }))
      .filter((node) => node.id)
  );
}

export function createDefaultTodoItems() {
  return [
    { id: `todo-${Date.now()}-1`, text: "첫 번째 할 일", done: false },
    { id: `todo-${Date.now()}-2`, text: "확인 후 완료 체크", done: false }
  ];
}

export function normalizeTodoItems(items) {
  return uniqueById(
    (Array.isArray(items) ? items : [])
      .map((item, index) => ({
        id: cleanId(item?.id) || `todo-${index}`,
        text: cleanText(item?.text),
        done: Boolean(item?.done)
      }))
      .filter((item) => item.text)
  );
}

function normalizeLinks(links, nodeIds) {
  return uniqueById(
    (Array.isArray(links) ? links : [])
      .map((link, index) => ({
        id: cleanId(link?.id) || `link-${index}`,
        sourceId: cleanId(link?.sourceId),
        targetId: cleanId(link?.targetId)
      }))
      .filter((link) => link.sourceId && link.targetId && link.sourceId !== link.targetId)
      .filter((link) => nodeIds.has(link.sourceId) && nodeIds.has(link.targetId))
  );
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function cleanId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number);
}
