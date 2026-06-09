import { useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download, Info, LocateFixed, Plus } from "lucide-react";
import { buildMindmapMarkdown, buildMindmapStructure, filterMindmapTasksByScope, mindmapGroupStatusSummary } from "./mindmapData.js";

const nodeWidth = {
  root: 190,
  group: 190,
  task: 230,
  compactTask: 190
};

const compactNodeWidth = {
  root: 220,
  group: 184,
  task: 240
};
const statusLegendItems = ["진행중", "계획", "검토/대기", "완료", "보류"];

function personLabel(people, personId) {
  return people.find((person) => person.id === personId)?.name ?? "미지정";
}

function isSpotMindmapTask(task) {
  return task?.workKind === "spot";
}

function nodeClass(type, tone = "") {
  return ["mindmap-node-card", `mindmap-node-${type}`, tone ? `mindmap-tone-${tone}` : ""].filter(Boolean).join(" ");
}

function MindmapNode({ data }) {
  const isTask = data.kind === "task";
  const isRoot = data.kind === "root";
  const statusClass = data.status ? `status-${data.status.replace("/", "")}` : "";
  if (isTask && data.compact) {
    return (
      <button
        className={nodeClass(data.kind, data.tone)}
        title={`${data.label} · ${data.ownerName} · ${data.status}`}
        type="button"
      >
        <Handle className="mindmap-handle" position={Position.Left} type="target" />
        <span className="mindmap-compact-line">
          <i className={`mindmap-status-dot ${statusClass}`} aria-label={data.status} />
          <strong>{data.label}</strong>
          <small>{data.ownerName}</small>
        </span>
      </button>
    );
  }
  return (
    <button
      className={nodeClass(data.kind, data.tone)}
      title={data.title}
      type="button"
    >
      {!isRoot && <Handle className="mindmap-handle" position={Position.Left} type="target" />}
      <span className="mindmap-node-topline">
        <strong>{data.label}</strong>
        {isTask && !data.compact && data.isSpot ? (
          <span className="priority-square spot-work-chip" title="스팟 업무">
            스팟
          </span>
        ) : (
          isTask && !data.compact && data.priority && <span className={`priority-square priority-square-${data.priority}`}>{data.priority}</span>
        )}
        {data.countLabel && <em>{data.countLabel}</em>}
      </span>
      {data.description && !data.compact && <small>{data.description}</small>}
      {isTask && !data.compact && (
        <>
          <span className="mindmap-task-meta">
            {data.ownerName} · {data.dueDate}
          </span>
          <span className="mindmap-node-chips">
            <i className={`mindmap-status-chip ${statusClass}`}>{data.status}</i>
            <i>{data.progress}%</i>
          </span>
        </>
      )}
      {!isTask && !data.compact && data.statusSummary?.length > 0 && (
        <span className="mindmap-node-chips">
          {data.statusSummary.map((item) => (
            <i key={item}>{item}</i>
          ))}
        </span>
      )}
      {!isTask && <Handle className="mindmap-handle" position={Position.Right} type="source" />}
    </button>
  );
}

const nodeTypes = {
  mindmap: MindmapNode
};

function compactWidthForText(text, baseWidth, maxWidth) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  const koreanChars = [...normalized].filter((char) => /[가-힣]/.test(char)).length;
  const wideChars = [...normalized].filter((char) => !/[가-힣A-Za-z0-9\s]/.test(char)).length;
  const weightedLength = normalized.length + koreanChars * 0.35 + wideChars * 0.25;
  return Math.min(maxWidth, Math.max(baseWidth, Math.round(weightedLength * 8.2 + 78)));
}

function mindmapNodeWidth(data) {
  if (!data.compact) return nodeWidth[data.kind] ?? 180;
  if (data.kind === "task") {
    return compactWidthForText(`${data.label} ${data.ownerName}`, compactNodeWidth.task, 520);
  }
  if (data.kind === "group") {
    return compactWidthForText(`${data.label} ${data.countLabel ?? ""}`, compactNodeWidth.group, 360);
  }
  return compactNodeWidth[data.kind] ?? compactNodeWidth.task;
}

function addNode(nodes, node) {
  nodes.push({
    ...node,
    type: "mindmap",
    draggable: false,
    style: {
      width: mindmapNodeWidth(node.data)
    }
  });
}

function addEdge(edges, source, target) {
  edges.push({
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#b9c8d8", strokeWidth: 1.8 }
  });
}

function safeFilePart(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "mindmap";
}

