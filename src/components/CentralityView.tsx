import React, { useState, useMemo } from 'react';
import { GraphNode, CentralityLeaderboardItem } from '../types/network';
import {
  Trophy,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
  Info,
  Layers,
  Activity,
} from 'lucide-react';

interface CentralityViewProps {
  nodes: GraphNode[];
  leaderboard: CentralityLeaderboardItem[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onApplyVisualMetric: (metric: 'degree' | 'betweenness' | 'closeness' | 'pagerank' | 'eigenvector') => void;
}

export const CentralityView: React.FC<CentralityViewProps> = ({
  nodes,
  leaderboard,
  selectedNodeId,
  onSelectNode,
  onApplyVisualMetric,
}) => {
  const [sortKey, setSortKey] = useState<keyof CentralityLeaderboardItem>('betweenness');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'bridges' | 'hubs'>('all');

  // Handle Sort Toggle
  const handleSort = (key: keyof CentralityLeaderboardItem) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Filter and sort items
  const filteredList = useMemo(() => {
    return leaderboard
      .filter((item) => {
        const matchesSearch =
          item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (filterType === 'bridges') return item.isBridge;
        if (filterType === 'hubs') return item.isHub;
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortKey] as number;
        const valB = b[sortKey] as number;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [leaderboard, searchTerm, filterType, sortKey, sortOrder]);

  // Max Degree and Max Betweenness for scatterplot
  const maxDegree = useMemo(
    () => Math.max(1, ...leaderboard.map((item) => item.degree)),
    [leaderboard]
  );
  const maxBetweenness = useMemo(
    () => Math.max(0.01, ...leaderboard.map((item) => item.betweenness)),
    [leaderboard]
  );

  return (
    <div className="space-y-6">
      {/* Metric Concept Summary Cards - 5 Centralities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => onApplyVisualMetric('degree')}
          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>度中心度 (Degree)</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              CD = kv / (N-1)
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">直接连通实力</div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            直连邻居数除以最大可能连通数，量化局部吞吐量与活跃度。
          </div>
          <div className="mt-2.5 text-[11px] font-medium text-blue-600 flex items-center gap-1">
            <span>画布高亮着色 →</span>
          </div>
        </div>

        <div
          onClick={() => onApplyVisualMetric('betweenness')}
          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-rose-400 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>介数中心度 (Betweenness)</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              CB = Σ σst(v)/σst
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">咽喉桥梁与结构洞</div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            穿过该节点的最短路径比例，掌控全网交通流动与通信命脉。
          </div>
          <div className="mt-2.5 text-[11px] font-medium text-rose-600 flex items-center gap-1">
            <span>画布高亮着色 →</span>
          </div>
        </div>

        <div
          onClick={() => onApplyVisualMetric('closeness')}
          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-emerald-400 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>接近中心度 (Closeness)</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              CC = (N-1) / Σd(v,u)
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">信息接收捷径度</div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            到全网所有其他节点的最短测地距离倒数，代表独立传播速度。
          </div>
          <div className="mt-2.5 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
            <span>画布高亮着色 →</span>
          </div>
        </div>

        <div
          onClick={() => onApplyVisualMetric('pagerank')}
          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-violet-400 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>PageRank 权威度</span>
            <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              PR = (1-d)/N + d·Σ
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">全局威望传导</div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            带阻尼因子的马尔可夫稳态游走概率，体现“受超级核心引用的高权重”。
          </div>
          <div className="mt-2.5 text-[11px] font-medium text-violet-600 flex items-center gap-1">
            <span>画布高亮着色 →</span>
          </div>
        </div>

        <div
          onClick={() => onApplyVisualMetric('eigenvector')}
          className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-teal-400 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>特征向量 (Eigenvector)</span>
            <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-mono font-semibold">
              Ax = λx
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">邻居权势扩散</div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
            节点权势取决于相连邻居的权势之和，由邻接矩阵主特征向量解出。
          </div>
          <div className="mt-2.5 text-[11px] font-medium text-teal-600 flex items-center gap-1">
            <span>画布高亮着色 →</span>
          </div>
        </div>
      </div>

      {/* Dedicated Mathematical Formulas & Formal Derivations Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>各网络指标与中心度计算公式手册（形式化数学推导）</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              严密对应图论、线性代数与统计物理标准推导公式及变量符号规范
            </p>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">
            标准无标度与加权图论公式规范
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Formula 1: 度中心度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">1. 度中心度 (Degree Centrality)</span>
              <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                局部活跃度
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-blue-900 font-semibold">无向图归一化：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                C<sub>D</sub>(v) = k<sub>v</sub> / (N - 1) = [ Σ<sub>u≠v</sub> A<sub>vu</sub> ] / (N - 1)
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                有向网络出入度细分：
                <br />• 入度中心度: C<sub>D</sub><sup>in</sup>(v) = k<sub>v</sub><sup>in</sup> / (N - 1) = [ Σ<sub>u</sub> A<sub>uv</sub> ] / (N - 1)
                <br />• 出度中心度: C<sub>D</sub><sup>out</sup>(v) = k<sub>v</sub><sup>out</sup> / (N - 1) = [ Σ<sub>u</sub> A<sub>vu</sub> ] / (N - 1)
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>N 为全网节点总数，k<sub>v</sub> 为节点直连度数，A 为邻接矩阵。入度体现受关注与权威度，出度体现主动发散辐射力。
            </p>
          </div>

          {/* Formula 2: 介数中心度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">2. 介数中心度 (Betweenness)</span>
              <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                咽喉中介率
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-rose-900 font-semibold">Brandes 算法标准式：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                C<sub>B</sub>(v) = Σ<sub>s≠v≠t</sub> [ σ<sub>st</sub>(v) / σ<sub>st</sub> ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                标准无向图无量纲归一化：
                <br />• C<sub>B</sub>'(v) = 2 · C<sub>B</sub>(v) / [ (N - 1)(N - 2) ]
                <br />• 有向图归一化分母为 (N - 1)(N - 2)
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>σ<sub>st</sub> 为节点 s 到 t 的最短测地路径总数，σ<sub>st</sub>(v) 为其中穿过节点 v 的最短路径数量。反映结构洞与卡脖子扼守能力。
            </p>
          </div>

          {/* Formula 3: 接近中心度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">3. 接近中心度 (Closeness)</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                测地捷径度
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-emerald-900 font-semibold">Sabidussi 连通图经典式：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                C<sub>C</sub>(v) = (N - 1) / [ Σ<sub>u≠v</sub> d(v, u) ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                Wasserman-Faust 非连通图修正公式：
                <br />• C<sub>C</sub>(v) = [ (N<sub>v</sub> - 1) / (N - 1) ] · [ (N<sub>v</sub> - 1) / Σ<sub>u∈R(v)</sub> d(v, u) ]
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>d(v, u) 为两点间最短跳数或最短距离，N<sub>v</sub> 为 v 所在连通分支规模。衡量信息摆脱中介、独立极速触达全网的能力。
            </p>
          </div>

          {/* Formula 4: PageRank */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">4. PageRank 权威度</span>
              <span className="font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                随机游走稳态
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-violet-900 font-semibold">马尔可夫转移递推方程：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                PR(v) = (1 - d) / N + d · Σ<sub>u∈In(v)</sub> [ PR(u) / Out(u) ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                矩阵向量代数形式：
                <br />• p = [ (1 - d)/N · E + d · A<sup>T</sup> D<sup>-1</sup> ] · p
                <br />• 阻尼因子通常取 d = 0.85
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>In(v) 为指向 v 的前驱节点集合，Out(u) 为节点 u 的出度。d 表达沿链接点击的概率，1-d 表达随机瞬间传送到全网任意节点的概率。
            </p>
          </div>

          {/* Formula 5: 特征向量中心度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">5. 特征向量中心度 (Eigenvector)</span>
              <span className="font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                矩阵主特征谱
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-teal-900 font-semibold">Bonacich 权势线性方程：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                x<sub>v</sub> = (1 / λ) · Σ<sub>u∈N(v)</sub> A<sub>vu</sub> x<sub>u</sub>  ⟺  A x = λ x
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                Perron-Frobenius 定理保证：
                <br />• λ 取非负实对称矩阵 A 的最大特征根 λ<sub>max</sub>(A)
                <br />• 对应特征向量 x<sub>v</sub> ≥ 0 即为中心度
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>相连节点不是孤立计算，而是赋予权重加成。连接一个超级 Hub 节点所带来的声望增益，远超连接十个边缘孤立节点。
            </p>
          </div>

          {/* Formula 6: 结构洞限制度与偏心度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">6. 结构洞限制度与偏心度</span>
              <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                伯特约束与半径
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-amber-900 font-semibold">Burt 限制度 (Constraint C):</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                C<sub>ij</sub> = ( p<sub>ij</sub> + Σ<sub>q≠i,j</sub> p<sub>iq</sub> p<sub>qj</sub> )<sup>2</sup>
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                节点偏心度 (Eccentricity):
                <br />• E(v) = max<sub>u∈V</sub> d(v, u)
                <br />• 全网半径: R = min<sub>v</sub> E(v)；网络直径: D = max<sub>v</sub> E(v)
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>限制度 C 越低，说明节点周围结构洞越丰富，跨界竞争和权力寻租空间越大；偏心度越低代表节点位于物理网络几何正中央。
            </p>
          </div>

          {/* Formula 7: 集聚系数 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">7. 局部集聚系数 (Clustering)</span>
              <span className="font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                抱团聚集度
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-cyan-900 font-semibold">Watts-Strogatz 定义式：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                C<sub>v</sub> = 2 · E<sub>v</sub> / [ k<sub>v</sub>(k<sub>v</sub> - 1) ] = (A<sup>3</sup>)<sub>vv</sub> / [ k<sub>v</sub>(k<sub>v</sub> - 1) ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                全网平均集聚系数：
                <br />• ⟨C⟩ = (1 / N) · Σ<sub>v</sub> C<sub>v</sub>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>E<sub>v</sub> 为节点 v 的直连邻居之间实际存在的连边数，k<sub>v</sub>(k<sub>v</sub>-1)/2 为邻居间最大可能连边数。量化“朋友的朋友也是朋友”的概率。
            </p>
          </div>

          {/* Formula 8: 平均路径长度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">8. 平均测地距离 (Avg Path Length)</span>
              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                传输效率
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-indigo-900 font-semibold">全网平均最短跳数：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                L = [ 1 / (N(N - 1)) ] · Σ<sub>i≠j</sub> d(i, j)
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                全局网络通信效率：
                <br />• E<sub>glob</sub> = [ 1 / (N(N - 1)) ] · Σ<sub>i≠j</sub> [ 1 / d(i, j) ]
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>d(i, j) 为节点 i 到 j 的最短路径跨度。在小世界网络中，L 随节点数 N 呈对数级增长 L ~ ln(N)，具备超快信息流动特征。
            </p>
          </div>

          {/* Formula 9: 网络密度与度异质度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">9. 网络密度与度异质度 (Density)</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                致密与分化
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-emerald-900 font-semibold">无向图网络密度：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                ρ = 2 · M / [ N(N - 1) ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                度分布方差与异质度：
                <br />• κ = ⟨k<sup>2</sup>⟩ / ⟨k⟩，无标度网络中 κ 极高
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>M 为总边数，N 为总节点数。度异质度 κ 决定了渗流临界点与流行病无阈值暴发特性。
            </p>
          </div>

          {/* Formula 10: 代数连通度 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">10. 代数连通度 (Fiedler Value)</span>
              <span className="font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                抗割裂韧性
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-violet-900 font-semibold">拉普拉斯矩阵特征值：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                λ<sub>2</sub>(L) = min<sub>x⊥1, x≠0</sub> [ (x<sup>T</sup> L x) / (x<sup>T</sup> x) ]
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                L = D - A, 0 = λ<sub>1</sub> ≤ λ<sub>2</sub> ≤ ... ≤ λ<sub>N</sub>
                <br />• λ<sub>2</sub> &gt; 0 当且仅当全网连通
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>λ<sub>2</sub> 越大，表明网络抵抗割裂的能力越强；当 λ<sub>2</sub> 趋近于 0 时，极易被单一边或节点割裂为孤立子网。
            </p>
          </div>

          {/* Formula 11: 谱半径与传播阈值 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">11. 谱半径与传播阈值 (Threshold)</span>
              <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                暴发临界点
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-rose-900 font-semibold">邻接矩阵谱半径：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                ρ(A) = max<sub>i</sub> |λ<sub>i</sub>(A)|,  τ<sub>c</sub> = 1 / ρ(A)
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                流行病暴发条件：
                <br />• 有效传播率 β / γ &gt; τ<sub>c</sub> 时爆发
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>β 为连边感染概率，γ 为康复/清除率。降低关键 Hub 节点的度数可直接压低谱半径 ρ(A)，提升暴发阈值。
            </p>
          </div>

          {/* Formula 12: 渗流崩塌阈值 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">12. 渗流崩塌临界阈值 (Percolation)</span>
              <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                鲁棒与脆弱
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-center text-slate-800 space-y-1 shadow-2xs">
              <div className="text-amber-900 font-semibold">Cohen-Havlin 随机与蓄意式：</div>
              <div className="text-xs py-1 bg-slate-50 rounded">
                f<sub>c</sub><sup>rand</sup> = 1 - 1 / ( [ ⟨k<sup>2</sup>⟩ / ⟨k⟩ ] - 1 )
              </div>
              <div className="text-[10px] text-slate-500 text-left pt-1">
                蓄意攻击关键 Hub 阈值：
                <br />• f<sub>c</sub><sup>target</sup> ≪ f<sub>c</sub><sup>rand</sup> (通常仅需 5%~10% 节点)
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>变量释义：</strong>f<sub>c</sub> 为导致巨型连通分量瓦解的临界移除比例。无标度网络对随机失效近乎免疫，但对针对性打击致命脆弱。
            </p>
          </div>
        </div>
      </div>

      {/* Degree vs Betweenness Correlation Scatterplot */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>度 vs. 介数二维关联散点图（识别结构洞桥梁）</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              左上方象限聚集了典型的“度数低但介数极高”的咽喉节点，对全网连通性起决定性中介作用
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> 结构洞桥梁 (Bridge)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> 巨型中枢 (Hub)
            </span>
          </div>
        </div>

        {/* Scatterplot Canvas SVG */}
        <div className="relative w-full h-64 bg-slate-50 rounded-lg border border-slate-200/80 p-4 overflow-hidden">
          {/* Quadrant split guide */}
          <div className="absolute left-1/2 top-0 bottom-0 border-r border-dashed border-slate-300 pointer-events-none" />
          <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-300 pointer-events-none" />
          <div className="absolute top-2 left-3 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            ★ 关键咽喉区（低度数、高介数）
          </div>
          <div className="absolute top-2 right-3 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            ★ 超级核心区（高度数、高介数）
          </div>

          <svg className="w-full h-full overflow-visible">
            {leaderboard.map((item) => {
              // Normalized to 5% ~ 95%
              const cx = 5 + (item.degree / maxDegree) * 90;
              const cy = 95 - (item.betweenness / maxBetweenness) * 90;
              const isSelected = item.id === selectedNodeId;

              let fillColor = '#64748b';
              if (item.isBridge) fillColor = '#e11d48';
              else if (item.isHub) fillColor = '#2563eb';

              return (
                <g
                  key={item.id}
                  className="cursor-pointer group"
                  onClick={() => onSelectNode(item.id)}
                >
                  <circle
                    cx={`${cx}%`}
                    cy={`${cy}%`}
                    r={isSelected ? 8 : item.isBridge ? 6.5 : 5}
                    fill={fillColor}
                    stroke={isSelected ? '#facc15' : '#ffffff'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all hover:r-7"
                  />
                  <text
                    x={`${cx}%`}
                    y={`${cy - 3}%`}
                    fontSize="9"
                    textAnchor="middle"
                    fill="#334155"
                    className="font-mono opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  >
                    {item.label} (k={item.degree}, B={item.betweenness.toFixed(3)})
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Axes labels */}
          <div className="absolute bottom-1 right-3 text-[10px] font-mono text-slate-500">
            连通度 Degree (k) →
          </div>
          <div className="absolute top-1 left-2 text-[10px] font-mono text-slate-500">
            ↑ 介数 Betweenness
          </div>
        </div>
      </div>

      {/* Leaderboard Ranking Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900 text-sm">节点多维中心性排行榜</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              共 {filteredList.length} 个节点
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded transition ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('bridges')}
                className={`px-2.5 py-1 rounded transition ${
                  filterType === 'bridges'
                    ? 'bg-white text-rose-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                结构洞桥梁
              </button>
              <button
                onClick={() => setFilterType('hubs')}
                className={`px-2.5 py-1 rounded transition ${
                  filterType === 'hubs'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                超级 Hub
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="搜索节点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 w-36"
              />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <th className="p-2.5 text-center w-12">#</th>
                <th className="p-2.5">节点名称</th>
                <th
                  onClick={() => handleSort('degree')}
                  className="p-2.5 cursor-pointer hover:text-indigo-600 transition"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>度数 (k)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('betweenness')}
                  className="p-2.5 cursor-pointer hover:text-indigo-600 transition"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>介数中心性</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('closeness')}
                  className="p-2.5 cursor-pointer hover:text-indigo-600 transition"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>接近中心性</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pagerank')}
                  className="p-2.5 cursor-pointer hover:text-indigo-600 transition"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>PageRank</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('eigenvector')}
                  className="p-2.5 cursor-pointer hover:text-indigo-600 transition"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>特征向量</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-2.5 text-center">拓扑角色特征</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((item, idx) => {
                const isSelected = item.id === selectedNodeId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectNode(item.id)}
                    className={`cursor-pointer transition hover:bg-slate-50/80 ${
                      isSelected ? 'bg-amber-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium text-slate-900">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-800 font-medium">
                      {item.degree}
                    </td>
                    <td className="p-2.5 font-mono text-rose-600 font-medium">
                      {item.betweenness.toFixed(4)}
                    </td>
                    <td className="p-2.5 font-mono text-emerald-600">
                      {item.closeness.toFixed(4)}
                    </td>
                    <td className="p-2.5 font-mono text-violet-600 font-medium">
                      {item.pagerank.toFixed(4)}
                    </td>
                    <td className="p-2.5 font-mono text-teal-600">
                      {item.eigenvector.toFixed(4)}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.isBridge && (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                            结构洞桥梁
                          </span>
                        )}
                        {item.isHub && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                            核心 Hub
                          </span>
                        )}
                        {!item.isBridge && !item.isHub && (
                          <span className="text-[10px] text-slate-400">常规边缘节点</span>
                        )}
                      </div>
                    </td>
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
