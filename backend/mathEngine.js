/**
 * J.A.R.V.I.S. Mathematical Intelligence & Calculation Engine
 * High-performance deterministic evaluation for arithmetic, percentages,
 * scientific math, unit conversions, linear/quadratic algebra, and statistics.
 */

// Factorial helper
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= Math.min(n, 170); i++) {
    res *= i;
  }
  return res;
}

// Format numbers nicely (e.g., 1000000 -> 1,000,000, avoid 0.0000000000000004)
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return String(num);
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  // Avoid floating point precision issues
  const rounded = Math.abs(num) < 1e-12 ? 0 : Number(num.toPrecision(12));
  const str = String(rounded);
  // Split decimals
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Spoken Word-to-Number conversion table
const WORD_SMALL_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

const WORD_MAGNITUDES = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
  billion: 1000000000
};

function parseWordNumber(phrase) {
  const tokens = phrase.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  for (const token of tokens) {
    if (token === 'and') continue;
    if (WORD_SMALL_NUMBERS[token] !== undefined) {
      current += WORD_SMALL_NUMBERS[token];
    } else if (token === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
    } else if (WORD_MAGNITUDES[token] !== undefined) {
      current = (current === 0 ? 1 : current) * WORD_MAGNITUDES[token];
      total += current;
      current = 0;
    } else {
      return null;
    }
  }
  return total + current;
}

function normalizeNumberWords(str) {
  const numberWordRegex = /\b(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|zero)(?:[-\s]+(?:and\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|zero))*)\b/gi;
  return str.replace(numberWordRegex, (match) => {
    const val = parseWordNumber(match);
    return val !== null ? String(val) : match;
  });
}

function normalizeSpokenMath(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();

  // Strip conversational / assistant prefix
  text = text.replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:can\s+you\s+)?(?:could\s+you\s+)?(?:tell\s+me\s+)?(?:what\s+is|what\'s|how\s+much\s+is|calculate|compute|solve|find|evaluate)?\s*(?:the\s+(?:answer|result|value)\s+(?:of|to)\s+)?/i, '');
  text = text.replace(/[?]+$/g, '').trim();

  // Convert number words to numeric digits first
  text = normalizeNumberWords(text);

  // Relational math phrases
  text = text.replace(/(?:the\s+)?sum\s+of\s+([0-9.]+)\s+and\s+([0-9.]+)/gi, '$1 + $2');
  text = text.replace(/(?:the\s+)?difference\s+(?:between|of)\s+([0-9.]+)\s+and\s+([0-9.]+)/gi, '$1 - $2');
  text = text.replace(/(?:the\s+)?product\s+of\s+([0-9.]+)\s+and\s+([0-9.]+)/gi, '$1 * $2');
  text = text.replace(/(?:the\s+)?quotient\s+of\s+([0-9.]+)\s+and\s+([0-9.]+)/gi, '$1 / $2');
  text = text.replace(/divide\s+([0-9.]+)\s+by\s+([0-9.]+)/gi, '$1 / $2');
  text = text.replace(/subtract\s+([0-9.]+)\s+from\s+([0-9.]+)/gi, '$2 - $1');

  // Spoken operators
  text = text
    .replace(/\bplus\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\b(?:times|multiplied\s+by|into)\b/gi, '*')
    .replace(/\b(?:divided\s+by|over)\b/gi, '/')
    .replace(/\b(?:modulo|mod)\b/gi, '%')
    .replace(/\b(?:to\s+the\s+power\s+of|raised\s+to\s+the\s+power\s+of|raised\s+to|power\s+of)\b/gi, '^')
    .replace(/\bsquared\b/gi, '^2')
    .replace(/\bcubed\b/gi, '^3')
    .replace(/\bsquare\s+root\s+of\s+([0-9.]+)/gi, 'sqrt($1)')
    .replace(/\bcube\s+root\s+of\s+([0-9.]+)/gi, 'cbrt($1)')
    .replace(/\bhalf\s+of\s+([0-9.]+)/gi, '0.5 * $1')
    .replace(/\bquarter\s+of\s+([0-9.]+)/gi, '0.25 * $1')
    .replace(/\b(?:percent|percentage)\s+of\b/gi, '% of')
    .replace(/(?<=\d)\s*x\s*(?=\d)/gi, ' * ');

  return text.trim();
}

