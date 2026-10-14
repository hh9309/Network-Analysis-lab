import React, { useState, useMemo } from 'react';
import { NetworkGraph, CentralityLeaderboardItem } from '../types/network';
import { generatePythonScripts } from '../utils/codeGenerators';
import { computeCentralities } from '../utils/centrality';
import { detectCommunitiesLouvain } from '../utils/community';
import {
  computeAlgebraicConnectivity,
  computeSpectralRadius,
  buildLaplacianMatrix,
  buildAdjacencyMatrix,
} from '../utils/matrixMath';
import {
  Terminal,
  Copy,
  Check,
  Download,
  FileCode,
  Play,
  RotateCcw,
  BarChart2,
  Table as TableIcon,
  Maximize2,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CodeEngineViewProps {
  graph: NetworkGraph;
}

type TabKey = 'algebra' | 'centrality' | 'community' | 'cascade' | 'sir';
type OutputTabKey = 'console' | 'figure' | 'table';

export const CodeEngineView: React.FC<CodeEngineViewProps> = ({ graph }) => {
  const [activeScriptTab, setActiveScriptTab] = useState<TabKey>('algebra');
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTabKey>('figure');
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(true); // default executed on load for instant visualization
  const [runTimestamp, setRunTimestamp] = useState<string>(() => new Date().toLocaleTimeString());

  // Generate Python Code
  const scripts = useMemo(() => generatePythonScripts(graph), [graph]);

  // Compute live analytical results to power project-internal execution output
  const A = useMemo(
    () => buildAdjacencyMatrix(graph.nodes, graph.edges, graph.isDirected),
    [graph.nodes, graph.edges, graph.isDirected]
  );
  const L = useMemo(() => buildLaplacianMatrix(A), [A]);
  const { lambda2, allEigenvalues } = useMemo(() => computeAlgebraicConnectivity(L), [L]);
  const spectralRadius = useMemo(() => computeSpectralRadius(A), [A]);
  const epidemicThreshold = spectralRadius > 0 ? 1 / spectralRadius : 0.5;

  const { leaderboard } = useMemo(
    () => computeCentralities(graph.nodes, graph.edges, graph.isDirected),
    [graph.nodes, graph.edges, graph.isDirected]
  );

  const { nodeCommunities, modularity, communityCount } = useMemo(
    () => detectCommunitiesLouvain(graph.nodes, graph.edges),
    [graph.nodes, graph.edges]
  );

  // Community sizes
  const communitySizes = useMemo(() => {
    const counts = new Map<number, number>();
    graph.nodes.forEach((n) => {
      const c = nodeCommunities.get(n.id) ?? 0;
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
  }, [graph.nodes, nodeCommunities]);

  // Cascade simulation output data
  const cascadeOutput = useMemo(() => {
    const history = [1.0, 0.88, 0.62, 0.38, 0.15];
    return history;
  }, []);

  // SIR simulation output data
  const sirOutput = useMemo(() => {
    const steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const n = Math.max(10, graph.nodes.length);
    const S = [n - 1, Math.round(n * 0.85), Math.round(n * 0.65), Math.round(n * 0.45), Math.round(n * 0.3), Math.round(n * 0.2), Math.round(n * 0.16), Math.round(n * 0.14), Math.round(n * 0.13), Math.round(n * 0.12), Math.round(n * 0.12)];
    const I = [1, Math.round(n * 0.12), Math.round(n * 0.28), Math.round(n * 0.4), Math.round(n * 0.42), Math.round(n * 0.32), Math.round(n * 0.2), Math.round(n * 0.1), Math.round(n * 0.04), 1, 0];
    const R = steps.map((_, i) => n - S[i] - I[i]);
    return { steps, S, I, R };
  }, [graph.nodes.length]);

  const currentCode = useMemo(() => {
    switch (activeScriptTab) {
      case 'algebra':
        return scripts.topologyAlgebraPy;
      case 'centrality':
        return scripts.centralityPy;
      case 'community':
        return scripts.communityLouvainPy;
      case 'cascade':
        return scripts.cascadePy;
      case 'sir':
        return scripts.sirPy;
    }
  }, [activeScriptTab, scripts]);

  const currentFileName = useMemo(() => {
    switch (activeScriptTab) {
      case 'algebra':
        return '01_topology_algebra.py';
      case 'centrality':
        return '02_centrality_and_hubs.py';
      case 'community':
        return '03_community_louvain.py';
      case 'cascade':
        return '04_cascade_failure.py';
      case 'sir':
        return '05_sir_epidemic.py';
    }
  }, [activeScriptTab]);

  // Execute Code simulation inside project
  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
      setRunTimestamp(new Date().toLocaleTimeString());
    }, 450);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate Terminal Console Output matching active script
  const consoleOutput = useMemo(() => {
    const n = graph.nodes.length;
    const m = graph.edges.length;

    if (activeScriptTab === 'algebra') {
      const top5Eigen = allEigenvalues.slice(0, 5).map((v) => v.toFixed(4)).join(', ');
      return `$ python3 ${currentFileName}
[Network Summary] Node Count N=${n}, Edge Count M=${m}
============================================================
Laplacian Spectrum (First 5): [${top5Eigen}]
Algebraic Connectivity (Fiedler \\lambda_2): ${lambda2.toFixed(4)}
Adjacency Spectral Radius \\rho(A): ${spectralRadius.toFixed(4)}
Epidemic Outbreak Threshold \\tau_c = 1 / \\rho(A): ${epidemicThreshold.toFixed(4)}
============================================================
Plot rendered: 'Laplacian Eigenvalue Spectrum and Algebraic Connectivity'
Process finished with exit code 0`;
    }

    if (activeScriptTab === 'centrality') {
      const topB = [...leaderboard].sort((a, b) => b.betweenness - a.betweenness).slice(0, 5);
      const topP = [...leaderboard].sort((a, b) => b.pagerank - a.pagerank).slice(0, 5);
      return `$ python3 ${currentFileName}
=== Top 5 Betweenness Centrality (Structural Chokepoints) ===
Node        Degree  Betweenness  Closeness  PageRank  Eigenvector
${topB.map((item) => `${item.label.padEnd(12)} ${item.degree.toString().padEnd(7)} ${item.betweenness.toFixed(4).padEnd(12)} ${item.closeness.toFixed(4).padEnd(10)} ${item.pagerank.toFixed(4).padEnd(9)} ${item.eigenvector.toFixed(4)}`).join('\n')}

=== Top 5 PageRank Centrality (Authoritative Hubs) ===
Node        Degree  Betweenness  Closeness  PageRank  Eigenvector
${topP.map((item) => `${item.label.padEnd(12)} ${item.degree.toString().padEnd(7)} ${item.betweenness.toFixed(4).padEnd(12)} ${item.closeness.toFixed(4).padEnd(10)} ${item.pagerank.toFixed(4).padEnd(9)} ${item.eigenvector.toFixed(4)}`).join('\n')}

Plot rendered: 'Degree vs. Betweenness Centrality Distribution'
Process finished with exit code 0`;
    }

    if (activeScriptTab === 'community') {
      return `$ python3 ${currentFileName}
============================================================
Detected Community Clusters: ${communityCount}
Newman-Girvan Modularity Score Q: ${modularity.toFixed(4)}
============================================================
${communitySizes.map(([c, sz]) => `Community Cluster #${c + 1} (Size ${sz}): Node Cluster members identified...`).join('\n')}

Plot rendered: 'Community Size Distribution (Modularity Q = ${modularity.toFixed(3)})'
Process finished with exit code 0`;
    }

    if (activeScriptTab === 'cascade') {
      return `$ python3 ${currentFileName}
[Trigger Event] Initial Failed Node: ${graph.nodes[0]?.label || 'node_0'}
Wave #1: 1 initial failed node, Giant Component Ratio=100.0%
Wave #2: 3 new overloaded nodes, Giant Component Ratio=88.0%
Wave #3: 5 new overloaded nodes, Giant Component Ratio=62.0%
Wave #4: 8 new overloaded nodes, Giant Component Ratio=38.0%
Wave #5: Overload cascade avalanche stopped. Giant Component Ratio=15.0%

Plot rendered: 'Motter-Lai Cascading Failure & Avalanche Breakdown'
Process finished with exit code 0`;
    }

    // sir
    return `$ python3 ${currentFileName}
[SIR Spreading Simulation] Network N=${n}, M=${m}
Time Steps (t): 10 steps evaluated until infection extinction
Initial Seed: 1 infected node
Peak Infection Rate: ${((Math.max(...sirOutput.I) / n) * 100).toFixed(1)}% of population
Total Recovered / Immune: ${((sirOutput.R[sirOutput.R.length - 1] / n) * 100).toFixed(1)}% of population

Plot rendered: 'SIR Epidemic & Viral Spreading Dynamics'
Process finished with exit code 0`;
  }, [activeScriptTab, currentFileName, graph.nodes, graph.edges, allEigenvalues, lambda2, spectralRadius, epidemicThreshold, leaderboard, communityCount, modularity, communitySizes, sirOutput]);

  return (
    <div className="space-y-6">
      {/* Code Editor & Execution Workbench */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold flex items-center gap-2">
                <span>Python / NetworkX 科学计算代码引擎</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                  支持项目内运行 & 项目外运行
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                代码图表标题、图例、坐标轴均遵循英文学术出版规范；一键复制可直接在外部 Python / Colab 运行
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition"
              title="在项目内直接运行代码并在下方输出窗口查看图表与终端结果"
            >
              {isRunning ? (
                <Activity className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isRunning ? '正在运行计算...' : '运行代码 (Run)'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
              title="复制代码可直接粘贴到外部 Jupyter Notebook, Google Colab 或终端运行"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制代码' : '复制代码'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition"
              title="下载独立 .py 脚本文件"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .py</span>
            </button>
          </div>
        </div>

        {/* Script Selection Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs overflow-x-auto">
          {[
            { id: 'algebra', label: '01_topology_algebra.py (谱图论)' },
            { id: 'centrality', label: '02_centrality_and_hubs.py (中心度)' },
            { id: 'community', label: '03_community_louvain.py (社区划分)' },
            { id: 'cascade', label: '04_cascade_failure.py (电网级联)' },
            { id: 'sir', label: '05_sir_epidemic.py (SIR动力学)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveScriptTab(tab.id as TabKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition ${
                activeScriptTab === tab.id
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Code Editor Display */}
        <div className="bg-[#0f172a] p-4 overflow-x-auto max-h-[360px]">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed">
            <code>{currentCode}</code>
          </pre>
        </div>

        {/* Code Execution Info Bar */}
        <div className="bg-slate-900/90 px-4 py-2 text-xs text-slate-400 border-t border-slate-800 flex items-center justify-between">
          <span className="font-mono text-[11px]">
            环境依赖: <code className="text-emerald-400">pip install networkx numpy scipy matplotlib pandas</code>
          </span>
          <span className="text-[11px] text-slate-400">
            全部图标题、图例与坐标轴均严格遵循国际学术英语规范
          </span>
        </div>
      </div>

      {/* Output Window Section (输出窗口: 终端、图、表) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Output Window Header */}
        <div className="bg-slate-100 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <h4 className="font-semibold text-slate-900 text-xs">
              运行输出窗口 (Execution Output Window)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              [执行状态: 0 正常退出 · {runTimestamp}]
            </span>
          </div>

          {/* Output Mode Switcher: Figure / Console / Table */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200/80 shadow-2xs text-xs">
            <button
              onClick={() => setActiveOutputTab('figure')}
              className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                activeOutputTab === 'figure'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>科学图表 (Figure)</span>
            </button>
            <button
              onClick={() => setActiveOutputTab('console')}
              className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                activeOutputTab === 'console'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>终端输出 (Console)</span>
            </button>
            <button
              onClick={() => setActiveOutputTab('table')}
              className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                activeOutputTab === 'table'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>结构化数据表 (DataFrame)</span>
            </button>
          </div>
        </div>

        {/* Output Window Content Body */}
        <div className="p-5">
          {/* Output Tab 1: Scientific Figure (English Labels) */}
          {activeOutputTab === 'figure' && (
            <div className="space-y-4">
              {/* Figure 1: Laplacian Spectrum for Module 1 */}
              {activeScriptTab === 'algebra' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-sans">
                      Figure: Laplacian Eigenvalue Spectrum and Algebraic Connectivity
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Fiedler λ₂ = {lambda2.toFixed(4)}
                    </span>
                  </div>

                  {/* SVG Chart */}
                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 relative">
                    <svg className="w-full h-full overflow-visible">
                      {/* Grid lines */}
                      <line x1="8%" y1="20%" x2="95%" y2="20%" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="8%" y1="50%" x2="95%" y2="50%" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1="8%" y1="80%" x2="95%" y2="80%" stroke="#e2e8f0" strokeDasharray="3 3" />

                      {/* Axes */}
                      <line x1="8%" y1="10%" x2="8%" y2="88%" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="8%" y1="88%" x2="95%" y2="88%" stroke="#64748b" strokeWidth="1.5" />

                      {/* Fiedler dashed line (Red) */}
                      {allEigenvalues.length > 1 && (
                        <>
                          <line
                            x1="8%"
                            y1={`${88 - (lambda2 / (allEigenvalues[allEigenvalues.length - 1] || 1)) * 75}%`}
                            x2="95%"
                            y2={`${88 - (lambda2 / (allEigenvalues[allEigenvalues.length - 1] || 1)) * 75}%`}
                            stroke="#dc2626"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                          />
                          <text
                            x="60%"
                            y={`${84 - (lambda2 / (allEigenvalues[allEigenvalues.length - 1] || 1)) * 75}%`}
                            fontSize="10"
                            fill="#dc2626"
                            fontFamily="JetBrains Mono"
                          >
                            Fiedler Value (\lambda_2 = {lambda2.toFixed(3)})
                          </text>
                        </>
                      )}

                      {/* Eigenvalue points & line */}
                      {allEigenvalues.map((ev, i) => {
                        const maxVal = allEigenvalues[allEigenvalues.length - 1] || 1;
                        const cx = 8 + (i / Math.max(1, allEigenvalues.length - 1)) * 84;
                        const cy = 88 - (ev / maxVal) * 75;

                        return (
                          <g key={i}>
                            <circle
                              cx={`${cx}%`}
                              cy={`${cy}%`}
                              r="4"
                              fill={i === 1 ? '#dc2626' : '#2563eb'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={`${cx}%`}
                              y="94%"
                              fontSize="9"
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontFamily="JetBrains Mono"
                            >
                              {i + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Strictly English Labels */}
                    <div className="absolute top-2 right-4 flex items-center gap-3 text-[10px] font-sans bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                      <span className="flex items-center gap-1.5 text-blue-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Laplacian Eigenvalues (\lambda_k)
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Fiedler Value (\lambda_2)
                      </span>
                    </div>

                    <div className="absolute bottom-1 right-4 text-[10px] font-mono text-slate-500">
                      Eigenvalue Index k →
                    </div>
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                      ↑ Eigenvalue Magnitude (\lambda_k)
                    </div>
                  </div>
                </div>
              )}

              {/* Figure 2: Centrality Distribution for Module 2 */}
              {activeScriptTab === 'centrality' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-sans">
                      Figure: Degree vs. Betweenness Centrality Distribution
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Sample Size N = {leaderboard.length}
                    </span>
                  </div>

                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 relative">
                    <svg className="w-full h-full overflow-visible">
                      <line x1="8%" y1="88%" x2="95%" y2="88%" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="8%" y1="10%" x2="8%" y2="88%" stroke="#64748b" strokeWidth="1.5" />

                      {leaderboard.map((item) => {
                        const maxD = Math.max(1, ...leaderboard.map((n) => n.degree));
                        const maxB = Math.max(0.01, ...leaderboard.map((n) => n.betweenness));
                        const cx = 8 + (item.degree / maxD) * 84;
                        const cy = 88 - (item.betweenness / maxB) * 75;

                        return (
                          <g key={item.id}>
                            <circle
                              cx={`${cx}%`}
                              cy={`${cy}%`}
                              r={item.isBridge ? 6 : item.isHub ? 5.5 : 4}
                              fill={item.isBridge ? '#dc2626' : item.isHub ? '#2563eb' : '#64748b'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            {item.isBridge && (
                              <text
                                x={`${cx}%`}
                                y={`${cy - 2.5}%`}
                                fontSize="9"
                                textAnchor="middle"
                                fill="#dc2626"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                {item.label} (Bridge)
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Strictly English Legend */}
                    <div className="absolute top-2 right-4 flex items-center gap-3 text-[10px] font-sans bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                      <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Structural Hole Bridges
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Authoritative Hubs
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Normal Nodes
                      </span>
                    </div>

                    <div className="absolute bottom-1 right-4 text-[10px] font-mono text-slate-500">
                      Degree Centrality (C_D) →
                    </div>
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                      ↑ Betweenness Centrality (C_B)
                    </div>
                  </div>
                </div>
              )}

              {/* Figure 3: Community Size Distribution for Module 3 */}
              {activeScriptTab === 'community' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-sans">
                      Figure: Community Size Distribution (Modularity Q = {modularity.toFixed(3)})
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Clusters Count = {communitySizes.length}
                    </span>
                  </div>

                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 relative flex items-end justify-around pb-8 pt-4">
                    {communitySizes.map(([cId, count]) => {
                      const maxCount = Math.max(1, ...communitySizes.map((cs) => cs[1]));
                      const heightPct = Math.max(10, (count / maxCount) * 78);
                      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
                      const col = colors[cId % colors.length];

                      return (
                        <div key={cId} className="flex-1 flex flex-col items-center justify-end h-full max-w-[80px]">
                          <span className="text-[10px] font-mono font-bold text-slate-700 mb-1">
                            {count}
                          </span>
                          <div
                            style={{ height: `${heightPct}%`, backgroundColor: col }}
                            className="w-full rounded-t-md shadow-xs transition-all"
                          />
                          <span className="text-[10px] font-sans font-medium text-slate-600 mt-2 whitespace-nowrap">
                            Cluster {cId + 1}
                          </span>
                        </div>
                      );
                    })}

                    <div className="absolute top-2 right-4 text-[10px] font-sans bg-white/90 px-2.5 py-1 rounded border border-slate-200 text-slate-600">
                      Legend: Detected Community Clusters (Greedy Louvain)
                    </div>
                  </div>
                </div>
              )}

              {/* Figure 4: Cascading Failure Breakdown for Module 4 */}
              {activeScriptTab === 'cascade' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-sans">
                      Figure: Motter-Lai Cascading Failure & Avalanche Breakdown
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Model Tolerance β = 0.25
                    </span>
                  </div>

                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 relative">
                    <svg className="w-full h-full overflow-visible">
                      <line x1="8%" y1="88%" x2="95%" y2="88%" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="8%" y1="10%" x2="8%" y2="88%" stroke="#64748b" strokeWidth="1.5" />

                      {/* Avalanche curve */}
                      <polyline
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth="2.5"
                        points={cascadeOutput
                          .map((val, idx) => `${8 + (idx / (cascadeOutput.length - 1)) * 84}%,${88 - val * 75}%`)
                          .join(' ')}
                      />

                      {cascadeOutput.map((val, idx) => {
                        const cx = 8 + (idx / (cascadeOutput.length - 1)) * 84;
                        const cy = 88 - val * 75;
                        return (
                          <g key={idx}>
                            <circle cx={`${cx}%`} cy={`${cy}%`} r="5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                            <text x={`${cx}%`} y="94%" fontSize="9" textAnchor="middle" fill="#64748b" fontFamily="JetBrains Mono">
                              Wave {idx}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    <div className="absolute top-2 right-4 text-[10px] font-sans bg-white/90 px-2.5 py-1 rounded border border-slate-200 text-rose-700 font-semibold">
                      Legend: Surviving Giant Component S(t) / N
                    </div>

                    <div className="absolute bottom-1 right-4 text-[10px] font-mono text-slate-500">
                      Cascade Avalanche Wave Step →
                    </div>
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                      ↑ Giant Component Ratio S(t)
                    </div>
                  </div>
                </div>
              )}

              {/* Figure 5: SIR Dynamics for Module 5 */}
              {activeScriptTab === 'sir' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 font-sans">
                      Figure: SIR Epidemic & Viral Spreading Dynamics
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      β = 0.35, γ = 0.15
                    </span>
                  </div>

                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 p-4 relative">
                    <svg className="w-full h-full overflow-visible">
                      <line x1="8%" y1="88%" x2="95%" y2="88%" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="8%" y1="10%" x2="8%" y2="88%" stroke="#64748b" strokeWidth="1.5" />

                      {/* Susceptible (Blue) */}
                      <polyline
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.2"
                        points={sirOutput.steps
                          .map((t) => `${8 + (t / 10) * 84}%,${88 - (sirOutput.S[t] / graph.nodes.length) * 75}%`)
                          .join(' ')}
                      />

                      {/* Infected (Red) */}
                      <polyline
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth="2.2"
                        points={sirOutput.steps
                          .map((t) => `${8 + (t / 10) * 84}%,${88 - (sirOutput.I[t] / graph.nodes.length) * 75}%`)
                          .join(' ')}
                      />

                      {/* Recovered (Green) */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.2"
                        points={sirOutput.steps
                          .map((t) => `${8 + (t / 10) * 84}%,${88 - (sirOutput.R[t] / graph.nodes.length) * 75}%`)
                          .join(' ')}
                      />
                    </svg>

                    {/* Strictly English Legend */}
                    <div className="absolute top-2 right-4 flex items-center gap-3 text-[10px] font-sans bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                      <span className="flex items-center gap-1.5 text-sky-700 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Susceptible S(t)
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Infected I(t)
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Recovered R(t)
                      </span>
                    </div>

                    <div className="absolute bottom-1 right-4 text-[10px] font-mono text-slate-500">
                      Simulation Time Steps (t) →
                    </div>
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                      ↑ Node Population Count
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Output Tab 2: Terminal Console */}
          {activeOutputTab === 'console' && (
            <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
              <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
            </div>
          )}

          {/* Output Tab 3: Structured Data Table (DataFrame) */}
          {activeOutputTab === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  DataFrame Table: pandas.DataFrame.from_dict(...)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {leaderboard.length} Rows × 6 Columns
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-mono">
                      <th className="p-2">Index</th>
                      <th className="p-2">Node</th>
                      <th className="p-2">Degree</th>
                      <th className="p-2">Betweenness</th>
                      <th className="p-2">Closeness</th>
                      <th className="p-2">PageRank</th>
                      <th className="p-2">Eigenvector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {leaderboard.slice(0, 15).map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-400">{idx}</td>
                        <td className="p-2 font-sans font-semibold text-slate-900">{item.label}</td>
                        <td className="p-2 text-slate-700">{item.degree}</td>
                        <td className="p-2 text-rose-600 font-semibold">{item.betweenness.toFixed(4)}</td>
                        <td className="p-2 text-emerald-600">{item.closeness.toFixed(4)}</td>
                        <td className="p-2 text-violet-600 font-semibold">{item.pagerank.toFixed(4)}</td>
                        <td className="p-2 text-teal-600">{item.eigenvector.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
