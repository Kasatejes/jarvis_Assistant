const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REMINDERS_FILE = path.join(__dirname, 'reminders.json');

// In-memory queue of triggered alerts for frontend consumption
let activeAlerts = [];
let tickerInterval = null;

/**
 * Loads all reminders safely from disk
 * @returns {Array} Array of reminder objects
 */
function loadReminders() {
  try {
    if (!fs.existsSync(REMINDERS_FILE)) {
      fs.writeFileSync(REMINDERS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(REMINDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[REMINDER-ENGINE] Error reading reminders.json:', err.message);
    return [];
  }
}

/**
 * Persists reminders safely to disk
 * @param {Array} entries 
 */
function persistReminders(entries) {
  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(entries, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[REMINDER-ENGINE] Error writing reminders.json:', err.message);
    return false;
  }
}

/**
 * Parses time expressions into a target epoch timestamp (ms)
 * Supports:
 * - "12:37", "12:37 PM", "12:37 am", "3:45 pm", "16:20"
 * - Relative expressions: "in 10 minutes", "in 2 hours", "in 45 seconds"
 * - Numeric offsets: delayMinutes, delaySeconds
 * 
 * @returns {{ targetTimestamp: number, formattedTime: string }}
 */
function parseTargetTime(timeStr, delayMinutes = 0, delaySeconds = 0) {
  const now = new Date();

  // 1. If explicit delay arguments provided
  if (delayMinutes > 0 || delaySeconds > 0) {
    const totalMs = (delayMinutes * 60000) + (delaySeconds * 1000);
    const target = new Date(now.getTime() + totalMs);
    const formatted = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { targetTimestamp: target.getTime(), formattedTime: formatted };
  }

  const rawStr = (timeStr || '').trim().toLowerCase();

  // 2. Relative time string parsing: e.g. "in 15 minutes", "in 1 hour", "in 30 seconds"
  const relMatch = rawStr.match(/^(?:in\s+)?(\d+)\s*(mins?|minutes?|hours?|hrs?|secs?|seconds?)/i);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    let offsetMs = 0;
    if (unit.startsWith('h')) offsetMs = amount * 3600000;
    else if (unit.startsWith('m')) offsetMs = amount * 60000;
    else if (unit.startsWith('s')) offsetMs = amount * 1000;

    const target = new Date(now.getTime() + offsetMs);
    const formatted = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { targetTimestamp: target.getTime(), formattedTime: formatted };
  }

  // 3. Clock time parsing: e.g. "12:37", "12:37 pm", "3:15pm", "14:00"
  const clockMatch = rawStr.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?/i);
  if (clockMatch) {
    let hours = parseInt(clockMatch[1], 10);
    const minutes = parseInt(clockMatch[2], 10);
    const meridian = clockMatch[3] ? clockMatch[3].toLowerCase() : null;

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    // If this time today has already elapsed by more than 45 seconds, schedule for tomorrow
    if (target.getTime() <= (now.getTime() - 45000)) {
      target.setDate(target.getDate() + 1);
    }

    const formatted = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { targetTimestamp: target.getTime(), formattedTime: formatted };
  }

  // Fallback: 5 minutes from now if time could not be parsed
  const fallbackTarget = new Date(now.getTime() + 300000);
  return { 
    targetTimestamp: fallbackTarget.getTime(), 
    formattedTime: fallbackTarget.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
  };
}

/**
 * Triggers a native alert on Windows:
 * 1. Speaks aloud via System.Speech.Synthesis
 * 2. Emits an audible system notification chime
 * 3. Shows a Windows desktop message notification
 */
function triggerNativeAlert(reminder) {
  if (process.platform !== 'win32') return;

  const scriptPath = path.join(__dirname, 'speak_alert.ps1');
  const cleanTitle = (reminder.title || 'General Reminder').replace(/["'`$]/g, '');
  const cleanTime = (reminder.timeStr || '').replace(/["'`$]/g, '');

  try {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-Title', cleanTitle,
      '-TimeStr', cleanTime
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  } catch (err) {
    console.warn('[REMINDER-ENGINE] Warning triggering Windows speech alert:', err.message);
  }
}

/**
 * Internal ticker loop that checks for due reminders every second
 */
function checkReminders() {
  const now = Date.now();
  const reminders = loadReminders();
  let modified = false;

  for (const item of reminders) {
    if (item.status === 'pending' && item.targetTimestamp <= now) {
      console.log(`[REMINDER-ENGINE] >>> TRIGGERING DUE REMINDER: "${item.title}" at ${item.timeStr} <<<`);
      item.status = 'triggered';
      item.triggeredAt = new Date().toISOString();
      modified = true;

      // Push to in-memory active alerts for frontend HUD
      activeAlerts.push({
        id: item.id,
        title: item.title,
        timeStr: item.timeStr,
        triggeredAt: item.triggeredAt
      });

      // Fire proactive native speech & desktop notification
      triggerNativeAlert(item);
    }
  }

  if (modified) {
    persistReminders(reminders);
  }
}

/**
 * Schedules a new reminder
 * @param {Object} data - { title, time, delayMinutes, delaySeconds }
 * @returns {Object} Result object with scheduled reminder details
 */
function scheduleReminder({ title, time, delayMinutes = 0, delaySeconds = 0 }) {
  const cleanTitle = (title || 'General Reminder').trim();
  const { targetTimestamp, formattedTime } = parseTargetTime(time, delayMinutes, delaySeconds);

  const reminders = loadReminders();
  const newReminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    timeStr: formattedTime,
    targetTimestamp,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reminders.push(newReminder);
  persistReminders(reminders);

  const diffMs = Math.max(0, targetTimestamp - Date.now());
  const diffMinutes = Math.round(diffMs / 60000);

  return {
    success: true,
    reminder: newReminder,
    minutesUntil: diffMinutes,
    message: `Reminder set: "${cleanTitle}" at ${formattedTime} (in ${diffMinutes > 0 ? `${diffMinutes} minute(s)` : 'under a minute'}). I will alert you automatically, sir.`
  };
}

/**
 * Retrieves all pending / upcoming reminders sorted by time
 */
function getUpcomingReminders() {
  const reminders = loadReminders();
  return reminders
    .filter(r => r.status === 'pending')
    .sort((a, b) => a.targetTimestamp - b.targetTimestamp);
}

/**
 * Cancels a reminder by ID or title match
 */
function cancelReminder(idOrTitle) {
  if (!idOrTitle) return { success: false, message: 'Identifier or title is required to cancel a reminder.' };

  const query = idOrTitle.toLowerCase().trim();
  const reminders = loadReminders();

  // If user says "all", "all reminders", "my all reminders", "everything", "cancel all"
  if (query === 'all' || query.includes('all reminder') || query.includes('all') || query === 'everything') {
    const pendingList = reminders.filter(r => r.status === 'pending');
    if (pendingList.length === 0) {
      return { success: true, count: 0, message: 'No active reminders to cancel, sir.' };
    }
    const now = new Date().toISOString();
    for (const r of pendingList) {
      r.status = 'cancelled';
      r.cancelledAt = now;
    }
    persistReminders(reminders);
    return {
      success: true,
      count: pendingList.length,
      message: `All ${pendingList.length} scheduled reminder(s) have been cancelled, sir.`
    };
  }

  const targetIndex = reminders.findIndex(r => 
    r.status === 'pending' && (r.id.toLowerCase() === query || r.title.toLowerCase().includes(query))
  );

  if (targetIndex < 0) {
    return { success: false, message: `No active reminder matching "${idOrTitle}" found.` };
  }

  const cancelled = reminders[targetIndex];
  cancelled.status = 'cancelled';
  cancelled.cancelledAt = new Date().toISOString();
  persistReminders(reminders);

  return {
    success: true,
    cancelledReminder: cancelled,
    message: `Reminder "${cancelled.title}" scheduled for ${cancelled.timeStr} has been successfully cancelled, sir.`
  };
}

/**
 * Returns all stored reminders
 */
function getAllReminders() {
  return loadReminders();
}

/**
 * Gets currently active triggered alerts and clears read alerts
 */
function getActiveAlerts() {
  const alerts = [...activeAlerts];
  return alerts;
}

/**
 * Dismisses a triggered alert from the active queue
 */
function dismissActiveAlert(id) {
  activeAlerts = activeAlerts.filter(a => a.id !== id);
  return { success: true };
}

/**
 * Starts the reminder background ticker
 */
function startEngine() {
  if (!tickerInterval) {
    tickerInterval = setInterval(checkReminders, 1000);
    console.log('[REMINDER-ENGINE] Proactive background scheduler ticker initialized.');
  }
}

/**
 * Stops the ticker
 */
function stopEngine() {
  if (tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
}

/**
 * Normalizes number words to numbers in text: "one" -> "1", "two" -> "2", etc.
 */
function convertNumberWords(str) {
  const numberWords = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'forty-five': 45, 'fifty': 50
  };
  return str.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-five|fifty)\b/gi, (match) => {
    return numberWords[match.toLowerCase()] || match;
  });
}

/**
 * Intelligent natural language parser for reminder commands
 * Supports:
 * - "Set reminder after one minute name as test"
 * - "remind me to call mom in 10 minutes"
 * - "remind me meeting at 12:37"
 * - "set reminder for gym at 6:00 pm"
 * - "set reminder after 2 minutes called test"
 */
function parseNaturalReminder(text) {
  if (!text || typeof text !== 'string') return null;

  const normalized = convertNumberWords(text.trim());
  if (!/\b(?:remind|reminder)\b/i.test(normalized)) {
    return null;
  }

  // Remove wake words and intro
  let cleaned = normalized
    .replace(/^(?:hey\s+|ok\s+|hi\s+)?(?:jarvis|jar\s+is|travis|javis|jarviz)[,.\s]*/i, '')
    .replace(/^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:set|add|create|make)?\s*(?:a\s+)?(?:remind\s+me|reminder)\s*(?:to|about|for)?\s*/i, '')
    .trim();

  let timeStr = '';
  let delayMinutes = 0;
  let delaySeconds = 0;

  // 1. Check relative duration: e.g. "after 1 minute", "in 5 minutes", "after 30 seconds"
  const relMatch = cleaned.match(/\b(?:after|in)\s+(\d+)\s*(mins?|minutes?|secs?|seconds?|hours?|hrs?)\b/i);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    if (unit.startsWith('h')) delayMinutes = val * 60;
    else if (unit.startsWith('m')) delayMinutes = val;
    else if (unit.startsWith('s')) delaySeconds = val;
    
    cleaned = cleaned.replace(relMatch[0], '').trim();
  } else {
    // 2. Check clock time: e.g. "at 12:37", "at 12:37 pm", "12:37"
    const clockMatch = cleaned.match(/\b(?:at\s+)?(\d{1,2}:\d{2}(?:\s*[ap]m)?)\b/i);
    if (clockMatch) {
      timeStr = clockMatch[1].trim();
      cleaned = cleaned.replace(clockMatch[0], '').trim();
    }
  }

  if (!timeStr && delayMinutes === 0 && delaySeconds === 0) {
    delayMinutes = 5;
  }

  // Clean remaining text to extract title
  let title = cleaned
    .replace(/^(?:name(?:d|\s+as)?|call(?:ed)?|title(?:d)?)\s+/i, '')
    .replace(/^(?:to|for|about)\s+/i, '')
    .replace(/[.,;!]+$/, '')
    .trim();

  if (!title) {
    title = 'Reminder';
  }

  return {
    title,
    timeStr,
    delayMinutes,
    delaySeconds
  };
}

module.exports = {
  scheduleReminder,
  getUpcomingReminders,
  cancelReminder,
  getAllReminders,
  getActiveAlerts,
  dismissActiveAlert,
  parseTargetTime,
  parseNaturalReminder,
  startEngine,
  stopEngine,
  triggerNativeAlert
};