// Unit conversion definitions (to base units)
const UNIT_TABLE = {
  // Distance / Length (base: meters)
  m: { base: 'm', factor: 1, name: 'meters' },
  meter: { base: 'm', factor: 1, name: 'meters' },
  meters: { base: 'm', factor: 1, name: 'meters' },
  km: { base: 'm', factor: 1000, name: 'kilometers' },
  kilometer: { base: 'm', factor: 1000, name: 'kilometers' },
  kilometers: { base: 'm', factor: 1000, name: 'kilometers' },
  cm: { base: 'm', factor: 0.01, name: 'centimeters' },
  centimeter: { base: 'm', factor: 0.01, name: 'centimeters' },
  centimeters: { base: 'm', factor: 0.01, name: 'centimeters' },
  mm: { base: 'm', factor: 0.001, name: 'millimeters' },
  millimeter: { base: 'm', factor: 0.001, name: 'millimeters' },
  millimeters: { base: 'm', factor: 0.001, name: 'millimeters' },
  mi: { base: 'm', factor: 1609.344, name: 'miles' },
  mile: { base: 'm', factor: 1609.344, name: 'miles' },
  miles: { base: 'm', factor: 1609.344, name: 'miles' },
  ft: { base: 'm', factor: 0.3048, name: 'feet' },
  foot: { base: 'm', factor: 0.3048, name: 'feet' },
  feet: { base: 'm', factor: 0.3048, name: 'feet' },
  in: { base: 'm', factor: 0.0254, name: 'inches' },
  inch: { base: 'm', factor: 0.0254, name: 'inches' },
  inches: { base: 'm', factor: 0.0254, name: 'inches' },
  yd: { base: 'm', factor: 0.9144, name: 'yards' },
  yard: { base: 'm', factor: 0.9144, name: 'yards' },
  yards: { base: 'm', factor: 0.9144, name: 'yards' },

  // Weight / Mass (base: grams)
  g: { base: 'g', factor: 1, name: 'grams' },
  gram: { base: 'g', factor: 1, name: 'grams' },
  grams: { base: 'g', factor: 1, name: 'grams' },
  kg: { base: 'g', factor: 1000, name: 'kilograms' },
  kilogram: { base: 'g', factor: 1000, name: 'kilograms' },
  kilograms: { base: 'g', factor: 1000, name: 'kilograms' },
  mg: { base: 'g', factor: 0.001, name: 'milligrams' },
  milligram: { base: 'g', factor: 0.001, name: 'milligrams' },
  milligrams: { base: 'g', factor: 0.001, name: 'milligrams' },
  lb: { base: 'g', factor: 453.59237, name: 'pounds' },
  lbs: { base: 'g', factor: 453.59237, name: 'pounds' },
  pound: { base: 'g', factor: 453.59237, name: 'pounds' },
  pounds: { base: 'g', factor: 453.59237, name: 'pounds' },
  oz: { base: 'g', factor: 28.349523, name: 'ounces' },
  ounce: { base: 'g', factor: 28.349523, name: 'ounces' },
  ounces: { base: 'g', factor: 28.349523, name: 'ounces' },
  ton: { base: 'g', factor: 907185, name: 'tons' },
  tons: { base: 'g', factor: 907185, name: 'tons' },
  tonne: { base: 'g', factor: 1000000, name: 'metric tonnes' },
  tonnes: { base: 'g', factor: 1000000, name: 'metric tonnes' },

  // Digital Data (base: bytes)
  b: { base: 'bytes', factor: 1, name: 'bytes' },
  byte: { base: 'bytes', factor: 1, name: 'bytes' },
  bytes: { base: 'bytes', factor: 1, name: 'bytes' },
  kb: { base: 'bytes', factor: 1024, name: 'kilobytes' },
  kilobyte: { base: 'bytes', factor: 1024, name: 'kilobytes' },
  kilobytes: { base: 'bytes', factor: 1024, name: 'kilobytes' },
  mb: { base: 'bytes', factor: 1024 ** 2, name: 'megabytes' },
  megabyte: { base: 'bytes', factor: 1024 ** 2, name: 'megabytes' },
  megabytes: { base: 'bytes', factor: 1024 ** 2, name: 'megabytes' },
  gb: { base: 'bytes', factor: 1024 ** 3, name: 'gigabytes' },
  gigabyte: { base: 'bytes', factor: 1024 ** 3, name: 'gigabytes' },
  gigabytes: { base: 'bytes', factor: 1024 ** 3, name: 'gigabytes' },
  tb: { base: 'bytes', factor: 1024 ** 4, name: 'terabytes' },
  terabyte: { base: 'bytes', factor: 1024 ** 4, name: 'terabytes' },
  terabytes: { base: 'bytes', factor: 1024 ** 4, name: 'terabytes' },

  // Speed (base: m/s)
  'm/s': { base: 'speed', factor: 1, name: 'meters per second' },
  kph: { base: 'speed', factor: 1 / 3.6, name: 'km/h' },
  'km/h': { base: 'speed', factor: 1 / 3.6, name: 'km/h' },
  mph: { base: 'speed', factor: 0.44704, name: 'mph' },
  knot: { base: 'speed', factor: 0.514444, name: 'knots' },
  knots: { base: 'speed', factor: 0.514444, name: 'knots' },

  // Time (base: seconds)
  s: { base: 'time', factor: 1, name: 'seconds' },
  sec: { base: 'time', factor: 1, name: 'seconds' },
  second: { base: 'time', factor: 1, name: 'seconds' },
  seconds: { base: 'time', factor: 1, name: 'seconds' },
  min: { base: 'time', factor: 60, name: 'minutes' },
  minute: { base: 'time', factor: 60, name: 'minutes' },
  minutes: { base: 'time', factor: 60, name: 'minutes' },
  hr: { base: 'time', factor: 3600, name: 'hours' },
  hour: { base: 'time', factor: 3600, name: 'hours' },
  hours: { base: 'time', factor: 3600, name: 'hours' },
  day: { base: 'time', factor: 86400, name: 'days' },
  days: { base: 'time', factor: 86400, name: 'days' },
  week: { base: 'time', factor: 604800, name: 'weeks' },
  weeks: { base: 'time', factor: 604800, name: 'weeks' }
};

