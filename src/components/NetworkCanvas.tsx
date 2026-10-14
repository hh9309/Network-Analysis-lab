import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GraphNode, GraphEdge } from '../types/network';
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause, Eye, Info, ShieldAlert } from 'lucide-react';

interface NetworkCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isDirected?: boolean;
  colorMetric?: 'default' | 'degree' | 'betweenness' | 'closeness' | 'pagerank' | 'eigenvector' | 'community' | 'cascade' | 'sir';
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onNodeMove?: (id: string, x: number, y: number) => void;
  height?: number;
  interactiveAddEdge?: boolean;
  onAddEdge?: (source: string, target: string) => void;
}

const COMMUNITY_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#84cc16', // lime
];

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  nodes,
  edges,
  isDirected = false,
  colorMetric = 'default',
  selectedNodeId,
  onSelectNode,
  height = 560,
  interactiveAddEdge = false,
  onAddEdge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging node
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Physics animation toggle
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Local positions cache for smooth force-directed physics
  const posRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  // Initialize or update positions
  useEffect(() => {
    nodes.forEach((n, idx) => {
      if (!posRef.current.has(n.id)) {
        posRef.current.set(n.id, {
          x: n.x || 300 + Math.cos(idx) * 150,
          y: n.y || 250 + Math.sin(idx) * 150,
          vx: 0,
          vy: 0,
        });
      }
    });

    // Cleanup deleted nodes
    const currentIds = new Set(nodes.map((n) => n.id));
    for (const key of posRef.current.keys()) {
      if (!currentIds.has(key)) {
        posRef.current.delete(key);
      }
    }
  }, [nodes]);

  // Force simulation tick
  useEffect(() => {
    if (!isSimulating) return;

    let animId: number;
    let stepCount = 0;

    const simulate = () => {
      stepCount++;
      const posMap = posRef.current;
      const n = nodes.length;

      // 1. Repulsion between all node pairs (Coulomb-like)
      for (let i = 0; i < n; i++) {
        const u = nodes[i].id;
        const pU = posMap.get(u);
        if (!pU) continue;

        for (let j = i + 1; j < n; j++) {
          const v = nodes[j].id;
          const pV = posMap.get(v);
          if (!pV) continue;

          const dx = pU.x - pV.x;
          const dy = pU.y - pV.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = 1800 / (distSq + 20);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggingNodeId !== u) {
              pU.vx += fx;
              pU.vy += fy;
            }
            if (draggingNodeId !== v) {
              pV.vx -= fx;
              pV.vy -= fy;
            }
          }
        }
      }

      // 2. Spring attraction along edges (Hooke's law)
      const idealLength = 90;
      for (const e of edges) {
        const pU = posMap.get(e.source);
        const pV = posMap.get(e.target);
        if (!pU || !pV) continue;

        const dx = pV.x - pU.x;
        const dy = pV.y - pU.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - idealLength;
        const force = displacement * 0.04;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (draggingNodeId !== e.source) {
          pU.vx += fx;
          pU.vy += fy;
        }
        if (draggingNodeId !== e.target) {
          pV.vx -= fx;
          pV.vy -= fy;
        }
      }

      // 3. Weak centering gravity pull
      const centerX = 360;
      const centerY = 280;
      nodes.forEach((node) => {
        const p = posMap.get(node.id);
        if (p && draggingNodeId !== node.id) {
          p.vx += (centerX - p.x) * 0.003;
          p.vy += (centerY - p.y) * 0.003;

          // Apply velocity damping & position update
          p.vx *= 0.82;
          p.vy *= 0.82;
          p.x += p.vx;
          p.y += p.vy;
        }
      });

      draw();
      animId = requestAnimationFrame(simulate);
    };

    animId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, nodes, edges, draggingNodeId, scale, pan, colorMetric, selectedNodeId, connectSourceId]);

  // Color & Radius helper
  const getNodeVisual = useCallback(
    (node: GraphNode) => {
      let radius = 12;
      let color = '#475569'; // default slate-600
      let strokeColor = '#ffffff';

      if (colorMetric === 'degree') {
        const d = node.degree || 0;
        radius = Math.max(9, Math.min(26, 8 + d * 2.2));
        color = d > 5 ? '#2563eb' : d > 2 ? '#3b82f6' : '#94a3b8';
      } else if (colorMetric === 'betweenness') {
        const b = node.betweenness || 0;
        radius = Math.max(10, Math.min(28, 9 + b * 50));
        // High betweenness is glowing crimson/amber
        color = b > 0.25 ? '#e11d48' : b > 0.08 ? '#f59e0b' : '#64748b';
      } else if (colorMetric === 'closeness') {
        const c = node.closeness || 0;
        radius = Math.max(10, Math.min(24, 8 + c * 25));
        color = c > 0.4 ? '#059669' : '#0284c7';
      } else if (colorMetric === 'pagerank') {
        const pr = node.pagerank || 0;
        radius = Math.max(10, Math.min(26, 8 + pr * 180));
        color = pr > 0.1 ? '#7c3aed' : '#8b5cf6';
      } else if (colorMetric === 'eigenvector') {
        const ev = node.eigenvector || 0;
        radius = Math.max(10, Math.min(26, 8 + ev * 30));
        color = ev > 0.3 ? '#0d9488' : '#64748b';
      } else if (colorMetric === 'community') {
        const commId = node.group ?? 0;
        color = COMMUNITY_PALETTE[commId % COMMUNITY_PALETTE.length];
        radius = 13;
      } else if (colorMetric === 'cascade') {
        if (node.status === 'failed') {
          color = '#ef4444'; // Red
          strokeColor = '#991b1b';
          radius = 11;
        } else if (node.status === 'overloaded') {
          color = '#f59e0b'; // Amber warning
          radius = 15;
        } else {
          color = '#10b981'; // Alive Green
          radius = 12;
        }
      } else if (colorMetric === 'sir') {
        if (node.status === 'infected') {
          color = '#f43f5e'; // Rose Red
          radius = 15;
        } else if (node.status === 'recovered') {
          color = '#10b981'; // Green
          radius = 12;
        } else if (node.status === 'vaccinated') {
          color = '#8b5cf6'; // Purple
          radius = 12;
        } else {
          color = '#38bdf8'; // Susceptible Sky
          radius = 11;
        }
      }

      if (node.id === selectedNodeId) {
        strokeColor = '#facc15'; // yellow highlight
      }

      return { radius, color, strokeColor };
    },
    [colorMetric, selectedNodeId]
  );

  // Render canvas scene
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support High-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const h = height;

    if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
      canvas.width = width * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);

    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    const posMap = posRef.current;

    // 1. Draw Edges
    for (const edge of edges) {
      const pU = posMap.get(edge.source);
      const pV = posMap.get(edge.target);
      if (!pU || !pV) continue;

      const isHighlight =
        edge.source === selectedNodeId || edge.target === selectedNodeId;

      ctx.beginPath();
      ctx.moveTo(pU.x, pU.y);
      ctx.lineTo(pV.x, pV.y);

      ctx.strokeStyle = isHighlight
        ? '#3b82f6'
        : edge.status === 'failed'
        ? '#cbd5e1'
        : '#cbd5e1';
      ctx.lineWidth = isHighlight ? 2.5 : Math.max(1.2, Math.min(4, (edge.weight || 1) * 1.2));
      ctx.setLineDash(edge.status === 'failed' ? [4, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow for directed graphs
      if (isDirected || edge.directed) {
        const angle = Math.atan2(pV.y - pU.y, pV.x - pU.x);
        const targetRadius = 14;
        const arrowX = pV.x - Math.cos(angle) * targetRadius;
        const arrowY = pV.y - Math.sin(angle) * targetRadius;
        const arrowSize = 7;

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.fillStyle = isHighlight ? '#3b82f6' : '#94a3b8';
        ctx.fill();
      }

      // Draw edge weight badge if > 1
      if ((edge.weight || 1) > 1.5) {
        const midX = (pU.x + pV.x) / 2;
        const midY = (pU.y + pV.y) / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${edge.weight}`, midX, midY - 6);
      }
    }

    // 2. Draw Nodes
    for (const node of nodes) {
      const p = posMap.get(node.id);
      if (!p) continue;

      const { radius, color, strokeColor } = getNodeVisual(node);
      const isSelected = node.id === selectedNodeId;
      const isConnectSource = node.id === connectSourceId;

      // Glow halo for selected / hub nodes
      if (isSelected || isConnectSource) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
        ctx.fillStyle = isConnectSource ? 'rgba(59, 130, 246, 0.25)' : 'rgba(250, 204, 21, 0.3)';
        ctx.fill();
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Node Label
      ctx.fillStyle = '#1e293b';
      ctx.font = isSelected ? 'bold 11px system-ui' : '10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Truncate label if too long
      const displayLabel = (node.label || node.id).length > 14
        ? (node.label || node.id).slice(0, 12) + '…'
        : node.label || node.id;
      ctx.fillText(displayLabel, p.x, p.y + radius + 4);
    }

    ctx.restore();
  }, [
    edges,
    nodes,
    pan.x,
    pan.y,
    scale,
    height,
    selectedNodeId,
    connectSourceId,
    isDirected,
    getNodeVisual,
  ]);

  // Handle Canvas Mouse Events
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      x: (clientX - pan.x) / scale,
      y: (clientY - pan.y) / scale,
      screenX: e.clientX,
      screenY: e.clientY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const posMap = posRef.current;

    // Check if clicked a node
    let clickedNode: GraphNode | null = null;
    for (const node of nodes) {
      const p = posMap.get(node.id);
      if (p) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= 22 * 22) {
          clickedNode = node;
          break;
        }
      }
    }

    if (clickedNode) {
      if (interactiveAddEdge) {
        if (!connectSourceId) {
          setConnectSourceId(clickedNode.id);
        } else if (connectSourceId !== clickedNode.id) {
          onAddEdge?.(connectSourceId, clickedNode.id);
          setConnectSourceId(null);
        }
      } else {
        setDraggingNodeId(clickedNode.id);
        onSelectNode?.(clickedNode.id);
      }
    } else {
      if (interactiveAddEdge) {
        setConnectSourceId(null);
      }
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode?.(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const posMap = posRef.current;

    if (draggingNodeId) {
      const p = posMap.get(draggingNodeId);
      if (p) {
        p.x = x;
        p.y = y;
        p.vx = 0;
        p.vy = 0;
      }
      draw();
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      draw();
      return;
    }

    // Hover inspection detection
    let foundHover: GraphNode | null = null;
    for (const node of nodes) {
      const p = posMap.get(node.id);
      if (p) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= 18 * 18) {
          foundHover = node;
          break;
        }
      }
    }
    setHoveredNode(foundHover);
    if (foundHover) {
      setHoverPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((prev) => Math.max(0.3, Math.min(3.0, prev * zoomFactor)));
  };

  const resetViewport = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const reheatSimulation = () => {
    posRef.current.forEach((p) => {
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = (Math.random() - 0.5) * 8;
    });
    setIsSimulating(true);
  };

  return (
    <div className="relative w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setScale((s) => Math.min(2.5, s * 1.2))}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
          title="放大视图"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.4, s / 1.2))}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
          title="缩小视图"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetViewport}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
          title="重置视角"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-200 mx-1" />
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition ${
            isSimulating
              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title="弹簧受力拓扑仿真"
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isSimulating ? '物理力学中' : '已静止'}</span>
        </button>
        <button
          onClick={reheatSimulation}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
          title="扰动重新布局"
        >
          扰动重排
        </button>
      </div>

      {/* Top Right Visual Mode Indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs text-xs text-slate-700">
        <Eye className="w-3.5 h-3.5 text-indigo-600" />
        <span className="font-medium">渲染模式:</span>
        <span className="font-semibold text-indigo-600">
          {colorMetric === 'degree' && '度中心性 (Degree)'}
          {colorMetric === 'betweenness' && '介数中心性 (Betweenness 咽喉)'}
          {colorMetric === 'closeness' && '接近中心性 (Closeness)'}
          {colorMetric === 'pagerank' && 'PageRank 权威度'}
          {colorMetric === 'eigenvector' && '特征向量中心性'}
          {colorMetric === 'community' && 'Louvain 社区色系'}
          {colorMetric === 'cascade' && '级联状态 (正常/超载/失效)'}
          {colorMetric === 'sir' && 'SIR 流行病状态 (S/I/R/V)'}
          {colorMetric === 'default' && '标准拓扑'}
        </span>
      </div>

      {/* Interactive Add Edge prompt */}
      {interactiveAddEdge && (
        <div className="absolute bottom-3 left-3 z-10 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
          <Info className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {connectSourceId
              ? `已选择起点 [${connectSourceId}]，请点击另一个节点完成连边`
              : '连线模式：点击第一个节点作为连边起点'}
          </span>
        </div>
      )}

      {/* Main Canvas Area */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="w-full bg-grid-dots cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Hover Node Card */}
      {hoveredNode && hoverPos && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs w-60 border border-slate-700"
          style={{
            left: `${hoverPos.x + 15}px`,
            top: `${hoverPos.y - 10}px`,
          }}
        >
          <div className="font-semibold text-sm border-b border-slate-700 pb-1 mb-2 text-indigo-300 flex items-center justify-between">
            <span>{hoveredNode.label || hoveredNode.id}</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
              ID: {hoveredNode.id}
            </span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span>度 (Degree):</span>
              <span className="font-mono font-medium text-white">{hoveredNode.degree ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>介数中心性:</span>
              <span className="font-mono font-medium text-rose-400">
                {(hoveredNode.betweenness ?? 0).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>接近中心性:</span>
              <span className="font-mono font-medium text-emerald-400">
                {(hoveredNode.closeness ?? 0).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>PageRank:</span>
              <span className="font-mono font-medium text-violet-400">
                {(hoveredNode.pagerank ?? 0).toFixed(4)}
              </span>
            </div>
            {hoveredNode.group !== undefined && (
              <div className="flex justify-between">
                <span>所属社区 (Louvain):</span>
                <span className="font-mono font-semibold text-amber-300">
                  Cluster-{hoveredNode.group}
                </span>
              </div>
            )}
            {hoveredNode.load !== undefined && (
              <div className="flex justify-between border-t border-slate-800 pt-1 mt-1">
                <span>负荷 / 容量:</span>
                <span className="font-mono font-medium text-yellow-300">
                  {hoveredNode.load} / {hoveredNode.capacity}
                </span>
              </div>
            )}
            {hoveredNode.status && (
              <div className="flex justify-between">
                <span>动力学状态:</span>
                <span className="font-mono uppercase font-semibold text-sky-400">
                  {hoveredNode.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
