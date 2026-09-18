// Data store for Chat conversations, Task runs, Chat Uploads, and Source Files

export const INITIAL_CHAT_UPLOADS = [];

export const INITIAL_SOURCE_FILES = [];

export const INITIAL_CHATS = [];

export function generateConversationTitle(prompt) {
  if (!prompt || typeof prompt !== 'string') return 'New Conversation';

  let text = prompt.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
  const lower = text.toLowerCase();

  // Intent-based smart mappings for domain prompts
  if (lower.includes('compare') && (lower.includes('report') || lower.includes('sop') || lower.includes('document') || lower.includes('inspection'))) {
    return 'Compare Inspection Reports';
  }
  if (lower.includes('material') && (lower.includes('requirement') || lower.includes('calculate') || lower.includes('flow'))) {
    return 'Material Requirements';
  }
  if (lower.includes('p&id') || (lower.includes('safety') && lower.includes('risk'))) {
    return 'P&ID Safety Risks';
  }
  if (lower.includes('equipment') && lower.includes('risk')) {
    return 'Equipment Risk Analysis';
  }
  if (lower.includes('vibration') || lower.includes('compressor')) {
    return 'Compressor Telemetry Audit';
  }
  if (lower.includes('email') || lower.includes('job offer')) {
    return 'Job Offer Reply Email';
  }
  if (lower.includes('to-do') || lower.includes('project')) {
    return 'Personal Project Tasks';
  }

  // General title generation algorithm
  text = text.replace(/^(please|can you|could you|would you|i want you to|i need you to|help me|kindly|tell me|explain to me|show me|analyze|check|audit|review)\s+/i, '');
  text = text.replace(/^(the|these|this|a|an)\s+/i, '');
  text = text.replace(/[?.!,:;]+$/, '').trim();

  const words = text.split(' ');
  let shortTitle = '';

  for (const word of words) {
    if ((shortTitle + ' ' + word).trim().length <= 35) {
      shortTitle += (shortTitle ? ' ' : '') + word;
    } else {
      break;
    }
  }

  const rawResult = shortTitle.trim() || text.slice(0, 35).trim();

  const formatted = rawResult
    .split(' ')
    .map((w, idx) => {
      const wLower = w.toLowerCase();
      if (idx > 0 && ['and', 'or', 'in', 'on', 'at', 'to', 'a', 'an', 'the', 'for', 'of', 'with', 'from', 'by'].includes(wLower)) {
        return wLower;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');

  return formatted.charAt(0).toUpperCase() + formatted.slice(1) || 'New Conversation';
}

export function getRelativeTimeLabel(timestampOrIso) {
  if (!timestampOrIso) return 'Just now';
  if (timestampOrIso === 'Today' || timestampOrIso === 'Yesterday' || timestampOrIso === 'Just now') {
    return timestampOrIso;
  }

  const now = new Date();
  const past = new Date(timestampOrIso);

  if (isNaN(past.getTime())) return timestampOrIso;

  const diffInSeconds = Math.floor((now - past) / 1000);
  if (diffInSeconds < 60) return 'Just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return past.toLocaleDateString([], { month: 'short', day: '2-digit' });
}