// Temperature conversion
function convertTemperature(val, fromUnit, toUnit) {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  let celsius = val;
  if (from === 'f' || from.includes('fahr')) {
    celsius = (val - 32) * (5 / 9);
  } else if (from === 'k' || from.includes('kelv')) {
    celsius = val - 273.15;
  }

  let result = celsius;
  let targetName = 'Celsius';
  if (to === 'f' || to.includes('fahr')) {
    result = celsius * (9 / 5) + 32;
    targetName = 'Fahrenheit';
  } else if (to === 'k' || to.includes('kelv')) {
    result = celsius + 273.15;
    targetName = 'Kelvin';
  }

  return {
    result: Number(result.toFixed(4)),
    targetName
  };
}

// Evaluate unit conversions
function tryUnitConversion(expr) {
  // Matches: "50 km to miles", "100 f to c", "2.5 gb in mb", "convert 75 kg to lbs"
  const regex = /(?:convert\s+)?([0-9.]+)\s*([a-zA-Z°/]+)\s+(?:to|in|into)\s+([a-zA-Z°/]+)/i;
  const match = expr.match(regex);
  if (!match) return null;

  const val = parseFloat(match[1]);
  let from = match[2].trim().toLowerCase().replace('°', '');
  let to = match[3].trim().toLowerCase().replace('°', '');

  if (isNaN(val)) return null;

  // Temperature check
  const isTempFrom = from === 'c' || from === 'f' || from === 'k' || from.includes('cels') || from.includes('fahr') || from.includes('kelv');
  const isTempTo = to === 'c' || to === 'f' || to === 'k' || to.includes('cels') || to.includes('fahr') || to.includes('kelv');

  if (isTempFrom && isTempTo) {
    const res = convertTemperature(val, from, to);
    const formatted = formatNumber(res.result);
    return {
      success: true,
      category: 'CONVERSION',
      expression: `${val}° ${from.toUpperCase()} to ${to.toUpperCase()}`,
      result: res.result,
      formattedResult: `${formatted} ${res.targetName}`,
      steps: `Temperature formula applied: ${val}° ${from.toUpperCase()} = ${formatted}° ${res.targetName}`,
      voiceResponse: `${val} degrees ${from.toUpperCase()} is equal to ${formatted} degrees ${res.targetName}, sir.`,
      textResponse: `**Conversion Result**: ${val}° ${from.toUpperCase()} = **${formatted} ${res.targetName}**`
    };
  }

  const unitFrom = UNIT_TABLE[from];
  const unitTo = UNIT_TABLE[to];

  if (unitFrom && unitTo && unitFrom.base === unitTo.base) {
    const baseValue = val * unitFrom.factor;
    const finalValue = baseValue / unitTo.factor;
    const formatted = formatNumber(Number(finalValue.toPrecision(7)));

    return {
      success: true,
      category: 'CONVERSION',
      expression: `${val} ${unitFrom.name} to ${unitTo.name}`,
      result: finalValue,
      formattedResult: `${formatted} ${unitTo.name}`,
      steps: `${val} ${unitFrom.name} × (${unitFrom.factor} / ${unitTo.factor}) = ${formatted} ${unitTo.name}`,
      voiceResponse: `${val} ${unitFrom.name} is equal to ${formatted} ${unitTo.name}, sir.`,
      textResponse: `**Conversion Result**: ${val} ${unitFrom.name} = **${formatted} ${unitTo.name}**`
    };
  }

  return null;
}

