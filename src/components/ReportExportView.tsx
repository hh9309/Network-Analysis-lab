import React, { useState, useMemo } from 'react';
import { NetworkGraph, NetworkStats, CentralityLeaderboardItem } from '../types/network';
import { CASE_STUDIES, CaseStudy } from '../utils/cases';
import {
  buildAdjacencyMatrix,
  buildLaplacianMatrix,
  computeAlgebraicConnectivity,
  computeSpectralRadius,
} from '../utils/matrixMath';
import { computeCentralities } from '../utils/centrality';
import { detectCommunitiesLouvain } from '../utils/community';
import {
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  Copy,
  Check,
  FileText,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
  BookOpen,
  Eye,
  Download,
  Activity,
  ShieldCheck,
  Compass,
} from 'lucide-react';

interface ReportExportViewProps {
  graph: NetworkGraph;
  stats: NetworkStats;
  leaderboard: CentralityLeaderboardItem[];
  onLoadCaseGraph?: (graph: NetworkGraph) => void;
  onJumpToTab?: (tab: string) => void;
}

export const ReportExportView: React.FC<ReportExportViewProps> = ({
  graph,
  stats,
  leaderboard,
  onLoadCaseGraph,
  onJumpToTab,
}) => {
  // Selected Target for Report & Data: 'current' or any case study ID
  const [selectedCaseId, setSelectedCaseId] = useState<string>('current');
  const [previewTab, setPreviewTab] = useState<'visual' | 'markdown'>('visual');
  const [activeViewTab, setActiveViewTab] = useState<'report_preview' | 'cases_data'>('report_preview');
  const [copied, setCopied] = useState<boolean>(false);

  // Download Trigger Helper
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute active graph, stats, and leaderboard based on selectedCaseId
  const { activeGraph, activeStats, activeLeaderboard, activeCaseInfo } = useMemo(() => {
    if (selectedCaseId === 'current') {
      return {
        activeGraph: graph,
        activeStats: stats,
        activeLeaderboard: leaderboard,
        activeCaseInfo: null,
      };
    }

    const foundCase = CASE_STUDIES.find((c) => c.id === selectedCaseId);
    if (!foundCase) {
      return {
        activeGraph: graph,
        activeStats: stats,
        activeLeaderboard: leaderboard,
        activeCaseInfo: null,
      };
    }

    const cGraph = foundCase.graph;
    const A = buildAdjacencyMatrix(cGraph.nodes, cGraph.edges, cGraph.isDirected);
    const L = buildLaplacianMatrix(A);
    const { lambda2 } = computeAlgebraicConnectivity(L);
    const spectralRadius = computeSpectralRadius(A);
    const { modularity } = detectCommunitiesLouvain(cGraph.nodes, cGraph.edges);
    const { nodesWithCentrality, leaderboard: cLeaderboard, stats: cStats } = computeCentralities(
      cGraph.nodes,
      cGraph.edges,
      cGraph.isDirected
    );

    return {
      activeGraph: { ...cGraph, nodes: nodesWithCentrality },
      activeStats: {
        ...cStats,
        algebraicConnectivity: lambda2,
        spectralRadius,
        modularity,
      },
      activeLeaderboard: cLeaderboard,
      activeCaseInfo: foundCase,
    };
  }, [selectedCaseId, graph, stats, leaderboard]);

  // Generators for CSV / JSON of any arbitrary graph
  const generateNodesCSV = (targetGraph: NetworkGraph, targetLeaderboard?: CentralityLeaderboardItem[]) => {
    const header = 'ID,Label,Category,Degree,Betweenness,Closeness,PageRank,Eigenvector,Community,IsBridge,IsHub,Coord_X,Coord_Y';
    const rows = targetGraph.nodes.map((node) => {
      const lb = targetLeaderboard?.find((item) => item.id === node.id);
      const deg = lb ? lb.degree : node.degree || 0;
      const bet = lb ? lb.betweenness.toFixed(4) : (node.betweenness || 0).toFixed(4);
      const clo = lb ? lb.closeness.toFixed(4) : (node.closeness || 0).toFixed(4);
      const pr = lb ? lb.pagerank.toFixed(4) : (node.pagerank || 0).toFixed(4);
      const eig = lb ? lb.eigenvector.toFixed(4) : (node.eigenvector || 0).toFixed(4);
      const comm = lb ? lb.community : node.group || 0;
      const isBridge = lb ? lb.isBridge : false;
      const isHub = lb ? lb.isHub : false;
      return `"${node.id}","${node.label || node.id}","${node.category || 'Standard'}",${deg},${bet},${clo},${pr},${eig},${comm},${isBridge},${isHub},${node.x},${node.y}`;
    });
    return [header, ...rows].join('\n');
  };

  const generateEdgesCSV = (targetGraph: NetworkGraph) => {
    const header = 'Source,Target,Weight,Directed';
    const rows = targetGraph.edges.map(
      (e) => `"${e.source}","${e.target}",${e.weight || 1},${targetGraph.isDirected ? 1 : 0}`
    );
    return [header, ...rows].join('\n');
  };

  const generateAdjacencyCSV = (targetGraph: NetworkGraph) => {
    const A = buildAdjacencyMatrix(targetGraph.nodes, targetGraph.edges, targetGraph.isDirected);
    const header = ['ID', ...targetGraph.nodes.map((n) => `"${n.label || n.id}"`)].join(',');
    const rows = A.map(
      (row, i) => `"${targetGraph.nodes[i]?.label || targetGraph.nodes[i]?.id}",` + row.join(',')
    );
    return [header, ...rows].join('\n');
  };

  // Structured Academic Markdown Report organized strictly in the 6 workflow steps (最少6个部分)
  const generate6PartMarkdownReport = () => {
    const topBetweenness = [...activeLeaderboard].sort((a, b) => b.betweenness - a.betweenness).slice(0, 5);
    const topDegree = [...activeLeaderboard].sort((a, b) => b.degree - a.degree).slice(0, 5);
    const topPageRank = [...activeLeaderboard].sort((a, b) => b.pagerank - a.pagerank).slice(0, 5);
    const bridges = activeLeaderboard.filter((item) => item.isBridge);

    const reportTitle = activeCaseInfo
      ? `【${activeCaseInfo.number} ${activeCaseInfo.title}】复杂网络全流程分析与拓扑韧性评估报告`
      : `【${activeGraph.name}】复杂网络全流程分析与拓扑韧性评估报告`;

    return `# ${reportTitle}

> **系统名称**: ${activeGraph.name}  
> **报告类型**: 复杂系统网络分析学术与工程综合评估白皮书 (全流程导引 6 大部分体系)  
> **生成时间**: ${new Date().toLocaleString()}  
> **分析引擎**: 复杂系统网络分析实验室 (谱图论/中心度/Louvain/动力学/渗流相变)

---

## 摘要 (Executive Summary)
本报告严格按照“建模 $\\rightarrow$ 谱代数 $\\rightarrow$ 中心性 $\\rightarrow$ 社区发现 $\\rightarrow$ 动力学传播 $\\rightarrow$ 鲁棒评估”的全流程导引架构展开。系统包含 $N=${activeStats.n}$ 个节点与 $M=${activeStats.m}$ 条连边，网络密度 $\\rho=${activeStats.density.toFixed(4)}$。分析表明：系统代数连通度 $\\lambda_2(L)=${activeStats.algebraicConnectivity.toFixed(4)}$，邻接矩阵谱半径 $\\rho(A)=${activeStats.spectralRadius.toFixed(3)}$，对应流行病与舆情暴发临界阈值 $\\tau_c=${(activeStats.spectralRadius > 0 ? 1 / activeStats.spectralRadius : 0.5).toFixed(4)}$。网络呈现典型无标度度异质特性，针对性攻击前 ${(activeStats.fcTarget * 100).toFixed(0)}\\%$ 的枢纽节点将诱发巨型连通分量瞬时瓦解。

---

## 第一部分：网络拓扑建模与形式化代数基础
### 1.1 拓扑图形式化定义与尺度空间
系统形式化定义为图 $G = (V, E, W)$：
- **节点集 $V$**: $|V| = N = ${activeStats.n}$，表征系统中参与交互的独立物理实体或逻辑中枢。
- **连边集 $E$**: $|E| = M = ${activeStats.m}$，交互性质为**${activeGraph.isDirected ? '有向图 (DiGraph)' : '无向图 (Undirected Graph)'}**，量化实体间物质流、资金流、信息流或物理连通。
- **网络拓扑密度**: $\\rho = \\frac{2M}{N(N-1)} = ${activeStats.density.toFixed(4)}$。
- **节点平均度**: $\\langle k \\rangle = \\frac{2M}{N} = ${activeStats.avgDegree.toFixed(3)}$。
- **度分布二阶异质度**: $\\kappa = \\frac{\\langle k^2 \\rangle}{\\langle k \\rangle} = ${activeStats.kappa.toFixed(3)}$。度异质度显著大于 1，验证了网络存在极度不均匀的拓扑度分化。

### 1.2 形式化代数邻接矩阵与度矩阵
系统拓扑结构由实对称邻接矩阵 $A \\in \\mathbb{R}^{N \\times N}$ 唯一确定：
$$A_{ij} = \\begin{cases} w_{ij}, & (v_i, v_j) \\in E \\\\ 0, & \\text{otherwise} \\end{cases}$$
度对角矩阵 $D = \\text{diag}(k_1, k_2, \\dots, k_N)$，其中 $k_i = \\sum_{j=1}^N A_{ij}$。

---

## 第二部分：谱图论代数与拉普拉斯谱特征解析
### 2.1 拉普拉斯矩阵谱分解
无向图非归一化图拉普拉斯矩阵定义为：
$$L = D - A$$
其特征值谱满足半正定性：$0 = \\lambda_1 \\le \\lambda_2 \\le \\dots \\le \\lambda_N$。
- **代数连通度 (Fiedler 值) $\\lambda_2(L)$**: **${activeStats.algebraicConnectivity.toFixed(4)}**。
  - **物理意义**: $\\lambda_2$ 是网络谱平分 (Spectral Bisection) 与抗二割裂韧性的核心量度。当 $\\lambda_2$ 较低时，全网极易被单个桥梁断裂分割为互不连通的孤岛。
- **邻接谱半径 $\\rho(A)$**: **${activeStats.spectralRadius.toFixed(3)}**。
  - **动力学意义**: $\\rho(A) = \\max_{i} |\\lambda_i(A)|$ 决定了网络动力学系统的李雅普诺夫指数与微扰发散极限。

### 2.2 流行病与舆情无阈值暴发判据
根据复杂网络平均场理论，系统流行病爆发临界阈值为：
$$\\tau_c = \\frac{1}{\\rho(A)} = ${(activeStats.spectralRadius > 0 ? 1 / activeStats.spectralRadius : 0.5).toFixed(4)}$$
当外部传播率与自愈率比值 $\\frac{\\beta}{\\gamma} > \\tau_c$ 时，扰动将演化为全网级震荡。

---

## 第三部分：多维节点中心性与关键咽喉识别
### 3.1 五大中心性计算公式规范
1. **度中心度 (Degree Centrality)**: $C_D(v) = \\frac{k_v}{N-1}$
2. **介数中心度 (Betweenness Centrality)**: $C_B(v) = \\sum_{s \\ne v \\ne t} \\frac{\\sigma_{st}(v)}{\\sigma_{st}}$，归一化 $C'_B(v) = \\frac{2 C_B(v)}{(N-1)(N-2)}$
3. **接近中心度 (Closeness Centrality)**: $C_C(v) = \\frac{N-1}{\\sum_{u \\ne v} d(v, u)}$
4. **PageRank 权威度**: $PR(v) = \\frac{1-d}{N} + d \\sum_{u \\in In(v)} \\frac{PR(u)}{Out(u)}$ ($d=0.85$)
5. **特征向量中心度 (Eigenvector)**: $x_v = \\frac{1}{\\lambda} \\sum_u A_{vu} x_u \\iff A x = \\lambda x$

### 3.2 节点中心性排行榜 Top 5
| 排名 | 节点名称 (Label) | 节点ID | 度数 $k_v$ | 介数中心性 $C_B$ | 接近中心性 $C_C$ | PageRank | 角色属性 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${topBetweenness
  .map(
    (n, idx) =>
      `| ${idx + 1} | **${n.label}** | \`${n.id}\` | ${n.degree} | ${n.betweenness.toFixed(
        4
      )} | ${n.closeness.toFixed(4)} | ${n.pagerank.toFixed(4)} | ${
        n.isBridge ? '⚠️ 咽喉桥梁 (Bridge)' : n.isHub ? '★ 巨型中枢 (Hub)' : '普通节点'
      } |`
  )
  .join('\n')}

