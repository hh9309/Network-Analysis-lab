import React, { useMemo } from 'react';
import { GraphNode, GraphEdge } from '../types/network';
import { detectCommunitiesLouvain, computeRoleCartography } from '../utils/community';
import { Users, PieChart, ShieldAlert, Sparkles, Network } from 'lucide-react';

interface CommunityViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onApplyCommunityColors: () => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

const COMMUNITY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#84cc16',
];

export const CommunityView: React.FC<CommunityViewProps> = ({
  nodes,
  edges,
  onApplyCommunityColors,
  selectedNodeId,
  onSelectNode,
}) => {
  // Execute Louvain clustering
  const { nodeCommunities, modularity, communityCount } = useMemo(
    () => detectCommunitiesLouvain(nodes, edges),
    [nodes, edges]
  );

  // Compute Role Cartography
  const roleCartography = useMemo(
    () => computeRoleCartography(nodes, edges, nodeCommunities),
    [nodes, edges, nodeCommunities]
  );

  // Group members by community
  const communityGroups = useMemo(() => {
    const map = new Map<number, GraphNode[]>();
    nodes.forEach((node) => {
      const c = nodeCommunities.get(node.id) ?? 0;
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(node);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [nodes, nodeCommunities]);

  return (
    <div className="space-y-6">
      {/* Top Modularity Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Newman-Girvan 模块度</span>
            <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Q 评分</span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {modularity.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {modularity >= 0.4
              ? '★ 显著强社区结构！各子群落内凝聚度远高于随机期望'
              : modularity >= 0.2
              ? '中等社群分化，存在部分局部抱团特征'
              : '无显著社群分化（趋于均匀随机互联）'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>识别独立子群落数</span>
            <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Clusters</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {communityCount} <span className="text-sm font-normal text-slate-500">个社群</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            基于 Louvain 启发式局部模块度贪心增益最优化搜索
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">画布视觉着色</div>
            <div className="text-xs text-slate-600 mt-1">
              将每个社区以柔和科学色盘在网络拓扑画布中差异化高亮
            </div>
          </div>
          <button
            onClick={onApplyCommunityColors}
            className="mt-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>在拓扑画布中渲染社群着色</span>
          </button>
        </div>
      </div>

      {/* Community Clusters Breakdown Cards */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>划分社区群落明细与成员清单</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communityGroups.map(([commId, members]) => {
            const color = COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length];
            return (
              <div
                key={commId}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: color }}
                      className="w-3 h-3 rounded-full inline-block shadow-xs"
                    />
                    <span className="font-semibold text-xs text-slate-900">
                      社区 {commId + 1}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {members.length} 个节点 ({((members.length / nodes.length) * 100).toFixed(0)}%)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      onClick={() => onSelectNode(m.id)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition ${
                        m.id === selectedNodeId
                          ? 'bg-amber-300 text-slate-900 font-bold'
                          : 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200/60'
                      }`}
                    >
                      {m.label || m.id}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guimerà-Amaral Role Cartography Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Guimerà-Amaral 节点角色拓扑制图谱 (Role Cartography)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              基于模块内度数 z-score ($z_i$) 与参与系数 Participation ($P_i$)，判定节点在社区内与跨社区的拓扑功能
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <th className="p-2.5">节点</th>
                <th className="p-2.5">所属社区</th>
                <th className="p-2.5 font-mono">模块内 z-Score (zᵢ)</th>
                <th className="p-2.5 font-mono">参与系数 Pᵢ</th>
                <th className="p-2.5">拓扑功能角色分类</th>
                <th className="p-2.5">机制释义</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roleCartography.map((item) => {
                const node = nodes.find((n) => n.id === item.id);
                const comm = nodeCommunities.get(item.id) ?? 0;
                const isSelected = item.id === selectedNodeId;

                let roleBadgeColor = 'bg-slate-100 text-slate-700';
                let roleDesc = '社区内普通成员';

                if (item.role === 'Connector Hub') {
                  roleBadgeColor = 'bg-rose-100 text-rose-800 font-bold border border-rose-300';
                  roleDesc = '既是本社区超核，又跨界串联其他多个社区的关键中枢';
                } else if (item.role === 'Connector') {
                  roleBadgeColor = 'bg-amber-100 text-amber-800 font-semibold border border-amber-300';
                  roleDesc = '模块度不大但在跨群落间沟通中扮演不可或缺的桥梁';
                } else if (item.role === 'Provincial Hub') {
                  roleBadgeColor = 'bg-blue-100 text-blue-800 font-semibold border border-blue-300';
                  roleDesc = '仅在本社区内部高度富集连边，鲜少对外跨界';
                } else if (item.role === 'Global Hub') {
                  roleBadgeColor = 'bg-purple-100 text-purple-800 font-bold border border-purple-300';
                  roleDesc = '全网级超核心超级领袖';
                }

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectNode(item.id)}
                    className={`cursor-pointer transition hover:bg-slate-50 ${
                      isSelected ? 'bg-amber-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 font-medium text-slate-900">
                      {node?.label || item.id}
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Community-{comm + 1}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-indigo-600 font-semibold">
                      {item.zScore}
                    </td>
                    <td className="p-2.5 font-mono text-emerald-600 font-semibold">
                      {item.participationCoeff}
                    </td>
                    <td className="p-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${roleBadgeColor}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{roleDesc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