// Linear & Quadratic Algebra Solver
function tryAlgebraSolver(expr) {
  // Clean prefix like "solve "
  const cleaned = expr.replace(/^(?:please\s+)?(?:solve|calculate|find\s+x\s+in)\s+/i, '').trim();
  if (!cleaned.includes('=')) return null;

  const sides = cleaned.split('=');
  if (sides.length !== 2) return null;

  const leftStr = sides[0].trim();
  const rightStr = sides[1].trim();

  // Linear form: ax + b = c or ax + b = cx + d
  // e.g. "2x + 10 = 50", "3x - 5 = 10", "4x = 24", "2x + 4 = x + 10"
  const linearRegex = /^([+-]?\s*(?:\d+(?:\.\d+)?|\d*)x)\s*([+-]\s*\d+(?:\.\d+)?)?\s*$/i;
  const rightNum = parseFloat(rightStr);

  if (!isNaN(rightNum) && linearRegex.test(leftStr)) {
    const leftMatch = leftStr.match(linearRegex);
    let aStr = leftMatch[1].replace(/\s/g, '').replace(/x/i, '');
    let a = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
    let b = 0;
    if (leftMatch[2]) {
      b = parseFloat(leftMatch[2].replace(/\s/g, ''));
    }

    if (a !== 0) {
      const xVal = (rightNum - b) / a;
      const formattedX = formatNumber(xVal);
      const step1 = b !== 0 ? `${a}x = ${rightNum} - (${b}) => ${a}x = ${rightNum - b}` : `${a}x = ${rightNum}`;
      const step2 = `x = ${rightNum - b} / ${a} => x = ${formattedX}`;

      return {
        success: true,
        category: 'ALGEBRA',
        expression: cleaned,
        result: xVal,
        formattedResult: `x = ${formattedX}`,
        steps: `${step1}\n${step2}`,
        voiceResponse: `The algebraic solution is x equals ${formattedX}, sir.`,
        textResponse: `**Algebraic Solution**: For \`${cleaned}\`:\n- ${step1}\n- **x = ${formattedX}**`
      };
    }
  }

  // Quadratic equation: ax^2 + bx + c = 0
  const quadRegex = /([+-]?\s*(?:\d+(?:\.\d+)?)?)x\^2\s*([+-]\s*(?:\d+(?:\.\d+)?)?x)?\s*([+-]\s*\d+(?:\.\d+)?)?\s*=\s*0/i;
  const quadMatch = cleaned.replace(/\s+/g, ' ').match(quadRegex);
  if (quadMatch) {
    let aStr = (quadMatch[1] || '').replace(/\s/g, '');
    let a = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
    let b = 0;
    if (quadMatch[2]) {
      let bStr = quadMatch[2].replace(/\s/g, '').replace(/x/i, '');
      b = bStr === '' || bStr === '+' ? 1 : (bStr === '-' ? -1 : parseFloat(bStr));
    }
    let c = 0;
    if (quadMatch[3]) {
      c = parseFloat(quadMatch[3].replace(/\s/g, ''));
    }

    const delta = b * b - 4 * a * c;
    if (delta >= 0) {
      const x1 = (-b + Math.sqrt(delta)) / (2 * a);
      const x2 = (-b - Math.sqrt(delta)) / (2 * a);
      const fx1 = formatNumber(x1);
      const fx2 = formatNumber(x2);
      const isSingle = Math.abs(x1 - x2) < 1e-9;

      const formatted = isSingle ? `x = ${fx1}` : `x₁ = ${fx1}, x₂ = ${fx2}`;
      return {
        success: true,
        category: 'ALGEBRA',
        expression: cleaned,
        result: isSingle ? x1 : [x1, x2],
        formattedResult: formatted,
        steps: `Discriminant Δ = b² - 4ac = ${delta}\nQuadratic formula: x = (-b ± √Δ) / 2a\n${formatted}`,
        voiceResponse: isSingle 
          ? `The equation has a single root, x equals ${fx1}, sir.` 
          : `The quadratic roots are x1 equals ${fx1}, and x2 equals ${fx2}, sir.`,
        textResponse: `**Quadratic Solution**: For \`${cleaned}\`:\n- Discriminant $\\Delta = ${delta}$\n- **${formatted}**`
      };
    } else {
      const real = formatNumber(-b / (2 * a));
      const imag = formatNumber(Math.sqrt(-delta) / (2 * a));
      const formatted = `x = ${real} ± ${imag}i`;
      return {
        success: true,
        category: 'ALGEBRA',
        expression: cleaned,
        result: formatted,
        formattedResult: formatted,
        steps: `Discriminant Δ = ${delta} (complex roots)\nx = ${formatted}`,
        voiceResponse: `The equation has complex roots: ${real} plus or minus ${imag} i, sir.`,
        textResponse: `**Quadratic Solution (Complex Roots)**: **${formatted}**`
      };
    }
  }

  return null;
}

