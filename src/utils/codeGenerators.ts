import { NetworkGraph } from '../types/network';

/**
 * Generates ready-to-run Python NetworkX scripts customized to the current network.
 * All plot titles, legends, and axis labels are strictly in English for global compatibility.
 * The scripts can be executed locally in Python 3.9+ with:
 * pip install networkx numpy scipy matplotlib pandas
 */
export function generatePythonScripts(graph: NetworkGraph) {
  const isDirected = graph.isDirected;

  // Format edges snippet (all edges formatted cleanly)
  const sampleEdges = graph.edges
    .map((e) => `("${e.source}", "${e.target}", ${e.weight || 1})`)
    .join(',\n    ');

  const topologyAlgebraPy = `"""
========================================================================
Module 1: Complex Network Topology Algebra & Spectral Graph Theory
Dependencies: pip install numpy scipy networkx matplotlib
========================================================================
"""
import numpy as np
import scipy.linalg as la
import networkx as nx
import matplotlib.pyplot as plt

# 1. Initialize Graph
${isDirected ? 'G = nx.DiGraph()' : 'G = nx.Graph()'}
edge_list = [
    ${sampleEdges}
]
for u, v, w in edge_list:
    G.add_edge(u, v, weight=w)

nodes = list(G.nodes())
n = len(nodes)
m = G.number_of_edges()
print(f"[Network Summary] Node Count N={n}, Edge Count M={m}")

# 2. Build Adjacency Matrix A and Degree Matrix D
A = nx.to_numpy_array(G, nodelist=nodes)
degrees = np.sum(A, axis=1)
D = np.diag(degrees)

# 3. Build Graph Laplacian Matrix L = D - A
L = D - A

# 4. Compute Normalized Symmetric Laplacian: L_sym = D^(-1/2) L D^(-1/2)
inv_sqrt_deg = np.zeros(n)
non_zero = degrees > 0
inv_sqrt_deg[non_zero] = 1.0 / np.sqrt(degrees[non_zero])
D_inv_sqrt = np.diag(inv_sqrt_deg)
L_norm = D_inv_sqrt @ L @ D_inv_sqrt

# 5. Compute Laplacian Eigenvalues and Algebraic Connectivity (Fiedler Value)
eigenvalues, eigenvectors = la.eigh(L)
eigenvalues = np.sort(eigenvalues)

fiedler_value = eigenvalues[1] if len(eigenvalues) > 1 else 0.0
print("=" * 60)
print(f"Laplacian Spectrum (First 5): {np.round(eigenvalues[:5], 4)}")
print(f"Algebraic Connectivity (Fiedler \\lambda_2): {fiedler_value:.4f}")

# 6. Compute Spectral Radius of Adjacency Matrix rho(A)
adj_eigenvals = la.eigvals(A)
spectral_radius = np.max(np.abs(adj_eigenvals))
epidemic_threshold = 1.0 / max(0.01, spectral_radius)
print(f"Adjacency Spectral Radius \\rho(A): {spectral_radius:.4f}")
print(f"Epidemic Outbreak Threshold \\tau_c = 1 / \\rho(A): {epidemic_threshold:.4f}")
print("=" * 60)

# 7. Matplotlib Visualization (Strictly English Titles, Legends & Axis Labels)
plt.figure(figsize=(9, 4.5))
plt.plot(range(1, n + 1), eigenvalues, 'o-', color='#2563eb', linewidth=2, markersize=5, label='Laplacian Eigenvalues (\\lambda_k)')
plt.axhline(y=fiedler_value, color='#dc2626', linestyle='--', linewidth=1.5, label=f'Fiedler Value (\\lambda_2 = {fiedler_value:.3f})')
plt.title("Laplacian Eigenvalue Spectrum and Algebraic Connectivity", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Eigenvalue Index k", fontsize=11)
plt.ylabel("Eigenvalue Magnitude (\\lambda_k)", fontsize=11)
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='upper left', frameon=True)
plt.tight_layout()
plt.show()
`;

  const centralityPy = `"""
========================================================================
Module 2: Multi-Dimensional Centrality & Key Nodes Identification
Dependencies: pip install networkx pandas matplotlib
========================================================================
"""
import networkx as nx
import pandas as pd
import matplotlib.pyplot as plt

# 1. Initialize Graph
${isDirected ? 'G = nx.DiGraph()' : 'G = nx.Graph()'}
edge_list = [
    ${sampleEdges}
]
for u, v, w in edge_list:
    G.add_edge(u, v, weight=w)

# 2. Compute 5 Key Centrality Metrics
deg_cen = nx.degree_centrality(G)
bet_cen = nx.betweenness_centrality(G, normalized=True)
clo_cen = nx.closeness_centrality(G)
pagerank_cen = nx.pagerank(G, alpha=0.85)

try:
    eig_cen = nx.eigenvector_centrality(G, max_iter=300)
except Exception:
    eig_cen = {n: 0.0 for n in G.nodes()}

# 3. Tabulate Leaderboard
df = pd.DataFrame({
    'Node': list(G.nodes()),
    'Degree': [deg_cen[n] for n in G.nodes()],
    'Betweenness': [bet_cen[n] for n in G.nodes()],
    'Closeness': [clo_cen[n] for n in G.nodes()],
    'PageRank': [pagerank_cen[n] for n in G.nodes()],
    'Eigenvector': [eig_cen[n] for n in G.nodes()],
})

print("=== Top 5 Betweenness Centrality (Structural Chokepoints) ===")
print(df.sort_values(by='Betweenness', ascending=False).head(5).to_string(index=False))

print("\\n=== Top 5 PageRank Centrality (Authoritative Hubs) ===")
print(df.sort_values(by='PageRank', ascending=False).head(5).to_string(index=False))

# 4. Scatter Plot (Strictly English Titles, Legends & Axis Labels)
plt.figure(figsize=(9, 5))
degrees = df['Degree']
betweenness = df['Betweenness']

plt.scatter(degrees, betweenness, c='#3b82f6', s=60, edgecolors='#1e293b', alpha=0.85, label='Network Nodes')

# Highlight top betweenness nodes (Structural Holes)
top_b = df.sort_values(by='Betweenness', ascending=False).head(3)
for _, row in top_b.iterrows():
    plt.annotate(row['Node'], (row['Degree'], row['Betweenness']), textcoords="offset points", xytext=(5, 5), ha='left', fontsize=9, color='#dc2626', fontweight='bold')

plt.title("Degree vs. Betweenness Centrality Distribution", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Degree Centrality (Normalized k / [N-1])", fontsize=11)
plt.ylabel("Betweenness Centrality (C_B)", fontsize=11)
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='upper left', frameon=True)
plt.tight_layout()
plt.show()
`;

  const communityLouvainPy = `"""
========================================================================
Module 3: Community Detection via Modularity Optimization
Dependencies: pip install networkx matplotlib
========================================================================
"""
import networkx as nx
import networkx.algorithms.community as nx_comm
import matplotlib.pyplot as plt

# 1. Initialize Graph
G = nx.Graph()
edge_list = [
    ${sampleEdges}
]
for u, v, w in edge_list:
    G.add_edge(u, v, weight=w)

# 2. Greedy Modularity Community Detection
communities = list(nx_comm.greedy_modularity_communities(G))
modularity_q = nx_comm.modularity(G, communities)

print("=" * 60)
print(f"Detected Community Clusters: {len(communities)}")
print(f"Newman-Girvan Modularity Score Q: {modularity_q:.4f}")
print("=" * 60)

for idx, comm in enumerate(communities):
    print(f"Community Cluster #{idx + 1} (Size {len(comm)}): {list(comm)[:8]}...")

# 3. Bar Chart of Community Sizes (Strictly English Titles, Legends & Axis Labels)
plt.figure(figsize=(8, 4.5))
comm_sizes = [len(c) for c in communities]
cluster_names = [f"Cluster {i+1}" for i in range(len(communities))]

colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4']
plt.bar(cluster_names, comm_sizes, color=colors[:len(comm_sizes)], edgecolor='#1e293b', width=0.55, label='Cluster Population')

plt.title(f"Community Size Distribution (Modularity Q = {modularity_q:.3f})", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Detected Community Clusters", fontsize=11)
plt.ylabel("Node Count (Population Size)", fontsize=11)
plt.grid(axis='y', linestyle=':', alpha=0.6)
plt.legend(loc='upper right', frameon=True)
plt.tight_layout()
plt.show()
`;

  const cascadePy = `"""
========================================================================
Module 4: Motter-Lai Cascading Failure & Overload Blackout Avalanche
Dependencies: pip install networkx matplotlib
========================================================================
"""
import networkx as nx
import matplotlib.pyplot as plt

def simulate_cascade_avalanche(G_orig, trigger_node=None, alpha=1.0, beta=0.25):
    G = G_orig.copy()
    nodes = list(G.nodes())
    n = len(nodes)
    
    # 1. Initialize Load and Capacity: L_i = k_i^alpha, C_i = (1 + beta) * L_i
    for u in G.nodes():
        deg = max(1, G.degree[u])
        load = (deg ** alpha) * 10.0
        G.nodes[u]['load'] = load
        G.nodes[u]['capacity'] = load * (1.0 + beta)
        G.nodes[u]['status'] = 'alive'
        
    if not trigger_node or trigger_node not in G:
        trigger_node = max(G.nodes(), key=lambda x: G.degree[x])
        
    print(f"[Trigger Event] Initial Failed Node: {trigger_node}")
    G.nodes[trigger_node]['status'] = 'failed'
    
    wave_history = [1.0] # Initial giant component fraction
    new_failures = [trigger_node]
    wave = 1
    
    while new_failures:
        # Load redistribution to surviving neighbors
        for f_node in new_failures:
            spilled_load = G.nodes[f_node]['load'] * 0.7
            alive_nbrs = [nbr for nbr in G.neighbors(f_node) if G.nodes[nbr]['status'] == 'alive']
            if alive_nbrs:
                share = spilled_load / len(alive_nbrs)
                for nbr in alive_nbrs:
                    G.nodes[nbr]['load'] += share
                    
        # Check newly overloaded nodes
        new_failures = []
        for u in G.nodes():
            if G.nodes[u]['status'] == 'alive' and G.nodes[u]['load'] > G.nodes[u]['capacity']:
                G.nodes[u]['status'] = 'failed'
                new_failures.append(u)
                
        alive_sub = G.subgraph([u for u in G.nodes() if G.nodes[u]['status'] == 'alive'])
        if len(alive_sub) > 0:
            giant_size = len(max(nx.connected_components(alive_sub), key=len, default=[]))
            wave_history.append(giant_size / n)
        else:
            wave_history.append(0.0)
            break
            
        print(f"Wave #{wave}: {len(new_failures)} new overloaded nodes, Giant Component Ratio={wave_history[-1]:.1%}")
        wave += 1
        
    return wave_history

# Run Simulation
G_power = nx.Graph()
for u, v, w in [${sampleEdges}]:
    G_power.add_edge(u, v, weight=w)

history = simulate_cascade_avalanche(G_power)

# 2. Avalanche Curve Plot (Strictly English Titles, Legends & Axis Labels)
plt.figure(figsize=(9, 4.5))
plt.plot(range(len(history)), history, 's-', color='#e11d48', linewidth=2.2, markersize=6, label='Surviving Giant Component S(t)')
plt.title("Motter-Lai Cascading Failure & Avalanche Breakdown", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Cascade Avalanche Wave Step", fontsize=11)
plt.ylabel("Giant Component Ratio S(t) / N", fontsize=11)
plt.ylim(-0.05, 1.05)
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='lower left', frameon=True)
plt.tight_layout()
plt.show()
`;

  const sirPy = `"""
========================================================================
Module 5: SIR Epidemic & Viral Dynamics Simulation on Complex Network
Dependencies: pip install networkx matplotlib numpy
========================================================================
"""
import networkx as nx
import random
import matplotlib.pyplot as plt

def run_sir_dynamics(G, beta=0.35, gamma=0.15, max_steps=20):
    nodes = list(G.nodes())
    n = len(nodes)
    status = {u: 'S' for u in nodes}
    
    # Random initial infected seed
    seed = random.choice(nodes)
    status[seed] = 'I'
    
    s_hist, i_hist, r_hist = [], [], []
    
    for t in range(max_steps):
        s_count = sum(1 for u in nodes if status[u] == 'S')
        i_count = sum(1 for u in nodes if status[u] == 'I')
        r_count = sum(1 for u in nodes if status[u] == 'R')
        
        s_hist.append(s_count)
        i_hist.append(i_count)
        r_hist.append(r_count)
        
        if i_count == 0:
            break
            
        next_status = status.copy()
        for u in nodes:
            if status[u] == 'I':
                for v in G.neighbors(u):
                    if status[v] == 'S' and random.random() < beta:
                        next_status[v] = 'I'
                if random.random() < gamma:
                    next_status[u] = 'R'
        status = next_status
        
    return s_hist, i_hist, r_hist

G_viral = nx.Graph()
for u, v, w in [${sampleEdges}]:
    G_viral.add_edge(u, v, weight=w)

s_curve, i_curve, r_curve = run_sir_dynamics(G_viral)
steps = range(len(s_curve))

# Plot SIR Dynamics (Strictly English Titles, Legends & Axis Labels)
plt.figure(figsize=(9, 4.5))
plt.plot(steps, s_curve, 'o-', color='#0284c7', linewidth=2, label='Susceptible Population S(t)')
plt.plot(steps, i_curve, 's-', color='#e11d48', linewidth=2, label='Infected Population I(t)')
plt.plot(steps, r_curve, '^-', color='#10b981', linewidth=2, label='Recovered Population R(t)')

plt.title("SIR Epidemic & Viral Spreading Dynamics", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Simulation Time Steps (t)", fontsize=11)
plt.ylabel("Node Population Count", fontsize=11)
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='center right', frameon=True)
plt.tight_layout()
plt.show()
`;

  return {
    topologyAlgebraPy,
    centralityPy,
    communityLouvainPy,
    cascadePy,
    sirPy,
  };
}
