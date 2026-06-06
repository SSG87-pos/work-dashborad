import {
  Clipboard,
  Link2,
  MousePointer2,
  Download,
  GitBranchPlus,
  GripVertical,
  Lightbulb,
  Plus,
  Rows3,
  Trash2
} from "lucide-react";
import { useRef, useState } from "react";

const canvasTemplates = [
  { id: "memo", label: "메모", title: "새 메모", body: "메모를 입력하세요." },
  { id: "question", label: "질문", title: "확인 질문", body: "확인할 질문을 적어두세요." },
  { id: "decision", label: "결정", title: "결정 사항", body: "결정 내용과 이유를 기록하세요." },
  { id: "action", label: "액션", title: "다음 행동", body: "담당자와 다음 행동을 적어두세요." },
  { id: "evidence", label: "근거", title: "근거 자료", body: "자료 출처와 핵심 근거를 적어두세요." },
  { id: "risk", label: "리스크", title: "리스크", body: "리스크와 대응 방향을 적어두세요." }
];

const templateMap = new Map(canvasTemplates.map((template) => [template.id, template]));

const defaultCanvasTabs = [
  {
    id: "ideas",
    label: "생각 정리",
    title: "생각 정리 캔버스",
    description: "개인이 떠올린 아이디어와 판단 근거를 자유롭게 모아두는 공간입니다.",
    notes: ["상위 업무흐름 후보", "보고서 관점", "추가 조사 질문"]
  }
];

const initialNodesByTab = Object.fromEntries(
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
);

const initialLinksByTab = Object.fromEntries(defaultCanvasTabs.map((tab) => [tab.id, []]));

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTemplate(templateId) {
  return templateMap.get(templateId) ?? canvasTemplates[0];
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("\r\n", "\n").trim();
}

