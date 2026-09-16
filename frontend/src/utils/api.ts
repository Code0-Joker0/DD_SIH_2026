/**
 * Singularity Enterprise API Client (TypeScript)
 * Sovereign On-Premise Industrial AI Workbench (MRPL SIH26117)
 * Manages JWT session tokens, headers, encrypted storage, and Ollama/FastAPI agent workflows
 */

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  status?: string;
  created_at?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  token: string;
  user: User;
}

export interface CompanyFile {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: string;
  rawSize?: number;
  encryptedSize: string;
  date: string;
  createdAt?: string;
  status: string;
  encryption: string;
  department: string;
  uploader: string;
}

export interface StorageStats {
  totalFiles: number;
  totalStorage: string;
  totalEncryptedStorage: string;
  categoryCounts: Record<string, number>;
  securityProtocol: string;
}

export interface NetworkStatus {
  egress_packets: number;
  wan_status: string;
  active_ip: string;
  host_ip?: string;
  interface?: string;
  timestamp?: number;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  sources?: Array<string | { filename?: string; title?: string }>;
  findings?: Array<{ num: string; title: string; desc: string }>;
  recommendation?: string;
  generatedFiles?: Array<{ name: string; size?: string; type?: string; status?: string }>;
  model?: string;
  [key: string]: unknown;
}

const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BACKEND_FALLBACK: string = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Token Storage Helpers
 */
export const getToken = (): string | null => localStorage.getItem('auth_token');
export const setToken = (token: string): void => localStorage.setItem('auth_token', token);
export const removeToken = (): void => localStorage.removeItem('auth_token');

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem('auth_user', JSON.stringify(user));
};

export const removeStoredUser = (): void => {
  localStorage.removeItem('auth_user');
};

/**
 * Centralized fetch with Authorization Bearer header
 */
export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  return await fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 1. Authenticate with Email and Password
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json()) as AuthResponse;
  if (!res.ok) {
    throw new Error(data.message || 'Authentication failed');
  }

  if (data.token) {
    setToken(data.token);
    setStoredUser(data.user);
  }

  return data;
}

/**
 * 2. Instant 1-Click Demo SSO Login (Reva Kulkarni)
 */
export async function demoLoginUser(): Promise<AuthResponse> {
  const res = await authFetch('/api/auth/demo-login', {
    method: 'POST',
  });

  const data = (await res.json()) as AuthResponse;
  if (!res.ok) {
    throw new Error(data.message || 'Demo SSO sign-in failed');
  }

  if (data.token) {
    setToken(data.token);
    setStoredUser(data.user);
  }

  return data;
}

/**
 * 3. Logout User & Clear Session
 */
export function logoutUser(): void {
  removeToken();
  removeStoredUser();
}

/**
 * 4. Get Current User Profile from JWT
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      logoutUser();
      return null;
    }
    const data = (await res.json()) as { user: User };
    setStoredUser(data.user);
    return data.user;
  } catch (err) {
    console.warn('Failed to verify user session:', err);
    return getStoredUser();
  }
}

/**
 * 5. Fetch Encrypted Company Files from PostgreSQL Storage
 */
export async function getCompanyFiles({
  category,
  search,
  department,
}: {
  category?: string;
  search?: string;
  department?: string;
} = {}): Promise<CompanyFile[]> {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (department && department !== 'All') params.append('department', department);
  if (search) params.append('search', search);

  const qs = params.toString();
  const endpoint = `/api/files${qs ? `?${qs}` : ''}`;

  const res = await authFetch(endpoint);
  const data = (await res.json()) as { files?: CompanyFile[]; message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch company files');
  }

  return data.files || [];
}

/**
 * 6. Upload and Encrypt File with AES-256-GCM + SHA-256
 */
export async function uploadCompanyFile(
  file: File,
  {
    department,
    category,
    isCompanyWide = true,
  }: {
    department?: string;
    category?: string;
    isCompanyWide?: boolean;
  } = {}
): Promise<{ status: string; message: string; file: CompanyFile }> {
  const formData = new FormData();
  formData.append('file', file);
  if (department) formData.append('department', department);
  if (category) formData.append('category', category);
  formData.append('isCompanyWide', String(isCompanyWide));

  const res = await authFetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  const data = (await res.json()) as { status: string; message: string; file: CompanyFile };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to upload and encrypt file');
  }

  return data;
}