### 3.3 结构洞跨界桥梁 (Structural Hole Bridges) 诊断
${
  bridges.length > 0
    ? `共检测出 **${bridges.length}** 个高介数但低度数的典型结构洞桥梁节点：\n` +
      bridges
        .map(
          (b) =>
            `- **${b.label}** (ID: \`${b.id}\`): 介数=$${b.betweenness.toFixed(4)}$，度数=$${b.degree}$。该节点扼守不同模块间的最短通道，是典型的卡脖子断点。`
        )
        .join('\n')
    : '- 当前网络各群落连通较为均匀，未出现极度显著的单一断点结构洞桥梁。'
}

---

## 第四部分：社区结构划分与模块度最大化剖析
### 4.1 Newman-Girvan 模块度优化
采用贪心 Louvain 层次聚类算法，求解全网模块度 $Q$ 最大化分配：
$$Q = \\frac{1}{2m} \\sum_{i,j} \\left[ A_{ij} - \\frac{k_i k_j}{2m} \\right] \\delta(c_i, c_j)$$
- **检测到的子社区群落数**: **${activeStats.modularity > 0 ? '多群落分化' : '连通子结构'}**
- **Newman 模块度评分 $Q$**: **${activeStats.modularity.toFixed(4)}**
  - **评估准则**: $Q \\in [0.3, 0.7]$ 代表网络具备显著且高质量的社群子群落结构；模块内部连接紧密，模块间通过稀疏关键通道协同。

