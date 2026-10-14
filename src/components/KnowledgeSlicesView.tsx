import React, { useState } from 'react';
import {
  BookOpen,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const KnowledgeSlicesView: React.FC = () => {
  const [activeSlice, setActiveSlice] = useState<number>(1);
  const [quizAnswered, setQuizAnswered] = useState<Record<number, number | null>>({});

  const handleSelectQuiz = (qIdx: number, optIdx: number) => {
    setQuizAnswered((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  return (
    <div className="space-y-6">
      {/* Slice Selector Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>网络要素</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              淡雅大方多维切片，夯实拓扑代数、容错相变机制与防范致命分析误区
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {[
            { id: 1, title: '切片一: 基本要素拓扑表达', tag: '点/线/向/权' },
            { id: 2, title: '切片二: 无标度 vs. 随机容错', tag: '鲁棒且脆弱' },
            { id: 3, title: '切片三: 三大致命分析陷阱', tag: '防踩坑指南' },
            { id: 4, title: '切片四: 误区警示与诊断陷阱', tag: '度高≠最关键' },
          ].map((slice) => (
            <button
              key={slice.id}
              onClick={() => setActiveSlice(slice.id)}
              className={`p-3 rounded-xl border text-left transition ${
                activeSlice === slice.id
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-[10px] font-mono text-indigo-600 font-bold">SLICE 0{slice.id}</div>
              <div className="font-semibold text-slate-900 mt-0.5">{slice.title}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{slice.tag}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Slice Content Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-5">
        {/* 切片一 */}
        {activeSlice === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                切片一
              </span>
              <h4 className="text-base font-bold text-slate-900">
                网络基本要素的拓扑表达：点、边、方向与权重
              </h4>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              复杂网络本质上由<strong>点（Vertices / Nodes）</strong>与<strong>线（Edges / Links）</strong>构成基础拓扑骨架：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>1. 实体抽象：点 (Nodes)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  代表真实物理或抽象系统中的独立主体。例如：社交网络中的用户、全球物流网络中的海港航站、电网中的变电母线、金融网络中的借贷银行。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>2. 相互作用：线 (Edges)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  代表实体间的关联纽带。线可分为<strong>无向边</strong>（对等双向交互，如光纤物理连接、同盟关系）与<strong>有向弧</strong>（具备主从、因果或物流单向流动，如金融拆借、社交关注、电流传输）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                  <span>3. 连边权重 (Edge Weights)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  并非所有连接都对等。权重量化连通强弱：航线吞吐量（TEU/年）、电网传输阻抗与容量、银行间同业负债敞口。在加权网络中，加权邻接矩阵 $W_{`{ij}`} \ne A_{`{ij}`}$。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                  <span>4. 矩阵代数形式化</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  邻接矩阵 A ∈ ℝ<sup>N×N</sup>、度矩阵 D = diag(k<sub>1</sub>, ..., k<sub>N</sub>)，以及拉普拉斯矩阵 L = D - A 构成了谱图论求解全网代数连通度的数学基石。
                </p>
              </div>
            </div>

            {/* Core Metrics Calculation Formula Cheat Sheet in Slice 1 */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>各网络指标计算公式速览表 (Formulas Summary)</span>
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-2">指标类别</th>
                      <th className="p-2">指标名称</th>
                      <th className="p-2 font-mono">数学计算公式</th>
                      <th className="p-2">参数符号与物理含义</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-blue-700">节点中心度</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">度中心度 (Degree)</td>
                      <td className="p-2 font-bold text-blue-900">C<sub>D</sub>(v) = k<sub>v</sub> / (N - 1)</td>
                      <td className="p-2 font-sans text-slate-600">k<sub>v</sub>: 节点连通度; N: 全网节点总数</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-rose-700">节点中心度</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">介数中心度 (Betweenness)</td>
                      <td className="p-2 font-bold text-rose-900">C<sub>B</sub>(v) = Σ<sub>s≠v≠t</sub> [ σ<sub>st</sub>(v) / σ<sub>st</sub> ]</td>
                      <td className="p-2 font-sans text-slate-600">σ<sub>st</sub>: 最短路径总数; σ<sub>st</sub>(v): 经由 v 的最短路径数</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-emerald-700">节点中心度</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">接近中心度 (Closeness)</td>
                      <td className="p-2 font-bold text-emerald-900">C<sub>C</sub>(v) = (N - 1) / [ Σ<sub>u≠v</sub> d(v, u) ]</td>
                      <td className="p-2 font-sans text-slate-600">d(v, u): 最短测地路径跳数或距离</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-violet-700">节点中心度</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">PageRank 权威度</td>
                      <td className="p-2 font-bold text-violet-900">PR(v) = (1-d)/N + d·Σ<sub>u∈In(v)</sub> [PR(u)/Out(u)]</td>
                      <td className="p-2 font-sans text-slate-600">d: 阻尼因子 (0.85); In/Out: 入度与出度邻居</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-teal-700">节点中心度</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">特征向量中心度</td>
                      <td className="p-2 font-bold text-teal-900">A · x = λ<sub>max</sub> · x</td>
                      <td className="p-2 font-sans text-slate-600">A: 邻接矩阵; x: 主特征值对应特征向量</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-indigo-700">谱图论指标</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">代数连通度 (Fiedler值)</td>
                      <td className="p-2 font-bold text-indigo-900">λ₂(L) = min<sub>x⊥1</sub> [ (x<sup>T</sup> L x)/(x<sup>T</sup> x) ]</td>
                      <td className="p-2 font-sans text-slate-600">L = D - A; λ₂ 表征网络二分割抗割裂韧性</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-purple-700">动态传播</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">流行病传播临界阈值</td>
                      <td className="p-2 font-bold text-purple-900">τ<sub>c</sub> = 1 / ρ(A)</td>
                      <td className="p-2 font-sans text-slate-600">ρ(A): 邻接矩阵谱半径; 当 β/γ &gt; τ<sub>c</sub> 暴发</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-amber-700">鲁棒性相变</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">渗流崩溃阈值 (Cohen)</td>
                      <td className="p-2 font-bold text-amber-900">f<sub>c</sub><sup>rand</sup> = 1 - 1 / (κ - 1)</td>
                      <td className="p-2 font-sans text-slate-600">κ = ⟨k²⟩/⟨k⟩: 度异质度; 随机移除临界比例</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="p-2 font-sans font-medium text-slate-700">社区结构</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">Newman 模块度 (Modularity)</td>
                      <td className="p-2 font-bold text-slate-900">Q = (1/2m)·Σ [ A<sub>ij</sub> - (k<sub>i</sub>k<sub>j</sub>)/(2m) ] δ(c<sub>i</sub>, c<sub>j</sub>)</td>
                      <td className="p-2 font-sans text-slate-600">m: 总边数; δ: 同属一社区为 1，否则为 0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 切片二 */}
        {activeSlice === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                切片二
              </span>
              <h4 className="text-base font-bold text-slate-900">
                无标度网络 vs. 随机网络容错差异：阿喀琉斯之踵
              </h4>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              统计物理学揭示了不同网络拓扑在面临外力攻击时的巨大韧性分异：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <h5 className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span>无标度网络 (Scale-Free Network)</span>
                </h5>
                <ul className="space-y-1.5 text-blue-900 list-disc list-inside">
                  <li><strong>度分布：</strong>遵循幂律衰减 $P(k) \sim k^{`{-\\gamma}`}$ (典型 $\gamma \approx 2 \sim 3$)。</li>
                  <li><strong>“鲁棒且脆弱 (Robust yet Fragile)”特性：</strong></li>
                  <li><strong>对随机故障极具鲁棒性：</strong>绝大多数节点度数极低，随机移除节点几乎不影响主干连通（$f_c^{`{\\text{rand}}`} \to 1$ 当 $N \to \infty$）。</li>
                  <li><strong>对蓄意打击致命脆弱：</strong>只需精准干预或摧毁前 $5\% \sim 15\%$ 的关键超级 Hub，巨型连通分量便发生相变瞬间崩解。</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>随机网络 (Erdős-Rényi Random Network)</span>
                </h5>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  <li><strong>度分布：</strong>呈现经典的泊松分布 $P(k) \approx e^{`{-\\langle k \\rangle}`} \\frac{`{\\langle k \\rangle^k}`}{`{k!}`}$。</li>
                  <li><strong>节点同质性高：</strong>节点度数均围绕均值 $\langle k \rangle$ 窄幅震荡，不存在极端掌权的超级大 Hub。</li>
                  <li><strong>容错行为对称：</strong>面对随机失效与蓄意攻击，其崩塌阈值 $f_c$ 差异较小，渗流断裂呈现平滑的二阶连续相变。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 切片三 */}
        {activeSlice === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                切片三
              </span>
              <h4 className="text-base font-bold text-slate-900">
                三大致命分析陷阱 (Anti-Pitfalls)
              </h4>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>陷阱一：忽略边权重导致关键节点中心性失真</span>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  <strong>典型反例：</strong>在金融间拆借网络中，若将 10 笔各 10 万元的微额往来与 1 笔 100 亿元的系统性对冲借贷同等计作一条连边，将得出“小微信用社度数高于超大型国有银行”的荒谬结论，从而彻底漏判系统性金融风险源头。
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>陷阱二：在未验证网络无标度特性时盲目套用平均度指标</span>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  <strong>典型反例：</strong>在无标度网络中，度二阶矩发散 $\langle k^2 \rangle \to \infty$，系统方差极大。单纯引用平均度 $\langle k \rangle$ 无法反映系统真实的连通概率；必须依据二阶异质度 $\kappa = \frac{`{\\langle k^2 \\rangle}`}{`{\\langle k \\rangle}`}$ 评估渗流与相变临界点。
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>陷阱三：未考虑信息传播临界阈值盲目评估扩散范围</span>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  <strong>典型反例：</strong>SIR 流行病动力学表明，若传播率与平息率之比 {'\\beta / \\gamma < 1 / \\rho(A)'}，即使投入高烈度种子感染源，扰动也将指数衰减并自行平息；盲目实施全网无差别封控将徒增系统运行能耗。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 切片四 */}
        {activeSlice === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                切片四
              </span>
              <h4 className="text-base font-bold text-slate-900">
                误区警示与诊断陷阱：警惕“度高即一定最关键”
              </h4>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>伯特“结构洞理论 (Structural Holes)”与跨界桥梁价值</span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                在许多企业组织或海运航运网络中，某些“低度数”节点连接着两个庞大互不通联的紧密社区。
                例如：苏伊士运河的度数仅为 2（北接欧洲航线，南连红海），但其<strong>介数中心性（Betweenness Centrality）</strong>位列全球前三。如果单纯按度数（Degree）过滤关键节点，苏伊士运河将被错误判为边缘节点并忽略防护，一旦受阻将触发欧亚海运全线停摆！
              </p>
            </div>

            {/* Quick Interactive Knowledge Check Quiz */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <h5 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>实战知识快测：检验您的拓扑洞察力</span>
              </h5>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <p className="font-medium text-slate-800">
                  问题：在无标度网络中，如果要用最小代价阻断谣言或病毒的大规模裂变扩散，最优方案是？
                </p>
                <div className="space-y-1.5 pt-1">
                  {[
                    { id: 0, text: 'A. 全网随机抽样 50% 用户实施全面封禁', correct: false },
                    { id: 1, text: 'B. 优先靶向免疫度数与介数位居前列的少数关键 Hub 及结构洞博主', correct: true },
                    { id: 2, text: 'C. 仅对网络中度数最低的边缘用户实施隔离', correct: false },
                  ].map((opt) => {
                    const answered = quizAnswered[0];
                    const isSelected = answered === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectQuiz(0, opt.id)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center justify-between ${
                          isSelected
                            ? opt.correct
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {isSelected && (
                          opt.correct ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
