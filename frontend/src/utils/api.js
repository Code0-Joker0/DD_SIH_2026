/**
 * Singularity AI Enterprise API Client
 * Manages JWT session tokens, headers, encrypted storage, and Ollama/FastAPI agent workflows
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BACKEND_FALLBACK = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Token Storage Helpers (unified with AuthContext)
 */
export const getToken = () => localStorage.getItem('auth_token') || localStorage.getItem('mrpl_auth_token');
export const setToken = (token) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('mrpl_auth_token', token);
};
export const removeToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('mrpl_auth_token');
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem('auth_user', JSON.stringify(user));
};

export const removeStoredUser = () => {
  localStorage.removeItem('auth_user');
};

/**
 * Centralized fetch with Authorization Bearer header
 */
export async function authFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  // Only set Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * 1. Authenticate with Email and Password
 */
export async function loginUser(email, password) {
  const res = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Authentication failed');
  }

  const resolvedToken = data.token;
  const resolvedUser = data.user || data.data?.user;

  if (resolvedToken) {
    setToken(resolvedToken);
  }
  if (resolvedUser) {
    setStoredUser(resolvedUser);
  }

  return { ...data, user: resolvedUser, token: resolvedToken };
}

/**
 * 2. Register / Enroll Inspection Engineer
 */
export async function registerUser({ username, full_name, email, password, role = 'engineer' }) {
  const res = await authFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      full_name: full_name || username,
      email,
      password,
      role
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  const resolvedToken = data.token;
  const resolvedUser = data.user || data.data?.user;

  if (resolvedToken) {
    setToken(resolvedToken);
  }
  if (resolvedUser) {
    setStoredUser(resolvedUser);
  }

  return { ...data, user: resolvedUser, token: resolvedToken };
}

/**
 * 3. Instant 1-Click Demo SSO Login (Fallback / Dev Mode)
 */
export async function demoLoginUser() {
  const res = await authFetch('/api/auth/demo-login', {
    method: 'POST',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Demo sign-in failed');
  }

  const resolvedToken = data.token;
  const resolvedUser = data.user || data.data?.user;

  if (resolvedToken) {
    setToken(resolvedToken);
  }
  if (resolvedUser) {
    setStoredUser(resolvedUser);
  }

  return data;
}

/**
 * 4. Logout User & Clear Session
 */
export async function logoutUser() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // Ignore network failures on client logout
  }
  removeToken();
  removeStoredUser();
}

/**
 * 5. Get Current User Profile from JWT
 */
export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      removeToken();
      removeStoredUser();
      return null;
    }
    const data = await res.json();
    const resolvedUser = data.user || data.data?.user || data;
    setStoredUser(resolvedUser);
    return resolvedUser;
  } catch (err) {
    console.warn('Failed to verify user session with gateway:', err.message);
    return getStoredUser();
  }
}

/**
 * 6. Fetch Encrypted Company Files from PostgreSQL Storage
 */
export async function getCompanyFiles({ category, search, department } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (department && department !== 'All') params.append('department', department);
  if (search) params.append('search', search);

  const qs = params.toString();
  const endpoint = `/api/files${qs ? `?${qs}` : ''}`;

  const res = await authFetch(endpoint);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch company files');
  }

  return data.files || [];
}

/**
 * 7. Upload and Encrypt File with AES-256-GCM + SHA-256
 */
export async function uploadCompanyFile(file, { department, category, isCompanyWide = true } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (department) formData.append('department', department);
  if (category) formData.append('category', category);
  formData.append('isCompanyWide', isCompanyWide);

  const res = await authFetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to upload and encrypt file');
  }

  return data;
}

/**
 * 8. Stream and Decrypt File on the Fly
 */
export async function downloadCompanyFile(fileId, filename = 'downloaded_file') {
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
 * 9. Delete File from Storage & Audit Log
 */
export async function deleteCompanyFile(fileId) {
  const res = await authFetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete file');
  }

  return data;
}

/**
 * 10. Get File Storage Metrics & Statistics
 */
export async function getStorageStats() {
  const res = await authFetch('/api/files/stats/summary');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch storage stats');
  }

  return data.stats;
}

/**
 * 11. Fetch Available AI Models from Gateway / Backend
 */
export async function fetchModels() {
  try {
    const gatewayRes = await authFetch('/api/models');
    if (gatewayRes.ok) {
      return await gatewayRes.json();
    }
  } catch (err) {
    console.warn('[FETCH MODELS VIA GATEWAY FAILED]:', err.message);
  }

  try {
    const pythonRes = await fetch(`${BACKEND_FALLBACK}/api/models`);
    if (pythonRes.ok) {
      return await pythonRes.json();
    }
  } catch (err) {
    console.warn('[FETCH MODELS DIRECT BACKEND FAILED]:', err.message);
  }

  return {
    default: 'auto',
    models: ['auto', 'llama3.2:3b', 'qwen2.5:7b', 'llama3.1:8b', 'deepseek-r1:7b']
  };
}

