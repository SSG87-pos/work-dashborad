import { useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Info, LocateFixed } from "lucide-react";
import { buildMindmapStructure, filterMindmapTasksByScope } from "./mindmapData.js";

const nodeWidth = {
  root: 190,
  group: 190,
  tag: 168,
  task: 230,
  compactTask: 190
};

const compactNodeWidth = {
  root: 164,
  group: 158,
  tag: 140,
  task: 172
};

function statusTone(status) {
  if (status === "완료") return "done";
  if (status === "보류") return "hold";
  if (status === "검토/대기") return "wait";
  if (status === "계획") return "plan";
  return "active";
}

function countStatuses(tasks) {
  return tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
}

function personLabel(people, personId) {
  return people.find((person) => person.id === personId)?.name ?? "미지정";
}

function nodeClass(type, tone = "") {
  return ["mindmap-node-card", `mindmap-node-${type}`, tone ? `mindmap-tone-${tone}` : ""].filter(Boolean).join(" ");
}

function MindmapNode({ data }) {
  const isTask = data.kind === "task";
  const isRoot = data.kind === "root";
  return (
    <button
      className={nodeClass(data.kind, data.tone)}
      title={data.title}
      type="button"
    >
      {!isRoot && <Handle className="mindmap-handle" position={Position.Left} type="target" />}
      <span className="mindmap-node-topline">
        <strong>{data.label}</strong>
        {data.countLabel && <em>{data.countLabel}</em>}
      </span>
      {data.description && !data.compact && <small>{data.description}</small>}
      {isTask && !data.compact && (
        <>
          <span className="mindmap-task-meta">
            {data.ownerName} · {data.dueDate}
          </span>
          <span className="mindmap-node-chips">
            <i className={`mindmap-status-chip ${statusTone(data.status)}`}>{data.status}</i>
            <i>{data.progress}%</i>
            {data.sharedCount > 1 && <i className="shared">공유 {data.sharedCount}곳</i>}
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

function addNode(nodes, node) {
  nodes.push({
    ...node,
    type: "mindmap",
    draggable: false,
    style: {
      width: node.data.compact ? compactNodeWidth[node.data.kind] ?? compactNodeWidth.task : nodeWidth[node.data.kind] ?? 180
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

function buildFlowElements(structure, people, density = "card") {
  const nodes = [];
  const edges = [];
  const isCompact = density === "compact";
  const rowGap = isCompact ? 44 : 86;
  const groupGap = isCompact ? 38 : 58;
  const canvasHeightPadding = isCompact ? 150 : 190;
  let cursorY = 0;
  const groupLayouts = structure.groups.map((group) => {
    const taskRows = group.tagBuckets.reduce((count, bucket) => count + Math.max(1, bucket.tasks.length), 0);
    const height = Math.max(128, taskRows * rowGap + (group.tagBuckets.length - 1) * 18);
    const layout = { group, y: cursorY, height };
    cursorY += height + groupGap;
    return layout;
  });
  const totalHeight = Math.max(cursorY - groupGap, 260);
  const rootY = Math.max(0, totalHeight / 2 - 44);

  addNode(nodes, {
    id: "root",
    position: { x: 0, y: rootY },
    data: {
      kind: "root",
      compact: isCompact,
      label: "연구기획그룹-전략",
      title: "현재 필터 기준 업무 구조",
      countLabel: `${structure.uniqueTaskCount}건`,
      description: "상위 업무흐름에서 Category/태그로 확장",
      statusSummary: structure.groups.map((group) => `${group.label} ${group.uniqueTaskCount}`)
    }
  });

  groupLayouts.forEach(({ group, y, height }) => {
    const groupId = `group:${group.id}`;
    const groupTasks = group.tagBuckets.flatMap((bucket) => bucket.tasks);
    const statuses = countStatuses(groupTasks);
    addNode(nodes, {
      id: groupId,
      position: { x: 260, y: y + height / 2 - 42 },
      data: {
        kind: "group",
        compact: isCompact,
        tone: group.tone,
        label: group.label,
        title: group.tags.join(", "),
        countLabel: `${group.uniqueTaskCount}건`,
        description: group.tags.join(" · "),
        statusSummary: Object.entries(statuses).slice(0, 3).map(([status, count]) => `${status} ${count}`)
      }
    });
    addEdge(edges, "root", groupId);

    let bucketY = y;
    group.tagBuckets.forEach((bucket) => {
      const bucketId = `tag:${group.id}:${bucket.tag}`;
      const bucketHeight = Math.max(rowGap, bucket.tasks.length * rowGap);
      addNode(nodes, {
        id: bucketId,
        position: { x: 520, y: bucketY + bucketHeight / 2 - 36 },
        data: {
          kind: "tag",
          compact: isCompact,
          tone: group.tone,
          label: bucket.tag,
          title: `${group.label} · ${bucket.tag}`,
          countLabel: `${bucket.tasks.length}건`,
          description: `${group.label} 안의 태그`
        }
      });
      addEdge(edges, groupId, bucketId);

      bucket.tasks.forEach((task, taskIndex) => {
        const taskNodeId = `task:${group.id}:${bucket.tag}:${task.id}`;
        addNode(nodes, {
          id: taskNodeId,
          position: { x: 760, y: bucketY + taskIndex * rowGap },
          data: {
            kind: "task",
            label: task.title,
            title: task.connectedLocations.map((location) => `${location.groupLabel} > ${location.tag}`).join(" · "),
            countLabel: isCompact ? "" : task.priority,
            taskId: task.id,
            status: task.status,
            progress: task.progress,
            dueDate: task.dueDate,
            ownerName: personLabel(people, task.ownerId),
            sharedCount: task.connectedLocations.length,
            compact: isCompact
          }
        });
        addEdge(edges, bucketId, taskNodeId);
      });
      bucketY += bucketHeight + 18;
    });
  });

  return { nodes, edges, canvasHeight: Math.max(620, totalHeight + canvasHeightPadding) };
}

export function MindmapView({ onFilterTags, onSelectTask, people, presets, tasks }) {
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
      return;
    }
    if (data.kind === "tag") {
      onFilterTags([data.label]);
    }
  }

  function returnToCenter() {
    mindmapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    flowInstance?.fitView?.({ padding: 0.18, duration: 360 });
  }

  return (
    <section className="mindmap-view" aria-label="업무 마인드맵" ref={mindmapRef}>
      <div className="mindmap-header">
        <div>
          <span className="panel-label">마인드맵</span>
          <h2>업무 구조</h2>
        </div>
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
