import { GraphNode, GraphEdge, SIRHistoryStep, CascadeHistoryStep, PercolationDataPoint } from '../types/network';

/**
 * Calculates connected components and returns size of giant component
 */
export function getGiantComponentSize(
  aliveNodeIds: Set<string>,
  edges: GraphEdge[]
): { giantSize: number; giantRatio: number } {
  if (aliveNodeIds.size === 0) return { giantSize: 0, giantRatio: 0 };

  const adj = new Map<string, string[]>();
  aliveNodeIds.forEach((id) => adj.set(id, []));

  for (const e of edges) {
    if (aliveNodeIds.has(e.source) && aliveNodeIds.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source);
    }
  }

  const visited = new Set<string>();
  let maxComp = 0;

  aliveNodeIds.forEach((startId) => {
    if (!visited.has(startId)) {
      let count = 0;
      const q = [startId];
      visited.add(startId);

      while (q.length > 0) {
        const u = q.shift()!;
        count++;
        for (const v of adj.get(u) || []) {
          if (!visited.has(v)) {
            visited.add(v);
            q.push(v);
          }
        }
      }
      if (count > maxComp) {
        maxComp = count;
      }
    }
  });

  return {
    giantSize: maxComp,
    giantRatio: maxComp / aliveNodeIds.size,
  };
}

/**
 * Step forward in SIR Propagation Model
 */
export function stepSIR(
  nodes: GraphNode[],
  edges: GraphEdge[],
  beta: number = 0.35, // infection rate
  gamma: number = 0.15 // recovery rate
): {
  updatedNodes: GraphNode[];
  stepStats: SIRHistoryStep;
  hasActiveInfection: boolean;
} {
  const currentStates = new Map<string, string>();
  nodes.forEach((n) => currentStates.set(n.id, n.status || 'susceptible'));

  // Build adjacency
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const nextStates = new Map<string, string>(currentStates);

  // 1. Transmission: Infected -> Susceptible neighbors
  nodes.forEach((node) => {
    if (currentStates.get(node.id) === 'infected') {
      const neighbors = adj.get(node.id) || [];
      for (const nbrId of neighbors) {
        if (currentStates.get(nbrId) === 'susceptible') {
          if (Math.random() < beta) {
            nextStates.set(nbrId, 'infected');
          }
        }
      }
    }
  });

  // 2. Recovery: Infected -> Recovered
  nodes.forEach((node) => {
    if (currentStates.get(node.id) === 'infected') {
      if (Math.random() < gamma) {
        nextStates.set(node.id, 'recovered');
      }
    }
  });

  let s = 0,
    i = 0,
    r = 0,
    v = 0;

  const updatedNodes = nodes.map((node) => {
    const status = (nextStates.get(node.id) as GraphNode['status']) || 'susceptible';
    if (status === 'susceptible') s++;
    else if (status === 'infected') i++;
    else if (status === 'recovered') r++;
    else if (status === 'vaccinated') v++;
    return {
      ...node,
      status,
    };
  });

  return {
    updatedNodes,
    stepStats: {
      step: 0,
      susceptible: s,
      infected: i,
      recovered: r,
      vaccinated: v,
    },
    hasActiveInfection: i > 0,
  };
}

/**
 * Apply Immunization (Vaccination / Quarantine) to nodes
 */
export function applyImmunization(
  nodes: GraphNode[],
  type: 'random' | 'targeted_hub' | 'bridge',
  fraction: number = 0.15
): GraphNode[] {
  const n = nodes.length;
  const countToImmunize = Math.max(1, Math.round(n * fraction));

  let chosenIds = new Set<string>();

  if (type === 'random') {
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    shuffled.slice(0, countToImmunize).forEach((node) => chosenIds.add(node.id));
  } else if (type === 'targeted_hub') {
    const byDegree = [...nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));
    byDegree.slice(0, countToImmunize).forEach((node) => chosenIds.add(node.id));
  } else if (type === 'bridge') {
    const byBetweenness = [...nodes].sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0));
    byBetweenness.slice(0, countToImmunize).forEach((node) => chosenIds.add(node.id));
  }

  return nodes.map((node) => {
    if (chosenIds.has(node.id)) {
      return { ...node, status: 'vaccinated' };
    }
    return { ...node, status: node.status === 'vaccinated' ? 'susceptible' : node.status };
  });
}

/**
 * Initialize / Step in Motter-Lai Cascading Overload Model
 */
