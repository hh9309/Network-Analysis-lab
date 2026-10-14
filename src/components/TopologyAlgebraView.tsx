import React, { useState, useMemo } from 'react';
import { GraphNode, GraphEdge } from '../types/network';
import {
  buildAdjacencyMatrix,
  buildDegreeMatrix,
  buildLaplacianMatrix,
  buildNormalizedLaplacian,
  jacobiEigenvalues,
  computeAlgebraicConnectivity,
  computeSpectralRadius,
} from '../utils/matrixMath';
import { Layers, Activity, Binary, HelpCircle, Sparkles } from 'lucide-react';

interface TopologyAlgebraViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isDirected: boolean;
}

export const TopologyAlgebraView: React.FC<TopologyAlgebraViewProps> = ({
  nodes,
  edges,
  isDirected,
}) => {
  const [activeMatrixTab, setActiveMatrixTab] = useState<'A' | 'L' | 'L_norm' | 'D'>('A');
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number; val: number } | null>(null);

  // Compute matrices
  const A = useMemo(() => buildAdjacencyMatrix(nodes, edges, isDirected), [nodes, edges, isDirected]);
  const D = useMemo(() => buildDegreeMatrix(A), [A]);
  const L = useMemo(() => buildLaplacianMatrix(A), [A]);
  const L_norm = useMemo(() => buildNormalizedLaplacian(A), [A]);

  const activeMatrix = useMemo(() => {
    switch (activeMatrixTab) {
      case 'A':
        return A;
      case 'D':
        return D;
      case 'L':
        return L;
      case 'L_norm':
        return L_norm;
    }
  }, [activeMatrixTab, A, D, L, L_norm]);

  // Spectral calculations
  const { lambda2, fiedlerVector, allEigenvalues } = useMemo(
    () => computeAlgebraicConnectivity(L),
    [L]
  );
  const spectralRadius = useMemo(() => computeSpectralRadius(A), [A]);
  const epidemicThreshold = spectralRadius > 0 ? 1 / spectralRadius : 0;

  // Max value in matrix for heatmap intensity
  const maxAbsVal = useMemo(() => {
    let maxV = 1;
    for (const row of activeMatrix) {
      for (const val of row) {
        if (Math.abs(val) > maxV) maxV = Math.abs(val);
      }
    }
    return maxV;
  }, [activeMatrix]);

  const n = nodes.length;

  return (
    <div className="space-y-6">
      {/* Top Spectral Indicators Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>代数连通度 (Fiedler 值)</span>
            <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">λ₂</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {lambda2.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lambda2 > 0.05
              ? '全网连通且具良好韧性，难以轻易被单刀割裂'
              : lambda2 > 0
              ? '弱连通瓶颈！存在极度狭窄的二分割断桥'
              : '非连通图（存在独立割裂孤立子图）'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>邻接矩阵谱半径</span>
            <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">ρ(A) = λₘₐₓ</span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600">
            {spectralRadius.toFixed(3)}
          </div>
          <div className="text-11px text-slate-500 mt-1">
            决定全网信息与病毒爆发增长速率的主特征根
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>流行病/舆情爆发临界阈值</span>
            <span className="font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">τc = 1/ρ(A)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {epidemicThreshold.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            传染率 β/γ 超过此值时，疫情将在全网形成持续暴发
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>拉普拉斯零特征值重数</span>
            <span className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">dim(Ker L)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {allEigenvalues.filter((v) => v < 1e-5).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            等于网络中相互完全孤立的独立连通分量总数
          </div>
        </div>
      </div>

      {/* Main Matrix Tabs & Heatmap Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Binary className="w-5 h-5 text-indigo-600" />
              <span>拓扑代数矩阵演化工作台</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              直观查看当前图的邻接、度及拉普拉斯矩阵形式，支持交互式热力探针
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveMatrixTab('A')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeMatrixTab === 'A'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              邻接矩阵 A
            </button>
            <button
              onClick={() => setActiveMatrixTab('L')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeMatrixTab === 'L'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              拉普拉斯矩阵 L
            </button>
            <button
              onClick={() => setActiveMatrixTab('L_norm')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeMatrixTab === 'L_norm'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              归一化拉普拉斯 ℒ
            </button>
            <button
              onClick={() => setActiveMatrixTab('D')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeMatrixTab === 'D'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              度矩阵 D
            </button>
          </div>
        </div>

        {/* Matrix Formula Explanatory Header */}
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 mb-4 flex items-start gap-2 border border-slate-200/60">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            {activeMatrixTab === 'A' && (
              <span>
                <strong>邻接矩阵 A:</strong> 若节点 i 与 j 存在连边则 $A_{`{ij}`} = w_{`{ij}`}$，无连边则为 0。在无向网络中 A 对称，其主特征值 $\rho(A)$ 表征全网动态连通能力。
              </span>
            )}
            {activeMatrixTab === 'L' && (
              <span>
                <strong>未归一化拉普拉斯矩阵 L = D - A:</strong> 主对角元为节点度数 $L_{`{ii}`} = k_i$，非对角元为负连边权 $-A_{`{ij}`}$。其行和恒为 0，最小特征值 $\lambda_1 = 0$ 对应常数特征向量 $\mathbf{1}$。
              </span>
            )}
            {activeMatrixTab === 'L_norm' && (
              <span>
                <strong>对称归一化拉普拉斯 ℒ = D^(-1/2) L D^(-1/2):</strong> 消除了各节点度数量纲差异，所有特征值严格落入区间 $[0, 2]$，常用于谱聚类 (Spectral Clustering) 与图神经网络。
              </span>
            )}
            {activeMatrixTab === 'D' && (
              <span>
                <strong>度对角矩阵 D = diag(k_1, k_2, ..., k_n):</strong> 对角线元素为各个节点的出入度或连通度总和，其余元素全为 0。
              </span>
            )}
          </div>
        </div>

        {/* Interactive Matrix Grid */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
          <div className="inline-block min-w-full align-middle">
            <table className="border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  <th className="p-2 text-slate-500 font-semibold sticky left-0 bg-slate-100 z-10">#</th>
                  {nodes.map((node, c) => (
                    <th
                      key={node.id}
                      className={`p-2 text-slate-700 whitespace-nowrap min-w-[36px] text-center ${
                        hoveredCell?.c === c ? 'bg-indigo-100 text-indigo-900 font-bold' : ''
                      }`}
                    >
                      {node.label || node.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeMatrix.map((row, r) => (
                  <tr key={nodes[r]?.id || r} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td
                      className={`p-2 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 z-10 whitespace-nowrap ${
                        hoveredCell?.r === r ? 'bg-indigo-100 text-indigo-900' : ''
                      }`}
                    >
                      {nodes[r]?.label || nodes[r]?.id || r}
                    </td>
                    {row.map((val, c) => {
                      const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
                      const intensity = Math.min(1, Math.abs(val) / (maxAbsVal || 1));
                      let bgStyle = 'transparent';
                      let textColor = val === 0 ? 'text-slate-300' : 'text-slate-800';

                      if (val > 0) {
                        bgStyle = `rgba(59, 130, 246, ${0.1 + intensity * 0.5})`;
                        textColor = intensity > 0.5 ? 'text-blue-950 font-semibold' : 'text-blue-800';
                      } else if (val < 0) {
                        bgStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`;
                        textColor = intensity > 0.5 ? 'text-rose-950 font-semibold' : 'text-rose-800';
                      }

                      return (
                        <td
                          key={c}
                          onMouseEnter={() => setHoveredCell({ r, c, val })}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{ backgroundColor: isHovered ? '#fef08a' : bgStyle }}
                          className={`p-1.5 text-center min-w-[36px] cursor-pointer transition-colors ${textColor} ${
                            isHovered ? 'ring-2 ring-amber-400 font-bold z-20' : ''
                          }`}
                        >
                          {Number.isInteger(val) ? val : val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hover Coordinate Prompt */}
        <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
          <div>
            {hoveredCell ? (
              <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                坐标 [{nodes[hoveredCell.r]?.label || hoveredCell.r}, {nodes[hoveredCell.c]?.label || hoveredCell.c}]: 值 = {hoveredCell.val}
              </span>
            ) : (
              <span>将鼠标悬浮在矩阵单元格上可查看详细连接权值</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-200 inline-block rounded-xs" /> 正权值/度
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-rose-200 inline-block rounded-xs" /> 负权值 (Laplacian)
            </span>
          </div>
        </div>
      </div>

      {/* Laplacian Spectrum Plot & Fiedler Bipartition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eigenvalue Spectrum */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>拉普拉斯特征值阶梯谱 (Laplacian Spectrum)</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">0 = λ₁ ≤ λ₂ ≤ ... ≤ λₙ</span>
          </div>

          <div className="h-44 w-full flex items-end gap-1.5 pt-6 pb-2 px-2 bg-slate-50 rounded-lg border border-slate-200/60 overflow-x-auto">
            {allEigenvalues.map((ev, idx) => {
              const maxEigen = allEigenvalues[allEigenvalues.length - 1] || 1;
              const barHeightPct = Math.max(4, (ev / (maxEigen || 1)) * 100);
              const isFiedler = idx === 1;

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                    λ{idx + 1} = {ev.toFixed(3)}
                  </div>
                  <div
                    style={{ height: `${barHeightPct}%` }}
                    className={`w-full rounded-t-xs transition-all ${
                      isFiedler
                        ? 'bg-rose-500 group-hover:bg-rose-600 ring-2 ring-rose-300'
                        : 'bg-indigo-400 group-hover:bg-indigo-500'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 font-mono mt-1">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            红色高亮柱为 <strong className="text-rose-600 font-mono">λ₂ (Fiedler 代数连通度)</strong>。若 λ₂ 极小且与 λ₃ 之间存在显著谱间隙 (Spectral Gap)，意味着该网络天然存在极易割裂的双子社区。
          </p>
        </div>

        {/* Fiedler Vector Bipartition Analysis */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Fiedler 特征向量与谱二分割 (Spectral Bipartitioning)</span>
            </h4>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">
              v₂ 符号划分
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {nodes.map((node, i) => {
              const val = fiedlerVector[i] ?? 0;
              const isPositive = val >= 0;
              return (
                <div
                  key={node.id}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-slate-50 border border-slate-200/40"
                >
                  <span className="font-medium text-slate-700">{node.label || node.id}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={isPositive ? 'text-blue-600' : 'text-amber-600'}>
                      {val.toFixed(4)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isPositive
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPositive ? '子集 A (+)' : '子集 B (-)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-2">
            根据谱图论 Cheeger 不等式，依据 Fiedler 向量 $v_2$ 的正负号将节点分为两组，可得到逼近最小割 (Min-Cut) 的最优网络瓶颈断开方案。
          </p>
        </div>
      </div>

      {/* Global Network Macro Metrics & Spectral Algebra Formulas Reference Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Binary className="w-4 h-4 text-indigo-600" />
              <span>网络全局拓扑与谱图代数指标计算公式速查表</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              系统宏观动力学、代数连通度、渗流相变与聚类结构形式化定义
            </p>
          </div>
          <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">
            LaTeX 形式化代数推导
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Item 1: 邻接矩阵与度矩阵 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>① 邻接矩阵与度矩阵</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">A, D</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>A = [ A<sub>ij</sub> ] (连边权值或 0/1)</div>
              <div>D = diag(k<sub>1</sub>, k<sub>2</sub>, ..., k<sub>N</sub>), 其中 k<sub>i</sub> = Σ<sub>j</sub> A<sub>ij</sub></div>
            </div>
            <p className="text-[11px] text-slate-600">
              无向图 A 为对称阵 (A = A<sup>T</sup>)，主对角线全 0（无自环）；有向图行和为出度，列和为入度。
            </p>
          </div>

          {/* Item 2: 未归一化拉普拉斯算子 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>② 图拉普拉斯算子 (Graph Laplacian)</span>
              <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">L = D - A</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>L<sub>ij</sub> = k<sub>i</sub> (当 i = j)</div>
              <div>L<sub>ij</sub> = -A<sub>ij</sub> (当 i ≠ j)</div>
            </div>
            <p className="text-[11px] text-slate-600">
              L 为半正定实对称矩阵，行和与列和恒等于 0，恒有最小特征值 λ<sub>1</sub> = 0，对应全 1 恒等特征向量。
            </p>
          </div>

          {/* Item 3: 归一化拉普拉斯 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>③ 对称归一化拉普拉斯</span>
              <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">ℒ_sym</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>ℒ = D<sup>-1/2</sup> L D<sup>-1/2</sup> = I - D<sup>-1/2</sup> A D<sup>-1/2</sup></div>
              <div className="text-[10px] text-slate-500">ℒ<sub>ij</sub> = 1 (i=j), -A<sub>ij</sub> / √(k<sub>i</sub> k<sub>j</sub>) (i≠j)</div>
            </div>
            <p className="text-[11px] text-slate-600">
              消除节点度量纲影响，其所有谱特征值严格限制在区间 [0, 2] 内，谱聚类与 GCN 图卷积神经网络通用。
            </p>
          </div>

          {/* Item 4: 代数连通度 (Fiedler值) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>④ 代数连通度 (Fiedler Value)</span>
              <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">λ₂(L)</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>λ₂(L) = min<sub>x ⊥ 1, x ≠ 0</sub> [ (x<sup>T</sup> L x) / (x<sup>T</sup> x) ]</div>
              <div className="text-[10px] text-slate-500">Cheeger 不等式: h(G)² / 2 ≤ λ₂ ≤ 2 h(G)</div>
            </div>
            <p className="text-[11px] text-slate-600">
              λ₂ &gt; 0 当且仅当网络连通。λ₂ 越大网络越难被断开；其对应特征向量 v₂ 符号划分直接给出谱二分割割集。
            </p>
          </div>

          {/* Item 5: 谱半径与流行病传播阈值 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>⑤ 谱半径与动态传播临界阈值</span>
              <span className="font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">ρ(A), τ_c</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>谱半径: ρ(A) = max<sub>i</sub> |λ<sub>i</sub>(A)|</div>
              <div>流行病临界阈值: τ<sub>c</sub> = 1 / ρ(A)</div>
            </div>
            <p className="text-[11px] text-slate-600">
              当信息传导率与衰减率比值 β/γ &gt; τ<sub>c</sub> 时，流行病或谣言将自发扩散爆发；反之扰动迅速熄灭。
            </p>
          </div>

          {/* Item 6: 异质度与渗流崩溃阈值 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>⑥ 度异质度与渗流崩溃相变</span>
              <span className="font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">κ, f_c</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1">
              <div>度异质度: κ = ⟨k²⟩ / ⟨k⟩ = [ Σ k<sub>i</sub>² ] / [ Σ k<sub>i</sub> ]</div>
              <div>随机失效崩溃点: f<sub>c</sub><sup>rand</sup> = 1 - 1 / (κ - 1)</div>
            </div>
            <p className="text-[11px] text-slate-600">
              无标度网络中 κ 极大（κ → ∞ 时 f<sub>c</sub> → 1），因此对随机故障几无影响；但对蓄意攻击关键 Hub 则 f<sub>c</sub> 极低。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
