const { evaluate, parseMathCommand } = require('./mathEngine');

const testCases = [
  '25 * 4',
  '(10 + 5) * 3',
  '2^10',
  '15% of 850',
  '1200 - 20%',
  '100 + 18%',
  'what is 20 percent of 1500',
  'sqrt(256)',
  'square root of 144',
  'sin(90)',
  'log(1000)',
  '5!',
  '50 km to miles',
  '100 fahrenheit to celsius',
  '10 kg to lbs',
  '4 gb in mb',
  'solve 2x + 10 = 50',
  'solve 3x - 15 = 30',
  'solve x^2 - 5x + 6 = 0',
  'average of 10, 20, 30, 40',
  'median of 5, 2, 8, 1, 9'
];

console.log('--- RUNNING MATH ENGINE UNIT TESTS ---');
let passed = 0;
for (const test of testCases) {
  const res = evaluate(test);
  if (res.success) {
    console.log(`[PASS] "${test}" -> ${res.formattedResult} (${res.category})`);
    passed++;
  } else {
    console.error(`[FAIL] "${test}" -> ${res.error}`);
  }
}

console.log(`\nTests passed: ${passed} / ${testCases.length}`);

// Test parseMathCommand fast-paths
const fastCases = [
  'Jarvis calculate 15% of 850',
  'what is 45 * 12',
  'how much is 100 + 50',
  'convert 100 km to miles',
  'solve 4x + 8 = 40',
  'sqrt(625)'
];

console.log('\n--- TESTING FAST-PATH COMMAND PARSER ---');
for (const cmd of fastCases) {
  const res = parseMathCommand(cmd);
  if (res && res.success) {
    console.log(`[FAST-PATH HIT] "${cmd}" -> ${res.formattedResult} | Voice: "${res.voiceResponse}"`);
  } else {
    console.error(`[FAST-PATH MISS] "${cmd}"`);
  }
}
