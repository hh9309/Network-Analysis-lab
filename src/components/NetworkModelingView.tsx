import React, { useState } from 'react';
import { NetworkGraph, GraphNode, GraphEdge } from '../types/network';
import {
  generateBANetwork,
  generateWSNetwork,
  generateERNetwork,
  generateGridNetwork,
} from '../utils/generators';
import { Plus, Trash2, Link, Shuffle, Network, HelpCircle, ArrowRightLeft } from 'lucide-react';

interface NetworkModelingViewProps {
  graph: NetworkGraph;
  onUpdateGraph: (graph: NetworkGraph) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  isConnectingEdges: boolean;
  setIsConnectingEdges: (val: boolean) => void;
}

export const NetworkModelingView: React.FC<NetworkModelingViewProps> = ({
  graph,
  onUpdateGraph,
  selectedNodeId,
  onSelectNode,
  isConnectingEdges,
  setIsConnectingEdges,
}) => {
  // Generator Parameters
  const [modelType, setModelType] = useState<'BA' | 'WS' | 'ER' | 'Grid'>('BA');
  const [baN, setBaN] = useState<number>(32);
  const [baM, setBaM] = useState<number>(2);

  const [wsN, setWsN] = useState<number>(32);
  const [wsK, setWsK] = useState<number>(4);
  const [wsP, setWsP] = useState<number>(0.15);

  const [erN, setErN] = useState<number>(32);
  const [erP, setErP] = useState<number>(0.12);

  const [gridW, setGridW] = useState<number>(5);
  const [gridH, setGridH] = useState<number>(5);

  // New Node Form
  const [newNodeLabel, setNewNodeLabel] = useState<string>('');

  // Handle Generator Execution
  const handleGenerate = () => {
    let newG: NetworkGraph;
    if (modelType === 'BA') {
      newG = generateBANetwork(baN, baM);
    } else if (modelType === 'WS') {
      newG = generateWSNetwork(wsN, wsK, wsP);
    } else if (modelType === 'ER') {
      newG = generateERNetwork(erN, erP);
    } else {
      newG = generateGridNetwork(gridW, gridH);
    }
    onUpdateGraph(newG);
    onSelectNode(null);
  };

  // Add custom node
  const handleAddNode = () => {
    const id = `node_${Date.now().toString().slice(-4)}`;
    const label = newNodeLabel.trim() || `Node-${graph.nodes.length + 1}`;
    const newNode: GraphNode = {
      id,
      label,
      x: 350 + (Math.random() - 0.5) * 100,
      y: 280 + (Math.random() - 0.5) * 100,
      category: '自定义',
      degree: 0,
    };
    onUpdateGraph({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });
    setNewNodeLabel('');
    onSelectNode(newNode.id);
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    const remainingNodes = graph.nodes.filter((n) => n.id !== selectedNodeId);
    const remainingEdges = graph.edges.filter(
      (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
    );
    onUpdateGraph({
      ...graph,
      nodes: remainingNodes,
      edges: remainingEdges,
    });
    onSelectNode(null);
  };

  // Randomize edge weights
  const handleRandomizeWeights = () => {
    const updatedEdges = graph.edges.map((e) => ({
      ...e,
      weight: Math.floor(Math.random() * 5) + 1,
    }));
    onUpdateGraph({
      ...graph,
      edges: updatedEdges,
    });
  };

  // Toggle directed / undirected
  const handleToggleDirected = () => {
    onUpdateGraph({
      ...graph,
      isDirected: !graph.isDirected,
      edges: graph.edges.map((e) => ({ ...e, directed: !graph.isDirected })),
    });
  };

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-6">
      {/* Topology Generator Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-600" />
              <span>经典复杂网络模型生成器</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              快速生成无标度 (BA)、小世界 (WS)、随机图 (ER) 与网格晶格模型
            </p>
          </div>

          {/* Model Type Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['BA', 'WS', 'ER', 'Grid'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setModelType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  modelType === type
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'BA' && 'BA 无标度模型'}
                {type === 'WS' && 'WS 小世界模型'}
                {type === 'ER' && 'ER 随机网络'}
                {type === 'Grid' && '网格晶格'}
              </button>
            ))}
          </div>
        </div>

        {/* Model Specific Parameter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {modelType === 'BA' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>节点总数 N</span>
                  <span className="font-mono text-indigo-600 font-semibold">{baN}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={baN}
                  onChange={(e) => setBaN(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
                <span className="text-[11px] text-slate-400">系统实体规模</span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>新节点连接边数 m</span>
                  <span className="font-mono text-indigo-600 font-semibold">{baM}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={baM}
                  onChange={(e) => setBaM(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
                <span className="text-[11px] text-slate-400">偏好连接密度系数</span>
              </div>
            </>
          )}

          {modelType === 'WS' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>节点总数 N</span>
                  <span className="font-mono text-indigo-600 font-semibold">{wsN}</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="70"
                  value={wsN}
                  onChange={(e) => setWsN(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>近邻连边数 k (偶数)</span>
                  <span className="font-mono text-indigo-600 font-semibold">{wsK}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="2"
                  value={wsK}
                  onChange={(e) => setWsK(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>重连概率 p</span>
                  <span className="font-mono text-indigo-600 font-semibold">{wsP.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={wsP}
                  onChange={(e) => setWsP(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
            </>
          )}

          {modelType === 'ER' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>节点总数 N</span>
                  <span className="font-mono text-indigo-600 font-semibold">{erN}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={erN}
                  onChange={(e) => setErN(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>连接概率 p</span>
                  <span className="font-mono text-indigo-600 font-semibold">{erP.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.02"
                  max="0.35"
                  step="0.01"
                  value={erP}
                  onChange={(e) => setErP(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
            </>
          )}

          {modelType === 'Grid' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>网格宽度 W</span>
                  <span className="font-mono text-indigo-600 font-semibold">{gridW}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={gridW}
                  onChange={(e) => setGridW(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 flex justify-between">
                  <span>网格高度 H</span>
                  <span className="font-mono text-indigo-600 font-semibold">{gridH}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={gridH}
                  onChange={(e) => setGridH(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600"
                />
              </div>
            </>
          )}

          <div>
            <button
              onClick={handleGenerate}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              即时生成拓扑网络
            </button>
          </div>
        </div>

        {/* Model Info Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <strong>当前模型描述:</strong> {graph.description || '自定义构建的网络拓扑结构。'}
        </div>
      </div>

      {/* Manual Graph Editing & Node Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Interactive Editing Toolbar */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <h4 className="font-semibold text-slate-900 text-sm flex items-center justify-between">
            <span>点边交互与拓扑编辑工具箱</span>
            <span className="text-xs font-normal text-slate-500">
              当前: {graph.nodes.length} 节点 / {graph.edges.length} 边
            </span>
          </h4>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsConnectingEdges(!isConnectingEdges)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                isConnectingEdges
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>{isConnectingEdges ? '正在连线 (点击两点)' : '开启连线模式'}</span>
            </button>

            <button
              onClick={handleToggleDirected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>切换为{graph.isDirected ? '无向图' : '有向图'}</span>
            </button>

            <button
              onClick={handleRandomizeWeights}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              title="赋予边随机权值 1~5"
            >
              <Shuffle className="w-3.5 h-3.5 text-slate-500" />
              <span>随机边权重</span>
            </button>

            <button
              disabled={!selectedNodeId}
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除选中节点</span>
            </button>
          </div>

          {/* Add Node Subform */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="输入新节点名称 (例如: 广州核心枢纽)..."
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加新节点</span>
            </button>
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <h4 className="font-semibold text-slate-900 text-sm mb-3">节点属性探针</h4>
          {selectedNode ? (
            <div className="space-y-2 text-xs">
              <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                <div className="text-[10px] text-indigo-600 font-medium">节点名称</div>
                <div className="text-sm font-bold text-indigo-950 font-mono mt-0.5">
                  {selectedNode.label || selectedNode.id}
                </div>
                <div className="text-[10px] text-slate-500">ID: {selectedNode.id}</div>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-600">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span>连通度 (Degree):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedNode.degree ?? 0}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span>介数中心性:</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {(selectedNode.betweenness ?? 0).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span>接近中心性:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {(selectedNode.closeness ?? 0).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span>PageRank 评分:</span>
                  <span className="font-mono font-semibold text-violet-600">
                    {(selectedNode.pagerank ?? 0).toFixed(4)}
                  </span>
                </div>
                {selectedNode.group !== undefined && (
                  <div className="flex justify-between py-0.5">
                    <span>归属社群:</span>
                    <span className="font-mono font-semibold text-amber-600">
                      Community-{selectedNode.group}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              请在上方画布中单击任意节点查看详细属性与连接流向
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
