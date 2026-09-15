import React, { useState } from 'react';
import { Cpu, Database, CheckCircle2, AlertTriangle, RefreshCw, Layers, Shield, FileText } from 'lucide-react';

const mockServices = [
  { id: 'srv_1', name: 'General AI Pipeline (Qwen3)', type: 'Language Model', status: 'Online', lastChecked: '1 min ago', latency: '18ms', endpoint: 'http://localhost:8000/v1/chat' },
  { id: 'srv_2', name: 'Code Intelligence (Qwen3-Coder)', type: 'Code Model', status: 'Online', lastChecked: '1 min ago', latency: '22ms', endpoint: 'http://localhost:8001/v1/code' },
  { id: 'srv_3', name: 'Vision & Diagram Engine (Qwen3-VL)', type: 'Multimodal Vision', status: 'Online', lastChecked: '2 mins ago', latency: '45ms', endpoint: 'http://localhost:8002/v1/vision' },
  { id: 'srv_4', name: 'Document Parser (PaddleOCR-VL)', type: 'OCR Pipeline', status: 'Online', lastChecked: '1 min ago', latency: '12ms', endpoint: 'http://localhost:8003/ocr' },
  { id: 'srv_5', name: 'Dense Embeddings (BGE-M3)', type: 'Embedding Model', status: 'Online', lastChecked: '3 mins ago', latency: '8ms', endpoint: 'http://localhost:8004/embeddings' },
  { id: 'srv_6', name: 'Vector Store (Qdrant)', type: 'Vector Database', status: 'Online', lastChecked: '1 min ago', latency: '4ms', endpoint: 'http://localhost:6333' },
  { id: 'srv_7', name: 'Cross-Encoder Reranker (BGE-Reranker)', type: 'Reranker Engine', status: 'Online', lastChecked: '2 mins ago', latency: '14ms', endpoint: 'http://localhost:8005/rerank' },
  { id: 'srv_8', name: 'Task Orchestrator', type: 'Agentic Core', status: 'Online', lastChecked: 'Just now', latency: '2ms', endpoint: 'http://localhost:9000/health' },
];

export default function AdminAIServicesView() {
  const [services, setServices] = useState(mockServices);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setServices(prev => prev.map(s => ({ ...s, lastChecked: 'Just now' })));
      setIsRefreshing(false);
    }, 1200);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Online':
        return <span className="status-badge-green"><CheckCircle2 size={12} /> Online</span>;
      case 'Degraded':
        return <span className="status-badge-amber"><AlertTriangle size={12} /> Degraded</span>;
      case 'Offline':
        return <span className="status-badge-red"><AlertTriangle size={12} /> Offline</span>;
      default:
        return <span className="status-badge-blue">{status}</span>;
    }
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">AI Services</h2>
          <p className="subpage-subtitle">Monitor operational health, latency, and endpoints for internal AI services and neural runtimes.</p>
        </div>
        <button 
          className="primary-action-btn" 
          onClick={handleRefreshAll}
          disabled={isRefreshing}
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Checking...' : 'Check All Services'}</span>
        </button>
      </header>

      {/* Services Grid */}
      <div className="admin-services-grid">
        {services.map((srv) => (
          <div key={srv.id} className="subpage-card service-health-card">
            <div className="service-card-top">
              <div className="service-icon-box blue-bg">
                <Cpu size={18} className="icon-blue" />
              </div>
              <div className="service-status-right">
                {getStatusBadge(srv.status)}
              </div>
            </div>

            <div className="service-info-block">
              <h3 className="service-name font-sans">{srv.name}</h3>
              <span className="service-type font-mono">{srv.type}</span>
            </div>

            <div className="service-metrics-row font-mono">
              <div className="metric-item">
                <span className="metric-label">Latency</span>
                <span className="metric-val">{srv.latency}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Last Checked</span>
                <span className="metric-val">{srv.lastChecked}</span>
              </div>
            </div>

            <div className="service-endpoint-sub font-mono">
              {srv.endpoint}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