export function initializeCascadingModel(
  nodes: GraphNode[],
  alpha: number = 1.0, // load scaling
  toleranceBeta: number = 0.25 // capacity redundancy margin
): GraphNode[] {
  return nodes.map((node) => {
    const deg = Math.max(1, node.degree || 1);
    const initialLoad = Math.round(Math.pow(deg, alpha) * 10);
    const capacity = Math.round(initialLoad * (1 + toleranceBeta));
    return {
      ...node,
      initialLoad,
      load: initialLoad,
      capacity,
      status: 'normal',
    };
  });
}

/**
 * Step forward in Cascading Failure (Load Redistribution Wave)
 */
export function stepCascadingFailure(
  nodes: GraphNode[],
  edges: GraphEdge[]
): {
  updatedNodes: GraphNode[];
  newlyFailedIds: string[];
  stepStats: CascadeHistoryStep;
  isCascadingComplete: boolean;
} {
  const aliveNodes = new Set<string>();
  const failedNodes = new Set<string>();

  nodes.forEach((n) => {
    if (n.status === 'failed') {
      failedNodes.add(n.id);
    } else {
      aliveNodes.add(n.id);
    }
  });

  const newlyFailed: string[] = [];
  const updatedNodes = nodes.map((node) => ({ ...node }));

  // Check if any alive node has load exceeding capacity
  updatedNodes.forEach((node) => {
    if (aliveNodes.has(node.id) && (node.load || 0) > (node.capacity || Infinity)) {
      node.status = 'failed';
      newlyFailed.push(node.id);
      failedNodes.add(node.id);
      aliveNodes.delete(node.id);
    }
  });

  // If new failures occurred, redistribute their load to connected surviving neighbors
  if (newlyFailed.length > 0) {
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    edges.forEach((e) => {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    });

    newlyFailed.forEach((failedId) => {
      const failedNode = nodes.find((n) => n.id === failedId);
      const spilledLoad = (failedNode?.load || 0) * 0.7; // 70% spilled to neighbors
      const neighbors = (adj.get(failedId) || []).filter((id) => aliveNodes.has(id));

      if (neighbors.length > 0) {
        const share = spilledLoad / neighbors.length;
        neighbors.forEach((nbrId) => {
          const targetNode = updatedNodes.find((n) => n.id === nbrId);
          if (targetNode) {
            targetNode.load = Math.round((targetNode.load || 0) + share);
            if (targetNode.load > (targetNode.capacity || 0)) {
              targetNode.status = 'overloaded';
            }
          }
        });
      }
    });
  }

  const { giantRatio } = getGiantComponentSize(aliveNodes, edges);

  return {
    updatedNodes,
    newlyFailedIds: newlyFailed,
    stepStats: {
      step: 0,
      aliveNodes: aliveNodes.size,
      failedNodes: failedNodes.size,
      giantComponentRatio: giantRatio,
      overloadedEdges: 0,
    },
    isCascadingComplete: newlyFailed.length === 0,
  };
}

/**
 * Computes Percolation Curves: Random Failure vs. Targeted Attack
 * Generates data points of Giant Component fraction S(f) vs fraction of nodes removed f
 */
export function computePercolationCurves(
  nodes: GraphNode[],
  edges: GraphEdge[],
  samples: number = 20
): PercolationDataPoint[] {
  const n = nodes.length;
  if (n === 0) return [];

  const results: PercolationDataPoint[] = [];

  // 1. Order for Targeted Attack (sorted by degree descending)
  const targetedOrder = [...nodes]
    .sort((a, b) => (b.degree || 0) - (a.degree || 0))
    .map((n) => n.id);

  // 2. Order for Random Failure (shuffled)
  const randomOrder = [...nodes].sort(() => Math.random() - 0.5).map((n) => n.id);

  for (let step = 0; step <= samples; step++) {
    const fraction = step / samples;
    const removeCount = Math.floor(n * fraction);

    // Random surviving set
    const randomAlive = new Set(randomOrder.slice(removeCount));
    const randomGiant = getGiantComponentSize(randomAlive, edges).giantRatio;

    // Targeted surviving set
    const targetedAlive = new Set(targetedOrder.slice(removeCount));
    const targetedGiant = getGiantComponentSize(targetedAlive, edges).giantRatio;

    results.push({
      fractionRemoved: Number(fraction.toFixed(2)),
      randomGiantRatio: Number(randomGiant.toFixed(3)),
      targetedGiantRatio: Number(targetedGiant.toFixed(3)),
    });
  }

  return results;
}