function buildFlowElements(structure, people, density = "card") {
  const nodes = [];
  const edges = [];
  const isCompact = density === "compact";
  const rowGap = isCompact ? 40 : 86;
  const groupGap = isCompact ? 24 : 58;
  const compactColumnGap = 54;
  const canvasHeightPadding = isCompact ? 120 : 190;
  const rootX = 0;
  const rootWidth = isCompact ? compactNodeWidth.root : nodeWidth.root;
  const maxGroupWidth = isCompact
    ? Math.max(
      compactNodeWidth.group,
      ...structure.groups.map((group) => compactWidthForText(`${group.label} ${group.uniqueTaskCount}건`, compactNodeWidth.group, 360))
    )
    : nodeWidth.group;
  const groupX = isCompact ? rootX + rootWidth + compactColumnGap : 260;
  const taskX = isCompact ? groupX + maxGroupWidth + compactColumnGap : 540;
  let cursorY = 0;
  const groupLayouts = structure.groups.map((group) => {
    const uniqueTasks = group.tasks ?? [];
    const taskRows = Math.max(1, uniqueTasks.length);
    const height = Math.max(isCompact ? 80 : 128, taskRows * rowGap);
    const layout = { group, uniqueTasks, y: cursorY, height };
    cursorY += height + groupGap;
    return layout;
  });
  const totalHeight = Math.max(cursorY - groupGap, 260);
  const rootY = Math.max(0, totalHeight / 2 - 44);

  addNode(nodes, {
    id: "root",
    position: { x: rootX, y: rootY },
    data: {
      kind: "root",
      compact: isCompact,
      label: "연구기획그룹-전략",
      title: "현재 필터 기준 업무 구조",
      countLabel: `${structure.uniqueTaskCount}건`,
      description: "상위 업무흐름에서 개별 업무로 확장",
      statusSummary: structure.groups.map((group) => `${group.label} ${group.uniqueTaskCount}`)
    }
  });

  groupLayouts.forEach(({ group, uniqueTasks, y, height }) => {
    const groupId = `group:${group.id}`;
    addNode(nodes, {
      id: groupId,
      position: { x: groupX, y: y + height / 2 - (isCompact ? 18 : 42) },
      data: {
        kind: "group",
        compact: isCompact,
        tone: group.tone,
        label: group.label,
        title: group.tags.join(", "),
        countLabel: `${group.uniqueTaskCount}건`,
        description: group.tags.slice(0, 5).join(" · "),
        statusSummary: mindmapGroupStatusSummary(group)
      }
    });
    addEdge(edges, "root", groupId);

    uniqueTasks.forEach((task, taskIndex) => {
      const taskNodeId = `task:${group.id}:${task.id}`;
      addNode(nodes, {
        id: taskNodeId,
        position: { x: taskX, y: y + taskIndex * rowGap },
        data: {
          kind: "task",
          label: task.title,
          title: task.connectedLocations.map((location) => `${location.groupLabel} > ${location.tag}`).join(" · "),
          countLabel: "",
          taskId: task.id,
          status: task.status,
          priority: task.priority,
          isSpot: isSpotMindmapTask(task),
          progress: task.progress,
          dueDate: task.dueDate,
          ownerName: personLabel(people, task.ownerId),
          compact: isCompact
        }
      });
      addEdge(edges, groupId, taskNodeId);
    });
  });

  return { nodes, edges, canvasHeight: Math.max(620, totalHeight + canvasHeightPadding) };
}

export function MindmapView({ onFillDemo, onFilterTags, onSelectTask, people, presets, tasks }) {
  const [scope, setScope] = useState("active");
  const [densityMode, setDensityMode] = useState("card");
  const [flowInstance, setFlowInstance] = useState(null);
  const mindmapRef = useRef(null);
  const scopedTasks = useMemo(() => filterMindmapTasksByScope(tasks, scope), [scope, tasks]);
  const structure = useMemo(() => buildMindmapStructure(scopedTasks, presets), [scopedTasks, presets]);
  const density = scope === "all" || densityMode === "compact" ? "compact" : "card";
  const { nodes, edges, canvasHeight } = useMemo(() => buildFlowElements(structure, people, density), [structure, people, density]);

  function handleNodeClick(_event, node) {
    const data = node.data;
    if (data.kind === "task" && data.taskId) {
      onSelectTask(data.taskId);
      return;
    }
    if (data.kind === "group") {
      const group = structure.groups.find((item) => `group:${item.id}` === node.id);
      if (group) onFilterTags(group.tags);
    }
  }

  function returnToCenter() {
    mindmapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    flowInstance?.fitView?.({ padding: 0.18, duration: 360 });
  }

  function downloadMarkdown() {
    const generatedAt = new Date().toISOString().slice(0, 10);
    const markdown = buildMindmapMarkdown(structure, people, { generatedAt, scope });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mindmap-${safeFilePart(scope)}-${generatedAt}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="mindmap-view" aria-label="업무 마인드맵" ref={mindmapRef}>
      <div className="mindmap-header">
        <div>
          <span className="panel-label">마인드맵</span>
          <h2>업무 구조</h2>
        </div>
        <div className="mindmap-header-stack">
          <div className="mindmap-header-controls">
            <div className="mindmap-mode-tabs" role="tablist" aria-label="마인드맵 범위">
              <button className={scope === "active" ? "active" : ""} onClick={() => setScope("active")} type="button">
                현재 진행업무
              </button>
              <button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")} type="button">
                전체 진행업무
              </button>
            </div>
            <div className="mindmap-mode-tabs" role="tablist" aria-label="마인드맵 노드 크기">
              <button className={densityMode === "card" && scope !== "all" ? "active" : ""} onClick={() => setDensityMode("card")} type="button">
                카드
              </button>
              <button className={density === "compact" ? "active" : ""} onClick={() => setDensityMode("compact")} type="button">
                작게
              </button>
            </div>
            <button className="mindmap-home-button" onClick={returnToCenter} type="button">
              <LocateFixed size={14} />
              중앙
            </button>
            <button className="mindmap-home-button" onClick={downloadMarkdown} type="button">
              <Download size={14} />
              MD 저장
            </button>
            {onFillDemo && (
              <button className="mindmap-home-button" onClick={onFillDemo} type="button">
                <Plus size={14} />
                샘플
              </button>
            )}
          </div>
          <div className="mindmap-status-legend" aria-label="마인드맵 상태 색상">
            {statusLegendItems.map((status) => (
              <span key={status}>
                <i className={`mindmap-status-dot status-${status.replace("/", "")}`} />
                {status}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={`mindmap-canvas ${density === "compact" ? "is-compact" : ""}`} style={{ height: canvasHeight }}>
        {nodes.length > 1 ? (
          <ReactFlow
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.35}
            maxZoom={1.35}
            nodes={nodes}
            nodesConnectable={false}
            nodesDraggable={false}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onInit={setFlowInstance}
            panOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#dbe5f0" gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="mindmap-empty">
            <Info size={18} />
            현재 필터에 맞는 업무가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
