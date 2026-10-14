import React, { useState, useMemo } from 'react';
import { NetworkGraph, GraphNode, GraphEdge } from './types/network';
import { generateBANetwork } from './utils/generators';
import { computeCentralities } from './utils/centrality';
import { detectCommunitiesLouvain } from './utils/community';
import { CaseStudy } from './utils/cases';
import { Header, ActiveTabId } from './components/Header';
import { NetworkCanvas } from './components/NetworkCanvas';
import { TopologyAlgebraView } from './components/TopologyAlgebraView';
import { NetworkModelingView } from './components/NetworkModelingView';
import { CentralityView } from './components/CentralityView';
import { CommunityView } from './components/CommunityView';
import { CasesView } from './components/CasesView';
import { CodeEngineView } from './components/CodeEngineView';
import { WorkflowGuideView } from './components/WorkflowGuideView';
import { ReportExportView } from './components/ReportExportView';
import { KnowledgeSlicesView } from './components/KnowledgeSlicesView';
import { AiDiagnosisModal } from './components/AiDiagnosisModal';
import { stepSIR, stepCascadingFailure } from './utils/simulations';

export default function App() {
  // Current Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTabId>('algebra');

  // Network Graph State - Default initialized with a Barabási-Albert Scale-Free network
  const [graph, setGraph] = useState<NetworkGraph>(() => generateBANetwork(32, 2));

  // Visual Coloring Mode for Canvas
  const [colorMetric, setColorMetric] = useState<
    'default' | 'degree' | 'betweenness' | 'closeness' | 'pagerank' | 'eigenvector' | 'community' | 'cascade' | 'sir'
  >('default');

  // Selected Node for Inspection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Connecting Edge Interactive Mode
  const [isConnectingEdges, setIsConnectingEdges] = useState<boolean>(false);

  // AI Diagnosis Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Louvain Community Detection
  const { nodeCommunities, modularity } = useMemo(
    () => detectCommunitiesLouvain(graph.nodes, graph.edges),
    [graph.nodes, graph.edges]
  );

  // Update nodes with community groups
  const nodesWithCommunities = useMemo(() => {
    return graph.nodes.map((node) => ({
      ...node,
      group: nodeCommunities.get(node.id) ?? 0,
    }));
  }, [graph.nodes, nodeCommunities]);

  // Compute 5 Centralities & Network Stats
  const { nodesWithCentrality, leaderboard, stats } = useMemo(() => {
    const computed = computeCentralities(nodesWithCommunities, graph.edges, graph.isDirected);
    return {
      ...computed,
      stats: {
        ...computed.stats,
        modularity,
      },
    };
  }, [nodesWithCommunities, graph.edges, graph.isDirected, modularity]);

  // Handle Adding Edge interactively
  const handleAddEdge = (source: string, target: string) => {
    // Avoid self-loops or multi-edges
    const exists = graph.edges.some(
      (e) => (e.source === source && e.target === target) || (!graph.isDirected && e.source === target && e.target === source)
    );
    if (!exists && source !== target) {
      setGraph((prev) => ({
        ...prev,
        edges: [...prev.edges, { source, target, weight: 1, directed: prev.isDirected }],
      }));
    }
    setIsConnectingEdges(false);
  };

  // Handle Scenario trigger from Case Studies
  const handleTriggerCaseScenario = (caseItem: CaseStudy) => {
    if (caseItem.actionScenario === 'chokepoint') {
      // Simulate Suez Canal Blockade: remove Suez node or mark failed
      setGraph((prev) => {
        const suez = prev.nodes.find((n) => n.id === 'suez');
        const updated = prev.nodes.map((n) =>
          n.id === 'suez' ? { ...n, status: 'failed' as const, label: '苏伊士运河 (已搁浅封锁!)' } : n
        );
        return { ...prev, nodes: updated };
      });
      setColorMetric('cascade');
    } else if (caseItem.actionScenario === 'cascade') {
      // Trigger Central Substation trip
      const inited = graph.nodes.map((n) => ({
        ...n,
        load: n.initialLoad || 30,
        capacity: n.capacity || 50,
        status: n.id === 'sub_alpha' ? ('failed' as const) : ('normal' as const),
      }));
      setGraph((prev) => ({ ...prev, nodes: inited }));
      setColorMetric('cascade');
    } else if (caseItem.actionScenario === 'sir') {
      // Seed viral infection on KOL
      const sirInited = graph.nodes.map((n) => ({
        ...n,
        status: n.id === 'kol_tech' ? ('infected' as const) : ('susceptible' as const),
      }));
      setGraph((prev) => ({ ...prev, nodes: sirInited }));
      setColorMetric('sir');
    } else if (caseItem.actionScenario === 'louvain') {
      setColorMetric('community');
    } else if (caseItem.actionScenario === 'smallworld') {
      setColorMetric('betweenness');
    } else if (caseItem.actionScenario === 'financial') {
      // G-SIB default
      const finInited = graph.nodes.map((n) => ({
        ...n,
        status: n.id === 'gsib_alpha' ? ('failed' as const) : ('normal' as const),
      }));
      setGraph((prev) => ({ ...prev, nodes: finInited }));
      setColorMetric('cascade');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Top Interactive Canvas Card */}
        <section className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">
                {graph.name}
              </span>
              <span className="text-xs bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                {graph.isDirected ? '有向图' : '无向图'}
              </span>
            </div>

            {/* Quick Canvas Render Mode Switcher */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs bg-white p-1 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 text-[11px] px-1.5 hidden sm:inline">画布着色:</span>
              {(
                [
                  { id: 'default', label: '默认' },
                  { id: 'degree', label: '度数' },
                  { id: 'betweenness', label: '介数 (咽喉)' },
                  { id: 'closeness', label: '接近度' },
                  { id: 'pagerank', label: 'PageRank' },
                  { id: 'community', label: 'Louvain 社区' },
                  { id: 'cascade', label: '级联状态' },
                  { id: 'sir', label: 'SIR 状态' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setColorMetric(m.id)}
                  className={`px-2 py-1 rounded transition text-xs ${
                    colorMetric === m.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Force-Directed Canvas */}
          <NetworkCanvas
            nodes={nodesWithCentrality}
            edges={graph.edges}
            isDirected={graph.isDirected}
            colorMetric={colorMetric}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            interactiveAddEdge={isConnectingEdges}
            onAddEdge={handleAddEdge}
            height={520}
          />
        </section>

        {/* Tab Module Views */}
        <section className="pt-2">
          {activeTab === 'algebra' && (
            <TopologyAlgebraView
              nodes={nodesWithCentrality}
              edges={graph.edges}
              isDirected={graph.isDirected}
            />
          )}

          {activeTab === 'modeling' && (
            <NetworkModelingView
              graph={graph}
              onUpdateGraph={setGraph}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              isConnectingEdges={isConnectingEdges}
              setIsConnectingEdges={setIsConnectingEdges}
            />
          )}

          {activeTab === 'centrality' && (
            <CentralityView
              nodes={nodesWithCentrality}
              leaderboard={leaderboard}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onApplyVisualMetric={(m) => setColorMetric(m)}
            />
          )}

          {activeTab === 'community' && (
            <CommunityView
              nodes={nodesWithCentrality}
              edges={graph.edges}
              onApplyCommunityColors={() => setColorMetric('community')}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}

          {activeTab === 'cases' && (
            <CasesView
              onLoadCaseGraph={(caseGraph) => {
                setGraph(caseGraph);
                setSelectedNodeId(null);
              }}
              onTriggerScenario={handleTriggerCaseScenario}
              currentGraphName={graph.name}
            />
          )}

          {activeTab === 'code' && <CodeEngineView graph={graph} />}

          {activeTab === 'workflow' && (
            <WorkflowGuideView
              graph={{ ...graph, nodes: nodesWithCentrality }}
              stats={stats}
              onUpdateNodes={(updated) => setGraph((prev) => ({ ...prev, nodes: updated }))}
              onJumpToModule={(mod) => {
                if (mod === 'algebra') setActiveTab('algebra');
                else if (mod === 'modeling') setActiveTab('modeling');
                else if (mod === 'centrality') setActiveTab('centrality');
                else if (mod === 'community') setActiveTab('community');
                else if (mod === 'cases') setActiveTab('cases');
                else if (mod === 'report') setActiveTab('report');
              }}
            />
          )}

          {activeTab === 'report' && (
            <ReportExportView
              graph={graph}
              stats={stats}
              leaderboard={leaderboard}
              onLoadCaseGraph={(caseGraph) => {
                setGraph(caseGraph);
                setSelectedNodeId(null);
              }}
              onJumpToTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'knowledge' && <KnowledgeSlicesView />}
        </section>
      </main>

      {/* Floating AI Consultation Dialog */}
      <AiDiagnosisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        stats={stats}
        nodes={nodesWithCentrality}
        edges={graph.edges}
      />
    </div>
  );
}
