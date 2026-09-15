import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  UploadCloud,
  Terminal,
  FileText,
  Download,
  Loader2,
  Activity,
  WifiOff,
  FileCheck,
  Lock,
  ChevronDown,
  ChevronUp,
  File,
  X,
  Sparkles,
  Zap,
  Check,
  AlertTriangle,
  MessageSquare,
  Send,
  Trash2,
  Copy,
  CheckCheck,
  Bot,
  User,
  ArrowRight,
  HelpCircle,
  Database
} from 'lucide-react';

interface TaskStep {
  id: string;
  name: string;
  model: string;
  desc: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
  detail?: string;
}

interface NetworkMetrics {
  egress_packets: number;
  wan_status: string;
  active_ip: string;
  host_ip: string;
  interface: string;
  timestamp: number;
}

interface ArtifactDeliverable {
  filename: string;
  download_url: string;
  file_size?: number;
  extracted_metrics?: {
    equipment_tag?: string;
    nominal_thickness?: string;
    measured_thickness?: string;
    corrosion_allowance?: string;
    service_line?: string;
    material?: string;
    design_pressure?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundedDoc?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'swarm' | 'copilot'>('swarm');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState('Perform API 570 ultrasonic thickness inspection analysis on pipe spool Tag E-101');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [artifact, setArtifact] = useState<ArtifactDeliverable | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [networkAudit, setNetworkAudit] = useState<NetworkMetrics>({
    egress_packets: 0,
    wan_status: 'SECURE_AIR_GAPPED',
    active_ip: '127.0.0.1',
    host_ip: '127.0.0.1',
    interface: 'Loopback (Sovereign Isolated)',
    timestamp: Date.now()
  });

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to the **MRPL Asset Integrity Copilot**.\n\nI am your sovereign AI engineering assistant running locally on `llama3.2:3b` with zero WAN egress. I am grounded in refinery statutory standards (API 570, API 510, ASME Section VIII, OISD-STD-118) and your active uploaded inspection data.\n\nHow can I assist your mechanical integrity assessment today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSessionId] = useState(() => 'mrpl-session-' + Math.random().toString(36).substring(2, 9));
  const [useActiveDocInChat, setUseActiveDocInChat] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const initialSwarmSteps: TaskStep[] = [
    {
      id: 'agent_ingestion',
      name: 'Agent 1: Multimodal Ingestion & Gatekeeper',
      model: 'qwen2.5vl:3b + llama3.2:3b',
      desc: 'Validates industrial domain authenticity & extracts structured inspection parameters',
      status: 'pending'
    },
    {
      id: 'agent_engine',
      name: 'Agent 2: Statutory Standards & Calculation Engine',
      model: 'ChromaDB RAG + qwen2.5-coder:1.5b + llama3.2:3b',
      desc: 'Retrieves API 570 / 510 / OISD standards, executes isolated sandbox math, & assesses risk',
      status: 'pending'
    },
    {
      id: 'agent_compiler_auditor',
      name: 'Agent 3: PSU Deliverable Compiler & Sovereign Auditor',
      model: 'python-docx + Local Air-Gap Socket Audit',
      desc: 'Compiles official MRPL Inter-Office Note (.docx) & verifies 0 WAN packet air-gap integrity',
      status: 'pending'
    }
  ];

