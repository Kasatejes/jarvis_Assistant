const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.json');

/**
 * Loads all knowledge entries from knowledge.json safely
 * @returns {Array} Array of knowledge objects
 */
function loadKnowledge() {
  try {
    if (!fs.existsSync(KNOWLEDGE_FILE)) {
      fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const rawData = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[KNOWLEDGE-ENGINE] Error reading knowledge.json:', error.message);
    return [];
  }
}

/**
 * Persists knowledge entries to knowledge.json safely
 * @param {Array} entries 
 */
function persistKnowledge(entries) {
  try {
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(entries, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[KNOWLEDGE-ENGINE] Error persisting knowledge.json:', error.message);
    return false;
  }
}

/**
 * Normalizes text for matching (lowercase, strips punctuation)
 */
function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Finds knowledge items relevant to the given user prompt
 * @param {string} prompt - User query
 * @param {number} maxResults - Max items to return (default 3)
 * @returns {Array} List of matching knowledge objects with relevance score
 */
function findRelevantKnowledge(prompt, maxResults = 3) {
  if (!prompt || typeof prompt !== 'string') return [];
  const entries = loadKnowledge();
  if (entries.length === 0) return [];

  const normalizedPrompt = normalizeText(prompt);
  const promptWords = new Set(normalizedPrompt.split(' ').filter(w => w.length > 2));

  const scored = [];

  for (const item of entries) {
    let score = 0;
    const normalizedTopic = normalizeText(item.topic || '');
    const topicWords = normalizedTopic.split(' ').filter(w => w.length > 2);

    // Check if entire topic is mentioned in prompt
    if (normalizedTopic && normalizedPrompt.includes(normalizedTopic)) {
      score += 15;
    }

    // Check keywords
    if (Array.isArray(item.keywords)) {
      for (const kw of item.keywords) {
        const normKw = normalizeText(kw);
        if (!normKw) continue;
        if (normalizedPrompt.includes(normKw)) {
          // Boost higher for multi-word or standalone exact matches
          score += normKw.includes(' ') ? 12 : 8;
        }
      }
    }

    // Check overlapping topic words
    for (const tw of topicWords) {
      if (promptWords.has(tw)) {
        score += 3;
      }
    }

    // Check content substring match for significant terms
    const normalizedContent = normalizeText(item.content || '');
    for (const pw of promptWords) {
      if (pw.length > 4 && normalizedContent.includes(pw)) {
        score += 1;
      }
    }

    if (score >= 4) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map(s => s.item);
}

/**
 * Formats relevant knowledge as a system prompt context snippet
 * @param {string} prompt 
 * @returns {string|null} Formatted context snippet, or null if none found
 */
function getKnowledgeContextSnippet(prompt) {
  const matches = findRelevantKnowledge(prompt);
  if (!matches || matches.length === 0) return null;

  const entriesText = matches.map((m, i) => {
    return `[KNOWLEDGE ITEM ${i + 1} - ${m.topic}]:\n${m.content}`;
  }).join('\n\n');

  return `\n[VERIFIED USER KNOWLEDGE BASE]:
The user has established the following verified knowledge base entries directly relevant to this query. ALWAYS prioritize this custom knowledge over general pre-training assumptions when formulating your answer:
${entriesText}\n`;
}

/**
 * Adds or updates a knowledge entry
 * @param {Object} entryData - { id, topic, content, keywords }
 * @returns {Object} { success: boolean, item: Object }
 */
function saveKnowledge({ id, topic, content, keywords = [] }) {
  if (!topic || !content) {
    throw new Error('Topic and content are required to save knowledge.');
  }

  const entries = loadKnowledge();
  const existingIndex = id ? entries.findIndex(e => e.id === id) : entries.findIndex(e => normalizeText(e.topic) === normalizeText(topic));

  const now = new Date().toISOString();
  let savedItem;

  const kwList = Array.isArray(keywords) 
    ? keywords 
    : String(keywords).split(',').map(k => k.trim()).filter(Boolean);

  // Automatically add topic words as keywords if not present
  const autoKeywords = normalizeText(topic).split(' ').filter(w => w.length > 2);
  for (const ak of autoKeywords) {
    if (!kwList.some(k => normalizeText(k) === ak)) {
      kwList.push(ak);
    }
  }

  if (existingIndex >= 0) {
    entries[existingIndex] = {
      ...entries[existingIndex],
      topic: topic.trim(),
      content: content.trim(),
      keywords: Array.from(new Set([...(entries[existingIndex].keywords || []), ...kwList])),
      updatedAt: now
    };
    savedItem = entries[existingIndex];
  } else {
    savedItem = {
      id: id || `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      topic: topic.trim(),
      keywords: Array.from(new Set(kwList)),
      content: content.trim(),
      updatedAt: now
    };
    entries.push(savedItem);
  }

  const success = persistKnowledge(entries);
  return { success, item: savedItem };
}

/**
 * Returns all knowledge entries
 */
function getAllKnowledge() {
  return loadKnowledge();
}

/**
 * Deletes a knowledge entry by ID
 * @param {string} id 
 */
function deleteKnowledge(id) {
  const entries = loadKnowledge();
  const filtered = entries.filter(e => e.id !== id);
  if (filtered.length === entries.length) {
    return { success: false, message: 'Knowledge entry not found.' };
  }
  const success = persistKnowledge(filtered);
  return { success, message: success ? 'Entry deleted successfully.' : 'Failed to delete entry.' };
}

module.exports = {
  loadKnowledge,
  findRelevantKnowledge,
  getKnowledgeContextSnippet,
  saveKnowledge,
  getAllKnowledge,
  deleteKnowledge
};
