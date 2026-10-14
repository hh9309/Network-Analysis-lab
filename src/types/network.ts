export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  group?: number;
  category?: string;
  degree?: number;
  inDegree?: number;
  outDegree?: number;
  betweenness?: number;
  closeness?: number;
  pagerank?: number;
  eigenvector?: number;
  // Dynamic simulation properties
  initialLoad?: number;
  load?: number;
  capacity?: number;
  status?: 'normal' | 'overloaded' | 'failed' | 'susceptible' | 'infected' | 'recovered' | 'vaccinated';
  meta?: Record<string, any>;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  weight: number;
  directed?: boolean;
  status?: 'active' | 'failed' | 'overloaded';
}

export interface NetworkGraph {
  name: string;
  description?: string;
  isDirected: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CentralityLeaderboardItem {
  id: string;
  label: string;
  degree: number;
  betweenness: number;
  closeness: number;
  pagerank: number;
  eigenvector: number;
  community: number;
  isBridge: boolean;
  isHub: boolean;
}

export interface NetworkStats {
  n: number;
  m: number;
  avgDegree: number;
  density: number;
  kappa: number; // <k^2>/<k>
  diameter: number;
  avgPathLength: number;
  avgClustering: number;
  modularity: number;
  algebraicConnectivity: number; // lambda_2 of Laplacian
  spectralRadius: number; // max eigenvalue of Adjacency
  giantComponentRatio: number;
  fcRandom: number; // 1 - 1/(kappa - 1)
  fcTarget: number; // approx critical fraction for hub targeted attack
  epidemicThreshold: number; // 1 / spectralRadius
}

export interface SIRHistoryStep {
  step: number;
  susceptible: number;
  infected: number;
  recovered: number;
  vaccinated: number;
}

export interface CascadeHistoryStep {
  step: number;
  aliveNodes: number;
  failedNodes: number;
  giantComponentRatio: number;
  overloadedEdges: number;
}

export interface PercolationDataPoint {
  fractionRemoved: number;
  randomGiantRatio: number;
  targetedGiantRatio: number;
}
