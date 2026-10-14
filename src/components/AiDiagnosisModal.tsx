import React, { useState, useRef, useEffect } from 'react';
import { NetworkStats, GraphNode, GraphEdge } from '../types/network';
import {
  Bot,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Activity,
  Maximize2,
  Minimize2,
  Settings,
  Key,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface AiDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: NetworkStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type SupportedModel = 'gemini 3 flash' | 'deepseek-v4-pro';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isDiagnosis?: boolean;
}

const LOCAL_STORAGE_KEY_NAME = 'complex_net_ai_key';
const LOCAL_STORAGE_MODEL_NAME = 'complex_net_ai_model';

const SYSTEM_DIAGNOSIS_PROMPT = `你是一位世界顶尖的复杂系统科学、图论与统计物理动力学 AI 专家。
你的任务是基于用户提供的复杂网络拓扑指标（谱图论、邻接矩阵谱半径、Fiedler代数连通度、介数中心度、社区模块度Q、渗流崩塌阈值）进行严密数学推导与物理分析。
请给出专业、清晰、分层级的系统诊断。适度运用 LaTeX 数学公式形式化表述（如 $\\lambda_2$、$\\rho(A)$、$C_B$ 等）。
重点剖析：
1. 网络拓扑类型（无标度/小世界/随机网络）与核心特征
2. 关键阿喀琉斯之踵（咽喉枢纽 Hubs 与结构洞 Bridges 的单点故障隐患）
3. 渗流相变与级联失效崩溃风险
4. 流行病/舆情爆发临界阈值 $\\tau_c = 1 / \\rho(A)$
5. 针对性加固对策（备用边冗余配置、自适应分流、靶向免疫策略）`;

