import React, { useState } from 'react';
import { CASE_STUDIES, CaseStudy } from '../utils/cases';
import { NetworkGraph, GraphNode } from '../types/network';
import {
  Globe,
  Zap,
  Radio,
  Building2,
  Satellite,
  TrendingDown,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface CasesViewProps {
  onLoadCaseGraph: (graph: NetworkGraph) => void;
  onTriggerScenario: (caseItem: CaseStudy) => void;
  currentGraphName: string;
}

export const CasesView: React.FC<CasesViewProps> = ({
  onLoadCaseGraph,
  onTriggerScenario,
  currentGraphName,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CASE_STUDIES[0].id);

  const activeCase = CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];

  const getCaseIcon = (id: string) => {
    switch (id) {
      case 'supply-chain':
        return <Globe className="w-5 h-5 text-blue-600" />;
      case 'power-grid':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'social-dynamics':
        return <Radio className="w-5 h-5 text-rose-500" />;
      case 'corp-org':
        return <Building2 className="w-5 h-5 text-indigo-600" />;
      case 'aerospace-comm':
        return <Satellite className="w-5 h-5 text-teal-600" />;
      case 'financial-contagion':
        return <TrendingDown className="w-5 h-5 text-purple-600" />;
      default:
        return <Globe className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 6 Case Switcher Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CASE_STUDIES.map((c) => {
          const isSelected = c.id === selectedCaseId;
          const isCurrentlyLoaded = currentGraphName.includes(c.title);

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={`p-4 rounded-xl border cursor-pointer transition relative ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-400">
                    {c.number}
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    {getCaseIcon(c.id)}
                  </div>
                </div>
                {isCurrentlyLoaded && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 当前载入
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h4 className="font-semibold text-sm text-slate-900">{c.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{c.subtitle}</p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-indigo-700 font-medium">
                {c.mappingConcept}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Case Deep Dive Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
              {getCaseIcon(activeCase.id)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  案例编号 {activeCase.number}
                </span>
                <span className="text-xs text-slate-500">
                  {activeCase.graph.nodes.length} 实体节点 · {activeCase.graph.edges.length} 条关联拓扑
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {activeCase.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                核心映射理论：<strong className="text-slate-800">{activeCase.mappingConcept}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onLoadCaseGraph(activeCase.graph)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <span>载入拓扑至主画布</span>
            </button>

            <button
              onClick={() => {
                onLoadCaseGraph(activeCase.graph);
                onTriggerScenario(activeCase);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{activeCase.actionButtonText}</span>
            </button>
          </div>
        </div>

        {/* Theoretical Framework & Scenario Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>复杂系统理论机制深度解析</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeCase.theorySummary}
            </p>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/70 space-y-2">
            <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>动态实验仿真情境演化说明</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {activeCase.scenarioDescription}
            </p>
            <div className="pt-2 text-[11px] text-amber-700">
              💡 提示：点击右上角实验按钮后，系统将自动把该拓扑注入画布并直接激发该动态冲击！
            </div>
          </div>
        </div>

        {/* Case Entities Preview List */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-2">典型网络实体成员构成</h4>
          <div className="flex flex-wrap gap-1.5">
            {activeCase.graph.nodes.map((node) => (
              <span
                key={node.id}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium border border-slate-200/60"
              >
                {node.label || node.id}
                {node.category && (
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">
                    ({node.category})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
