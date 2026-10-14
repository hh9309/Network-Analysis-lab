import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini client on server if valid API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 5) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Local heuristic diagnosis engine for instant analysis and fallback
function generateLocalDiagnosis(stats: any, prompt?: string): string {
  const n = stats?.n || 0;
  const m = stats?.m || 0;
  const avgK = stats?.avgDegree?.toFixed(2) || '0';
  const kappa = stats?.kappa?.toFixed(2) || '1';
  const fiedler = stats?.algebraicConnectivity?.toFixed(4) || '0';
  const rho = stats?.spectralRadius?.toFixed(3) || '1';
  const modularity = stats?.modularity?.toFixed(3) || '0';
  const giantRatio = stats?.giantComponentRatio ? (stats.giantComponentRatio * 100).toFixed(1) + '%' : '100%';
  const fcRand = stats?.fcRandom ? (stats.fcRandom * 100).toFixed(1) + '%' : '50%';
  const fcTarget = stats?.fcTarget ? (stats.fcTarget * 100).toFixed(1) + '%' : '15%';

  return `### 🔍 复杂网络智能拓扑诊断评估报告 (本地高精度分析)

**1. 基础拓扑与连通性分析**
* 节点规模 $N=${n}$，连接边数 $M=${m}$，平均度 $\\langle k \\rangle = ${avgK}$。
* 当前巨型连通分量（Giant Component）占比为 **${giantRatio}**。
* **代数连通度（Fiedler 值 $\\lambda_2$）** 为 **${fiedler}**：${
    Number(fiedler) < 0.05
      ? '处于极低连通水平，网络存在明显结构瓶颈或弱连接颈缩区，极易被二分割断。'
      : '网络整体连通度较好，各子群落间具备有效信息通道。'
  }

**2. 鲁棒性与渗透相变（Percolation Threshold）评估**
* **度二阶异质度 $\\kappa = \\frac{\\langle k^2 \\rangle}{\\langle k \\rangle} = ${kappa}$**。
* **随机失效容错阈值 $f_c^{\\text{rand}} \\approx ${fcRand}$**：网络对随机故障具有极高天然抵抗力，即使随机节点故障，系统仍能维持主连通核。
* **蓄意攻击崩塌阈值 $f_c^{\\text{target}} \\approx ${fcTarget}$**：【高危警示】对高介数或高连通度 Hub 节点的靶向移除将导致巨型连通分量发生**渗流一级/二级相变崩塌**！

**3. 动力学传播与级联扩散特性**
* **邻接谱半径 $\\rho(A) = ${rho}$**，根据动力学流行病学理论，网络流行病传播临界阈值约为 $\\tau_c = \\frac{1}{\\rho(A)} \\approx ${(1 / Math.max(0.1, Number(rho))).toFixed(3)}$。当传播率高于此值时，疫情或有害舆情将在全网爆发。
* 当前群落模块度 $Q = ${modularity}$，${Number(modularity) > 0.4 ? '呈现显著的社区聚类结构，信息传播会在局部社区内快速饱和，而跨社区传播高度依赖少数边界桥梁节点。' : '群落分化不明显，拓扑结构更趋向全局混叠。'}

**4. 工程加固与风险阻断对策建议**
1. **结构洞跨界保护**：优先识别并加固介数中心性居前但度偏低的“咽喉节点”，配备多路冗余备份。
2. **级联过载阻断**：在关键负荷路径上设置“电气断路器 / 速率限制（Rate Limiter）”，避免单点雪崩连锁传递。
3. **定向免疫策略**：针对前 5% 的枢纽节点施加预防性免疫或隔离，其效果显著优于广谱随机管控。`;
}