/**
 * 12. Interactive Multi-Modal Copilot Chat with Vault Sync & Gateway Fallback
 */
export async function sendChatMessage(
  message,
  sessionId = 'default_session',
  selectedDocIds = [],
  modelName = 'auto',
  attachedFiles = [],
  chatTitle = 'Inspection Session'
) {
  const hasFiles = Array.isArray(attachedFiles) && attachedFiles.length > 0;

  if (hasFiles) {
    const formData = new FormData();
    formData.append('message', message || '');
    formData.append('prompt', message || '');
    formData.append('session_id', sessionId || 'default_session');
    formData.append('model_name', modelName || 'auto');
    formData.append('chatTitle', chatTitle);
    formData.append('selected_doc_ids', JSON.stringify(selectedDocIds || []));

    attachedFiles.forEach((fileItem) => {
      const fileObj = fileItem.rawFile || fileItem.file || (fileItem instanceof File ? fileItem : null);
      if (fileObj && fileObj instanceof File) {
        const isImg = fileObj.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp|gif|svg)$/i.test(fileObj.name);
        if (isImg) {
          formData.append('images', fileObj, fileObj.name);
        } else {
          formData.append('documents', fileObj, fileObj.name);
        }
      }
    });

    // 1. Primary: Post multi-part payload to Node API Gateway Vault Pipeline
    try {
      const gatewayRes = await authFetch('/api/chat/message', {
        method: 'POST',
        body: formData,
      });

      if (gatewayRes.ok) {
        const data = await gatewayRes.json();
        // Emit global event to immediately update Knowledge Base vault views without page reload
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('knowledge-vault-updated', { detail: { files: attachedFiles } }));
        }
        return data;
      }
    } catch (err) {
      console.warn('[GATEWAY CHAT VAULT FAILED, TRYING DIRECT FASTAPI MULTI-MODAL]:', err.message);
    }

    // 2. Direct Fallback: Python FastAPI Multi-Modal Endpoint
    try {
      const pythonRes = await fetch(`${BACKEND_FALLBACK}/api/analyze/multi-modal`, {
        method: 'POST',
        body: formData,
      });

      if (pythonRes.ok) {
        const data = await pythonRes.json();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('knowledge-vault-updated', { detail: { files: attachedFiles } }));
        }
        return data;
      }
      const errData = await pythonRes.json().catch(() => ({}));
      throw new Error(errData.detail || `Multi-modal engine failed with HTTP ${pythonRes.status}`);
    } catch (directErr) {
      throw new Error(`Direct inference engine failed: ${directErr.message}`);
    }
  }

  // Pure JSON Text Chat Flow
  const payload = {
    session_id: sessionId,
    message,
    selected_doc_ids: selectedDocIds,
    model_name: modelName || 'auto',
    chatTitle
  };

  // 1. Primary: Try Node API Gateway
  try {
    const gatewayRes = await authFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (gatewayRes.ok) {
      return await gatewayRes.json();
    }
  } catch (err) {
    console.warn('[GATEWAY CHAT FAILED, TRYING DIRECT BACKEND]:', err.message);
  }

  // 2. Direct Fallback: Python FastAPI / Ollama Engine
  const pythonRes = await fetch(`${BACKEND_FALLBACK}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!pythonRes.ok) {
    const errData = await pythonRes.json().catch(() => ({}));
    throw new Error(errData.detail || `Inference engine failed with HTTP ${pythonRes.status}`);
  }

  return await pythonRes.json();
}

/**
 * 13. Upload Document to RAG Pipeline
 */
export async function uploadRAGDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata.equipment_tag) formData.append('equipment_tag', metadata.equipment_tag);
  if (metadata.category) formData.append('category', metadata.category);
  if (metadata.source_type) formData.append('source_type', metadata.source_type);

  const res = await authFetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || `Ingestion failed with HTTP ${res.status}`);
  }

  return data;
}

/**
 * 14. Execute Full Agentic Task & Stream Docx
 */
export async function executeAgentTask(taskPrompt, file = null) {
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

export default {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  authFetch,
  loginUser,
  registerUser,
  demoLoginUser,
  logoutUser,
  getCurrentUser,
  getCompanyFiles,
  uploadCompanyFile,
  downloadCompanyFile,
  deleteCompanyFile,
  getStorageStats,
  fetchModels,
  sendChatMessage,
  uploadRAGDocument,
  executeAgentTask,
};