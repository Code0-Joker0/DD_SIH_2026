import { useState, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Database, 
  CheckCircle2, 
  Trash2, 
  Upload, 
  Sparkles, 
  FileCode, 
  FileSpreadsheet, 
  Image as ImageIcon,
  BookOpen,
  CheckSquare,
  Square,
  Layers,
  Cpu
} from 'lucide-react';

export interface KBSourceExcerpt {
  chunkIndex: number;
  title: string;
  text: string;
  pageOrSection?: string;
}

export interface KBSource {
  id: string;
  name: string;
  type: 'pdf' | 'standard' | 'note' | 'sheet' | 'doc' | 'image';
  size: string;
  chunks: number;
  embeddings: number;
  uploadedAt: string;
  checked: boolean;
  status: 'Indexed' | 'Syncing' | 'Ready';
  summary?: string;
  excerpts?: KBSourceExcerpt[];
}

interface KnowledgeBaseViewProps {
  initialSearch?: string;
  sources?: KBSource[];
  onToggleSource?: (id: string) => void;
  onToggleAllSources?: (selectAll: boolean) => void;
  onDeleteSource?: (id: string) => void;
  onUploadSource?: (file: File) => void;
  onGroundSourceInChat?: (sourceName: string, contextSummary: string) => void;
}

