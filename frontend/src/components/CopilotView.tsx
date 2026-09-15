import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Copy, 
  CheckCheck, 
  Trash2, 
  Loader2, 
  Database, 
  ShieldCheck, 
  HelpCircle, 
  Check 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundedDoc?: string;
}

interface CopilotViewProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  onSendMessage: (msg?: string) => void;
  onClearChat: () => void;
  activeDocSummary: string;
  useActiveDocInChat: boolean;
  setUseActiveDocInChat: (v: boolean) => void;
}

export default function CopilotView({
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  onSendMessage,
  onClearChat,
  activeDocSummary,
  useActiveDocInChat,
  setUseActiveDocInChat
}: CopilotViewProps) {
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const quickChatChips = [
    'Why was this tagged as CRITICAL FAIL?',
    'What is the recommended replacement timeline under API 570?',
    'Summarize the wall thickness degradation at each point.',
    'What is the minimum retirement thickness equation under ASME Sec VIII?'
  ];

  return (
    <div className="copilot-container">
      {/* Left Sidebar: Grounding Context & Knowledge Store */}
      <aside className="copilot-sidebar">
        {/* Grounding Context */}
        <div className="grounding-box">
          <div className="grounding-header">
            <span className="grounding-title">
              <Database size={14} color="#38BDF8" /> Grounding Context
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#9CA3AF', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useActiveDocInChat}
                onChange={(e) => setUseActiveDocInChat(e.target.checked)}
              />
              <span>Grounded</span>
            </label>
          </div>

          {activeDocSummary ? (
            <pre className="grounding-pre">
              {activeDocSummary}
            </pre>
          ) : (
            <div style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No inspection document uploaded yet. Upload a scan in New Task to ground responses.
            </div>
          )}
        </div>

        {/* Statutory Standards Knowledge Base */}
        <div className="grounding-box">
          <div className="grounding-header">
            <span className="grounding-title">
              <ShieldCheck size={14} color="#10B981" /> Statutory Standards
            </span>
            <span className="font-mono text-muted" style={{ fontSize: '0.65rem' }}>ChromaDB RAG</span>
          </div>

          <div className="standards-list-box">
            <div className="standard-item-row">
              <span className="standard-name">API 570</span>
              <span className="standard-desc">Piping Retirement Limits</span>
            </div>
            <div className="standard-item-row">
              <span className="standard-name">ASME Sec VIII</span>
              <span className="standard-desc">Vessel Wall Loss & MAWP</span>
            </div>
            <div className="standard-item-row">
              <span className="standard-name">OISD-STD-118</span>
              <span className="standard-desc">Refinery Shutdown Mandates</span>
            </div>
            <div className="standard-item-row">
              <span className="standard-name">ISO 10816-3</span>
              <span className="standard-desc">Machinery Vibration Limits</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="copilot-chat-panel">
        <header className="chat-panel-header">
          <div className="chat-header-title">
            <div className="chat-bot-icon">
              <Bot size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>MRPL Asset Integrity Copilot</span>
                <span className="version-pill">LLaMA-3.2:3B</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>Air-Gapped Multi-Turn Refinery Assistant</span>
            </div>
          </div>

          <button
            type="button"
            className="terminal-clear-btn"
            onClick={onClearChat}
            title="Reset Chat"
          >
            <Trash2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Clear
          </button>
        </header>

        {/* Chat Messages Stream */}
        <div className="chat-messages-container">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`chat-message-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-bot-icon" style={{ marginTop: '2px', flexShrink: 0 }}>
                  <Bot size={14} />
                </div>
              )}

              <div className={`chat-bubble ${msg.role}`}>
                {msg.role === 'assistant' && msg.groundedDoc && (
                  <div className="grounded-badge-inline">
                    <Check size={11} />
                    <span>Grounded in: {msg.groundedDoc}</span>
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>

                <div className="chat-msg-footer">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopy(msg.id, msg.content)}
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <CheckCheck size={12} color="#10B981" />
                          <span style={{ color: '#10B981' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="avatar-circle-purple" style={{ width: '26px', height: '26px', fontSize: '0.7rem', flexShrink: 0 }}>
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {isChatLoading && (
            <div className="chat-message-row assistant">
              <div className="chat-bot-icon" style={{ marginTop: '2px', flexShrink: 0 }}>
                <Bot size={14} />
              </div>
              <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38BDF8' }}>
                <Loader2 size={15} className="animate-spin" />
                <span className="font-mono" style={{ fontSize: '0.75rem' }}>Copilot reasoning locally with LLaMA-3.2 & statutory RAG...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="chat-suggestions-bar">
          <span className="font-mono text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <HelpCircle size={11} /> Quick:
          </span>
          {quickChatChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              className="suggestion-chip"
              disabled={isChatLoading}
              onClick={() => onSendMessage(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="chat-input-bar">
          <textarea
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) onSendMessage();
              }
            }}
            placeholder="Ask questions about wall thickness degradation, API 570 limits, or inspection findings (Enter to send)..."
            className="chat-textarea"
          />

          <button
            type="button"
            className="chat-send-btn"
            disabled={isChatLoading || !chatInput.trim()}
            onClick={() => onSendMessage()}
          >
            {isChatLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Send size={13} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