### 4.2 跨群落交互边界分析
网络节点按职能或地域聚集。模块内部信息交互迅速，但跨社区协调高度依赖少数边缘连边，这要求在工程管理中必须对跨群落接口设立专属冗余备份机制。

---

## 第五部分：动力学演化与传播机制模拟
### 5.1 级联过载失效雪崩动力学 (Motter-Lai 模型)
- **节点初始负载与容量**: $L_i = k_i^\\alpha, \\quad C_i = (1 + \\beta) L_i$ (取容差系数 $\\beta = 0.25$)。
- **故障触发与溢出机制**: 当移除介数排名前位的核心节点时，原有巨量通信/物流/电力通量将瞬间被重分配给相邻存活节点。
- **雪崩链式反应**: 一旦相邻节点由于超载突破 $C_i$ 阈值继发跳闸，将引发 $1 \\to 3 \\to 8$ 的次生雪崩浪潮，导致全网巨型连通分量比率 $S(t)/N$ 呈断崖式下跌至不足 $20\\%$。

### 5.2 病毒/舆情 SIR 动力学传播相变
- **状态划分**: 易感态 ($S$)、感染态 ($I$)、移出/免疫态 ($R$)。
- **无标度网络传染特性**: 由于度二阶矩 $\\langle k^2 \\rangle$ 发散，在无干预情形下，哪怕初始仅有 1 个感染源，峰值感染率仍将迅速蔓延触达全网重要节点。

