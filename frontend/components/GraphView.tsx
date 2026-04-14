"use client";

import { useEffect, useRef } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import type { DFA, NFA } from "@/lib/automata";
import type { MinDFA } from "@/lib/minimize";

export type GraphMode = "nfa" | "dfa" | "min";

interface GraphViewProps {
  nfa: NFA | null;
  dfa: DFA | null;
  minDfa: MinDFA | null;
  mode: GraphMode;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  normal:      { bg: "#1e3a5f", border: "#4fc3f7" },
  start:       { bg: "#2d1b69", border: "#7c4dff" },
  accept:      { bg: "#0d2f3f", border: "#00e5ff" },
  startAccept: { bg: "#1a2d4d", border: "#00e5ff" },
  font:        "#e6f1ff",
  edge:        "#4fc3f7",
  edgeEps:     "#7c4dff",
  edgeHover:   "#00e5ff",
  startArrow:  "#7c4dff",
};

const NODE_R   = 30;   // visual radius for collision detection
const H_GAP    = 220;  // horizontal gap between levels
const V_GAP    = 140;  // vertical gap between nodes in same level

// ─── Manual layered layout ────────────────────────────────────────────────────
// Returns { id -> {x, y} } with zero physics, zero overlap
function computePositions(
  nodeIds: string[],
  startId: string,
  edges: Array<{ from: string; to: string }>
): Record<string, { x: number; y: number }> {
  // BFS to assign levels
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const e of edges) {
    if (adj[e.from]) adj[e.from].push(e.to);
  }

  const level: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: Array<{ id: string; lv: number }> = [{ id: startId, lv: 0 }];
  visited.add(startId);
  while (queue.length > 0) {
    const { id, lv } = queue.shift()!;
    level[id] = lv;
    for (const nb of adj[id] ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push({ id: nb, lv: lv + 1 });
      }
    }
  }
  // Assign unvisited nodes to level 0 (isolated)
  for (const id of nodeIds) {
    if (level[id] === undefined) level[id] = 0;
  }

  // Group by level
  const byLevel: Record<number, string[]> = {};
  for (const id of nodeIds) {
    const lv = level[id];
    if (!byLevel[lv]) byLevel[lv] = [];
    byLevel[lv].push(id);
  }

  // Sort within each level by number of incoming edges (most connected first)
  const inDegree: Record<string, number> = {};
  for (const id of nodeIds) inDegree[id] = 0;
  for (const e of edges) {
    if (inDegree[e.to] !== undefined) inDegree[e.to]++;
  }
  for (const lv of Object.keys(byLevel)) {
    byLevel[Number(lv)].sort((a, b) => (inDegree[b] ?? 0) - (inDegree[a] ?? 0));
  }

  // Assign coordinates
  const pos: Record<string, { x: number; y: number }> = {};
  for (const [lvStr, ids] of Object.entries(byLevel)) {
    const lv = Number(lvStr);
    const count = ids.length;
    const totalH = (count - 1) * V_GAP;
    ids.forEach((id, idx) => {
      pos[id] = {
        x: lv * H_GAP,
        y: idx * V_GAP - totalH / 2,
      };
    });
  }
  return pos;
}

// ─── Group edges by (from,to) — keep each symbol as its own entry ─────────────
// Returns groups; each group is one (from,to) pair with all its symbols.
// We fan them out with alternating curvature so they never overlap.
interface EdgeGroup {
  from: string;
  to: string;
  symbols: string[];   // one per parallel edge
}

function groupEdges(
  raw: Array<{ from: string; to: string; symbol: string }>
): EdgeGroup[] {
  const map: Record<string, EdgeGroup> = {};
  for (const e of raw) {
    const key = `${e.from}|||${e.to}`;
    if (map[key]) {
      if (!map[key].symbols.includes(e.symbol)) map[key].symbols.push(e.symbol);
    } else {
      map[key] = { from: e.from, to: e.to, symbols: [e.symbol] };
    }
  }
  // Sort symbols within each group: non-ε first, then ε
  for (const g of Object.values(map)) {
    g.symbols.sort((a, b) => a === "ε" ? 1 : b === "ε" ? -1 : a.localeCompare(b));
  }
  return Object.values(map);
}

// ─── Collision detection: does segment (p1→p2) pass through circle (c, r)? ──
function segmentHitsCircle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  c:  { x: number; y: number },
  r:  number
): boolean {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const fx = p1.x - c.x,  fy = p1.y - c.y;
  const a = dx * dx + dy * dy;
  if (a === 0) return false;
  const b = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  // Exclude endpoints (t ≈ 0 or 1 means the edge starts/ends at the node)
  const eps = 0.05;
  return (t1 > eps && t1 < 1 - eps) || (t2 > eps && t2 < 1 - eps);
}