// Percentage calculations
function tryPercentage(expr) {
  // Case 1: "15% of 850" or "what is 15 percent of 850"
  const p1 = expr.match(/(?:what\s+is\s+)?([0-9.]+)\s*(?:%|percent)\s+(?:of\s+)([0-9.]+)/i);
  if (p1) {
    const pct = parseFloat(p1[1]);
    const total = parseFloat(p1[2]);
    if (!isNaN(pct) && !isNaN(total)) {
      const res = (pct / 100) * total;
      const formatted = formatNumber(res);
      return {
        success: true,
        category: 'PERCENTAGE',
        expression: `${pct}% of ${total}`,
        result: res,
        formattedResult: formatted,
        steps: `(${pct} / 100) × ${total} = ${formatted}`,
        voiceResponse: `${pct} percent of ${total} is ${formatted}, sir.`,
        textResponse: `**Percentage Result**: ${pct}% of ${total} = **${formatted}**`
      };
    }
  }

  // Case 2: "1200 - 20%", "500 minus 15 percent", "100 plus 18%"
  const p2 = expr.match(/([0-9.]+)\s*([+-]|plus|minus)\s*([0-9.]+)\s*(?:%|percent)/i);
  if (p2) {
    const base = parseFloat(p2[1]);
    const rawOp = p2[2].toLowerCase();
    const isPlus = rawOp === '+' || rawOp === 'plus';
    const op = isPlus ? '+' : '-';
    const pct = parseFloat(p2[3]);
    if (!isNaN(base) && !isNaN(pct)) {
      const diff = (pct / 100) * base;
      const res = isPlus ? base + diff : base - diff;
      const formatted = formatNumber(res);
      return {
        success: true,
        category: 'PERCENTAGE',
        expression: `${base} ${op} ${pct}%`,
        result: res,
        formattedResult: formatted,
        steps: `${base} ${op} (${pct}% of ${base} = ${diff}) = ${formatted}`,
        voiceResponse: `${base} ${isPlus ? 'plus' : 'minus'} ${pct} percent is ${formatted}, sir.`,
        textResponse: `**Calculation Result**: ${base} ${op} ${pct}% = **${formatted}**`
      };
    }
  }

  // Case 3: "what percentage of 500 is 125" or "125 as a percentage of 500"
  const p3 = expr.match(/what\s+percentage\s+of\s+([0-9.]+)\s+is\s+([0-9.]+)/i);
  if (p3) {
    const total = parseFloat(p3[1]);
    const part = parseFloat(p3[2]);
    if (total !== 0) {
      const res = (part / total) * 100;
      const formatted = formatNumber(res);
      return {
        success: true,
        category: 'PERCENTAGE',
        expression: `${part} / ${total}`,
        result: res,
        formattedResult: `${formatted}%`,
        steps: `(${part} / ${total}) × 100 = ${formatted}%`,
        voiceResponse: `${part} is ${formatted} percent of ${total}, sir.`,
        textResponse: `**Percentage Result**: ${part} of ${total} is **${formatted}%**`
      };
    }
  }

  return null;
}

