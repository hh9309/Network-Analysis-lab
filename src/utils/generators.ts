import { GraphNode, GraphEdge, NetworkGraph } from '../types/network';

/**
 * Positions nodes along circle or layout grid initially
 */
function layoutInCircle(n: number, radius = 240, cx = 350, cy = 300) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    positions.push({
      x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
    });
  }
  return positions;
}

/**
 * 1. Barabási-Albert (BA) Scale-Free Network Generator
 * Implements preferential attachment: Pi(i) ~ k_i
 */
export function generateBANetwork(
  n: number = 36,
  m: number = 2,
  m0: number = 3
): NetworkGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const coords = layoutInCircle(n);

  // Initialize seed network of m0 nodes
  const initialNodes = Math.max(m0, m + 1);
  for (let i = 0; i < initialNodes; i++) {
    nodes.push({
      id: `n${i}`,
      label: `Node-${i}`,
      x: coords[i].x,
      y: coords[i].y,
      category: 'Seed',
    });
  }

  // Connect seed nodes into a ring or clique
  for (let i = 0; i < initialNodes; i++) {
    for (let j = i + 1; j < initialNodes; j++) {
      edges.push({
        source: `n${i}`,
        target: `n${j}`,
        weight: 1,
      });
    }
  }

  // Node pool for preferential attachment sampling
  const nodeDegrees: number[] = new Array(n).fill(0);
  edges.forEach((e) => {
    const u = parseInt(e.source.replace('n', ''));
    const v = parseInt(e.target.replace('n', ''));
    nodeDegrees[u]++;
    nodeDegrees[v]++;
  });

  // Step-by-step addition of remaining nodes
  for (let i = initialNodes; i < n; i++) {
    const newId = `n${i}`;
    nodes.push({
      id: newId,
      label: `Node-${i}`,
      x: coords[i].x,
      y: coords[i].y,
      category: 'Scale-Free Growth',
    });

    // Select m distinct target nodes proportional to degree
    const targets = new Set<number>();
    let totalDegree = nodeDegrees.slice(0, i).reduce((a, b) => a + b, 0);

    let attempts = 0;
    while (targets.size < Math.min(m, i) && attempts < 200) {
      attempts++;
      let rand = Math.random() * (totalDegree || 1);
      let runningSum = 0;
      let chosen = 0;
      for (let j = 0; j < i; j++) {
        runningSum += nodeDegrees[j];
        if (rand <= runningSum) {
          chosen = j;
          break;
        }
      }
      targets.add(chosen);
    }

    // Connect to chosen targets
    targets.forEach((targetIdx) => {
      edges.push({
        source: newId,
        target: `n${targetIdx}`,
        weight: 1,
      });
      nodeDegrees[i]++;
      nodeDegrees[targetIdx]++;
    });
  }

  return {
    name: `BA 无标度网络 (N=${n}, m=${m})`,
    description: '呈现幂律度分布 P(k) ~ k^-3，具备“富者愈富”的偏好连接与极度不均匀的拓扑核心。',
    isDirected: false,
    nodes,
    edges,
  };
}

/**
 * 2. Watts-Strogatz (WS) Small-World Network Generator
 * Starts with regular ring lattice of degree k, rewired with probability p
 */
export function generateWSNetwork(
  n: number = 36,
  k: number = 4,
  p: number = 0.15
): NetworkGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const coords = layoutInCircle(n);

  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `n${i}`,
      label: `WS-${i}`,
      x: coords[i].x,
      y: coords[i].y,
      category: 'Lattice',
    });
  }

  // Ensure k is even
  const actualK = Math.min(n - 1, k % 2 === 0 ? k : k + 1);
  const halfK = Math.floor(actualK / 2);

  const edgeSet = new Set<string>();
  const makeKey = (u: number, v: number) =>
    u < v ? `${u}-${v}` : `${v}-${u}`;

  // Initial regular ring lattice
  for (let i = 0; i < n; i++) {
    for (let offset = 1; offset <= halfK; offset++) {
      const neighbor = (i + offset) % n;
      const key = makeKey(i, neighbor);
      edgeSet.add(key);
    }
  }

  // Rewiring step with probability p
  const currentEdges = Array.from(edgeSet).map((str) => {
    const [u, v] = str.split('-').map(Number);
    return { u, v };
  });

  const finalEdges: { u: number; v: number }[] = [];

  currentEdges.forEach(({ u, v }) => {
    if (Math.random() < p) {
      // Rewire target v to a random other node w (no self-loops, no multi-edges)
      let w = Math.floor(Math.random() * n);
      let safety = 0;
      while (
        (w === u ||
          finalEdges.some((e) => makeKey(e.u, e.v) === makeKey(u, w))) &&
        safety < 100
      ) {
        w = Math.floor(Math.random() * n);
        safety++;
      }
      finalEdges.push({ u, v: w });
    } else {
      finalEdges.push({ u, v });
    }
  });

  finalEdges.forEach(({ u, v }) => {
    edges.push({
      source: `n${u}`,
      target: `n${v}`,
      weight: 1,
    });
  });

  return {
    name: `WS 小世界网络 (N=${n}, k=${actualK}, p=${p})`,
    description: '高聚类系数与极短特征路径长度并存，模拟现实社交与航空通信网络中“六度分隔”现象。',
    isDirected: false,
    nodes,
    edges,
  };
}

/**
 * 3. Erdős-Rényi (ER) Random Network Generator
 * G(N, p) where each edge exists with independent probability p
 */
export function generateERNetwork(n: number = 36, p: number = 0.08): NetworkGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const coords = layoutInCircle(n);

  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `n${i}`,
      label: `ER-${i}`,
      x: coords[i].x,
      y: coords[i].y,
      category: 'Random',
    });
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < p) {
        edges.push({
          source: `n${i}`,
          target: `n${j}`,
          weight: 1,
        });
      }
    }
  }

  return {
    name: `ER 随机网络 (N=${n}, p=${p})`,
    description: '呈现泊松度分布，节点地位同质性强，存在明显的巨型连通分量涌现相变临界点 (<k>=1)。',
    isDirected: false,
    nodes,
    edges,
  };
}

/**
 * 4. 2D Grid Lattice Network
 */
export function generateGridNetwork(width: number = 6, height: number = 6): NetworkGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const spacing = 75;
  const startX = 140;
  const startY = 90;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = `g_${x}_${y}`;
      nodes.push({
        id,
        label: `(${x},${y})`,
        x: startX + x * spacing,
        y: startY + y * spacing,
        category: 'Grid Mesh',
      });

      if (x > 0) {
        edges.push({
          source: `g_${x - 1}_${y}`,
          target: id,
          weight: 1,
        });
      }
      if (y > 0) {
        edges.push({
          source: `g_${x}_${y - 1}`,
          target: id,
          weight: 1,
        });
      }
    }
  }

  return {
    name: `二维网格晶格网络 (${width}x${height})`,
    description: '空间受限网络，局部连通性强，特征路径长度随节点数平方根扩展。',
    isDirected: false,
    nodes,
    edges,
  };
}