// ─── Determine smooth config for an edge ─────────────────────────────────────
function smoothFor(
  fromId: string,
  toId: string,
  fromPos: { x: number; y: number },
  toPos:   { x: number; y: number },
  allPos:  Record<string, { x: number; y: number }>,
  pairSet: Set<string>,
  edgeIndex: number   // 0-based index among edges with same from/to direction
): object {
  // Self-loop
  if (fromId === toId) {
    return { enabled: true, type: "curvedCW", roundness: 0.6 };
  }

  // Bidirectional pair
  const isBidi = pairSet.has(`${toId}|||${fromId}`);
  if (isBidi) {
    return fromId < toId
      ? { enabled: true, type: "curvedCW",  roundness: 0.35 }
      : { enabled: true, type: "curvedCCW", roundness: 0.35 };
  }

  // Check if straight line hits any intermediate node
  let hits = false;
  for (const [nid, npos] of Object.entries(allPos)) {
    if (nid === fromId || nid === toId) continue;
    if (segmentHitsCircle(fromPos, toPos, npos, NODE_R + 8)) {
      hits = true;
      break;
    }
  }

  if (!hits) {
    return { enabled: false };
  }

  // Alternate CW / CCW for multiple conflicting edges
  const roundness = 0.25 + (edgeIndex % 3) * 0.1;
  return edgeIndex % 2 === 0
    ? { enabled: true, type: "curvedCW",  roundness }
    : { enabled: true, type: "curvedCCW", roundness };
}

// ─── Build vis-network datasets for any automaton ────────────────────────────
interface AutomatonSpec {
  nodeIds:    string[];
  startId:    string;
  acceptIds:  Set<string>;
  nodeLabel:  (id: string) => string;
  nodeTitle:  (id: string) => string;
  rawEdges:   Array<{ from: string; to: string; symbol: string }>;
  nodeSize:   number;
}