// Statistics: average, median, min, max, sum
function tryStatistics(expr) {
  const statRegex = /^(?:calculate\s+|find\s+)?(average|mean|median|min|minimum|max|maximum|sum)\s+(?:of\s+)?([0-9.,\s]+)$/i;
  const match = expr.match(statRegex);
  if (!match) return null;

  const fn = match[1].toLowerCase();
  const rawNumbers = match[2]
    .split(/[\s,]+/)
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n));

  if (rawNumbers.length === 0) return null;

  let result = 0;
  let label = fn.toUpperCase();

  if (fn === 'average' || fn === 'mean') {
    const sum = rawNumbers.reduce((a, b) => a + b, 0);
    result = sum / rawNumbers.length;
    label = 'AVERAGE';
  } else if (fn === 'sum') {
    result = rawNumbers.reduce((a, b) => a + b, 0);
    label = 'SUM';
  } else if (fn === 'min' || fn === 'minimum') {
    result = Math.min(...rawNumbers);
    label = 'MINIMUM';
  } else if (fn === 'max' || fn === 'maximum') {
    result = Math.max(...rawNumbers);
    label = 'MAXIMUM';
  } else if (fn === 'median') {
    const sorted = [...rawNumbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    result = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    label = 'MEDIAN';
  }

  const formatted = formatNumber(result);
  return {
    success: true,
    category: 'STATISTICS',
    expression: `${label}(${rawNumbers.join(', ')})`,
    result: result,
    formattedResult: formatted,
    steps: `${label} of [${rawNumbers.join(', ')}] = ${formatted}`,
    voiceResponse: `The ${label.toLowerCase()} of the provided dataset is ${formatted}, sir.`,
    textResponse: `**Statistics Telemetry**: ${label} = **${formatted}**`
  };
}

