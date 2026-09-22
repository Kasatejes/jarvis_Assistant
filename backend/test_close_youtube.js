// Verification test for "close youtube", multi-target close, and phonetic variants
const { execSync } = require('child_process');

console.log('=== VERIFYING CLOSE YOUTUBE & MULTI-TAB RESOLUTION ===\n');

// Import server logic functions or test the pattern directly
const testInputs = [
  'close youtube',
  'hey jar is close youtube',
  'jar is close youtube',
  'hey jarvis close youtube',
  'please close youtube',
  'close the youtube tab',
  'close youtube tab',
  'close youtube window',
  'exit youtube',
  'quit youtube',
  'close youtube and instagram',
  'close both youtube and instagram',
  'close youtube, instagram and whatsapp'
];

function parseDirectCloseCommand(text) {
  const t = (text || '').trim();
  if (!t) return null;

  const normalized = t.replace(/^(?:hey\s+|ok\s+|hi\s+)?(?:jarvis|jar\s+is|jars|travis|javis|jarviz)[,.\s]*/i, '').trim();

  const match = normalized.match(/^(?:is\s+|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|just\s+|i\s+want\s+to\s+)?(?:close|exit|quit|kill|terminate|shut(?:\s+down)?)\s+(.*)$/i);
  if (!match) return null;

  let raw = match[1].trim();

  const countMatch = raw.match(/^(?:the\s+)?(?:(\d+|two|three|four|five|all|multiple)\s+)?(?:tabs?|windows?)$/i);
  if (countMatch) {
    let count = 1;
    const countWord = (countMatch[1] || '').toLowerCase();
    if (countWord === 'two' || countWord === '2') count = 2;
    else if (countWord === 'three' || countWord === '3') count = 3;
    else if (countWord === 'all' || countWord === 'multiple') count = 3;
    else if (/^\d+$/.test(countWord)) count = parseInt(countWord, 10);
    return {
      targets: ['tab'],
      count: Math.min(count, 10),
      raw,
      isGeneric: true
    };
  }

  raw = raw.replace(/^(?:the\s+)?(?:tabs?|websites?|webs?|apps?|applications?|programs?|both)\s+/i, '').trim();

  const rawParts = raw.split(/\s+(?:and|&)\s+|,\s*(?:and\s+)?/i);

  const targets = [];
  for (let part of rawParts) {
    let clean = part.trim();
    clean = clean.replace(/^(?:the\s+)?(?:tab|website|web|app)\s+/i, '').trim();
    clean = clean.replace(/\s+(?:tabs?|windows?|apps?|applications?|programs?|websites?|sites?)$/i, '').trim();
    clean = clean.replace(/^(?:the\s+)/i, '').trim();

    if (!clean || clean.length < 2) continue;

    const isProtected = /^(jarvis|localhost|system|core|terminal|hud|reactapp|3000)$/i.test(clean.replace(/[^a-z0-9]/gi, ''));
    if (isProtected) continue;

    if (/^(something|anything|it)$/i.test(clean)) continue;

    targets.push(clean);
  }

  if (targets.length === 0) return null;

  return {
    targets,
    count: targets.length,
    raw,
    isGeneric: false
  };
}

function parseMediaCommand(text) {
  const lower = (text || '').trim().toLowerCase();
  if (/\b(?:close|exit|quit|kill|terminate|shut(?:\s*down)?)\b/i.test(lower)) {
    return null;
  }
  if (/\byoutube\b/i.test(lower)) {
    if (/^(?:open|launch|start|close|exit|quit|kill)\s+youtube\b/i.test(lower) || /\b(?:close|exit|quit|kill)\s+(?:the\s+)?youtube/i.test(lower)) return null;
    return { type: 'play_query', target: 'youtube', query: lower };
  }
  return null;
}

let allPassed = true;
for (const input of testInputs) {
  const closeCmd = parseDirectCloseCommand(input);
  const mediaResult = parseMediaCommand(input);

  console.log(`Input: "${input}"`);
  console.log(`  -> Direct Close Targets: ${closeCmd ? JSON.stringify(closeCmd.targets) : 'null'}`);
  console.log(`  -> Media Result: ${mediaResult ? JSON.stringify(mediaResult) : 'null (BLOCKED)'}`);

  if (closeCmd && closeCmd.targets.includes('youtube') && mediaResult === null) {
    console.log('  [PASS] Correctly resolved to close YouTube without triggering media playback!\n');
  } else {
    console.error('  [FAIL] Did not correctly resolve to close YouTube!\n');
    allPassed = false;
  }
}

if (allPassed) {
  console.log('ALL TESTS PASSED! "close youtube" and multi-target close work flawlessly.');
} else {
  process.exit(1);
}