  const [steps, setSteps] = useState<TaskStep[]>(initialSwarmSteps);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Poll local network status every 4 seconds to verify air-gap
  useEffect(() => {
    const fetchNetworkStatus = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/network-status');
        if (res.ok) {
          const data = await res.json();
          setNetworkAudit(data);
        }
      } catch (err) {
        // Local server offline or starting
      }
    };
    fetchNetworkStatus();
    const interval = setInterval(fetchNetworkStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Autoscroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Autoscroll chat
  useEffect(() => {
    if (activeTab === 'copilot' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isChatLoading]);

  // Handle File Selection & Thumbnail Preview
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const resetPipelineSteps = () => {
    setSteps(initialSwarmSteps);
  };

  const updateStepStatus = (
    index: number,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected',
    detail?: string
  ) => {
    setSteps((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], status, detail: detail || next[index].detail };
      }
      return next;
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setLogs([]);
    setArtifact(null);
    setValidationAlert(null);
    resetPipelineSteps();

    const formData = new FormData();
    formData.append('prompt', prompt);
    if (file) formData.append('file', file);

    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] [INIT] Initiating Sovereign Execution pipeline...`]);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/tasks/run', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));

          if (eventLine && dataLine) {
            const eventType = eventLine.replace('event: ', '').trim();
            const dataStr = dataLine.replace('data: ', '').trim();

            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                const evTime = new Date().toLocaleTimeString();

                if (eventType === 'step') {
                  const sIdx = Number(data.step_index) || 1;
                  const statusLower = String(data.status || '').toLowerCase();
                  const uiIdx = sIdx <= 2 ? 0 : sIdx <= 5 ? 1 : 2;

                  if (statusLower === 'rejected' || statusLower === 'failed') {
                    updateStepStatus(uiIdx, statusLower === 'rejected' ? 'rejected' : 'failed', data.message);
                    if (statusLower === 'rejected') {
                      setValidationAlert(data.message || 'Uploaded file is not a valid refinery inspection sheet or P&ID. Please upload an ultrasonic test report or equipment scan.');
                    }
                    setIsRunning(false);
                  } else {
                    if (data.status === 'RUNNING') {
                      updateStepStatus(uiIdx, 'running', data.message);
                    } else if (data.status === 'COMPLETED') {
                      if (sIdx === 2 || sIdx === 5 || sIdx === 7) {
                        updateStepStatus(uiIdx, 'completed', data.message);
                      } else {
                        updateStepStatus(uiIdx, 'running', data.message);
                      }
                    }
                  }
                } else if (eventType === 'log') {
                  setLogs((prev) => [...prev, `[${evTime}] ${data.log}`]);
                } else if (eventType === 'artifact') {
                  setArtifact({
                    filename: data.filename,
                    download_url: `http://127.0.0.1:5000${data.download_url}`,
                    file_size: data.file_size
                  });
                } else if (eventType === 'complete') {
                  const compStatus = String(data.status || '').toLowerCase();
                  if (compStatus === 'rejected' || compStatus === 'validation_rejected') {
                    const errMsg = data.reason || 'Uploaded file is not a valid refinery inspection sheet or P&ID. Please upload an ultrasonic test report or equipment scan.';
                    updateStepStatus(0, 'rejected', errMsg);
                    setValidationAlert(errMsg);
                    setLogs((prev) => [
                      ...prev,
                      `[${evTime}] [VALIDATION_REJECTED] ${errMsg}`
                    ]);
                    setIsRunning(false);
                  } else {
                    setLogs((prev) => [
                      ...prev,
                      `[${evTime}] [SUCCESS] Autonomous Swarm execution complete (${data.status}). Deliverable verified.`
                    ]);
                    if (data.extracted_data) {
                      setArtifact((prev) =>
                        prev ? { ...prev, extracted_metrics: data.extracted_data } : {
                          filename: 'MRPL_Approval_Note.docx',
                          download_url: '#',
                          extracted_metrics: data.extracted_data
                        }
                      );
                    }
                    setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
                    setIsRunning(false);
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE JSON', e);
              }
            }
          }
        }
      }
    } catch (error) {
      const errTime = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${errTime}] [ERROR] Pipeline failure: ${error}`]);
      setIsRunning(false);
    }
  };

  // Helper to compile active document context for Chat grounding
  const getActiveDocumentContext = () => {
    let ctx = '';
    if (file) {
      ctx += `Uploaded Inspection File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n`;
    }
    if (artifact?.extracted_metrics) {
      const m = artifact.extracted_metrics;
      ctx += `Equipment Identifier / Tag: ${m.equipment_tag || 'N/A'}\n`;
      if (m.service_line) ctx += `Service Process Line: ${m.service_line}\n`;
      if (m.material) ctx += `Material Grade: ${m.material}\n`;
      if (m.design_pressure) ctx += `Design Pressure: ${m.design_pressure}\n`;
      if (m.nominal_thickness) ctx += `Nominal Wall Thickness: ${m.nominal_thickness}\n`;
      if (m.measured_thickness) ctx += `Measured Wall Thickness: ${m.measured_thickness}\n`;
      if (m.corrosion_allowance) ctx += `Corrosion Allowance: ${m.corrosion_allowance}\n`;
    }
    if (prompt) {
      ctx += `Engineering Task Query: ${prompt}\n`;
    }
    return ctx.trim();
  };

  // Send message to Copilot chat endpoint
  const handleSendChatMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const docContext = useActiveDocInChat ? getActiveDocumentContext() : '';

      const res = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: chatSessionId,
          message: textToSend,
          history: historyPayload,
          document_context: docContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API returned status ${res.status}`);
      }

      const data = await res.json();
      const activeTag = artifact?.extracted_metrics?.equipment_tag || (file ? file.name : undefined);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response generated from local model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundedDoc: docContext && activeTag ? activeTag : undefined,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Copilot Connection Error**: Unable to reach local Ollama inference on ` +
          `\`http://127.0.0.1:11434\`.\n\n*Error detail*: ${err.message || String(err)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const presetTemplates = [
    {
      title: 'Pipe E-101 Thickness Scan',
      prompt: 'Perform API 570 ultrasonic thickness inspection on line 10-HC-4001 tagged E-101 (Nominal 8.0mm, Measured 3.8mm, Corrosion Allowance 3.0mm).'
    },
    {
      title: 'Centrifugal Pump P-201 Alert',
      prompt: 'Verify vibration velocity for crude booster pump P-201A against ISO 10816-3 limits (Measured: 7.8 mm/s RMS).'
    },
    {
      title: 'API 510 Vessel Integrity Check',
      prompt: 'Assess remaining life of sour crude flash drum V-301 shell thickness (Nominal 12.0mm, Measured 5.8mm, MAWP 25 bar).'
    }
  ];

  const quickChatChips = [
    'Why was this tagged as CRITICAL FAIL?',
    'What is the recommended replacement timeline under API 570?',
    'Summarize the wall thickness degradation at each point.',
    'What is the minimum retirement thickness equation under ASME Sec VIII?'
  ];

  const activeDocSummary = getActiveDocumentContext();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Industrial Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/90 border-b border-zinc-800/80 px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  MRPL SOVEREIGN AI WORKBENCH
                </h1>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  v2.0 ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Mangalore Refinery & Petrochemicals Limited &bull; Problem Statement #26117
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 shadow-inner">
            <button
              onClick={() => setActiveTab('swarm')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'swarm'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Swarm Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('copilot')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === 'copilot'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-cyan-300" />
              <span>Integrity Copilot</span>
              {activeDocSummary && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Air-Gap Security Badge */}
            <div className="flex items-center gap-2.5 bg-emerald-950/40 text-emerald-400 px-3.5 py-1.5 rounded-full font-mono text-xs border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold tracking-wide">SOVEREIGN AIR-GAP: 0 EGRESS</span>
            </div>

            {/* Hardware Topology Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>RTX 3060 6GB &bull; LLaMA-3.2:3B</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'swarm' ? (
          /* ========================================================================= */
          /* 7-AGENT SWARM PIPELINE WORKSPACE                                          */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: 7-Agent Swarm Contract Cards (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-sm text-zinc-100">Active Task Contract</h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800/80">
                    {steps.filter((s) => s.status === 'completed').length} / {steps.length} Steps
                  </span>
                </div>

                {/* Step Checklist */}
                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-xl border transition-all duration-200 ${
                        step.status === 'running'
                          ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : step.status === 'completed'
                          ? 'bg-zinc-950/60 border-zinc-800/90'
                          : step.status === 'rejected'
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                          : step.status === 'failed'
                          ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                          : 'bg-zinc-950/30 border-zinc-800/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {step.status === 'completed' && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                            )}
                            {(step.status === 'rejected' || step.status === 'failed') && (
                              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                            )}
                            {step.status === 'running' && (
                              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                            )}
                            {step.status === 'pending' && (
                              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                                {idx + 1}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-semibold text-zinc-100">{step.name}</h3>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{step.desc}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                                {step.model}
                              </span>
                              {step.status === 'running' && (
                                <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                                  &bull; In Progress
                                </span>
                              )}
                              {step.status === 'rejected' && (
                                <span className="text-[10px] font-mono text-amber-400">
                                  &bull; Rejected
                                </span>
                              )}
                              {step.status === 'failed' && (
                                <span className="text-[10px] font-mono text-red-400">
                                  &bull; Failed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium shrink-0 ${
                            step.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : step.status === 'rejected'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : step.status === 'failed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : step.status === 'running'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>

                      {step.detail && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
                          <span className="text-cyan-400">&gt;</span>
                          <span className="truncate">{step.detail}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Air-Gapped Network Audit Widget */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-sm text-zinc-100">Sovereignty & Egress Auditor</h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <Lock className="w-3 h-3" />
                    <span>AIR-GAPPED</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">WAN Outbound Packets</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">0 PKTS</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Strict egress block</div>
                  </div>

                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Bound Interface</div>
                    <div className="text-sm font-bold font-mono text-zinc-200 mt-1 truncate">
                      {networkAudit.active_ip}:11434
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 truncate">Local loopback socket</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
                    Cloud SDKs Blocked
                  </span>
                  <span className="text-emerald-400 font-semibold">100% LOCAL</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Execution Surface, Terminal & Deliverable (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Input & Upload Zone */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-sm text-zinc-100">Industrial Task Formulation</h2>
                  </div>
                  <span className="text-xs text-zinc-400">Multimodal Input</span>
                </div>

                {/* Drag-and-Drop File Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : file
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
                    }}
                    className="hidden"
                    accept="image/*,.pdf,.png,.jpg,.jpeg"
                  />

                  {file ? (
                    <div className="flex items-center gap-4 w-full px-2">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-14 h-14 rounded-lg object-cover border border-emerald-500/40 shadow"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center">
                          <File className="w-6 h-6 text-emerald-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold text-zinc-100 truncate">{file.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB &bull; Ready for Qwen2.5-VL Vision
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setFilePreview(null);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 mb-2">
                        <UploadCloud className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">
                        Drag & drop inspection scan (PNG/PDF) or click to browse
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Local vision analysis for ultrasonic thickness logs and equipment tags
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono self-center mr-1">Presets:</span>
                  {presetTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrompt(tpl.prompt)}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>

                {/* Prompt Text Input & Execution Button */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe inspection task or engineering calculation..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none"
                  />
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl px-5 py-3 transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-cyan-950/50 shrink-0"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                        <span>Execute Sovereign Task</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Validation Rejection Alert Banner */}
              {validationAlert && (
                <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/50 rounded-2xl p-4 shadow-xl flex items-start justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">Domain Validation Rejection</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          REJECTED
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 font-mono">{validationAlert}</p>
                      <p className="text-[11px] text-zinc-400 mt-1.5">
                        Uploaded file is not a recognized refinery inspection sheet or P&ID. Please upload an ultrasonic test report or equipment scan.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setValidationAlert(null)}
                    className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Real-Time Agent Reasoning Terminal */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                      Live SSE Agent Reasoning Terminal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {logs.length > 0 && (
                      <button
                        onClick={() => setLogs([])}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      {terminalCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {!terminalCollapsed && (
                  <div
                    ref={logContainerRef}
                    className="h-44 p-4 overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-1.5 bg-zinc-950/80"
                  >
                    {logs.length === 0 && (
                      <div className="text-zinc-600 italic mt-8 text-center">
                        Awaiting execution command &bull; Output stream will render here...
                      </div>
                    )}
                    {logs.map((log, i) => (
                      <div key={i} className="leading-relaxed whitespace-pre-wrap">
                        {log.includes('[SUCCESS]') || log.includes('PASSED') ? (
                          <span className="text-emerald-400">{log}</span>
                        ) : log.includes('[ERROR]') || log.includes('FAILED') ? (
                          <span className="text-red-400">{log}</span>
                        ) : log.includes('[SANDBOX]') ? (
                          <span className="text-cyan-300">{log}</span>
                        ) : log.includes('[ARTIFACT]') ? (
                          <span className="text-amber-300">{log}</span>
                        ) : (
                          <span>{log}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Deliverable Card (Animates upon completion) */}
              {artifact && (
                <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">MRPL Inter-Office Approval Note</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                            VERIFIED DELIVERABLE
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-1">{artifact.filename}</div>

                        {/* Summary Tags */}
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono text-zinc-300">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                            Format: Microsoft Word (.docx)
                          </span>
                          {artifact.file_size && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                              Size: {(artifact.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                            Mandate: Spool Replacement Required
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setActiveTab('copilot');
                          handleSendChatMessage('Explain the API 570 compliance verdict and recommended replacement timeline for this equipment.');
                        }}
                        className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 px-4 py-3 rounded-xl text-xs font-semibold transition shrink-0"
                      >
                        <Bot className="w-4 h-4" />
                        <span>Ask Copilot</span>
                      </button>

                      <a
                        href={artifact.download_url}
                        download
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/60 transition-all shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Note (.docx)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ASSET INTEGRITY COPILOT WORKSPACE (MULTI-TURN CHAT)                       */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT SIDEBAR: Active Document Context & Knowledge Stats (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Active Grounding Context Card */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-semibold text-xs text-zinc-100 uppercase tracking-wider">
                      Grounding Context
                    </h2>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-mono text-zinc-400">
                    <input
                      type="checkbox"
                      checked={useActiveDocInChat}
                      onChange={(e) => setUseActiveDocInChat(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Active</span>
                  </label>
                </div>

                {activeDocSummary ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs">
                      <div className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Active Inspection Grounded</span>
                      </div>
                      <pre className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {activeDocSummary}
                      </pre>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-normal">
                      The Copilot automatically extracts and references these exact parameters along with local API 570/510 SOPs to answer your questions.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                    <UploadCloud className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                    <div className="text-xs font-medium text-zinc-300">No Document Uploaded Yet</div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Upload an inspection PDF/image in the Swarm tab to ground Copilot responses in your equipment data.
                    </p>
                    <button
                      onClick={() => setActiveTab('swarm')}
                      className="mt-3 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                      <span>Go to Upload Zone</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Statutory Standards Vector Store Card */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-semibold text-xs text-zinc-100 uppercase tracking-wider">
                      Statutory Knowledge Base
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ChromaDB RAG
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">API 570</span>
                    <span className="text-zinc-500 text-[11px]">Piping Retirement Limits</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">ASME Sec VIII</span>
                    <span className="text-zinc-500 text-[11px]">Vessel Wall Loss & MAWP</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">OISD-STD-118</span>
                    <span className="text-zinc-500 text-[11px]">Refinery Shutdown Mandates</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-300">ISO 10816-3</span>
                    <span className="text-zinc-500 text-[11px]">Machinery Vibration Limits</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-zinc-500">
                  Embeddings running locally on CPU via <span className="text-zinc-400">BAAI/bge-small-en-v1.5</span>.
                </div>
              </div>
            </div>

            {/* RIGHT MAIN PANEL: Interactive Chat Stream (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden h-[700px]">
              {/* Chat Header Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>MRPL Asset Integrity Copilot</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                        llama3.2:3b
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Multi-Turn Air-Gapped Engineering Conversational Assistant
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setChatMessages([
                        {
                          id: 'welcome-reset',
                          role: 'assistant',
                          content: 'Chat history cleared. How can I assist with your refinery asset integrity calculations?',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        }
                      ]);
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition font-mono"
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-950/60">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 transition-all shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                          : 'bg-zinc-900 border border-zinc-800/90 text-zinc-200 rounded-tl-none'
                      }`}
                    >
                      {/* Grounded Document Indicator on Assistant message */}
                      {msg.role === 'assistant' && msg.groundedDoc && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md mb-2 w-fit">
                          <Check className="w-3 h-3" />
                          <span>Grounded in: {msg.groundedDoc}</span>
                        </div>
                      )}

                      <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-2.5 pt-1.5 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                        <span>{msg.timestamp}</span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-white transition flex items-center gap-1"
                            title="Copy to clipboard"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Copilot Reasoning Loader */}
                {isChatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 text-xs text-cyan-300 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span className="font-mono">
                        Copilot reasoning locally with LLaMA 3.2:3B & standards RAG...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-3 bg-zinc-950/90 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-zinc-500 font-mono shrink-0 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Ask:
                </span>
                {quickChatChips.map((chip, i) => (
                  <button
                    key={i}
                    disabled={isChatLoading}
                    onClick={() => handleSendChatMessage(chip)}
                    className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 hover:text-cyan-300 text-zinc-400 transition whitespace-nowrap shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-zinc-950 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <textarea
                    rows={1}
                    value={chatInput}
                    disabled={isChatLoading}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    placeholder={
                      isChatLoading
                        ? 'Copilot is generating answer...'
                        : 'Ask engineering questions grounded in this inspection or standards (Enter to send)...'
                    }
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSendChatMessage()}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl px-4 py-2.5 transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-cyan-950/50 shrink-0"
                  >
                    {isChatLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5 px-1 font-mono">
                  <span>100% On-Premises &bull; Local Ollama llama3.2:3b &bull; Zero External Egress</span>
                  <span>Press Shift+Enter for new line</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