// General Arithmetic and Scientific evaluator
function evaluateArithmetic(rawExpr) {
  let expr = normalizeSpokenMath(rawExpr)
    .toLowerCase()
    .replace(/times|multiplied\s+by/gi, '*')
    .replace(/divided\s+by/gi, '/')
    .replace(/plus/gi, '+')
    .replace(/minus/gi, '-')
    .replace(/square\s+root\s+of\s+([0-9.]+)/gi, 'sqrt($1)')
    .replace(/cube\s+root\s+of\s+([0-9.]+)/gi, 'cbrt($1)')
    .replace(/to\s+the\s+power\s+of/gi, '^')
    .replace(/power\s+of/gi, '^')
    .replace(/squared/gi, '^2')
    .replace(/cubed/gi, '^3')
    .replace(/(?<=\d)\s*x\s*(?=\d)/gi, ' * ')
    .replace(/\bx\b/gi, '*')
    .trim();

  // Strip prefixes like "calculate ", "what is ", "jarvis "
  expr = expr.replace(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(?:calculate|compute|evaluate|what\s+is|what\'s|how\s+much\s+is)?\s*/i, '').trim();

  // Handle factorials (e.g. 5!)
  expr = expr.replace(/(\d+)!/g, (_, n) => `factorial(${n})`);

  // Build safe evaluator scope with Math methods
  const safeScope = {
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    sin: (x) => Math.sin((x * Math.PI) / 180), // default to degrees for human intuition
    cos: (x) => Math.cos((x * Math.PI) / 180),
    tan: (x) => Math.tan((x * Math.PI) / 180),
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    log: Math.log10, // log(100) = 2
    log10: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    pow: Math.pow,
    pi: Math.PI,
    PI: Math.PI,
    e: Math.E,
    factorial: factorial
  };

  // Convert ^ to ** for JS power
  let jsExpr = expr.replace(/\^/g, '**');

  // Verify only permitted tokens exist
  const tokenRegex = /^[0-9+\-*/().\s,*^%a-zA-Z_]+$/;
  if (!tokenRegex.test(jsExpr)) {
    throw new Error('Invalid mathematical expression.');
  }

  // Ensure no dangerous JS keywords or prototypes
  const blocked = /(window|document|process|global|require|import|function|class|eval|prototype|constructor|this|return|settimeout|setinterval)/i;
  if (blocked.test(jsExpr)) {
    throw new Error('Security constraint violated.');
  }

  // Create isolated evaluator
  const scopeKeys = Object.keys(safeScope);
  const scopeValues = Object.values(safeScope);
  const fn = new Function(...scopeKeys, `return (${jsExpr});`);
  const result = fn(...scopeValues);

  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('Calculation did not yield a valid number.');
  }

  const formatted = formatNumber(result);
  const isSci = /sqrt|cbrt|sin|cos|tan|log|ln|factorial|\^|\*\*/i.test(expr);

  return {
    success: true,
    category: isSci ? 'SCIENTIFIC' : 'ARITHMETIC',
    expression: expr,
    result: result,
    formattedResult: formatted,
    steps: `${expr} = ${formatted}`,
    voiceResponse: `The calculation result is ${formatted}, sir.`,
    textResponse: `**Calculation Result**: \`${expr}\` = **${formatted}**`
  };
}

/**
 * Main evaluation entry point
 * Accurately solves arithmetic, percentages, scientific equations, unit conversions, and algebra.
 */
function evaluate(input) {
  if (!input || typeof input !== 'string') {
    return {
      success: false,
      error: 'Empty or invalid expression.'
    };
  }

  // Try both normalized spoken math and raw query
  const normalized = normalizeSpokenMath(input);
  const candidates = [normalized, input.trim()].filter((c, i, a) => c && a.indexOf(c) === i);

  for (const query of candidates) {
    // 1. Try Unit Conversion (e.g. 50 km to miles)
    try {
      const conv = tryUnitConversion(query);
      if (conv) return conv;
    } catch (e) {}

    // 2. Try Percentage (e.g. 15% of 850, 1200 - 20%)
    try {
      const pct = tryPercentage(query);
      if (pct) return pct;
    } catch (e) {}

    // 3. Try Algebra Solver (e.g. solve 2x + 10 = 50)
    try {
      const alg = tryAlgebraSolver(query);
      if (alg) return alg;
    } catch (e) {}

    // 4. Try Statistics (e.g. average of 10, 20, 30)
    try {
      const stat = tryStatistics(query);
      if (stat) return stat;
    } catch (e) {}

    // 5. Try General Arithmetic and Scientific Evaluator
    try {
      const arith = evaluateArithmetic(query);
      if (arith && arith.success) return arith;
    } catch (e) {}
  }

  return {
    success: false,
    error: 'Unable to evaluate calculation.'
  };
}

/**
 * Parses user input to detect if it's a direct math calculation command for the fast-path
 */
function parseMathCommand(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;
  const clean = prompt.trim();

  // Fast pattern 1: Starts with calculate, compute, evaluate, solve, or convert
  const directPrefix = clean.match(/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:please\s+)?(calculate|compute|evaluate|solve|convert)\s+(.+)$/i);
  if (directPrefix) {
    const mathQuery = directPrefix[2].trim();
    const evalRes = evaluate(mathQuery);
    if (evalRes.success) return evalRes;
  }

  // Fast pattern 2: Questions: "what is ...", "what's ...", "how much is ...", "tell me what is ..."
  if (/^(?:hey\s+jarvis[,.\s]*|ok\s+jarvis[,.\s]*|jarvis[,.\s]*)?(?:what\s+is\s+the\s+answer\s+(?:of|to)|what\s+is|what\'s|how\s+much\s+is|tell\s+me\s+what\s+is)\b/i.test(clean)) {
    const evalRes = evaluate(clean);
    if (evalRes.success) return evalRes;
  }

  // Fast pattern 3: Standalone arithmetic, word math (e.g. "one plus one", "15% of 850", "sqrt(144)")
  const normalized = normalizeSpokenMath(clean);
  if (normalized) {
    if (/[0-9]/.test(normalized) && (/[+*/^%=-]/.test(normalized) || /\b(?:sqrt|cbrt|sin|cos|tan|log|average|median|to|in)\b/i.test(normalized))) {
      const evalRes = evaluate(normalized);
      if (evalRes.success) return evalRes;
    }
  }

  // Fast pattern 4: Direct fallback evaluate on raw clean input
  const directEval = evaluate(clean);
  if (directEval.success) return directEval;

  return null;
}

module.exports = {
  evaluate,
  parseMathCommand,
  formatNumber,
  normalizeNumberWords,
  normalizeSpokenMath
};