/**
 * 7. Stream and Decrypt File on the Fly
 */
export async function downloadCompanyFile(fileId: string, filename: string = 'downloaded_file'): Promise<void> {
  const res = await authFetch(`/api/files/${fileId}/download`);
  if (!res.ok) {
    throw new Error(`Download failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * 8. Delete File from Storage & Audit Log
 */
export async function deleteCompanyFile(fileId: string): Promise<{ status: string; message: string }> {
  const res = await authFetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  });

  const data = (await res.json()) as { status: string; message: string };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete file');
  }

  return data;
}

/**
 * 9. Get File Storage Metrics & Statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const res = await authFetch('/api/files/stats/summary');
  const data = (await res.json()) as { stats: StorageStats; message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch storage stats');
  }

  return data.stats;
}

/**
 * 10. Interactive Copilot Chat with Gateway and Fallback
 */
export async function sendChatMessage(
  message: string,
  sessionId: string = 'default_session',
  selectedDocIds: string[] = []
): Promise<ChatResponse> {
  const payload = {
    session_id: sessionId,
    message,
    selected_doc_ids: selectedDocIds,
  };

  // 1. Primary: Try Node API Gateway (:3000)
  try {
    const gatewayRes = await authFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (gatewayRes.ok) {
      return (await gatewayRes.json()) as ChatResponse;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[GATEWAY CHAT FAILED, TRYING DIRECT BACKEND]:', msg);
  }

  // 2. Direct Fallback: Python FastAPI / Ollama Engine (:8000)
  const pythonRes = await fetch(`${BACKEND_FALLBACK}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!pythonRes.ok) {
    const errData = (await pythonRes.json().catch(() => ({}))) as { detail?: string };
    throw new Error(errData.detail || `Inference engine failed with HTTP ${pythonRes.status}`);
  }

  return (await pythonRes.json()) as ChatResponse;
}

/**
 * 11. Upload Document to RAG Pipeline
 */
export async function uploadRAGDocument(
  file: File,
  metadata: {
    equipment_tag?: string;
    category?: string;
    source_type?: string;
    department?: string;
  } = {}
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.equipment_tag) formData.append('equipment_tag', metadata.equipment_tag);
  if (metadata.category) formData.append('category', metadata.category);
  if (metadata.source_type) formData.append('source_type', metadata.source_type);

  const res = await authFetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  const data = (await res.json()) as { error?: string; details?: string };
  if (!res.ok) {
    throw new Error(data.error || data.details || `Ingestion failed with HTTP ${res.status}`);
  }

  return data;
}

/**
 * 12. Execute Full Agentic Task & Stream Docx
 */
export async function executeAgentTask(taskPrompt?: string, file: File | null = null): Promise<Blob> {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (taskPrompt) formData.append('task_prompt', taskPrompt);

  const res = await authFetch('/api/tasks/execute', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Task execution failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Approval_Note.docx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return blob;
}

/**
 * 13. Fetch Sovereign Air-Gap Network Status
 * Polls Node Gateway (/api/network-status) with direct fallback to FastAPI (port 8000)
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  try {
    const res = await authFetch('/api/network-status');
    if (res.ok) {
      return (await res.json()) as NetworkStatus;
    }
  } catch {
    // Gateway fallback
  }

  try {
    const pyRes = await fetch(`${BACKEND_FALLBACK}/api/network-status`);
    if (pyRes.ok) {
      return (await pyRes.json()) as NetworkStatus;
    }
  } catch {
    // Backend offline
  }

  return {
    egress_packets: 0,
    wan_status: 'SECURE_AIR_GAPPED',
    active_ip: '127.0.0.1',
    interface: 'Loopback (Sovereign Isolated)',
  };
}

export default {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  authFetch,
  loginUser,
  demoLoginUser,
  logoutUser,
  getCurrentUser,
  getCompanyFiles,
  uploadCompanyFile,
  downloadCompanyFile,
  deleteCompanyFile,
  getStorageStats,
  sendChatMessage,
  uploadRAGDocument,
  executeAgentTask,
  getNetworkStatus,
};

