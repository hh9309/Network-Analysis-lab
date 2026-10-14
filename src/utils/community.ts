import { GraphNode, GraphEdge } from '../types/network';

/**
 * Computes Newman-Girvan Modularity Q for a given community assignment.
 */
export function calculateModularity(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: Map<string, number>
): number {
  const m = edges.length;
  if (m === 0) return 0;

  const degrees = new Map<string, number>();
  nodes.forEach((node) => degrees.set(node.id, 0));

  for (const e of edges) {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1);
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1);
  }

  const twoM = 2 * m;
  let q = 0;

  // Optimized sum over all edges + degree normalization
  for (const e of edges) {
    const c1 = communities.get(e.source);
    const c2 = communities.get(e.target);
    if (c1 !== undefined && c2 !== undefined && c1 === c2) {
      const k1 = degrees.get(e.source) || 0;
      const k2 = degrees.get(e.target) || 0;
      // Edge exists => A_ij = 1
      q += 2 * (1 - (k1 * k2) / twoM);
    }
  }

  // Also subtract the null model for pairs within same community with no edge
  const commNodes = new Map<number, string[]>();
  nodes.forEach((node) => {
    const c = communities.get(node.id) ?? 0;
    if (!commNodes.has(c)) commNodes.set(c, []);
    commNodes.get(c)!.push(node.id);
  });

  // Accurate Q computation
  let sumKci = 0;
  commNodes.forEach((nodeList) => {
    const totalDeg = nodeList.reduce((acc, id) => acc + (degrees.get(id) || 0), 0);
    sumKci += Math.pow(totalDeg / twoM, 2);
  });

  let intraEdges = 0;
  for (const e of edges) {
    if (communities.get(e.source) === communities.get(e.target)) {
      intraEdges++;
    }
  }

  const modularity = intraEdges / m - sumKci;
  return Math.max(-0.5, Math.min(1.0, modularity));
}

/**
 * Fast Louvain Modularity Optimization Algorithm
 * Assigns each node to an optimal community cluster {0, 1, 2, ...}
 */
export function detectCommunitiesLouvain(
  nodes: GraphNode[],
  edges: GraphEdge[]
): {
  nodeCommunities: Map<string, number>;
  modularity: number;
  communityCount: number;
} {
  const n = nodes.length;
  if (n === 0) {
    return { nodeCommunities: new Map(), modularity: 0, communityCount: 0 };
  }

  const communities = new Map<string, number>();
  nodes.forEach((node, i) => communities.set(node.id, i));

  if (edges.length === 0) {
    return { nodeCommunities: communities, modularity: 0, communityCount: n };
  }

  const m = edges.length;
  const twoM = 2 * m;

  // Degree map and adjacency map
  const neighbors = new Map<string, Map<string, number>>();
  const nodeDegrees = new Map<string, number>();

  nodes.forEach((node) => {
    neighbors.set(node.id, new Map());
    nodeDegrees.set(node.id, 0);
  });

  for (const e of edges) {
    const w = e.weight || 1;
    nodeDegrees.set(e.source, (nodeDegrees.get(e.source) || 0) + w);
    nodeDegrees.set(e.target, (nodeDegrees.get(e.target) || 0) + w);

    neighbors.get(e.source)!.set(e.target, (neighbors.get(e.source)!.get(e.target) || 0) + w);
    neighbors.get(e.target)!.set(e.source, (neighbors.get(e.target)!.get(e.source) || 0) + w);
  }

  // Community total degrees
  const commTotalDegrees = new Map<number, number>();
  nodes.forEach((node, i) => commTotalDegrees.set(i, nodeDegrees.get(node.id) || 0));

  let improvement = true;
  let iterations = 0;

  while (improvement && iterations < 15) {
    improvement = false;
    iterations++;

    for (const node of nodes) {
      const u = node.id;
      const currentComm = communities.get(u)!;
      const degU = nodeDegrees.get(u) || 0;
      if (degU === 0) continue;

      // Calculate weights to neighboring communities
      const neighborComms = new Map<number, number>();
      for (const [v, w] of neighbors.get(u)!.entries()) {
        const c = communities.get(v)!;
        neighborComms.set(c, (neighborComms.get(c) || 0) + w);
      }

      // Remove u from current community
      commTotalDegrees.set(currentComm, (commTotalDegrees.get(currentComm) || degU) - degU);

      let bestComm = currentComm;
      let maxDeltaQ = 0;

      // Evaluate delta Q for each candidate community
      for (const [candidateComm, k_i_in] of neighborComms.entries()) {
        const totalDegreeC = commTotalDegrees.get(candidateComm) || 0;
        // delta Q formula: k_{i, in}/(2m) - (Sigma_{tot} * k_i)/(2m^2)
        const deltaQ = k_i_in / twoM - (totalDegreeC * degU) / (twoM * twoM);

        if (deltaQ > maxDeltaQ) {
          maxDeltaQ = deltaQ;
          bestComm = candidateComm;
        }
      }

      // Add back to chosen best community
      communities.set(u, bestComm);
      commTotalDegrees.set(bestComm, (commTotalDegrees.get(bestComm) || 0) + degU);

      if (bestComm !== currentComm) {
        improvement = true;
      }
    }
  }

  // Compact community IDs to 0, 1, 2, ...
  const uniqueComms = Array.from(new Set(communities.values()));
  const commMapping = new Map<number, number>();
  uniqueComms.forEach((oldId, newId) => commMapping.set(oldId, newId));

  const compactedCommunities = new Map<string, number>();
  nodes.forEach((node) => {
    compactedCommunities.set(node.id, commMapping.get(communities.get(node.id)!) ?? 0);
  });

  const modularity = calculateModularity(nodes, edges, compactedCommunities);

  return {
    nodeCommunities: compactedCommunities,
    modularity,
    communityCount: uniqueComms.length,
  };
}

