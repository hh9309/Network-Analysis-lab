import React, { useState } from 'react';
import { NetworkGraph, NetworkStats, GraphNode, GraphEdge } from '../types/network';
import {
  stepSIR,
  applyImmunization,
  initializeCascadingModel,
  stepCascadingFailure,
  computePercolationCurves,
} from '../utils/simulations';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Activity,
  FileText,
  Radio,
  Zap,
} from 'lucide-react';

interface WorkflowGuideViewProps {
  graph: NetworkGraph;
  stats: NetworkStats;
  onUpdateNodes: (nodes: GraphNode[]) => void;
  onJumpToModule: (moduleId: string) => void;
}

export const WorkflowGuideView: React.FC<WorkflowGuideViewProps> = ({
  graph,
  stats,
  onUpdateNodes,
  onJumpToModule,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Dynamic simulation controls in Step 3
  const [simType, setSimType] = useState<'sir' | 'cascade'>('sir');
  const [sirBeta, setSirBeta] = useState<number>(0.35);
  const [sirGamma, setSirGamma] = useState<number>(0.15);
  const [sirStepCount, setSirStepCount] = useState<number>(0);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);

  // Cascading Failure params
  const [cascadeStepCount, setCascadeStepCount] = useState<number>(0);
  const [cascadeOverloadedCount, setCascadeOverloadedCount] = useState<number>(0);

  // Step 4 Percolation curves
  const percolationData = React.useMemo(
    () => computePercolationCurves(graph.nodes, graph.edges, 15),
    [graph.nodes, graph.edges]
  );

  // Step 3 Actions: SIR step
  const handleSIRStep = () => {
    const { updatedNodes, stepStats, hasActiveInfection } = stepSIR(
      graph.nodes,
      graph.edges,
      sirBeta,
      sirGamma
    );
    onUpdateNodes(updatedNodes);
    setSirStepCount((prev) => prev + 1);
  };

  const handleResetSIR = () => {
    // Reset all to susceptible, pick 1 random infected
    const reset = graph.nodes.map((n, i) => ({
      ...n,
      status: i === 0 ? ('infected' as const) : ('susceptible' as const),
    }));
    onUpdateNodes(reset);
    setSirStepCount(0);
  };

  const handleImmunizeHubs = () => {
    const immunized = applyImmunization(graph.nodes, 'targeted_hub', 0.15);
    onUpdateNodes(immunized);
  };

  // Step 3 Actions: Cascade step
  const handleInitCascade = () => {
    const inited = initializeCascadingModel(graph.nodes, 1.0, 0.25);
    // Trigger failure on highest degree node
    const highestDegNode = [...inited].sort((a, b) => (b.degree || 0) - (a.degree || 0))[0];
    if (highestDegNode) {
      highestDegNode.status = 'failed';
    }
    onUpdateNodes(inited);
    setCascadeStepCount(0);
  };

  const handleCascadeStep = () => {
    const { updatedNodes, newlyFailedIds, stepStats } = stepCascadingFailure(
      graph.nodes,
      graph.edges
    );
    onUpdateNodes(updatedNodes);
    setCascadeStepCount((prev) => prev + 1);
    setCascadeOverloadedCount(stepStats.failedNodes);
  };

  return (
    <div className="space-y-6">
      {/* 4-Step Progress Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              全流程研究导引：建模 → 指标计算 → 传播模拟 → 鲁棒评估
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              遵循统计物理与复杂网络标准科研规程，循序推进系统分析
            </p>
          </div>
          <div className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            阶段 {currentStep} / 4
          </div>
        </div>

        {/* Progress tracker steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { num: 1, title: '网络拓扑构建', desc: '选型或自定义' },
            { num: 2, title: '谱代数与中心性', desc: '拉普拉斯与Hub' },
            { num: 3, title: '传播与级联演化', desc: 'SIR / 级联雪崩' },
            { num: 4, title: '鲁棒韧性评估', desc: '渗透阈值与报告' },
          ].map((step) => {
            const isPassed = step.num < currentStep;
            const isCurrent = step.num === currentStep;

            return (
              <div
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                    : isPassed
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className={isCurrent ? 'text-indigo-600' : isPassed ? 'text-emerald-600' : 'text-slate-400'}>
                    步骤 0{step.num}
                  </span>
                  {isPassed && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="text-xs font-semibold text-slate-900">{step.title}</div>
                <div className="text-[10px] text-slate-500">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Modeling Content */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
              <span>第一阶段：网络拓扑构建与参数确认</span>
            </h4>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              已载入: {graph.name}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            在开展深入计算前，请确保网络拓扑已正确建模。当前网络包含 <strong>{graph.nodes.length}</strong> 个节点与 <strong>{graph.edges.length}</strong> 条连边。平均度数 $\langle k \rangle = {stats.avgDegree.toFixed(2)}$。
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => onJumpToModule('modeling')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition"
            >
              调整生成模型参数 (BA/WS/ER) →
            </button>
            <button
              onClick={() => onJumpToModule('cases')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition"
            >
              载入六大经典实战案例拓扑 →
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <span>下一步：计算拓扑谱代数与中心性</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Metrics Content */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
              <span>第二阶段：谱代数、拉普拉斯特征值与中心性透视</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="text-slate-500">代数连通度 λ₂</div>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-0.5">
                {stats.algebraicConnectivity.toFixed(4)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="text-slate-500">邻接谱半径 ρ(A)</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {stats.spectralRadius.toFixed(3)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="text-slate-500">度异质性 κ</div>
              <div className="text-lg font-bold font-mono text-blue-600 mt-0.5">
                {stats.kappa.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="text-slate-500">巨型分量占比</div>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                {(stats.giantComponentRatio * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => onJumpToModule('algebra')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition"
            >
              检查邻接/拉普拉斯矩阵热力图 →
            </button>
            <button
              onClick={() => onJumpToModule('centrality')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition"
            >
              查看咽喉结构洞排行榜 →
            </button>
            <button
              onClick={() => onJumpToModule('community')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition"
            >
              执行 Louvain 社区发现 →
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <span>下一步：开展动力学传播与级联雪崩实验</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Propagation & Cascades */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
              <span>第三阶段：动力学传播与级联攻击模拟仿真</span>
            </h4>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSimType('sir')}
                className={`px-3 py-1 rounded-md transition ${
                  simType === 'sir'
                    ? 'bg-white text-rose-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SIR 流行病/舆情传播
              </button>
              <button
                onClick={() => setSimType('cascade')}
                className={`px-3 py-1 rounded-md transition ${
                  simType === 'cascade'
                    ? 'bg-white text-amber-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Motter-Lai 电网级联跳闸
              </button>
            </div>
          </div>

          {/* SIR Panel */}
          {simType === 'sir' && (
            <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200/80 space-y-4">
              <div className="flex items-center justify-between text-xs text-rose-900 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-rose-600" />
                  <span>SIR 传播状态控制器 (已演化 {sirStepCount} 步)</span>
                </div>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200">
                  爆发临界阈值 τc = {stats.epidemicThreshold.toFixed(3)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-700 font-medium flex justify-between">
                    <span>感染概率 β</span>
                    <span className="font-mono text-rose-600 font-bold">{sirBeta.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={sirBeta}
                    onChange={(e) => setSirBeta(Number(e.target.value))}
                    className="w-full mt-1.5 accent-rose-600"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium flex justify-between">
                    <span>康复概率 γ</span>
                    <span className="font-mono text-emerald-600 font-bold">{sirGamma.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={sirGamma}
                    onChange={(e) => setSirGamma(Number(e.target.value))}
                    className="w-full mt-1.5 accent-emerald-600"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleSIRStep}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>单步演化 (+1 Step)</span>
                </button>
                <button
                  onClick={handleImmunizeHubs}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-xs transition"
                >
                  靶向免疫超级 Hub (隔离阻断)
                </button>
                <button
                  onClick={handleResetSIR}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium rounded-lg transition"
                >
                  重置易感人群状态
                </button>
              </div>
            </div>
          )}

          {/* Cascade Panel */}
          {simType === 'cascade' && (
            <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>电网负荷超载雪崩 (Motter-Lai 模型, 已演进 {cascadeStepCount} 轮)</span>
                </div>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                  累计失效节点: {cascadeOverloadedCount} 个
                </span>
              </div>

              <p className="text-xs text-slate-600">
                当枢纽变电站故障时，剩余连通路径需承受溢出负荷。一旦超出预设负荷容差（Tolerance），将触发多米诺连锁断电。
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleInitCascade}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                >
                  💥 初始触发核心变电站故障跳闸
                </button>
                <button
                  onClick={handleCascadeStep}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>推进下一波次负荷再分配跳闸</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <span>下一步：查看渗流相变曲线与韧性评估</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resilience Assessment & Percolation */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">4</span>
              <span>第四阶段：网络韧性评估与随机 vs. 蓄意攻击渗透曲线</span>
            </h4>
          </div>

          {/* Percolation Comparison Plot */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">
                巨型连通分量残留比例 S(f) 对比曲线
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 随机失效 (Random)
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> 蓄意攻击 (Targeted Hubs)
                </span>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="w-full h-48 relative border-b border-l border-slate-300">
              <svg className="w-full h-full overflow-visible">
                {/* Random curve (Green) */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={percolationData
                    .map((d) => `${d.fractionRemoved * 100}%,${(1 - d.randomGiantRatio) * 100}%`)
                    .join(' ')}
                />
                {/* Targeted curve (Rose) */}
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  points={percolationData
                    .map((d) => `${d.fractionRemoved * 100}%,${(1 - d.targetedGiantRatio) * 100}%`)
                    .join(' ')}
                />
              </svg>
              <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-500">
                移除节点比例 f (0% ~ 100%) →
              </div>
              <div className="absolute top-1 left-2 text-[10px] font-mono text-slate-500">
                ↑ 残留巨型分量 S(f)
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>典型无标度特征验证：</strong> 虚线（蓄意攻击）在移除前 <strong className="text-rose-600">{(stats.fcTarget * 100).toFixed(0)}%</strong> 的关键 Hub 节点时，巨型分量发生断崖式相变归零；而实线（随机失效）直至 <strong className="text-emerald-600">{(stats.fcRandom * 100).toFixed(0)}%</strong> 仍能维持巨型连通分量存活。
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onJumpToModule('report')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>生成并导出最终学术科研分析报告 →</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-start">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一步</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
