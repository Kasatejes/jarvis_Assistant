function parseDirectCloseCommand(text) {
  const t = (text || '').trim();
  if (!t) return null;

  // Normalize speech-to-text phonetic misrecognitions of wake words:
  const normalized = t.replace(/^(?:hey\s+|ok\s+|hi\s+)?(?:jarvis|jar\s+is|jars|travis|javis|jarviz)[,.\s]*/i, '').trim();

  // Match close command
  const match = normalized.match(/^(?:is\s+|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|just\s+|i\s+want\s+to\s+)?(?:close|exit|quit|kill|terminate|shut(?:\s+down)?)\s+(.*)$/i);
  if (!match) return null;

  let raw = match[1].trim();

  // Check for generic "N tabs" e.g. "2 tabs", "3 tabs", "multiple tabs", "tabs"
  const countMatch = raw.match(/^(?:the\s+)?(?:(\d+|two|three|four|five|all|multiple)\s+)?(?:tabs?|windows?)$/i);
  if (countMatch) {
    let count = 1;
    const countWord = (countMatch[1] || '').toLowerCase();
    if (countWord === 'two' || countWord === '2') count = 2;
    else if (countWord === 'three' || countWord === '3') count = 3;
    else if (countWord === 'four' || countWord === '4') count = 4;
    else if (countWord === 'five' || countWord === '5') count = 5;
    else if (countWord === 'all' || countWord === 'multiple') count = 3;
    else if (/^\d+$/.test(countWord)) count = parseInt(countWord, 10);
    return {
      targets: ['tab'],
      count: Math.min(count, 10),
      raw,
      isGeneric: true
    };
  }

  // Strip leading prefixes like "the tab", "tabs", "the website", "website", "web", "app", "both"
  raw = raw.replace(/^(?:the\s+)?(?:tabs?|websites?|webs?|apps?|applications?|programs?|both)\s+/i, '').trim();

  // Split targets on "and", "&", or commas:
  // e.g. "youtube and instagram", "youtube, instagram, and whatsapp", "youtube tab and instagram tab"
  const rawParts = raw.split(/\s+(?:and|&)\s+|,\s*(?:and\s+)?/i);

  const targets = [];
  for (let part of rawParts) {
    let clean = part.trim();
    // Strip trailing/leading descriptors
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

const testPhrases = [
  'close youtube',
  'hey jar is close youtube',
  'jar is close youtube',
  'hey jarvis close youtube',
  'please close youtube tab',
  'close the youtube tab',
  'close youtube window',
  'exit spotify',
  'quit chrome',
  'hey jarvis, close youtube',
  'close youtube and instagram',
  'close both youtube and instagram',
  'close youtube, instagram and whatsapp',
  'close youtube tab and instagram tab',
  'close tabs youtube and instagram',
  'close web youtube',
  'close website instagram',
  'close 2 tabs',
  'close 3 tabs',
  'close tabs',
  'close all tabs'
];

console.log('--- TESTING DIRECT CLOSE COMMAND PARSER ---');
for (const phrase of testPhrases) {
  const res = parseDirectCloseCommand(phrase);
  console.log(`"${phrase}" -> ${JSON.stringify(res)}`);
}
