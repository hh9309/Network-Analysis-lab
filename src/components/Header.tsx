import React from 'react';
import { NetworkStats } from '../types/network';
import {
  Binary,
  Network,
  Trophy,
  Users,
  Briefcase,
  Terminal,
  Bot,
  Compass,
  FileDown,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export type ActiveTabId =
  | 'algebra'
  | 'modeling'
  | 'centrality'
  | 'community'
  | 'cases'
  | 'code'
  | 'workflow'
  | 'report'
  | 'knowledge';

interface HeaderProps {
  activeTab: ActiveTabId;
  onTabChange: (tab: ActiveTabId) => void;
  stats: NetworkStats;
  onOpenAiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  stats,
  onOpenAiModal,
}) => {
  const tabs = [
    { id: 'algebra', label: '1. 拓扑代数', icon: Binary },
    { id: 'modeling', label: '2. 交互建模', icon: Network },
    { id: 'centrality', label: '3. 中心性计算', icon: Trophy },
    { id: 'community', label: '4. 社区发现', icon: Users },
    { id: 'cases', label: '5. 六大案例', icon: Briefcase },
    { id: 'code', label: '6. 代码引擎', icon: Terminal },
    { id: 'workflow', label: '8. 全流程导引', icon: Compass },
    { id: 'report', label: '9. 报告导出', icon: FileDown },
    { id: 'knowledge', label: '10. 网络要素', icon: BookOpen },
  ] as const;

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Network className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                复杂系统网络分析实验室
              </h1>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                10大核心模块
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              谱图论代数 · 关键节点与结构洞 · 社区发现 · 动力学传播与渗流相变
            </p>
          </div>
        </div>

        {/* Global Live Stats & AI Trigger Button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-mono">
            <div>
              <span className="text-slate-400">N: </span>
              <strong className="text-slate-800">{stats.n}</strong>
            </div>
            <div className="w-[1px] h-3 bg-slate-200" />
            <div>
              <span className="text-slate-400">M: </span>
              <strong className="text-slate-800">{stats.m}</strong>
            </div>
            <div className="w-[1px] h-3 bg-slate-200" />
            <div>
              <span className="text-slate-400">λ₂: </span>
              <strong className="text-indigo-600">{stats.algebraicConnectivity.toFixed(3)}</strong>
            </div>
            <div className="w-[1px] h-3 bg-slate-200" />
            <div>
              <span className="text-slate-400">ρ(A): </span>
              <strong className="text-slate-800">{stats.spectralRadius.toFixed(2)}</strong>
            </div>
          </div>

          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Bot className="w-4 h-4 text-white" />
            <span>AI 随诊窗口 (模块 7)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <nav className="flex space-x-1 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as ActiveTabId)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
