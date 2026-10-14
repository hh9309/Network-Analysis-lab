/**
 * Linear Algebra & Spectral Graph Theory Utilities
 * Implements Adjacency, Laplacian, Normalized Laplacian, and Jacobi Eigenvalue decomposition
 */

export function buildAdjacencyMatrix(
  nodes: { id: string }[],
  edges: { source: string; target: string; weight?: number; directed?: boolean }[],
  isDirected: boolean = false
): number[][] {
  const n = nodes.length;
  const idMap = new Map<string, number>();
  nodes.forEach((node, idx) => idMap.set(node.id, idx));

  const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const edge of edges) {
    const u = idMap.get(edge.source);
    const v = idMap.get(edge.target);
    if (u !== undefined && v !== undefined) {
      const w = edge.weight ?? 1;
      A[u][v] = w;
      if (!isDirected && !edge.directed) {
        A[v][u] = w;
      }
    }
  }

  return A;
}

export function buildDegreeMatrix(A: number[][]): number[][] {
  const n = A.length;
  const D: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let deg = 0;
    for (let j = 0; j < n; j++) {
      deg += A[i][j];
    }
    D[i][i] = deg;
  }
  return D;
}

export function buildLaplacianMatrix(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let deg = 0;
    for (let j = 0; j < n; j++) {
      deg += A[i][j];
      if (i !== j) {
        L[i][j] = -A[i][j];
      }
    }
    L[i][i] = deg;
  }
  return L;
}

export function buildNormalizedLaplacian(A: number[][]): number[][] {
  const n = A.length;
  const degrees = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      degrees[i] += A[i][j];
    }
  }

  const normL: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        normL[i][j] = degrees[i] > 0 ? 1 : 0;
      } else if (A[i][j] !== 0) {
        if (degrees[i] > 0 && degrees[j] > 0) {
          normL[i][j] = -A[i][j] / Math.sqrt(degrees[i] * degrees[j]);
        }
      }
    }
  }
  return normL;
}

/**
 * Jacobi Eigenvalue Algorithm for Real Symmetric Matrices.
 * Returns sorted eigenvalues and corresponding eigenvector columns.
 */
export function jacobiEigenvalues(
  matrix: number[][],
  maxIterations: number = 100,
  epsilon: number = 1e-9
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  if (n === 0) return { eigenvalues: [], eigenvectors: [] };

  // Copy matrix
  const A: number[][] = matrix.map((row) => [...row]);
  // V is identity matrix
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find maximum off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = Math.abs(A[i][j]);
        if (val > maxVal) {
          maxVal = val;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < epsilon) {
      break;
    }

    // Compute rotation angle
    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];

    const theta = (aqq - app) / (2 * apq);
    const t =
      theta >= 0
        ? 1 / (theta + Math.sqrt(theta * theta + 1))
        : -1 / (-theta + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply Givens rotation to A
    A[p][p] = app - t * apq;
    A[q][q] = aqq + t * apq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const akp = A[k][p];
        const akq = A[k][q];
        A[k][p] = c * akp - s * akq;
        A[p][k] = A[k][p];
        A[k][q] = s * akp + c * akq;
        A[q][k] = A[k][q];
      }
    }

    // Accumulate eigenvectors in V
    for (let k = 0; k < n; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq;
      V[k][q] = s * vkp + c * vkq;
    }
  }

  // Extract diagonal as eigenvalues
  const rawEigen = Array.from({ length: n }, (_, i) => ({
    val: A[i][i],
    vector: V.map((row) => row[i]),
  }));

  // Sort ascending
  rawEigen.sort((a, b) => a.val - b.val);

  return {
    eigenvalues: rawEigen.map((e) => (Math.abs(e.val) < 1e-10 ? 0 : e.val)),
    eigenvectors: rawEigen.map((e) => e.vector),
  };
}

/**
 * Computes Algebraic Connectivity (Fiedler value lambda_2) of Laplacian
 */
export function computeAlgebraicConnectivity(L: number[][]): {
  lambda2: number;
  fiedlerVector: number[];
  allEigenvalues: number[];
} {
  const n = L.length;
  if (n < 2) {
    return { lambda2: 0, fiedlerVector: n === 1 ? [1] : [], allEigenvalues: [0] };
  }

  const { eigenvalues, eigenvectors } = jacobiEigenvalues(L);
  const lambda2 = eigenvalues.length > 1 ? Math.max(0, eigenvalues[1]) : 0;
  const fiedlerVector = eigenvectors.length > 1 ? eigenvectors[1] : new Array(n).fill(0);

  return {
    lambda2,
    fiedlerVector,
    allEigenvalues: eigenvalues,
  };
}

/**
 * Computes Spectral Radius (largest eigenvalue in magnitude) of Adjacency matrix
 * Using Power Iteration for fast convergence.
 */
export function computeSpectralRadius(A: number[][], maxIter = 100): number {
  const n = A.length;
  if (n === 0) return 0;
  if (n === 1) return Math.abs(A[0][0]);

  let b = Array.from({ length: n }, () => Math.random() + 0.1);
  let norm = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  b = b.map((v) => v / (norm || 1));

  let prevRayleigh = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    const nextB = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        nextB[i] += A[i][j] * b[j];
      }
    }

    norm = Math.sqrt(nextB.reduce((acc, v) => acc + v * v, 0));
    if (norm < 1e-12) return 0;
    b = nextB.map((v) => v / norm);

    // Rayleigh quotient
    let num = 0;
    for (let i = 0; i < n; i++) {
      let Ab_i = 0;
      for (let j = 0; j < n; j++) {
        Ab_i += A[i][j] * b[j];
      }
      num += b[i] * Ab_i;
    }
    if (Math.abs(num - prevRayleigh) < 1e-7) {
      return Math.abs(num);
    }
    prevRayleigh = num;
  }

  return Math.abs(prevRayleigh);
}