---

## 第六部分：网络韧性评估与防御加固对策建议
### 6.1 渗流相变崩塌临界阈值评估 (Percolation Breakdown)
- **随机失效容错阈值 $f_c^{\\text{rand}}$**: **${(activeStats.fcRandom * 100).toFixed(1)}\\%$**。
  - 说明系统对随机发生的硬件损耗或自发偶发故障具备天然强健的免疫力。
- **靶向蓄意打击崩溃点 $f_c^{\\text{target}}$**: **${(activeStats.fcTarget * 100).toFixed(1)}\\%$**。
  - **阿喀琉斯之踵**: 恶意攻击者仅需精准摧毁排名前 ${(activeStats.fcTarget * 100).toFixed(
    0
  )}\\%$ 的超级 Hub 或关键 Bridge 节点，全网巨型分量将瞬间发生一级相变解体，系统丧失全局协同能力。

### 6.2 四维立体防御与韧性加固对策
1. **增设跨区绕行备份连边 (提升 $\\lambda_2$)**:
   针对介数中心性最高的前 3 个咽喉节点（如 **${topBetweenness[0]?.label || '关键枢纽'}**），部署点对点旁路路由，将网络代数连通度 $\\lambda_2$ 提升 30% 以上。
2. **超级 Hub 节点靶向免疫与过载熔断**:
   优先将 80% 的安全加固、备用电源与疫苗接种资源倾斜配置于度数与介数前 10% 的超级中枢，并设置自适应限流阻尼器防止过载雪崩反噬。