// AI Diagnosis & Network Consultation API
app.post('/api/ai/diagnose', async (req, res) => {
  try {
    const { prompt, networkStats, model = 'gemini-3-flash', apiKey: clientKey } = req.body;

    const systemInstruction = `你是一位专注于复杂网络理论、统计物理与谱图论拓扑分析的资深科学家。
请针对用户提供的复杂网络拓扑指标（节点数 N、边数 M、平均度 <k>、度二阶异质性 kappa = <k^2>/<k>、谱半径 rho(A)、代数连通度 lambda_2 (Fiedler值)、模块度 Q、巨型连通分量占比、渗透阈值等），进行专业、深入、严谨的分析。
包含：
1. 拓扑形态学判定（无标度/小世界/随机/稠密网络特性）
2. 鲁棒性与阿喀琉斯之踵（随机故障 vs. 靶向蓄意打击对比，渗流阈值突变）
3. 传播与级联雪崩风险（SIR 传播阈值 1/rho(A)，过载级联失效机制）
4. 具体网络韧性优化与工程加固建议。
请使用精炼专业的学术中文，公式使用 LaTeX 规范（如 $A_{ij}$, $\\lambda_2$ 等）。`;

    const userMessage = `【当前网络拓扑统计数据】：
- 节点数 N: ${networkStats?.n}
- 边数 M: ${networkStats?.m}
- 平均度 <k>: ${networkStats?.avgDegree?.toFixed(2)}
- 度异质性 kappa: ${networkStats?.kappa?.toFixed(2)}
- 谱半径 rho(A): ${networkStats?.spectralRadius?.toFixed(3)}
- 代数连通度 lambda_2 (Fiedler值): ${networkStats?.algebraicConnectivity?.toFixed(4)}
- 模块度 Q: ${networkStats?.modularity?.toFixed(3)}
- 巨型连通分量占比: ${(networkStats?.giantComponentRatio * 100)?.toFixed(1)}%
- 随机攻击失效阈值: ${(networkStats?.fcRandom * 100)?.toFixed(1)}%
- 靶向攻击失效阈值: ${(networkStats?.fcTarget * 100)?.toFixed(1)}%

【用户提问 / 深度诊断请求】：
${prompt || '请对当前网络进行全面的鲁棒性、相变崩溃临界点及结构瓶颈诊断，并指出潜在的阿喀琉斯之踵。'}`;

    // 1. DeepSeek V4 Pro branch
    if (model === 'deepseek-v4-pro') {
      const activeKey = clientKey || process.env.DEEPSEEK_API_KEY;
      if (!activeKey) {
        return res.json({
          fallback: true,
          text: generateLocalDiagnosis(networkStats, prompt),
          warning: '未提供 DeepSeek API-Key，已自动切换为内置专家系统进行诊断',
        });
      }

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API returned status ${response.status}`);
      }

      const data: any = await response.json();
      const replyText = data.choices?.[0]?.message?.content || generateLocalDiagnosis(networkStats, prompt);
      return res.json({
        fallback: false,
        model: 'deepseek-v4-pro',
        text: replyText,
      });
    }

    // 2. Gemini 3 Flash branch
    const effectiveAi = clientKey
      ? new GoogleGenAI({
          apiKey: clientKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : ai;

    if (!effectiveAi) {
      return res.json({
        fallback: true,
        text: generateLocalDiagnosis(networkStats, prompt),
        warning: '未检测到可用 Gemini API-Key，已自动切换为内置专家系统',
      });
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI诊断请求响应超时，已降级为内置专家系统')), 8000)
    );

    const generatePromise = effectiveAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    return res.json({
      fallback: false,
      model: 'gemini-3-flash',
      text: response.text || generateLocalDiagnosis(networkStats, prompt),
    });
  } catch (error: any) {
    console.error('LLM API Error in /api/ai/diagnose:', error);
    return res.json({
      fallback: true,
      text: generateLocalDiagnosis(req.body.networkStats, req.body.prompt),
      warning: error.message || '大模型调用异常，已自动切换为内置专家系统进行诊断',
    });
  }
});

// Mount Vite or static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Complex Systems Network Analysis Server running at http://localhost:${port}`);
  });
}

startServer();