function buildGraph(spec: AutomatonSpec) {
  const { nodeIds, startId, acceptIds, nodeLabel, nodeTitle, rawEdges, nodeSize } = spec;

  // Compute manual positions
  const pos = computePositions(nodeIds, startId, rawEdges.map(e => ({ from: e.from, to: e.to })));

  // Add invisible start-arrow node just to the left of start
  const startPos = pos[startId] ?? { x: 0, y: 0 };
  const arrowId = "__ARROW__";
  pos[arrowId] = { x: startPos.x - H_GAP * 0.55, y: startPos.y };

  // Build vis nodes
  const visNodes: object[] = nodeIds.map((id) => {
    const isAccept = acceptIds.has(id);
    const isStart  = id === startId;
    let bg     = C.normal.bg;
    let border = C.normal.border;
    if (isStart && isAccept) { bg = C.startAccept.bg; border = C.startAccept.border; }
    else if (isStart)        { bg = C.start.bg;       border = C.start.border; }
    else if (isAccept)       { bg = C.accept.bg;      border = C.accept.border; }

    return {
      id,
      label: nodeLabel(id),
      title: nodeTitle(id),
      x: pos[id]!.x,
      y: pos[id]!.y,
      fixed: { x: true, y: true },
      shape: "circle",
      size: nodeSize,
      font: { size: 14, color: C.font, bold: true },
      color: {
        background: bg,
        border,
        highlight: { background: bg, border: C.edgeHover },
        hover:      { background: bg, border: C.edgeHover },
      },
      // Accept states: thick border; inner ring drawn in afterDrawing
      borderWidth: isAccept ? 3 : 2,
      borderWidthSelected: 3,
      shadow: { enabled: false },
    };
  });

  // Arrow phantom node
  visNodes.push({
    id: arrowId,
    label: "",
    x: pos[arrowId]!.x,
    y: pos[arrowId]!.y,
    fixed: { x: true, y: true },
    shape: "dot",
    size: 1,
    font: { size: 1, color: "transparent", bold: false as boolean },
    color: {
      background: "transparent", border: "transparent",
      highlight: { background: "transparent", border: "transparent" },
      hover:      { background: "transparent", border: "transparent" },
    },
    borderWidth: 0,
    borderWidthSelected: 0,
    shadow: { enabled: false },
  });

  // Group edges by (from,to) — each symbol gets its own vis edge with fanned curvature
  const groups = groupEdges(rawEdges);
  // Build a set of all (from,to) pairs that have a reverse (for bidi detection)
  const pairSet = new Set(groups.map(g => `${g.from}|||${g.to}`));

  const visEdges: object[] = [];

  for (const { from, to, symbols } of groups) {
    const isSelf = from === to;
    const isBidi = !isSelf && pairSet.has(`${to}|||${from}`);
    const fromPos = pos[from] ?? { x: 0, y: 0 };
    const toPos   = pos[to]   ?? { x: 0, y: 0 };
    const n = symbols.length;

    // Fan curvature table: index → { type, roundness, vadjust }
    // For a single edge: straight (or collision-curved).
    // For multiple parallel edges: alternate CW/CCW with increasing roundness.
    const fanCurves = (count: number, idx: number): { smooth: object; vadjust: number } => {
      if (isSelf) {
        // Self-loops: stack them with increasing roundness
        const r = 0.5 + idx * 0.15;
        return { smooth: { enabled: true, type: "curvedCW", roundness: r }, vadjust: -8 - idx * 6 };
      }
      if (isBidi) {
        // Bidirectional: one direction always CW, other CCW
        const base = from < to ? "curvedCW" : "curvedCCW";
        const r = 0.3 + idx * 0.12;
        const va = idx % 2 === 0 ? -6 : 6;
        return { smooth: { enabled: true, type: base, roundness: r }, vadjust: va };
      }
      if (count === 1) {
        // Single edge — check collision, else straight
        const smooth = smoothFor(from, to, fromPos, toPos, pos, pairSet, 0);
        return { smooth, vadjust: 0 };
      }
      // Multiple parallel edges — fan them symmetrically
      // Roundness values: 0.2, -0.2, 0.35, -0.35, 0.5, -0.5 …
      const tier = Math.floor(idx / 2);
      const r = 0.2 + tier * 0.15;
      const type = idx % 2 === 0 ? "curvedCW" : "curvedCCW";
      const va = idx % 2 === 0 ? -7 : 7;
      return { smooth: { enabled: true, type, roundness: r }, vadjust: va };
    };

    symbols.forEach((symbol, idx) => {
      const isEps = symbol === "ε";
      const { smooth, vadjust } = fanCurves(n, idx);
      const edgeId = `${from}|||${to}|||${symbol}`;

      visEdges.push({
        id: edgeId,
        from,
        to,
        label: symbol,
        smooth,
        arrows: { to: { enabled: true, scaleFactor: 0.45, type: "arrow" } },
        font: {
          size: 12,
          color: isEps ? C.edgeEps : "#a8d8ea",
          bold: true,
          background: "rgba(10,25,47,0.92)",
          strokeWidth: 0,
          align: isSelf ? "top" : "middle",
          vadjust,
        },
        color: { color: isEps ? C.edgeEps : C.edge, highlight: C.edgeHover, hover: C.edgeHover },
        width: 1.2,
        selectionWidth: 2,
        hoverWidth: 3,
      });
    });
  }

  // Start arrow edge
  visEdges.push({
    id: "__START_EDGE__",
    from: arrowId,
    to: startId,
    label: "",
    smooth: { enabled: false },
    arrows: { to: { enabled: true, scaleFactor: 0.55, type: "arrow" } },
    font: { size: 1, color: "transparent" },
    color: { color: C.startArrow, highlight: C.startArrow, hover: C.startArrow },
    width: 2,
    hoverWidth: 2,
    selectionWidth: 2,
  });

  return {
    nodes: new DataSet(visNodes),
    edges: new DataSet(visEdges),
    acceptIds: [...acceptIds],
    nodeSize,
  };
}