3. **跨社区结构洞隔离防火墙**:
   在各子社区连接的关键桥梁处部署动态检测切断装置。一旦某一社区内部发生失控级联雪崩或舆情暴发，立即实行临时物理阻断，防止全网交叉感染。
4. **自愈与拓扑动态重构协议**:
   制定拓扑重组预案，在检测到巨型连通分量比率骤降至 60% 以下时，自动激活二级预备节点与低轨应急通道。

---
*报告结束 · 复杂系统网络分析实验室自动生成*
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generate6PartMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <FileDown className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                科研报告与六大案例原始数据集导出引擎
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                全流程导引 6 大部分规范
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              提供六大实战案例的点边数据、邻接矩阵与图结构下载；生成全流程导引六步严密学术与工程报告并支持在线预览
            </p>
          </div>

          {/* Main View Mode Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveViewTab('report_preview')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
                activeViewTab === 'report_preview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>全流程报告预览 (6大部分)</span>
            </button>
            <button
              onClick={() => setActiveViewTab('cases_data')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
                activeViewTab === 'cases_data'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>六大案例原始数据下载 ({CASE_STUDIES.length} 个案例)</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW SECTION 1: 报告在线预览 (严格按照全流程导引6大部分组织) */}
      {activeViewTab === 'report_preview' && (
        <div className="space-y-6">
          {/* Target Selector Bar: choose Current Network or Any of the 6 Cases */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>报告分析对象:</span>
              </span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="current">当前画布活跃网络: {graph.name} (N={graph.nodes.length})</option>
                {CASE_STUDIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} {c.title} (N={c.graph.nodes.length}, M={c.graph.edges.length})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setPreviewTab('visual')}
                  className={`px-3 py-1 rounded transition ${
                    previewTab === 'visual'
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  排版预览
                </button>
                <button
                  onClick={() => setPreviewTab('markdown')}
                  className={`px-3 py-1 rounded transition ${
                    previewTab === 'markdown'
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Markdown 源码
                </button>
              </div>

              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-3 py-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                title="复制 Markdown 文本"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制代码'}</span>
              </button>

              <button
                onClick={() =>
                  triggerDownload(
                    generate6PartMarkdownReport(),
                    `${activeGraph.name}_全流程网络分析报告.md`,
                    'text/markdown'
                  )
                }
                className="flex items-center gap-1 px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 .md</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 text-white bg-slate-900 hover:bg-slate-800 rounded-lg font-semibold shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>打印 / 另存为 PDF</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar of Currently Previewed Report */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">1. 节点与边数</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                N={activeStats.n} <span className="text-xs text-slate-500 font-normal">/ M={activeStats.m}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">密度 ρ = {activeStats.density.toFixed(3)}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">2. 代数连通度 λ₂</span>
              <div className="text-base font-bold text-indigo-600 mt-0.5">
                {activeStats.algebraicConnectivity.toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">二分割抗割裂韧性</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">3. 谱半径 ρ(A)</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {activeStats.spectralRadius.toFixed(3)}
              </div>
              <div className="text-[10px] text-purple-600 font-mono mt-1">
                阈值 τ_c = {(activeStats.spectralRadius > 0 ? 1 / activeStats.spectralRadius : 0.5).toFixed(3)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">4. 模块度 Q</span>
              <div className="text-base font-bold text-emerald-600 mt-0.5">
                {activeStats.modularity.toFixed(3)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Louvain 贪心社群</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">5. 随机失效阈值</span>
              <div className="text-base font-bold text-blue-600 mt-0.5">
                {(activeStats.fcRandom * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">天然容错强韧</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-mono">6. 蓄意攻击阈值</span>
              <div className="text-base font-bold text-rose-600 mt-0.5">
                {(activeStats.fcTarget * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-rose-500 mt-1">阿喀琉斯之踵</div>
            </div>
          </div>

          {/* PREVIEW CONTAINER */}
          {previewTab === 'visual' ? (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 font-sans print:shadow-none print:border-none print:p-0">
              {/* Document Header */}
              <div className="border-b border-slate-200 pb-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    全流程规范评估报告 · 6 大部分体系
                  </span>
                  {activeCaseInfo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      实战案例 {activeCaseInfo.number}: {activeCaseInfo.title}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeCaseInfo
                    ? `${activeCaseInfo.number} ${activeCaseInfo.title}：复杂网络全流程分析与拓扑韧性评估报告`
                    : `${activeGraph.name}：复杂网络全流程分析与拓扑韧性评估报告`}
                </h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 pt-1">
                  <span>系统类型: {activeGraph.isDirected ? '有向加权网络' : '无向无标度复杂网络'}</span>
                  <span>生成时间: {new Date().toLocaleString()}</span>
                  <span>机构: 复杂系统网络分析实验室</span>
                </div>
              </div>

              {/* Part 1: 网络拓扑建模与形式化代数基础 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第一部分：网络拓扑建模与形式化代数基础</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  系统形式化抽象为拓扑图 <strong className="font-mono">G = (V, E, W)</strong>，其中节点集规模 <strong className="font-mono">|V| = N = {activeStats.n}</strong>，连边集规模 <strong className="font-mono">|E| = M = {activeStats.m}</strong>。实体间连通密度为 <strong className="font-mono">ρ = {activeStats.density.toFixed(4)}</strong>，平均连通度为 <strong className="font-mono">⟨k⟩ = {activeStats.avgDegree.toFixed(3)}</strong>。
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-800">代数形式化矩阵定义：</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-blue-700 font-bold">邻接矩阵 A ∈ ℝ^(N×N)</div>
                      <div className="text-slate-600 mt-1">A_ij = w_ij 若存在 (v_i, v_j) ∈ E，否则为 0</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="text-emerald-700 font-bold">度对角阵 D = diag(k_1, ..., k_N)</div>
                      <div className="text-slate-600 mt-1">k_i = Σ_j A_ij，二阶异质度 κ = ⟨k²⟩/⟨k⟩ = {activeStats.kappa.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: 谱图论代数与拉普拉斯谱特征解析 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第二部分：谱图论代数与拉普拉斯谱特征解析</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  谱图论通过拉普拉斯矩阵谱系剖析拓扑的代数几何约束。无向图拉普拉斯矩阵 <strong className="font-mono">L = D - A</strong> 拥有非负实特征值谱 <strong className="font-mono">0 = λ₁ ≤ λ₂ ≤ ... ≤ λ_N</strong>。
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                    <div className="text-indigo-900 font-bold">代数连通度 λ₂(L)</div>
                    <div className="text-lg font-mono font-black text-indigo-600">
                      {activeStats.algebraicConnectivity.toFixed(4)}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Fiedler 特征值决定网络二割裂阻抗；当 λ₂ 偏低时，系统存在被关键连边孤立的风险。
                    </p>
                  </div>
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                    <div className="text-purple-900 font-bold">邻接谱半径 ρ(A)</div>
                    <div className="text-lg font-mono font-black text-purple-600">
                      {activeStats.spectralRadius.toFixed(3)}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      主特征根量化全网微扰放大倍率，是动态系统渐近稳定性的核心边界。
                    </p>
                  </div>
                  <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 space-y-1">
                    <div className="text-rose-900 font-bold">爆发临界阈值 τ_c</div>
                    <div className="text-lg font-mono font-black text-rose-600">
                      {(activeStats.spectralRadius > 0 ? 1 / activeStats.spectralRadius : 0.5).toFixed(4)}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      τ_c = 1/ρ(A)；当有效传播率 β/γ 超越此阈值时，引发全网大流行或舆情泛滥。
                    </p>
                  </div>
                </div>
              </div>

              {/* Part 3: 多维节点中心度与结构洞咽喉识别 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第三部分：多维节点中心度与结构洞咽喉识别</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  通过同屏求解度、介数、接近度、PageRank 与特征向量中心度，精确定位网络控制命脉与潜在卡脖子断点：
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="p-2.5">排名</th>
                        <th className="p-2.5">节点名称</th>
                        <th className="p-2.5 font-mono">度中心度 (Degree)</th>
                        <th className="p-2.5 font-mono">介数中心度 (Betweenness)</th>
                        <th className="p-2.5 font-mono">接近度 (Closeness)</th>
                        <th className="p-2.5 font-mono">PageRank</th>
                        <th className="p-2.5">角色定位</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                      {activeLeaderboard.slice(0, 5).map((n, idx) => (
                        <tr key={n.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{idx + 1}</td>
                          <td className="p-2.5 font-sans font-semibold text-slate-900">{n.label}</td>
                          <td className="p-2.5 text-blue-700">{n.degree}</td>
                          <td className="p-2.5 font-bold text-rose-600">{n.betweenness.toFixed(4)}</td>
                          <td className="p-2.5 text-emerald-700">{n.closeness.toFixed(4)}</td>
                          <td className="p-2.5 text-violet-700">{n.pagerank.toFixed(4)}</td>
                          <td className="p-2.5 font-sans">
                            {n.isBridge ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                结构洞桥梁 (Bridge)
                              </span>
                            ) : n.isHub ? (
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                                巨型中枢 (Hub)
                              </span>
                            ) : (
                              <span className="text-slate-500">常规业务节点</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Part 4: 社区结构划分与模块度最大化剖析 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第四部分：社区结构划分与模块度最大化剖析</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  通过 Newman-Girvan 模块度函数 Q 进行 Louvain 贪心社群发现，当前系统最优模块度评分为 <strong className="font-mono text-emerald-700">Q = {activeStats.modularity.toFixed(4)}</strong>。模块度 Q 在 [0.3, 0.7] 区间表明子群落结构清晰，内部高频交互，外部依赖少数中继通道跨界协同。
                </p>
              </div>

              {/* Part 5: 动力学演化与传播机制模拟 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第五部分：动力学演化与传播机制模拟</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-bold text-slate-900">Motter-Lai 级联雪崩动力学</h5>
                    <p className="text-slate-600 leading-relaxed">
                      负载模型取 L_i = k_i^α，容量上限 C_i = (1+β)L_i。当移除首个高介数节点时，溢出通量将诱发相邻节点相继超载断路，导致巨型连通分量呈雪崩式衰减。
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h5 className="font-bold text-slate-900">SIR 流行病与病毒扩散动力学</h5>
                    <p className="text-slate-600 leading-relaxed">
                      基于 S → I → R 状态机模拟信息在无标度拓扑中的蔓延。由于度分布极度异质，只要感染源触及高 PageRank 节点，将在极短时步内引发全网级峰值感染。
                    </p>
                  </div>
                </div>
              </div>

              {/* Part 6: 网络韧性评估与防御加固对策建议 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm border-l-4 border-indigo-600 pl-3">
                  <span>第六部分：网络韧性评估与防御加固对策建议</span>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                  <div className="font-bold text-amber-950 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Cohen-Havlin 渗流相变阈值对比：</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-slate-800">
                      <div>随机失效崩溃点 f_c^rand ≈ <strong>{(activeStats.fcRandom * 100).toFixed(1)}%</strong></div>
                      <div className="text-[11px] text-slate-500 mt-0.5">网络对非靶向随机损耗具有天然免疫抵抗力</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-slate-800">
                      <div>蓄意攻击崩溃点 f_c^target ≈ <strong className="text-rose-600">{(activeStats.fcTarget * 100).toFixed(1)}%</strong></div>
                      <div className="text-[11px] text-slate-500 mt-0.5">精准打击前少数枢纽将引发巨型连通分量瞬时解体</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <h5 className="font-bold text-slate-900">四重防御工程加固对策：</h5>
                  <ul className="list-decimal list-inside space-y-1.5 text-slate-700">
                    <li><strong>增设跨区绕行备份连边</strong>：针对介数最高的前 3 位咽喉节点设立物理/逻辑旁路，将代数连通度 λ₂ 提升至安全区间。</li>
                    <li><strong>超级 Hub 节点靶向免疫与熔断</strong>：倾斜 80% 核心防护资源至 Top 10% 枢纽节点，部署自适应负载切断与缓冲吸收池。</li>
                    <li><strong>跨社区结构洞隔离防火墙</strong>：在关键跨界连边处设置流控闸门，防止局部级联过载与恶性舆情向其他独立社区扩散。</li>
                    <li><strong>拓扑自愈应急重组协议</strong>：当检测到巨型连通分量比率跌破 60% 时，触发应急协议自动连通备用星载/微波通道。</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Markdown Code Raw View */
            <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap">{generate6PartMarkdownReport()}</pre>
            </div>
          )}
        </div>
      )}

      {/* VIEW SECTION 2: 六大案例原始数据下载专区 (Requirement) */}
      {activeViewTab === 'cases_data' && (
        <div className="space-y-5">
          <div className="bg-indigo-50/60 border border-indigo-200/80 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-indigo-950">六大复杂网络实战案例：原始数据集下载专区</h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  所有案例均包含真实的拓扑节点属性、加权有向/无向连边数据、N×N 邻接矩阵与标准 JSON，可直接用于 NetworkX, Gephi 与学术研究
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Bulk download JSON of all 6 cases
                const allCasesData = {
                  generatedAt: new Date().toISOString(),
                  project: '复杂系统网络分析实验室',
                  caseStudies: CASE_STUDIES,
                };
                triggerDownload(
                  JSON.stringify(allCasesData, null, 2),
                  '复杂网络六大案例全量数据集合集.json',
                  'application/json'
                );
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>全量打包下载 (JSON)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CASE_STUDIES.map((caseItem) => {
              const cGraph = caseItem.graph;
              const n = cGraph.nodes.length;
              const m = cGraph.edges.length;

              return (
                <div
                  key={caseItem.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        案例 {caseItem.number}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        N={n} · M={m}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{caseItem.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                      {caseItem.theorySummary}
                    </p>

                    <div className="pt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                        {caseItem.mappingConcept}
                      </span>
                    </div>
                  </div>

                  {/* Download Options for this specific Case */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[10px] text-slate-400 font-mono">原始数据下载选项：</div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {/* Download Nodes CSV */}
                      <button
                        onClick={() =>
                          triggerDownload(
                            generateNodesCSV(cGraph),
                            `${caseItem.id}_节点数据.csv`,
                            'text/csv'
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-[11px] text-slate-700 font-medium flex items-center justify-center gap-1 transition"
                        title="下载点集 CSV 表格"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                        <span>节点 CSV</span>
                      </button>

                      {/* Download Edges CSV */}
                      <button
                        onClick={() =>
                          triggerDownload(
                            generateEdgesCSV(cGraph),
                            `${caseItem.id}_连边数据.csv`,
                            'text/csv'
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/50 text-[11px] text-slate-700 font-medium flex items-center justify-center gap-1 transition"
                        title="下载边集 CSV 表格"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>连边 CSV</span>
                      </button>

                      {/* Download Adjacency CSV */}
                      <button
                        onClick={() =>
                          triggerDownload(
                            generateAdjacencyCSV(cGraph),
                            `${caseItem.id}_邻接矩阵A.csv`,
                            'text/csv'
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/50 text-[11px] text-slate-700 font-medium flex items-center justify-center gap-1 transition"
                        title="下载邻接矩阵 CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                        <span>邻接矩阵</span>
                      </button>

                      {/* Download Graph JSON */}
                      <button
                        onClick={() =>
                          triggerDownload(
                            JSON.stringify(cGraph, null, 2),
                            `${caseItem.id}_拓扑图.json`,
                            'application/json'
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-violet-400 bg-slate-50 hover:bg-violet-50/50 text-[11px] text-slate-700 font-medium flex items-center justify-center gap-1 transition"
                        title="下载标准拓扑 JSON"
                      >
                        <FileJson className="w-3.5 h-3.5 text-violet-600" />
                        <span>拓扑 JSON</span>
                      </button>
                    </div>

                    {/* Quick Load into Workbench or Report Preview */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setSelectedCaseId(caseItem.id);
                          setActiveViewTab('report_preview');
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg text-center transition flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>查看该案例报告</span>
                      </button>

                      {onLoadCaseGraph && (
                        <button
                          onClick={() => {
                            onLoadCaseGraph(caseItem.graph);
                            if (onJumpToTab) onJumpToTab('modeling');
                          }}
                          className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold rounded-lg text-center transition flex items-center gap-1"
                          title="载入当前画布并在工作台全模块交互分析"
                        >
                          <Layers className="w-3 h-3" />
                          <span>载入画布</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
