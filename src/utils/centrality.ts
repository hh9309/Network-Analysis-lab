import { GraphNode, GraphEdge, NetworkStats, CentralityLeaderboardItem } from '../types/network';
import {
  buildAdjacencyMatrix,
  buildLaplacianMatrix,
  computeAlgebraicConnectivity,
  computeSpectralRadius,
} from './matrixMath';

/**
 * Computes all 5 key centrality metrics:
 * 1. Degree Centrality
 * 2. Betweenness Centrality (Brandes Algorithm)
 * 3. Closeness Centrality
 * 4. PageRank
 * 5. Eigenvector Centrality
 */
export function computeCentralities(
  nodes: GraphNode[],
  edges: GraphEdge[],
  isDirected: boolean = false
): {
  nodesWithCentrality: GraphNode[];
  leaderboard: CentralityLeaderboardItem[];
  stats: NetworkStats;
} {
  const n = nodes.length;
  if (n === 0) {
    return {
      nodesWithCentrality: [],
      leaderboard: [],
      stats: {
        n: 0,
        m: 0,
        avgDegree: 0,
        density: 0,
        kappa: 0,
        diameter: 0,
        avgPathLength: 0,
        avgClustering: 0,
        modularity: 0,
        algebraicConnectivity: 0,
        spectralRadius: 0,
        giantComponentRatio: 0,
        fcRandom: 0,
        fcTarget: 0,
        epidemicThreshold: 0,
      },
    };
  }

  const idToIndex = new Map<string, number>();
  nodes.forEach((node, i) => idToIndex.set(node.id, i));

  // Build adjacency list
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inAdj: number[][] = Array.from({ length: n }, () => []);
  const degrees: number[] = new Array(n).fill(0);
  const inDegrees: number[] = new Array(n).fill(0);
  const outDegrees: number[] = new Array(n).fill(0);

  for (const e of edges) {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u !== undefined && v !== undefined) {
      adj[u].push(v);
      inAdj[v].push(u);
      outDegrees[u]++;
      inDegrees[v]++;
      degrees[u]++;
      if (!isDirected) {
        adj[v].push(u);
        inAdj[u].push(v);
        degrees[v]++;
        inDegrees[u]++;
        outDegrees[v]++;
      }
    }
  }

  // 1. Degree Centrality
  const normFactor = n > 1 ? n - 1 : 1;
  const degreeCentrality = degrees.map((d) => d / normFactor);

  // 2. Betweenness Centrality via Brandes Algorithm
  const betweenness = new Array(n).fill(0);

  for (let s = 0; s < n; s++) {
    const S: number[] = [];
    const P: number[][] = Array.from({ length: n }, () => []);
    const sigma: number[] = new Array(n).fill(0);
    sigma[s] = 1;
    const d: number[] = new Array(n).fill(-1);
    d[s] = 0;

    const Q: number[] = [s];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      for (const w of adj[v]) {
        // w found for first time?
        if (d[w] < 0) {
          Q.push(w);
          d[w] = d[v] + 1;
        }
        // shortest path to w via v?
        if (d[w] === d[v] + 1) {
          sigma[w] += sigma[v];
          P[w].push(v);
        }
      }
    }

    const delta: number[] = new Array(n).fill(0);
    // S returns vertices in order of non-increasing distance from s
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P[w]) {
        if (sigma[w] > 0) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
      }
      if (w !== s) {
        betweenness[w] += delta[w];
      }
    }
  }

  // Normalize betweenness
  // For undirected: divide by 2, and then by (n-1)(n-2)/2 => (n-1)(n-2)
  const bNorm = !isDirected
    ? n > 2
      ? (n - 1) * (n - 2)
      : 1
    : n > 2
    ? (n - 1) * (n - 2)
    : 1;

  for (let i = 0; i < n; i++) {
    betweenness[i] = !isDirected ? betweenness[i] / 2 / (bNorm || 1) : betweenness[i] / (bNorm || 1);
  }

  // 3. Closeness Centrality & Shortest Paths
  const closeness = new Array(n).fill(0);
  let totalDistSum = 0;
  let totalPairsCount = 0;
  let maxShortestPath = 0;

  for (let i = 0; i < n; i++) {
    const dist = new Array(n).fill(-1);
    dist[i] = 0;
    const q = [i];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const v of adj[u]) {
        if (dist[v] === -1) {
          dist[v] = dist[u] + 1;
          q.push(v);
        }
      }
    }

    let reachableCount = 0;
    let sumDist = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j && dist[j] > 0) {
        reachableCount++;
        sumDist += dist[j];
        if (dist[j] > maxShortestPath) {
          maxShortestPath = dist[j];
        }
        totalDistSum += dist[j];
        totalPairsCount++;
      }
    }

    if (sumDist > 0 && reachableCount > 0) {
      // Wasserman and Faust formula for disconnected networks
      closeness[i] = (reachableCount / normFactor) * (reachableCount / sumDist);
    } else {
      closeness[i] = 0;
    }
  }

  const avgPathLength = totalPairsCount > 0 ? totalDistSum / totalPairsCount : 0;
  const diameter = maxShortestPath;

  // 4. PageRank via Power Iteration
  const damping = 0.85;
  let pr = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 40; iter++) {
    const nextPR = new Array(n).fill((1 - damping) / n);
    let sinkSum = 0;

    for (let i = 0; i < n; i++) {
      const outDeg = adj[i].length;
      if (outDeg === 0) {
        sinkSum += pr[i];
      } else {
        const share = (damping * pr[i]) / outDeg;
        for (const target of adj[i]) {
          nextPR[target] += share;
        }
      }
    }

    const sinkShare = (damping * sinkSum) / n;
    for (let i = 0; i < n; i++) {
      nextPR[i] += sinkShare;
    }
    pr = nextPR;
  }

  // 5. Eigenvector Centrality
  let ev = new Array(n).fill(1 / Math.sqrt(n));
  for (let iter = 0; iter < 50; iter++) {
    const nextEV = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (const neighbor of adj[i]) {
        nextEV[i] += ev[neighbor];
      }
    }
    const norm = Math.sqrt(nextEV.reduce((sum, v) => sum + v * v, 0));
    if (norm > 1e-12) {
      ev = nextEV.map((v) => v / norm);
    }
  }

  // Clustering coefficient (local and average)
  let sumClustering = 0;
  for (let i = 0; i < n; i++) {
    const neighbors = Array.from(new Set(adj[i]));
    const k = neighbors.length;
    if (k < 2) continue;
    let triangles = 0;
    for (let p = 0; p < k; p++) {
      for (let q = p + 1; q < k; q++) {
        const u = neighbors[p];
        const v = neighbors[q];
        if (adj[u].includes(v)) {
          triangles++;
        }
      }
    }
    sumClustering += (2 * triangles) / (k * (k - 1));
  }
  const avgClustering = n > 0 ? sumClustering / n : 0;

  // Degree moments & Heterogeneity: kappa = <k^2> / <k>
  const sumK = degrees.reduce((a, b) => a + b, 0);
  const avgK = sumK / n;
  const sumK2 = degrees.reduce((a, b) => a + b * b, 0);
  const avgK2 = sumK2 / n;
  const kappa = avgK > 0 ? avgK2 / avgK : 0;

  // Giant Component Calculation (BFS connected components)
  const visited = new Array(n).fill(false);
  let maxCompSize = 0;
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      let compSize = 0;
      const q = [i];
      visited[i] = true;
      while (q.length > 0) {
        const u = q.shift()!;
        compSize++;
        for (const v of adj[u]) {
          if (!visited[v]) {
            visited[v] = true;
            q.push(v);
          }
        }
      }
      if (compSize > maxCompSize) {
        maxCompSize = compSize;
      }
    }
  }
  const giantComponentRatio = n > 0 ? maxCompSize / n : 0;

  // Percolation Threshold
  // Cohen et al. (2000): f_c = 1 - 1 / (kappa - 1) for random breakdown
  const fcRandom = kappa > 2 ? Math.max(0, Math.min(1, 1 - 1 / (kappa - 1))) : 0.5;
  // For targeted attacks on scale-free networks, threshold is much lower (approx 5% to 20%)
  const fcTarget = Math.max(0.04, Math.min(0.25, 1 / Math.max(1.5, kappa)));

  // Matrix and Spectral calculations
  const A = buildAdjacencyMatrix(nodes, edges, isDirected);
  const L = buildLaplacianMatrix(A);
  const { lambda2 } = computeAlgebraicConnectivity(L);
  const spectralRadius = computeSpectralRadius(A);
  const epidemicThreshold = spectralRadius > 0 ? 1 / spectralRadius : 0.5;

  // Update nodes with calculated metrics
  const nodesWithCentrality: GraphNode[] = nodes.map((node, i) => ({
    ...node,
    degree: degrees[i],
    inDegree: inDegrees[i],
    outDegree: outDegrees[i],
    betweenness: betweenness[i],
    closeness: closeness[i],
    pagerank: pr[i],
    eigenvector: ev[i],
  }));

  // Leaderboard items with Bridge & Hub detection
  // Hub: top 15% in Degree
  // Bridge: top 20% in Betweenness but NOT in top 20% in Degree
  const sortedByDegree = [...degrees].sort((a, b) => b - a);
  const sortedByBetweenness = [...betweenness].sort((a, b) => b - a);
  const degThreshold = sortedByDegree[Math.floor(n * 0.2)] ?? 0;
  const betwThreshold = sortedByBetweenness[Math.floor(n * 0.2)] ?? 0;

  const leaderboard: CentralityLeaderboardItem[] = nodesWithCentrality.map((node, i) => {
    const isHub = degrees[i] >= degThreshold && degrees[i] > 1;
    const isBridge = betweenness[i] >= betwThreshold && degrees[i] < degThreshold;
    return {
      id: node.id,
      label: node.label || node.id,
      degree: degrees[i],
      betweenness: betweenness[i],
      closeness: closeness[i],
      pagerank: pr[i],
      eigenvector: ev[i],
      community: node.group ?? 0,
      isBridge,
      isHub,
    };
  });

  const m = edges.length;
  const maxEdges = !isDirected ? (n * (n - 1)) / 2 : n * (n - 1);
  const density = maxEdges > 0 ? m / maxEdges : 0;

  const stats: NetworkStats = {
    n,
    m,
    avgDegree: avgK,
    density,
    kappa,
    diameter,
    avgPathLength,
    avgClustering,
    modularity: 0, // will be computed in community.ts
    algebraicConnectivity: lambda2,
    spectralRadius,
    giantComponentRatio,
    fcRandom,
    fcTarget,
    epidemicThreshold,
  };

  return {
    nodesWithCentrality,
    leaderboard,
    stats,
  };
}