export const AiDiagnosisModal: React.FC<AiDiagnosisModalProps> = ({
  isOpen,
  onClose,
  stats,
  nodes,
  edges,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Model & API-Key Configuration State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_NAME) || '';
  });
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(() => {
    return (localStorage.getItem(LOCAL_STORAGE_MODEL_NAME) as SupportedModel) || 'gemini 3 flash';
  });

  // Temp form state in settings modal
  const [inputKeyDraft, setInputKeyDraft] = useState<string>(apiKey);
  const [modelDraft, setModelDraft] = useState<SupportedModel>(selectedModel);
  const [showKeyText, setShowKeyText] = useState<boolean>(false);
  const [configToast, setConfigToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `您好！我是您的**复杂系统网络拓扑与动力学 AI 专家**。\n\n我已实时读取当前网络指标：\n- 节点数 $N=${stats.n}$，边数 $M=${stats.m}$，平均度 $\\langle k \\rangle=${stats.avgDegree.toFixed(2)}$\n- 谱半径 $\\rho(A)=${stats.spectralRadius.toFixed(3)}$，代数连通度 $\\lambda_2=${stats.algebraicConnectivity.toFixed(4)}$\n- 随机失效阈值 $f_c^{\\text{rand}}=${(stats.fcRandom * 100).toFixed(1)}\\%$，蓄意攻击崩溃阈值 $f_c^{\\text{target}}=${(stats.fcTarget * 100).toFixed(1)}\\%$\n\n📌 **使用须知**：本项目已适配 GitHub 开源部署，支持浏览器直接调用大模型。所有调用**必须先在右上角小齿轮 ⚙️ 输入您的 API-Key**（支持 **gemini 3 flash** 与 **deepseek-v4-pro**）。`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [stats]);

  // Sync draft when opened
  useEffect(() => {
    if (showSettings) {
      setInputKeyDraft(apiKey);
      setModelDraft(selectedModel);
      setConfigToast(null);
    }
  }, [showSettings, apiKey, selectedModel]);

  // Save Settings Handler ("确认大模型")
  const handleConfirmModelConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKeyDraft.trim();
    if (!cleanKey) {
      setConfigToast('⚠️ API-Key 不能为空，请输入有效的 API-Key 后再点击确认！');
      return;
    }

    setApiKey(cleanKey);
    setSelectedModel(modelDraft);
    localStorage.setItem(LOCAL_STORAGE_KEY_NAME, cleanKey);
    localStorage.setItem(LOCAL_STORAGE_MODEL_NAME, modelDraft);

    setConfigToast(`✓ 大模型配置已成功保存！当前启用: ${modelDraft}`);
    setTimeout(() => {
      setShowSettings(false);
      setConfigToast(null);
    }, 900);
  };

  // Clear Key Handler
  const handleClearKey = () => {
    setApiKey('');
    setInputKeyDraft('');
    localStorage.removeItem(LOCAL_STORAGE_KEY_NAME);
    setConfigToast('已清除 API-Key 配置');
  };

  // Direct Browser API Call to Gemini or DeepSeek
  const callLlmApiDirectly = async (question: string): Promise<string> => {
    const key = apiKey.trim();
    if (!key) {
      throw new Error('MISSING_KEY');
    }

    const networkContextText = `当前分析网络拓扑数据概要：
- 节点数 N = ${stats.n}, 边数 M = ${stats.m}, 密度 ρ = ${stats.density.toFixed(4)}
- 平均度 ⟨k⟩ = ${stats.avgDegree.toFixed(2)}, 集聚系数 C = ${stats.avgClustering.toFixed(4)}
- 邻接矩阵谱半径 ρ(A) = ${stats.spectralRadius.toFixed(4)}
- 拉普拉斯矩阵代数连通度 λ₂(L) = ${stats.algebraicConnectivity.toFixed(4)}
- 传染病爆发临界阈值 τ_c = 1 / ρ(A) = ${(stats.spectralRadius > 0 ? 1 / stats.spectralRadius : 0.5).toFixed(4)}
- 随机故障崩溃阈值 f_c^rand = ${(stats.fcRandom * 100).toFixed(1)}%
- 蓄意针对攻击崩溃阈值 f_c^target = ${(stats.fcTarget * 100).toFixed(1)}%
- 拓扑节点列表（前 8 个）：${nodes.slice(0, 8).map((n) => `${n.label}(度${n.degree || 0})`).join(', ')}`;

    if (selectedModel === 'gemini 3 flash') {
      // Direct call to Google Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        key
      )}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_DIAGNOSIS_PROMPT}\n\n${networkContextText}\n\n【用户提出的分析咨询或诊断指令】\n${question}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Gemini API 响应异常: ${errMsg}`);
      }

      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API 未返回有效的文本内容。');
      }
      return text;
    } else {
      // Direct call to DeepSeek API (deepseek-v4-pro / deepseek-chat)
      const deepseekUrl = 'https://api.deepseek.com/chat/completions';

      const response = await fetch(deepseekUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_DIAGNOSIS_PROMPT },
            {
              role: 'user',
              content: `${networkContextText}\n\n【用户提出的分析咨询或诊断指令】\n${question}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`DeepSeek API 响应异常: ${errMsg}`);
      }

      const resJson = await response.json();
      const text = resJson.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('DeepSeek API 未返回有效的文本内容。');
      }
      return text;
    }
  };

  // Handle Send Question
  const handleSendMessage = async (promptText?: string) => {
    const question = promptText || inputText.trim();
    if (!question || isLoading) return;

    // Strict Enforcement: All LLM calls require API-Key
    if (!apiKey.trim()) {
      setShowSettings(true);
      const reminderMsg: ChatMessage = {
        id: `sys_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **未检测到 API-Key**\n\n本项目已适配 GitHub 部署环境，所有大模型调用**必须由用户手工输入 API-Key** 后方可发起。\n\n请在已弹出的设置窗口中输入您的 API-Key，选择 **gemini 3 flash** 或 **deepseek-v4-pro**，并点击【确认大模型】。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, reminderMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputText('');
    setIsLoading(true);

    try {
      // Direct browser-side call
      const aiReplyText = await callLlmApiDirectly(question);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isDiagnosis: question.includes('诊断') || question.includes('评估'),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      let errorDesc = err.message || '网络连接或请求失败';
      if (err.message === 'MISSING_KEY') {
        errorDesc = '请先点击右上角小齿轮输入并确认 API-Key。';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `❌ **大模型调用失败**：${errorDesc}\n\n💡 **排查建议**：\n1. 请检查右上角 ⚙️ 设置中输入的 API-Key 是否正确且具备对应模型权限；\n2. 若使用 DeepSeek，请确认账号余额充足；\n3. 若在内网或受限网络环境，请检查网络是否能访问对应 API 域名。`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunFullDiagnosis = () => {
    handleSendMessage(
      '请对当前网络的拓扑连通性、渗流崩塌临界阈值与阿喀琉斯之踵进行全面深度诊断，并给出具体的网络韧性加固对策。'
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 bg-white shadow-2xl border border-slate-200/90 rounded-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'inset-6'
          : 'bottom-5 right-5 w-[490px] max-w-[calc(100vw-30px)] h-[650px] max-h-[calc(100vh-50px)]'
      }`}
    >
      {/* Modal Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <span>复杂网络智能随诊 AI 专家</span>
              {apiKey.trim() ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {selectedModel}
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  待配Key
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              拓扑代数、渗流阈值与抗毁性崩塌动态随诊
            </div>
          </div>
        </div>

        {/* Header Right Action Tools: Settings Gear Icon (Requirement 5) */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded transition relative ${
              showSettings
                ? 'bg-indigo-600 text-white'
                : 'hover:text-white hover:bg-slate-800 text-slate-300'
            }`}
            title="设置大模型与 API-Key"
          >
            <Settings className="w-4 h-4" />
            {!apiKey.trim() && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition"
            title={isExpanded ? '还原窗口' : '最大化窗口'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition"
            title="关闭窗口"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel (大模型与 API-Key 设置) */}
      {showSettings && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 text-white text-xs space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-slate-100">大模型配置 (GitHub 部署浏览器直调)</span>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmModelConfig} className="space-y-3">
            {/* 1. 手工输入 API-Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. 手工输入 API-Key (必须输入)</span>
                </label>
                {apiKey.trim() && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                  >
                    清除当前 Key
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  placeholder={
                    modelDraft === 'gemini 3 flash'
                      ? '请输入 Google Gemini API-Key (如 AIzaSy...)'
                      : '请输入 DeepSeek API-Key (如 sk-...)'
                  }
                  value={inputKeyDraft}
                  onChange={(e) => setInputKeyDraft(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-9 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                🔒 密钥仅安全存储于您浏览器的 localStorage，浏览器前端直连官方 API，零服务端中转。
              </p>
            </div>

            {/* 2. 选择两个大模型 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. 选择大模型 (两个核心模型)</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 1: gemini 3 flash */}
                <div
                  onClick={() => setModelDraft('gemini 3 flash')}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                    modelDraft === 'gemini 3 flash'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-xs'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-300">gemini 3 flash</span>
                    <input
                      type="radio"
                      name="modelSelect"
                      checked={modelDraft === 'gemini 3 flash'}
                      onChange={() => setModelDraft('gemini 3 flash')}
                      className="accent-indigo-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Google 官方模型，拓扑长上下文与极速响应
                  </div>
                </div>

                {/* Option 2: deepseek-v4-pro */}
                <div
                  onClick={() => setModelDraft('deepseek-v4-pro')}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                    modelDraft === 'deepseek-v4-pro'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-xs'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-sky-300">deepseek-v4-pro</span>
                    <input
                      type="radio"
                      name="modelSelect"
                      checked={modelDraft === 'deepseek-v4-pro'}
                      onChange={() => setModelDraft('deepseek-v4-pro')}
                      className="accent-indigo-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    深度推理模型，复杂博弈与抗毁性归纳
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Toast */}
            {configToast && (
              <div
                className={`text-[11px] px-3 py-1.5 rounded-md ${
                  configToast.startsWith('✓')
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {configToast}
              </div>
            )}

            {/* 3. 确认大模型 Button */}
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>确认大模型</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Network Health Glance Bar */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
        <div className="flex items-center gap-3">
          <span>
            代数连通度: <strong className="font-mono text-indigo-600">{stats.algebraicConnectivity.toFixed(3)}</strong>
          </span>
          <span>
            谱半径: <strong className="font-mono text-slate-800">{stats.spectralRadius.toFixed(2)}</strong>
          </span>
          <span>
            蓄意攻击阈值: <strong className="font-mono text-rose-600">{(stats.fcTarget * 100).toFixed(0)}%</strong>
          </span>
        </div>
        <button
          onClick={handleRunFullDiagnosis}
          disabled={isLoading}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>深度体检</span>
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
              }`}
            >
              {/* Message Content formatted with line breaks */}
              <div className="whitespace-pre-wrap space-y-1">
                {msg.text.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return (
                      <h4 key={i} className="font-bold text-slate-900 text-xs mt-2 mb-1">
                        {line.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={i} className="font-semibold text-slate-900 mt-1">
                        {line.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 bg-white p-3 rounded-xl border border-slate-200 w-fit">
            <Activity className="w-4 h-4 animate-spin" />
            <span>AI 专家正在解析拓扑谱特征与相变临界点...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Prompt Quick Chips */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0 text-[11px]">
        <button
          onClick={() => handleSendMessage('分析当前网络的阿喀琉斯之踵（针对关键 Hub 节点的蓄意打击崩溃风险）。')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          🎯 靶向攻击崩溃分析
        </button>
        <button
          onClick={() => handleSendMessage('评估流行病与舆情爆发阈值 1/rho(A)，如何实施最优阻断？')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          🦠 流行病传播阻断
        </button>
        <button
          onClick={() => handleSendMessage('代数连通度 Fiedler 值处于什么水平？如何通过增加备用边提高网络弹性？')}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          🛡️ 代数连通度加固
        </button>
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder={
            apiKey.trim()
              ? `向复杂网络 AI 专家 (${selectedModel}) 提问...`
              : '请先点击右上角 ⚙️ 输入 API-Key...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition"
          title="发送"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