// ─── Draw double ring for accept states ──────────────────────────────────────
function drawAcceptRings(
  ctx: CanvasRenderingContext2D,
  network: Network,
  acceptIds: (string | number)[],
  nodeSize: number
) {
  ctx.save();
  for (const id of acceptIds) {
    const p = network.getPosition(id);
    if (!p) continue;
    // Inner ring (tight gap = 6px from node edge)
    const innerR = nodeSize + 6;
    ctx.strokeStyle = C.accept.border;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, innerR, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GraphView({ nfa, dfa, minDfa, mode }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef   = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    // Build spec based on mode
    let spec: AutomatonSpec | null = null;

    if (mode === "nfa" && nfa) {
      const rawEdges = nfa.transitions.map(t => ({
        from: String(t.from),
        to:   String(t.to),
        symbol: t.symbol,
      }));
      spec = {
        nodeIds:   nfa.states.map(s => String(s.id)),
        startId:   String(nfa.startState),
        acceptIds: new Set(nfa.states.filter(s => s.isAccept).map(s => String(s.id))),
        nodeLabel: (id) => `q${id}`,
        nodeTitle: (id) => `State q${id}`,
        rawEdges,
        nodeSize: 30,
      };
    } else if (mode === "dfa" && dfa) {
      const rawEdges = dfa.transitions.map(t => ({
        from: String(t.from),
        to:   String(t.to),
        symbol: t.symbol,
      }));
      spec = {
        nodeIds:   dfa.states.map(s => s.id),
        startId:   dfa.startState,
        acceptIds: new Set(dfa.acceptStates),
        nodeLabel: (id) => id,
        nodeTitle: (id) => {
          const s = dfa.states.find(x => x.id === id);
          return s ? `{${s.nfaStates.join(", ")}}` : id;
        },
        rawEdges,
        nodeSize: 32,
      };
    } else if (mode === "min" && minDfa) {
      const rawEdges = minDfa.transitions.map(t => ({
        from: String(t.from),
        to:   String(t.to),
        symbol: t.symbol,
      }));
      spec = {
        nodeIds:   minDfa.states.map(s => s.id),
        startId:   minDfa.startState,
        acceptIds: new Set(minDfa.acceptStates),
        nodeLabel: (id) => id,
        nodeTitle: (id) => {
          const members = minDfa.mapping[id] ?? [];
          return `${id} = {${members.join(", ")}}`;
        },
        rawEdges,
        nodeSize: 32,
      };
    }

    if (!spec) return;

    const { nodes, edges, acceptIds, nodeSize } = buildGraph(spec);

    const options = {
      physics: { enabled: false },
      layout:  { improvedLayout: false },
      interaction: {
        dragNodes: false,
        dragView:  true,
        zoomView:  true,
        hover:     true,
        tooltipDelay: 150,
      },
      nodes: { shape: "circle" },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.45, type: "arrow" } },
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options as any);
    networkRef.current = network;

    // ── Hover: brighten edge on hover ────────────────────────────────────────
    network.on("hoverEdge", ({ edge }: { edge: string }) => {
      if (edge === "__START_EDGE__") return;
      edges.update({
        id: edge,
        width: 3,
        color: { color: C.edgeHover, highlight: C.edgeHover, hover: C.edgeHover },
        font: { color: "#ffffff", bold: true, size: 13, background: "rgba(10,25,47,0.95)", strokeWidth: 0 },
      });
    });
    network.on("blurEdge", ({ edge }: { edge: string }) => {
      if (edge === "__START_EDGE__") return;
      const orig = edges.get(edge) as any;
      if (!orig) return;
      // Edge id format: "from|||to|||symbol"
      const symbol = (edge as string).split("|||")[2] ?? "";
      const isEps = symbol === "ε";
      edges.update({
        id: edge,
        width: 1.2,
        color: { color: isEps ? C.edgeEps : C.edge, highlight: C.edgeHover, hover: C.edgeHover },
        font: {
          color: isEps ? C.edgeEps : "#a8d8ea",
          bold: true,
          size: 12,
          background: "rgba(10,25,47,0.92)",
          strokeWidth: 0,
        },
      });
    });

    // ── Hover: highlight connected edges on node hover ────────────────────────
    network.on("hoverNode", ({ node }: { node: string }) => {
      const connected = network.getConnectedEdges(node) as string[];
      for (const eid of connected) {
        if (eid === "__START_EDGE__") continue;
        edges.update({
          id: eid,
          width: 2.5,
          color: { color: C.edgeHover, highlight: C.edgeHover, hover: C.edgeHover },
        });
      }
    });
    network.on("blurNode", ({ node }: { node: string }) => {
      const connected = network.getConnectedEdges(node) as string[];
      for (const eid of connected) {
        if (eid === "__START_EDGE__") continue;
        const symbol = (eid as string).split("|||")[2] ?? "";
        const isEps = symbol === "ε";
        edges.update({
          id: eid,
          width: 1.2,
          color: { color: isEps ? C.edgeEps : C.edge, highlight: C.edgeHover, hover: C.edgeHover },
        });
      }
    });

    // ── Draw double rings ─────────────────────────────────────────────────────
    network.on("afterDrawing", (ctx: CanvasRenderingContext2D) => {
      drawAcceptRings(ctx, network, acceptIds, nodeSize);
    });

    // Fit after first stabilization
    network.once("afterDrawing", () => {
      network.fit({ animation: { duration: 400, easingFunction: "easeInOutQuad" } });
    });

    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [nfa, dfa, minDfa, mode]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{
        background: "radial-gradient(circle at 1px 1px, #1e3a5f 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}