function buildCanvasMarkdown(tab, nodes, links) {
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

export function SharedCanvasView() {
  const [canvasTabs, setCanvasTabs] = useState(defaultCanvasTabs);
  const [activeTab, setActiveTab] = useState(defaultCanvasTabs[0].id);
  const [nodesByTab, setNodesByTab] = useState(initialNodesByTab);
  const [linksByTab, setLinksByTab] = useState(initialLinksByTab);
  const [canvasDensity, setCanvasDensity] = useState("card");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTabTitle, setDraftTabTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(canvasTemplates[0].id);
  const [linkSourceId, setLinkSourceId] = useState("");
  const [markdownStatus, setMarkdownStatus] = useState("");
  const dragRef = useRef(null);
  const stageRef = useRef(null);
  const selectedTab = canvasTabs.find((tab) => tab.id === activeTab) ?? canvasTabs[0];
  const nodes = nodesByTab[selectedTab.id] ?? [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parentLinks = nodes
    .filter((node) => node.parentId && nodesById.has(node.parentId))
    .map((node) => ({ id: `parent:${node.parentId}->${node.id}`, sourceId: node.parentId, targetId: node.id, kind: "parent" }));
  const manualLinks = (linksByTab[selectedTab.id] ?? []).filter((link) => nodesById.has(link.sourceId) && nodesById.has(link.targetId));
  const renderedLinks = [...parentLinks, ...manualLinks];
  const nodeBox = canvasDensity === "compact" ? { width: 160, centerY: 24 } : { width: 182, centerY: 50 };

  function updateNode(nodeId, updates) {
    setNodesByTab((current) => ({
      ...current,
      [selectedTab.id]: (current[selectedTab.id] ?? []).map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
    }));
  }

  function addNode() {
    const template = getTemplate(selectedTemplate);
    const title = draftTitle.trim() || template.title;
    setNodesByTab((current) => {
      const currentNodes = current[selectedTab.id] ?? [];
      const nextIndex = currentNodes.length;
      return {
        ...current,
        [selectedTab.id]: [
          ...currentNodes,
          {
            id: `${selectedTab.id}-${Date.now()}`,
            title,
            body: template.body,
            template: template.id,
            parentId: "",
            x: 330 + (nextIndex % 4) * 46,
            y: 74 + nextIndex * 66
          }
        ]
      };
    });
    setDraftTitle("");
    setMarkdownStatus("");
  }

  function addCanvasTab() {
    const label = draftTabTitle.trim() || `새 캔버스 ${canvasTabs.length + 1}`;
    const id = `custom-${Date.now()}`;
    const nextTab = {
      id,
      label,
      title: `${label} 캔버스`,
      description: "새로 만든 자유 캔버스입니다.",
      notes: []
    };
    setCanvasTabs((current) => [...current, nextTab]);
    setNodesByTab((current) => ({ ...current, [id]: [] }));
    setLinksByTab((current) => ({ ...current, [id]: [] }));
    setActiveTab(id);
    setDraftTabTitle("");
    setLinkSourceId("");
    setMarkdownStatus("");
  }

  function addChildNode(parentNode) {
    const template = getTemplate(selectedTemplate);
    const stepX = canvasDensity === "compact" ? 196 : 220;
    const stepY = canvasDensity === "compact" ? 58 : 104;
    setNodesByTab((current) => {
      const currentNodes = current[selectedTab.id] ?? [];
      const siblingCount = currentNodes.filter((node) => node.parentId === parentNode.id).length;
      return {
        ...current,
        [selectedTab.id]: [
          ...currentNodes,
          {
            id: `${selectedTab.id}-${Date.now()}`,
            title: template.title,
            body: template.body,
            template: template.id,
            parentId: parentNode.id,
            x: parentNode.x + stepX,
            y: parentNode.y + siblingCount * stepY
          }
        ]
      };
    });
    setMarkdownStatus("");
  }

  function deleteNode(nodeId) {
    setNodesByTab((current) => ({
      ...current,
      [selectedTab.id]: (current[selectedTab.id] ?? [])
        .filter((node) => node.id !== nodeId)
        .map((node) => (node.parentId === nodeId ? { ...node, parentId: "" } : node))
    }));
    setLinksByTab((current) => ({
      ...current,
      [selectedTab.id]: (current[selectedTab.id] ?? []).filter((link) => link.sourceId !== nodeId && link.targetId !== nodeId)
    }));
    if (linkSourceId === nodeId) setLinkSourceId("");
  }

  function connectNode(nodeId) {
    if (!linkSourceId) {
      setLinkSourceId(nodeId);
      setMarkdownStatus("연결할 대상 노드를 선택하세요.");
      return;
    }

    if (linkSourceId === nodeId) {
      setLinkSourceId("");
      setMarkdownStatus("연결 선택을 취소했습니다.");
      return;
    }

    const sourceId = linkSourceId;
    const targetId = nodeId;
    setLinksByTab((current) => {
      const currentLinks = current[selectedTab.id] ?? [];
      const exists = currentLinks.some(
        (link) =>
          (link.sourceId === sourceId && link.targetId === targetId) ||
          (link.sourceId === targetId && link.targetId === sourceId)
      );
      if (exists) return current;
      return {
        ...current,
        [selectedTab.id]: [
          ...currentLinks,
          {
            id: `link-${Date.now()}`,
            sourceId,
            targetId
          }
        ]
      };
    });
    setLinkSourceId("");
    setMarkdownStatus("노드를 연결했습니다.");
  }

  function clearManualLinks() {
    setLinksByTab((current) => ({ ...current, [selectedTab.id]: [] }));
    setLinkSourceId("");
    setMarkdownStatus("직접 연결선을 지웠습니다.");
  }

  function autoArrangeNodes() {
    setNodesByTab((current) => {
      const currentNodes = current[selectedTab.id] ?? [];
      const childrenByParent = new Map();
      const nodeIds = new Set(currentNodes.map((node) => node.id));
      const layoutParentById = new Map();
      const isCompact = canvasDensity === "compact";
      const nodeHeight = isCompact ? 46 : 136;
      const stepX = isCompact ? 196 : 234;
      const siblingGap = isCompact ? 20 : 28;
      const rootGap = isCompact ? 32 : 42;

      currentNodes.forEach((node) => {
        if (node.parentId && nodeIds.has(node.parentId)) {
          layoutParentById.set(node.id, node.parentId);
        }
      });

      const createsCycle = (childId, parentId) => {
        let currentParentId = parentId;
        while (currentParentId) {
          if (currentParentId === childId) return true;
          currentParentId = layoutParentById.get(currentParentId);
        }
        return false;
      };

      (linksByTab[selectedTab.id] ?? []).forEach((link) => {
        if (!nodeIds.has(link.sourceId) || !nodeIds.has(link.targetId)) return;
        if (layoutParentById.has(link.targetId)) return;
        if (createsCycle(link.targetId, link.sourceId)) return;
        layoutParentById.set(link.targetId, link.sourceId);
      });

      currentNodes.forEach((node) => {
        const parentKey = layoutParentById.get(node.id) ?? "root";
        if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
        childrenByParent.get(parentKey).push(node);
      });

      const arranged = [];
      const measureSubtree = (node) => {
        const children = childrenByParent.get(node.id) ?? [];
        if (!children.length) return nodeHeight;
        const childrenHeight = children.reduce((sum, child) => sum + measureSubtree(child), 0) + siblingGap * (children.length - 1);
        return Math.max(nodeHeight, childrenHeight);
      };

      const placeSubtree = (node, depth, topY) => {
        const subtreeHeight = measureSubtree(node);
        arranged.push({
          ...node,
          x: 320 + depth * stepX,
          y: Math.round(topY + (subtreeHeight - nodeHeight) / 2)
        });
        let childTop = topY;
        (childrenByParent.get(node.id) ?? []).forEach((child) => {
          const childHeight = measureSubtree(child);
          placeSubtree(child, depth + 1, childTop);
          childTop += childHeight + siblingGap;
        });
      };
      let nextRootTop = 72;
      (childrenByParent.get("root") ?? []).forEach((rootNode, rootIndex) => {
        const rootHeight = measureSubtree(rootNode);
        placeSubtree(rootNode, 0, nextRootTop);
        nextRootTop += rootHeight + rootGap;
      });

      return {
        ...current,
        [selectedTab.id]: arranged
      };
    });
    setMarkdownStatus("");
  }

  function startDrag(event, node) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: node.id,
      offsetX: event.clientX - rect.left - node.x,
      offsetY: event.clientY - rect.top - node.y
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    updateNode(drag.id, {
      x: clamp(event.clientX - rect.left - drag.offsetX, 12, Math.max(12, rect.width - nodeBox.width - 8)),
      y: clamp(event.clientY - rect.top - drag.offsetY, 12, Math.max(12, rect.height - 104))
    });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function downloadMarkdown() {
    const markdown = buildCanvasMarkdown(selectedTab, nodes, manualLinks);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTab.label}-canvas.md`;
    link.click();
    URL.revokeObjectURL(url);
    setMarkdownStatus("마크다운 파일을 준비했습니다.");
  }

  async function copyMarkdown() {
    const markdown = buildCanvasMarkdown(selectedTab, nodes, manualLinks);
    try {
      await navigator.clipboard.writeText(markdown);
      setMarkdownStatus("마크다운을 클립보드에 복사했습니다.");
    } catch {
      downloadMarkdown();
    }
  }

  return (
    <section className="shared-canvas-view" aria-label="Canvas">
      <header className="shared-canvas-heading">
        <h2>Canvas</h2>
        <p>직접 생각을 펼치고 공유하는 공간</p>
      </header>

      <div className="shared-canvas-tabs" role="tablist" aria-label="Canvas 탭">
        {canvasTabs.map((tab) => (
          <button
            className={tab.id === activeTab ? "active" : ""}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setLinkSourceId("");
              setMarkdownStatus("");
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
        <label className="canvas-tab-add-control">
          <input
            aria-label="Canvas 새 탭 이름"
            onChange={(event) => setDraftTabTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCanvasTab();
            }}
            placeholder="새 탭"
            value={draftTabTitle}
          />
          <button onClick={addCanvasTab} type="button">
            <Plus size={13} />
          </button>
        </label>
      </div>

      <div className="shared-canvas-board">
        <div className="shared-canvas-toolbar">
          <strong>{selectedTab.title}</strong>
          <div className="canvas-density-tabs" role="tablist" aria-label="Canvas 노드 크기">
            <button className={canvasDensity === "card" ? "active" : ""} onClick={() => setCanvasDensity("card")} type="button">
              카드
            </button>
            <button className={canvasDensity === "compact" ? "active" : ""} onClick={() => setCanvasDensity("compact")} type="button">
              작게
            </button>
          </div>
          <div className="canvas-template-picker" aria-label="Canvas 템플릿">
            {canvasTemplates.map((template) => (
              <button
                className={template.id === selectedTemplate ? "active" : ""}
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                type="button"
              >
                {template.label}
              </button>
            ))}
          </div>
          <label className="canvas-add-control">
            <input
              aria-label="Canvas 새 노드 제목"
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addNode();
              }}
              placeholder="새 노드 제목"
              value={draftTitle}
            />
            <button onClick={addNode} type="button">
              <Plus size={14} />
              노드 추가
            </button>
          </label>
          <button className="canvas-arrange-button" onClick={autoArrangeNodes} type="button">
            <Rows3 size={14} />
            자동 정렬
          </button>
          {manualLinks.length > 0 ? (
            <button className="canvas-arrange-button" onClick={clearManualLinks} type="button">
              <Link2 size={14} />
              연결 지우기
            </button>
          ) : null}
          <button className="canvas-export-button" onClick={copyMarkdown} type="button">
            <Clipboard size={14} />
            MD 복사
          </button>
          <button className="canvas-export-button" onClick={downloadMarkdown} type="button">
            <Download size={14} />
            MD 저장
          </button>
          {markdownStatus ? <span className="canvas-markdown-status">{markdownStatus}</span> : null}
        </div>
        <div className={`shared-canvas-stage ${canvasDensity === "compact" ? "is-compact" : ""}`} onPointerLeave={stopDrag} onPointerMove={moveDrag} onPointerUp={stopDrag}>
          <div className="canvas-plane" ref={stageRef}>
            <svg className="canvas-link-layer" aria-hidden="true">
              {renderedLinks.map((link) => {
                const source = nodesById.get(link.sourceId);
                const target = nodesById.get(link.targetId);
                if (!source || !target) return null;
                const startX = source.x + nodeBox.width;
                const startY = source.y + nodeBox.centerY;
                const endX = target.x;
                const endY = target.y + nodeBox.centerY;
                const midX = startX + Math.max(36, (endX - startX) / 2);
                return (
                  <path
                    className={link.kind === "parent" ? "is-parent-link" : "is-manual-link"}
                    d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                    key={link.id}
                  />
                );
              })}
            </svg>
            <article className="canvas-seed-node primary">
              <Lightbulb size={15} />
              <strong>{selectedTab.title}</strong>
              <p>{selectedTab.description}</p>
            </article>
            {nodes.map((node) => {
              const template = getTemplate(node.template);
              return (
                <article
                  className={`canvas-seed-node is-editable template-${template.id} ${linkSourceId === node.id ? "is-link-source" : ""}`}
                  key={node.id}
                  style={{ left: node.x, top: node.y }}
                >
                  <button className="canvas-drag-handle" onPointerDown={(event) => startDrag(event, node)} type="button" title="노드 이동">
                    <GripVertical size={13} />
                  </button>
                  <button className="canvas-child-node" onClick={() => addChildNode(node)} type="button" title="하위 노드 추가">
                    <GitBranchPlus size={12} />
                  </button>
                  <button className="canvas-connect-node" onClick={() => connectNode(node.id)} type="button" title="기존 노드 연결">
                    {linkSourceId && linkSourceId !== node.id ? <MousePointer2 size={12} /> : <Link2 size={12} />}
                  </button>
                  {canvasDensity !== "compact" && <span className="canvas-node-template">{template.label}</span>}
                  <textarea
                    aria-label="Canvas 노드 제목"
                    className="canvas-title-input"
                    onChange={(event) => updateNode(node.id, { title: event.target.value.replaceAll("\n", " ") })}
                    rows={canvasDensity === "compact" ? 1 : 2}
                    value={node.title}
                  />
                  {canvasDensity !== "compact" && (
                    <textarea
                      aria-label="Canvas 노드 내용"
                      onChange={(event) => updateNode(node.id, { body: event.target.value })}
                      rows={2}
                      value={node.body}
                    />
                  )}
                  <button className="canvas-delete-node" onClick={() => deleteNode(node.id)} type="button" title="노드 삭제">
                    <Trash2 size={12} />
                  </button>
                </article>
              );
            })}
            <div className="shared-canvas-placeholder">
              <strong>로컬 초안 편집</strong>
              <p>스크롤되는 작업면에서 노드를 작게 배치하고, 현재 탭은 마크다운으로 내보낼 수 있습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