export default function KnowledgeBaseView({
  initialSearch = '',
  sources = [],
  onToggleSource,
  onToggleAllSources,
  onDeleteSource,
  onUploadSource,
  onGroundSourceInChat
}: KnowledgeBaseViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sources[0]?.id || 'api-570');
  const [chunkFilterQuery, setChunkFilterQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active selected source for preview panel
  const activeSource = sources.find(s => s.id === selectedSourceId) || sources[0];

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.summary && s.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCount = sources.filter(s => s.checked).length;
  const allSelected = sources.length > 0 && selectedCount === sources.length;

  const filteredChunks = (activeSource?.excerpts || []).filter(c => 
    c.title.toLowerCase().includes(chunkFilterQuery.toLowerCase()) ||
    c.text.toLowerCase().includes(chunkFilterQuery.toLowerCase()) ||
    (c.pageOrSection && c.pageOrSection.toLowerCase().includes(chunkFilterQuery.toLowerCase()))
  );

  // Drag and Drop handlers
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onUploadSource) {
      onUploadSource(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadSource) {
      onUploadSource(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSourceIcon = (type: KBSource['type']) => {
    switch (type) {
      case 'pdf':
        return <div className="source-icon-box icon-pdf"><FileText size={16} /></div>;
      case 'standard':
        return <div className="source-icon-box icon-std"><BookOpen size={16} /></div>;
      case 'doc':
        return <div className="source-icon-box icon-doc"><FileCode size={16} /></div>;
      case 'sheet':
        return <div className="source-icon-box icon-sheet"><FileSpreadsheet size={16} /></div>;
      case 'image':
        return <div className="source-icon-box icon-image"><ImageIcon size={16} /></div>;
      default:
        return <div className="source-icon-box icon-std"><FileText size={16} /></div>;
    }
  };

  return (
    <div className="notebook-kb-container">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Statutory Knowledge Base &amp; Multi-Source Manager</h2>
          <p className="subpage-subtitle">
            NotebookLM-style selective grounding: selectively toggle indexed sources to feed directly into the local RAG prompt context.
          </p>
        </div>

        <button 
          type="button" 
          className="primary-action-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          <span>Upload New Source</span>
        </button>
      </header>

      {/* Main 2-Column NotebookLM Layout */}
      <div className="notebook-kb-grid">
        {/* LEFT COLUMN: Source Deck */}
        <aside className="source-deck-card">
          <div className="source-deck-header">
            <div className="source-deck-title-row">
              <Layers size={16} color="#38BDF8" />
              <span className="source-deck-title">Source Deck</span>
              <span className="source-count-pill">
                {selectedCount} of {sources.length} active
              </span>
            </div>

            <div className="source-quick-actions">
              <button
                type="button"
                className="terminal-clear-btn"
                onClick={() => onToggleAllSources?.(!allSelected)}
                title={allSelected ? 'Deselect All' : 'Select All'}
                style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                {allSelected ? <CheckSquare size={12} color="#10B981" /> : <Square size={12} />}
                <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
              </button>
            </div>
          </div>

          <div className="source-deck-tools-bar">
            {/* Drag and Drop Zone */}
            <div 
              className={`source-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="source-dropzone-title">
                <Upload size={13} color="#38BDF8" /> Drag &amp; drop source file here
              </span>
              <span className="source-dropzone-sub">
                PDF &middot; DOCX &middot; CSV &middot; Standards SOP
              </span>
            </div>

            {/* Filter Search Input */}
            <div className="subpage-search-box-compact" style={{ width: '100%' }}>
              <Search size={13} style={{ color: '#64748B' }} />
              <input
                type="text"
                placeholder="Filter source documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Scrollable Sources List */}
          <div className="source-deck-list">
            {filteredSources.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
                No sources matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredSources.map((source) => {
                const isSelected = activeSource?.id === source.id;
                return (
                  <div 
                    key={source.id} 
                    className={`source-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSourceId(source.id)}
                  >
                    {/* Checkbox */}
                    <div 
                      className="source-checkbox-col"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSource?.(source.id);
                      }}
                    >
                      <input 
                        type="checkbox" 
                        className="source-checkbox"
                        checked={source.checked}
                        onChange={() => onToggleSource?.(source.id)}
                      />
                    </div>

                    {/* Source Icon */}
                    {getSourceIcon(source.type)}

                    {/* Meta Info */}
                    <div className="source-info-col">
                      <div className="source-title-row">
                        <span className="source-filename" title={source.name}>
                          {source.name}
                        </span>
                        {onDeleteSource && !source.id.startsWith('api-') && !source.id.startsWith('asme-') && !source.id.startsWith('oisd-') && (
                          <button
                            type="button"
                            className="source-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSource(source.id);
                            }}
                            title="Delete this source"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div className="source-meta-row">
                        <span>{source.size}</span>
                        <span>&middot;</span>
                        <span className="source-tag-chip">{source.chunks} chunks</span>
                        <span>&middot;</span>
                        <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <CheckCircle2 size={10} /> {source.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Document Intelligence Preview */}
        <main className="source-preview-card">
          {activeSource ? (
            <>
              {/* Preview Header */}
              <div className="source-preview-header">
                <div className="source-preview-title-block">
                  {getSourceIcon(activeSource.type)}
                  <div>
                    <div className="source-preview-title">{activeSource.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '2px' }}>
                      <span className="source-tag-chip font-mono" style={{ fontSize: '0.65rem' }}>
                        {activeSource.chunks} Chunks &middot; {activeSource.embeddings.toLocaleString()} Vectors
                      </span>
                      <span className="status-badge-green" style={{ padding: '0.05rem 0.4rem', fontSize: '0.65rem' }}>
                        <CheckCircle2 size={10} /> ChromaDB Vector Indexed
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="std-ground-btn"
                    onClick={() => {
                      if (onGroundSourceInChat && activeSource.summary) {
                        onGroundSourceInChat(activeSource.name, activeSource.summary);
                      }
                    }}
                    title="Send active document context into Copilot chat prompt"
                  >
                    <Sparkles size={13} color="#38BDF8" />
                    <span>Ground in Copilot</span>
                  </button>
                </div>
              </div>

              {/* Preview Content Body */}
              <div className="source-preview-body">
                {/* Executive Summary Card */}
                {activeSource.summary && (
                  <div className="source-summary-box">
                    <div className="source-summary-title">
                      <Sparkles size={13} /> Document Synthesis &amp; Standard Scope
                    </div>
                    <p className="source-summary-text">
                      {activeSource.summary}
                    </p>
                  </div>
                )}

                {/* Chunks Explorer Section */}
                <div className="chunks-section-title-row">
                  <div className="chunks-section-title">
                    <Database size={15} color="#38BDF8" />
                    <span>Parsed RAG Chunk Excerpts ({filteredChunks.length})</span>
                  </div>

                  <div className="subpage-search-box-compact" style={{ width: '220px' }}>
                    <Search size={13} style={{ color: '#64748B' }} />
                    <input
                      type="text"
                      placeholder="Search within chunks..."
                      value={chunkFilterQuery}
                      onChange={(e) => setChunkFilterQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Chunks Stream List */}
                <div className="chunks-stream-list">
                  {filteredChunks.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6B7280', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      No parsed chunks match &quot;{chunkFilterQuery}&quot;.
                    </div>
                  ) : (
                    filteredChunks.map((chunk) => (
                      <div key={chunk.chunkIndex} className="chunk-item-card">
                        <div className="chunk-card-header">
                          <span className="chunk-badge">Chunk #{chunk.chunkIndex + 1}</span>
                          {chunk.pageOrSection && (
                            <span className="chunk-section-tag">
                              {chunk.pageOrSection}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFF', marginBottom: '0.35rem' }}>
                          {chunk.title}
                        </div>
                        <p className="chunk-card-text">
                          {chunk.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Metadata Footer */}
              <footer className="source-preview-footer">
                <span>Vector Embedding: BAAI/bge-large-en-v1.5 (1024-dim)</span>
                <span>Chunk Size: 512 tokens &middot; Overlap: 64 tokens</span>
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Cpu size={12} /> Local Enclave Vector Store
                </span>
              </footer>
            </>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6B7280' }}>
              <BookOpen size={36} style={{ marginBottom: '0.75rem', color: '#38BDF8', opacity: 0.6 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFF' }}>No Document Selected</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Select a source from the deck on the left to inspect its parsed embeddings.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
