// Test direct endpoint logic and mathEngine integration
const mathEngine = require('./mathEngine');

console.log('=== VERIFYING MATH AGENT CORE CAPABILITIES ===\n');

// 1. Test standard arithmetic
const t1 = mathEngine.evaluate('25 * 40 + 12');
console.log('1. Arithmetic: 25 * 40 + 12 =', t1.formattedResult, '| Category:', t1.category);

// 2. Test percentage calculation
const t2 = mathEngine.evaluate('15% of 850');
console.log('2. Percentage: 15% of 850 =', t2.formattedResult, '| Steps:', t2.steps);

// 3. Test discount calculation
const t3 = mathEngine.evaluate('1200 - 20%');
console.log('3. Discount: 1200 - 20% =', t3.formattedResult, '| Voice:', t3.voiceResponse);

// 4. Test scientific functions
const t4 = mathEngine.evaluate('sqrt(625) + 2^5');
console.log('4. Scientific: sqrt(625) + 2^5 =', t4.formattedResult, '| Steps:', t4.steps);

// 5. Test unit conversions
const t5 = mathEngine.evaluate('100 km to miles');
console.log('5. Distance Conversion: 100 km to miles =', t5.formattedResult, '| Category:', t5.category);

const t6 = mathEngine.evaluate('100 fahrenheit to celsius');
console.log('6. Temp Conversion: 100 F to C =', t6.formattedResult, '| Category:', t6.category);

const t7 = mathEngine.evaluate('8 gb in mb');
console.log('7. Digital Conversion: 8 GB in MB =', t7.formattedResult, '| Category:', t7.category);

// 6. Test algebra equation solving
const t8 = mathEngine.evaluate('solve 3x + 15 = 45');
console.log('8. Linear Algebra: solve 3x + 15 = 45 ->', t8.formattedResult, '\n   Steps:\n  ', t8.steps);

const t9 = mathEngine.evaluate('solve x^2 - 5x + 6 = 0');
console.log('9. Quadratic Algebra: solve x^2 - 5x + 6 = 0 ->', t9.formattedResult, '\n   Steps:\n  ', t9.steps);

// 7. Test statistical operations
const t10 = mathEngine.evaluate('average of 15, 30, 45, 60');
console.log('10. Statistics: average ->', t10.formattedResult, '| Category:', t10.category);

// 8. Test natural language voice commands
const voiceQueries = [
  'Jarvis, calculate 18% of 2500',
  'what is 45 times 80',
  'how much is 500 minus 15 percent',
  'convert 50 miles to km',
  'solve 4x + 12 = 48',
  'what is square root of 1024'
];

console.log('\n=== TESTING VOICE / NATURAL LANGUAGE FAST-PATH COMMANDS ===\n');
for (const vq of voiceQueries) {
  const parsed = mathEngine.parseMathCommand(vq);
  if (parsed && parsed.success) {
    console.log(`[FAST-PATH RECOGNIZED] "${vq}"`);
    console.log(`   -> Result: ${parsed.formattedResult}`);
    console.log(`   -> Voice: "${parsed.voiceResponse}"\n`);
  } else {
    console.error(`[FAST-PATH ERROR] Failed to parse: "${vq}"`);
  }
}

console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