/**
 * Computes Guimerà-Amaral Role Cartography:
 * - Within-module degree z-score (zi)
 * - Participation coefficient (Pi)
 */
export function computeRoleCartography(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: Map<string, number>
): {
  id: string;
  zScore: number;
  participationCoeff: number;
  role: 'Ultra-peripheral' | 'Peripheral' | 'Connector' | 'Kinless' | 'Provincial Hub' | 'Connector Hub' | 'Global Hub';
}[] {
  const neighbors = new Map<string, string[]>();
  nodes.forEach((n) => neighbors.set(n.id, []));
  for (const e of edges) {
    neighbors.get(e.source)?.push(e.target);
    neighbors.get(e.target)?.push(e.source);
  }

  // Group nodes by community
  const commMembers = new Map<number, string[]>();
  nodes.forEach((n) => {
    const c = communities.get(n.id) ?? 0;
    if (!commMembers.has(c)) commMembers.set(c, []);
    commMembers.get(c)!.push(n.id);
  });

  // Calculate internal degree within each module
  const intraDegrees = new Map<string, number>();
  nodes.forEach((n) => {
    const c = communities.get(n.id) ?? 0;
    const nbrs = neighbors.get(n.id) || [];
    const intra = nbrs.filter((v) => communities.get(v) === c).length;
    intraDegrees.set(n.id, intra);
  });

  // Mean and std dev of intra degrees per community
  const commStats = new Map<number, { mean: number; std: number }>();
  commMembers.forEach((members, c) => {
    const degs = members.map((id) => intraDegrees.get(id) || 0);
    const mean = degs.reduce((a, b) => a + b, 0) / (members.length || 1);
    const variance =
      degs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (members.length || 1);
    commStats.set(c, { mean, std: Math.sqrt(variance) || 1 });
  });

  return nodes.map((n) => {
    const c = communities.get(n.id) ?? 0;
    const stats = commStats.get(c) || { mean: 0, std: 1 };
    const intraDeg = intraDegrees.get(n.id) || 0;
    const zScore = (intraDeg - stats.mean) / (stats.std || 1);

    // Participation coefficient P = 1 - sum (k_is / k_i)^2
    const nbrs = neighbors.get(n.id) || [];
    const k_i = nbrs.length;
    let P = 0;
    if (k_i > 0) {
      const commCounts = new Map<number, number>();
      nbrs.forEach((v) => {
        const commV = communities.get(v) ?? 0;
        commCounts.set(commV, (commCounts.get(commV) || 0) + 1);
      });
      let sumSq = 0;
      commCounts.forEach((count) => {
        sumSq += Math.pow(count / k_i, 2);
      });
      P = 1 - sumSq;
    }

    // Role classification
    let role: 'Ultra-peripheral' | 'Peripheral' | 'Connector' | 'Kinless' | 'Provincial Hub' | 'Connector Hub' | 'Global Hub';
    if (zScore >= 2.5) {
      // Hubs
      if (P <= 0.3) role = 'Provincial Hub';
      else if (P <= 0.75) role = 'Connector Hub';
      else role = 'Global Hub';
    } else {
      // Non-hubs
      if (P <= 0.05) role = 'Ultra-peripheral';
      else if (P <= 0.62) role = 'Peripheral';
      else if (P <= 0.8) role = 'Connector';
      else role = 'Kinless';
    }

    return {
      id: n.id,
      zScore: Number(zScore.toFixed(2)),
      participationCoeff: Number(P.toFixed(3)),
      role,
    };
  });
}
