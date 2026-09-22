const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');

const MODELS_BASE_DIR = path.join(__dirname, 'Data', 'Generated_Models');

// Ensure base storage directory exists
try {
  if (!fs.existsSync(MODELS_BASE_DIR)) {
    fs.mkdirSync(MODELS_BASE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[AI3D] Error ensuring base directory:', e.message);
}

// Initialize Groq client
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.ASTRA_API_KEY || process.env.OPENAI_API_KEY || '';
const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * System prompt that instructs Groq to act as a Master 3D CAD Architect.
 * Outputs a strict JSON object with volumetric primitives that construct the requested object.
 */
const SYSTEM_CAD_PROMPT = `You are the J.A.R.V.I.S. Master 3D CAD Architect and Industrial Designer.
Your task is to mathematically construct and design a recognizable, realistic, exquisitely proportioned 3D CAD model for ANY object or concept requested by the user.

You assemble 3D objects using 14 to 45 volumetric geometric primitives with authentic real-world materials, realistic organic/aerodynamic proportions, and natural curves.

Available primitive shapes:
- "box": dimensions = [width_X, height_Y, depth_Z]
- "ellipsoid": dimensions = [radius_X, radius_Y, radius_Z] (ESSENTIAL for organic shapes, bodies, guitar bouts, vehicle fuselages, eggs, muscle contours)
- "sphere": dimensions = [radius] (uniform round sphere)
- "cylinder": dimensions = [radius, height] OR [radiusTop, radiusBottom, height] (oriented vertically along Y by default)
- "capsule": dimensions = [radius, length] (oriented along Y by default)
- "cone": dimensions = [radius, height] (oriented along Y by default)
- "torus": dimensions = [radius, tubeRadius] (faces Z by default; perfect for soundholes, steering wheels, jet exhausts, rims, rings)
- "dodecahedron": dimensions = [radius]
- "icosahedron": dimensions = [radius]
- "octahedron": dimensions = [radius]
- "ring": dimensions = [innerRadius, outerRadius]

Coordinate System & Proportions:
- Y is UP (0 is ground level, positive Y goes upward).
- Z is FORWARD (toward viewer) / BACKWARD.
- X is LEFT (-X) / RIGHT (+X).
- Ground alignment: The base or feet should touch ground level (Y = 0 to 0.1).
- Centered roughly around (0, 1.5, 0) with total height between 1.5 and 3.5 units so it fits the viewport.

REALISTIC SHAPE SCULPTING & ANATOMY RULES (CRITICAL):
1. AVOID DUMB ROUND BLOBS! Never make flat objects (guitars, skateboards, laptops, shields, wings, surfboards) out of round balls or thick sausages!
2. FOR MUSICAL INSTRUMENTS (GUITARS, VIOLINS, CELLOS):
   - The body is FLATTENED in depth Z (depth Z must be 0.15 to 0.22).
   - Use two overlapping flattened "ellipsoid" bouts:
     * Lower bout: wider, e.g. [0.85, 0.75, 0.18] at [0, 0.75, 0]
     * Waist / Middle: narrower transition, e.g. [0.65, 0.45, 0.18] at [0, 1.15, 0]
     * Upper bout: slightly smaller, e.g. [0.72, 0.55, 0.18] at [0, 1.55, 0]
   - Add dark circular soundhole ("torus" or "cylinder") centered on front face of upper body [0, 1.5, 0.1].
   - Add wooden bridge below soundhole [0, 0.8, 0.1].
   - Add slender neck ("box" or "cylinder") extending upward to Y = 2.8.
   - Add headstock ("box") at the top angled slightly, with 6 metallic tuning pegs.
   - Add strings running along the neck from bridge to headstock.
3. FOR VEHICLES (CARS, BIKES, PLANES, MECHS):
   - Aerodynamic chassis, hood, raked windshield ("glass"), cockpit canopy, spoiler.
   - 4 wheels: dark rubber tires + silver alloy rims, properly positioned at corners, oriented sideways (rotZ = 1.57 rad).
4. FOR CREATURES / ANIMALS / BIRDS:
   - Defined chest and abdomen, neck, head with snout/muzzle, eyes, ears, articulated limbs, paws/hooves, and curved tail.
5. SYMMETRY & ALIGNMENT:
   - Always maintain left/right X symmetry (-X for left, +X for right).
   - All parts must connect solidly into a cohesive structure without disjoint floating pieces.

COLOR & MATERIAL REALISM (CRITICAL):
- DO NOT make everything cyan or monochrome blue.
- Assign realistic, authentic real-world hex colors and material types:
  * "metal": steel, chrome, silver, armor ("#94a3b8", "#cbd5e1", "#e2e8f0", "#475569")
  * "gold": brass, gold trim ("#e5a93c", "#facc15")
  * "paint": body paint, enamels ("#dc2626", "#2563eb", "#18181b", "#ffffff")
  * "rubber": matte dark wheels, tires, grips ("#141416", "#1e293b")
  * "glass": transparent windows, canopies, visors ("#7dd3fc", "#e0f2fe")
  * "wood": timber, oak, mahogany, acoustic soundboard ("#8b4513", "#a0522d", "#78350f", "#d2b48c")
  * "stone": rock, bone, horn, claws ("#64748b", "#f8fafc", "#1e300d")
  * "glow": headlights, arc reactors, eyes ("#38bdf8", "#f59e0b", "#ffffff", "#ef4444")
  * "matte": standard organic surfaces, leather, fabric

Output STRICT JSON ONLY (no markdown formatting, no backticks, no explanations):
{
  "modelName": "Clear descriptive name",
  "category": "vehicle" | "creature" | "architecture" | "weapon" | "furniture" | "object",
  "parts": [
    {
      "name": "Component name (e.g. lower_bout, upper_bout, guitar_neck, soundhole, left_front_wheel)",
      "shape": "box" | "ellipsoid" | "sphere" | "cylinder" | "capsule" | "cone" | "torus" | "dodecahedron" | "icosahedron" | "octahedron" | "ring",
      "dimensions": [number, number, ...],
      "position": [x, y, z],
      "rotation": [rotX_rad, rotY_rad, rotZ_rad],
      "scale": [scaleX, scaleY, scaleZ],
      "color": "#hexColor",
      "material": "metal" | "paint" | "rubber" | "glass" | "wood" | "stone" | "glow" | "matte"
    }
  ]
}`;

/**
 * Procedural geometric backup generator if AI API call times out or fails
 * Intelligently generates authentic archetypes for common concepts (guitars, vehicles, weapons, mechs)
 */
function generateProceduralBackupBlueprint(cleanName) {
  const cap = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const q = (cleanName || '').toLowerCase();

  // 1. Acoustic Guitar / String Instrument archetype
  if (q.includes('guitar') || q.includes('bass') || q.includes('ukulele') || q.includes('violin') || q.includes('cello') || q.includes('instrument')) {
    return {
      modelName: `${cap} Acoustic Assembly`,
      category: 'object',
      parts: [
        // Soundboard body bouts (flattened ellipsoids)
        { name: 'lower_bout', shape: 'ellipsoid', dimensions: [0.85, 0.75, 0.18], position: [0, 0.75, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#a0522d', material: 'wood' },
        { name: 'waist', shape: 'ellipsoid', dimensions: [0.65, 0.45, 0.18], position: [0, 1.15, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#a0522d', material: 'wood' },
        { name: 'upper_bout', shape: 'ellipsoid', dimensions: [0.72, 0.55, 0.18], position: [0, 1.55, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#a0522d', material: 'wood' },
        // Soundhole & Rosette
        { name: 'soundhole_inner', shape: 'cylinder', dimensions: [0.18, 0.02], position: [0, 1.5, 0.09], rotation: [Math.PI / 2, 0, 0], color: '#18181b', material: 'matte' },
        { name: 'soundhole_rosette', shape: 'torus', dimensions: [0.22, 0.02], position: [0, 1.5, 0.1], rotation: [0, 0, 0], color: '#d2b48c', material: 'wood' },
        // Bridge & Saddle
        { name: 'wooden_bridge', shape: 'box', dimensions: [0.38, 0.08, 0.04], position: [0, 0.8, 0.1], rotation: [0, 0, 0], color: '#451a03', material: 'wood' },
        { name: 'bridge_saddle', shape: 'box', dimensions: [0.28, 0.02, 0.02], position: [0, 0.82, 0.12], rotation: [0, 0, 0], color: '#f8fafc', material: 'stone' },
        // Neck & Fretboard
        { name: 'guitar_neck', shape: 'box', dimensions: [0.12, 1.35, 0.08], position: [0, 2.35, 0.02], rotation: [0, 0, 0], color: '#78350f', material: 'wood' },
        { name: 'fretboard', shape: 'box', dimensions: [0.13, 1.3, 0.02], position: [0, 2.35, 0.07], rotation: [0, 0, 0], color: '#262626', material: 'wood' },
        // Headstock
        { name: 'headstock', shape: 'box', dimensions: [0.18, 0.38, 0.06], position: [0, 3.15, 0.04], rotation: [-0.12, 0, 0], color: '#78350f', material: 'wood' },
        // 6 Tuning Pegs
        { name: 'tuner_L1', shape: 'cylinder', dimensions: [0.015, 0.06], position: [-0.12, 3.05, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tuner_L2', shape: 'cylinder', dimensions: [0.015, 0.06], position: [-0.12, 3.18, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tuner_L3', shape: 'cylinder', dimensions: [0.015, 0.06], position: [-0.12, 3.31, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tuner_R1', shape: 'cylinder', dimensions: [0.015, 0.06], position: [0.12, 3.05, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tuner_R2', shape: 'cylinder', dimensions: [0.015, 0.06], position: [0.12, 3.18, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tuner_R3', shape: 'cylinder', dimensions: [0.015, 0.06], position: [0.12, 3.31, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        // Strings (parallel slender cylinders)
        { name: 'string_E_low', shape: 'cylinder', dimensions: [0.006, 2.2], position: [-0.045, 1.9, 0.085], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
        { name: 'string_A', shape: 'cylinder', dimensions: [0.005, 2.2], position: [-0.027, 1.9, 0.085], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
        { name: 'string_D', shape: 'cylinder', dimensions: [0.004, 2.2], position: [-0.009, 1.9, 0.085], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
        { name: 'string_G', shape: 'cylinder', dimensions: [0.004, 2.2], position: [0.009, 1.9, 0.085], rotation: [0, 0, 0], color: '#e2e8f0', material: 'metal' },
        { name: 'string_B', shape: 'cylinder', dimensions: [0.003, 2.2], position: [0.027, 1.9, 0.085], rotation: [0, 0, 0], color: '#e2e8f0', material: 'metal' },
        { name: 'string_E_high', shape: 'cylinder', dimensions: [0.003, 2.2], position: [0.045, 1.9, 0.085], rotation: [0, 0, 0], color: '#e2e8f0', material: 'metal' }
      ]
    };
  }

  // 2. Vehicle / Car archetype
  if (q.includes('car') || q.includes('vehicle') || q.includes('auto') || q.includes('supercar') || q.includes('truck') || q.includes('sportscar')) {
    return {
      modelName: `${cap} Supercar`,
      category: 'vehicle',
      parts: [
        { name: 'chassis_main', shape: 'box', dimensions: [1.3, 0.38, 2.6], position: [0, 0.42, 0], rotation: [0, 0, 0], color: '#dc2626', material: 'paint' },
        { name: 'hood_sloped', shape: 'box', dimensions: [1.2, 0.22, 1.0], position: [0, 0.48, 0.85], rotation: [-0.14, 0, 0], color: '#dc2626', material: 'paint' },
        { name: 'cabin_canopy', shape: 'ellipsoid', dimensions: [0.55, 0.35, 0.75], position: [0, 0.75, -0.15], rotation: [0, 0, 0], color: '#0f172a', material: 'glass' },
        { name: 'windshield_front', shape: 'box', dimensions: [1.05, 0.4, 0.04], position: [0, 0.68, 0.35], rotation: [0.65, 0, 0], color: '#7dd3fc', material: 'glass' },
        { name: 'rear_spoiler', shape: 'box', dimensions: [1.25, 0.06, 0.3], position: [0, 0.85, -1.25], rotation: [0.08, 0, 0], color: '#18181b', material: 'paint' },
        { name: 'headlight_left', shape: 'box', dimensions: [0.22, 0.08, 0.05], position: [-0.48, 0.48, 1.32], rotation: [0, 0, 0], color: '#ffffff', material: 'glow' },
        { name: 'headlight_right', shape: 'box', dimensions: [0.22, 0.08, 0.05], position: [0.48, 0.48, 1.32], rotation: [0, 0, 0], color: '#ffffff', material: 'glow' },
        { name: 'taillight_left', shape: 'box', dimensions: [0.28, 0.06, 0.05], position: [-0.45, 0.52, -1.32], rotation: [0, 0, 0], color: '#ef4444', material: 'glow' },
        { name: 'taillight_right', shape: 'box', dimensions: [0.28, 0.06, 0.05], position: [0.45, 0.52, -1.32], rotation: [0, 0, 0], color: '#ef4444', material: 'glow' },
        // 4 Wheels (Rubber tire + Rim)
        { name: 'tire_FL', shape: 'cylinder', dimensions: [0.32, 0.22], position: [-0.72, 0.32, 0.75], rotation: [0, 0, Math.PI / 2], color: '#141416', material: 'rubber' },
        { name: 'rim_FL', shape: 'cylinder', dimensions: [0.2, 0.23], position: [-0.72, 0.32, 0.75], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tire_FR', shape: 'cylinder', dimensions: [0.32, 0.22], position: [0.72, 0.32, 0.75], rotation: [0, 0, Math.PI / 2], color: '#141416', material: 'rubber' },
        { name: 'rim_FR', shape: 'cylinder', dimensions: [0.2, 0.23], position: [0.72, 0.32, 0.75], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tire_RL', shape: 'cylinder', dimensions: [0.34, 0.26], position: [-0.74, 0.34, -0.75], rotation: [0, 0, Math.PI / 2], color: '#141416', material: 'rubber' },
        { name: 'rim_RL', shape: 'cylinder', dimensions: [0.22, 0.27], position: [-0.74, 0.34, -0.75], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' },
        { name: 'tire_RR', shape: 'cylinder', dimensions: [0.34, 0.26], position: [0.74, 0.34, -0.75], rotation: [0, 0, Math.PI / 2], color: '#141416', material: 'rubber' },
        { name: 'rim_RR', shape: 'cylinder', dimensions: [0.22, 0.27], position: [0.74, 0.34, -0.75], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', material: 'metal' }
      ]
    };
  }

  // 3. Default futuristic holographic core assembly
  return {
    modelName: `${cap} Holographic Assembly`,
    category: 'object',
    parts: [
      { name: 'pedestal_base', shape: 'cylinder', dimensions: [1.2, 1.4, 0.3], position: [0, 0.15, 0], rotation: [0, 0, 0], color: '#334155', material: 'metal' },
      { name: 'core_fuselage', shape: 'box', dimensions: [1.4, 1.4, 1.4], position: [0, 1.2, 0], rotation: [0, Math.PI / 4, 0], color: '#1e293b', material: 'metal' },
      { name: 'sensor_sphere', shape: 'sphere', dimensions: [0.6], position: [0, 2.2, 0], rotation: [0, 0, 0], color: '#00f0ff', material: 'glow' },
      { name: 'orbital_ring_x', shape: 'torus', dimensions: [1.5, 0.06], position: [0, 1.2, 0], rotation: [Math.PI / 3, 0, 0], color: '#38bdf8', material: 'metal' },
      { name: 'orbital_ring_z', shape: 'torus', dimensions: [1.8, 0.05], position: [0, 1.2, 0], rotation: [0, 0, Math.PI / 4], color: '#38bdf8', material: 'metal' },
      { name: 'antenna_mast', shape: 'cylinder', dimensions: [0.06, 1.2], position: [0, 3.0, 0], rotation: [0, 0, 0], color: '#94a3b8', material: 'metal' },
      { name: 'satellite_node_1', shape: 'box', dimensions: [0.3, 0.3, 0.3], position: [1.5, 1.2, 0], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
      { name: 'satellite_node_2', shape: 'box', dimensions: [0.3, 0.3, 0.3], position: [-1.5, 1.2, 0], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
      { name: 'satellite_node_3', shape: 'box', dimensions: [0.3, 0.3, 0.3], position: [0, 1.2, 1.5], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' },
      { name: 'satellite_node_4', shape: 'box', dimensions: [0.3, 0.3, 0.3], position: [0, 1.2, -1.5], rotation: [0, 0, 0], color: '#cbd5e1', material: 'metal' }
    ]
  };
}

/**
 * Validates, repairs shapes, and assigns realistic contextual colors & materials
 * to ensure no component is ever rendered with null color or broken geometry.
 */
function sanitizeAndColorPart(p, idx, contextName = '') {
  const name = (p.name || `part_${idx + 1}`).toLowerCase();
  const cName = (contextName || '').toLowerCase();
  let color = p.color;
  let material = (p.material || p.materialType || '').toLowerCase() || 'matte';

  // If color is missing or null, assign realistic contextual color
  if (!color || color === 'null' || color === 'undefined') {
    if (name.includes('eye') || name.includes('pupil')) {
      color = '#f59e0b'; // Amber glowing eye
      material = 'glow';
    } else if (name.includes('teeth') || name.includes('tooth') || name.includes('fang') || name.includes('claw') || name.includes('nail') || name.includes('bone') || name.includes('saddle')) {
      color = '#f8fafc'; // Ivory white
      material = 'stone';
    } else if (name.includes('tongue') || name.includes('mouth') || name.includes('gum') || name.includes('throat')) {
      color = '#be123c'; // Crimson red
      material = 'matte';
    } else if (name.includes('belly') || name.includes('chest') || name.includes('under')) {
      color = '#d4a373'; // Pale tan underbelly
      material = 'matte';
    } else if (name.includes('horn') || name.includes('spike') || name.includes('spine') || name.includes('scute') || name.includes('ridge')) {
      color = '#1e300d'; // Charcoal dark horn
      material = 'stone';
    } else if (name.includes('fretboard') || name.includes('fingerboard')) {
      color = '#262626'; // Dark rosewood/ebony
      material = 'wood';
    } else if (name.includes('neck') || name.includes('headstock') || name.includes('bout') || name.includes('guitar') || name.includes('wood') || name.includes('timber')) {
      color = '#8b4513'; // Rich acoustic wood tone
      material = 'wood';
    } else if (name.includes('string') || name.includes('wire') || name.includes('tuner') || name.includes('peg')) {
      color = '#cbd5e1'; // Chrome/nickel
      material = 'metal';
    } else if (name.includes('soundhole') || name.includes('hole')) {
      color = '#18181b';
      material = 'matte';
    } else if (cName.includes('dinosaur') || cName.includes('t-rex') || cName.includes('trex') || cName.includes('reptile') || cName.includes('lizard') || cName.includes('dragon')) {
      color = name.includes('head') || name.includes('snout') || name.includes('jaw') ? '#284410' : '#365314'; // Olive green
      material = 'matte';
    } else if (name.includes('glass') || name.includes('window') || name.includes('visor') || name.includes('windshield')) {
      color = '#7dd3fc';
      material = 'glass';
    } else if (name.includes('tire') || name.includes('wheel') || name.includes('tread') || name.includes('rubber')) {
      color = '#141416';
      material = 'rubber';
    } else if (name.includes('metal') || name.includes('steel') || name.includes('chrome') || name.includes('armor') || name.includes('rim')) {
      color = '#94a3b8';
      material = 'metal';
    } else if (name.includes('gold') || name.includes('brass')) {
      color = '#e5a93c';
      material = 'metal';
    } else if (name.includes('light') || name.includes('glow') || name.includes('laser') || name.includes('beam')) {
      color = '#38bdf8';
      material = 'glow';
    } else {
      color = '#475569';
      material = 'matte';
    }
  }

  const validShapes = ['box', 'ellipsoid', 'cylinder', 'sphere', 'cone', 'torus', 'ring', 'capsule', 'dodecahedron', 'icosahedron', 'octahedron'];
  const shape = validShapes.includes((p.shape || '').toLowerCase()) ? p.shape.toLowerCase() : 'box';

  // Normalize rotation angles: convert degree values to radians if detected (> 2*PI)
  let rot = Array.isArray(p.rotation) && p.rotation.length >= 3 ? p.rotation.map(Number) : [0, 0, 0];
  if (Math.abs(rot[0]) > 6.28 || Math.abs(rot[1]) > 6.28 || Math.abs(rot[2]) > 6.28) {
    rot = rot.map(deg => deg * (Math.PI / 180));
  }

  const scale = Array.isArray(p.scale) && p.scale.length >= 3 ? p.scale.map(Number) : [1, 1, 1];

  return {
    name: p.name || `part_${idx + 1}`,
    shape,
    dimensions: Array.isArray(p.dimensions) && p.dimensions.length >= 1 ? p.dimensions.map(Number) : [1, 1, 1],
    position: Array.isArray(p.position) && p.position.length >= 3 ? p.position.map(Number) : [0, 1, 0],
    rotation: rot,
    scale,
    color,
    material,
    wireframe: Boolean(p.wireframe)
  };
}

/**
 * Synthesizes a 3D blueprint for any given prompt or object.
 * Checks local cache first; if not found, generates via Groq in JSON mode.
 */
async function synthesize3DModel(rawPrompt) {
  const clean = (rawPrompt || '').toLowerCase().trim().replace(/[^a-z0-9\s_-]/g, '');
  const modelKey = clean.replace(/\s+/g, '_') || 'custom_model';
  const itemDir = path.join(MODELS_BASE_DIR, modelKey);
  const blueprintPath = path.join(itemDir, 'blueprint.json');

  // Ensure item directory exists
  try {
    if (!fs.existsSync(itemDir)) {
      fs.mkdirSync(itemDir, { recursive: true });
    }
  } catch (e) {}

  // 1. Check local cache hit with automatic healing of legacy/null-color blueprints
  if (fs.existsSync(blueprintPath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
      if (cachedData && Array.isArray(cachedData.parts) && cachedData.parts.length > 0) {
        let repaired = false;

        // Auto-heal legacy flat-box or malformed guitar models
        if (clean.includes('guitar') && (cachedData.parts.length < 16 || cachedData.parts.some(p => p.name === 'body' && p.shape === 'box'))) {
          console.log(`[AI3D] Detected legacy flat-box guitar blueprint for "${modelKey}". Upgrading to authentic contoured 3D guitar...`);
          const upgraded = generateProceduralBackupBlueprint('Acoustic Guitar');
          cachedData.parts = upgraded.parts;
          cachedData.modelName = upgraded.modelName;
          repaired = true;
        }

        cachedData.parts = cachedData.parts.map((p, idx) => {
          if (!p.color || p.color === 'null' || !p.material || !p.scale) {
            repaired = true;
          }
          return sanitizeAndColorPart(p, idx, cachedData.modelName || clean);
        });

        if (repaired) {
          fs.writeFileSync(blueprintPath, JSON.stringify(cachedData, null, 2), 'utf8');
        }

        console.log(`[AI3D] Cache hit for "${modelKey}" with ${cachedData.parts.length} components (repaired: ${repaired})`);
        return {
          success: true,
          modelKey,
          assetName: cachedData.modelName || `${clean} 3D Asset`,
          fileName: 'blueprint.json',
          fileSize: `${(fs.statSync(blueprintPath).size / 1024).toFixed(1)} KB`,
          format: 'json-blueprint (AI-CAD)',
          location: `backend/Data/Generated_Models/${modelKey}/blueprint.json`,
          blueprint: cachedData,
          isCached: true
        };
      }
    } catch (err) {
      console.warn(`[AI3D] Error reading cached blueprint for "${modelKey}":`, err.message);
    }
  }

  // 2. Synthesize with Groq AI in JSON mode
  console.log(`[AI3D] Synthesizing custom 3D model for: "${rawPrompt}"...`);
  const startTime = Date.now();

  try {
    let completion = null;
    const candidateModels = [
      { id: 'openai/gpt-oss-120b', maxTokens: 2000 },
      { id: 'qwen/qwen3.8-27b', maxTokens: 950 },
      { id: 'openai/gpt-oss-20b', maxTokens: 1600 },
      { id: 'groq/compound-mini', maxTokens: 950 }
    ];
    for (const cand of candidateModels) {
      try {
        completion = await groq.chat.completions.create({
          model: cand.id,
          messages: [
            { role: 'system', content: SYSTEM_CAD_PROMPT },
            { role: 'user', content: `Construct a beautifully proportioned, recognizable 3D CAD model of: "${rawPrompt}". Use authentic shapes ("ellipsoid" for curved/flattened volumes, "box" for structures, "cylinder" for columns/pegs/strings, "torus" for rings/soundholes). Ensure realistic proportions, authentic hex colors, materials (wood, metal, rubber, glass, paint), and left/right symmetry.` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.25,
          max_tokens: cand.maxTokens
        });
        if (completion && completion.choices[0]?.message?.content) break;
      } catch (err) {
        console.warn(`[AI3D] Model ${cand.id} failed: ${err.message}. Trying next candidate...`);
      }
    }

    if (!completion || !completion.choices[0]?.message?.content) {
      throw new Error('All AI models failed to produce blueprint');
    }

    const rawJson = completion.choices[0]?.message?.content;
    const blueprint = JSON.parse(rawJson);

    // Validate blueprint structure
    if (!blueprint || !Array.isArray(blueprint.parts) || blueprint.parts.length === 0) {
      throw new Error('AI returned invalid blueprint schema');
    }

    // Sanitize, shape-validate and auto-color parts (prevent null colors permanently)
    blueprint.parts = blueprint.parts.map((p, idx) => sanitizeAndColorPart(p, idx, blueprint.modelName || clean));

    if (!blueprint.modelName) {
      blueprint.modelName = `${clean.charAt(0).toUpperCase() + clean.slice(1)} 3D Model`;
    }

    // Save to disk cache
    fs.writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2), 'utf8');
    const elapsed = Date.now() - startTime;
    console.log(`[AI3D] Successfully synthesized "${blueprint.modelName}" with ${blueprint.parts.length} parts in ${elapsed}ms`);

    return {
      success: true,
      modelKey,
      assetName: blueprint.modelName,
      fileName: 'blueprint.json',
      fileSize: `${(fs.statSync(blueprintPath).size / 1024).toFixed(1)} KB`,
      format: 'json-blueprint (AI-CAD)',
      location: `backend/Data/Generated_Models/${modelKey}/blueprint.json`,
      blueprint: blueprint,
      isCached: false,
      synthesisTimeMs: elapsed
    };
  } catch (err) {
    console.warn(`[AI3D] Groq synthesis failed for "${rawPrompt}", using procedural backup:`, err.message);
    const backupBlueprint = generateProceduralBackupBlueprint(clean);
    fs.writeFileSync(blueprintPath, JSON.stringify(backupBlueprint, null, 2), 'utf8');

    return {
      success: true,
      modelKey,
      assetName: backupBlueprint.modelName,
      fileName: 'blueprint.json',
      fileSize: '1.2 KB',
      format: 'json-blueprint (AI-CAD)',
      location: `backend/Data/Generated_Models/${modelKey}/blueprint.json`,
      blueprint: backupBlueprint,
      isCached: false
    };
  }
}

/**
 * Lists all previously synthesized models stored on disk.
 */
function getRecentSynthesizedModels() {
  try {
    if (!fs.existsSync(MODELS_BASE_DIR)) return [];
    const dirs = fs.readdirSync(MODELS_BASE_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const results = [];
    for (const d of dirs) {
      const bPath = path.join(MODELS_BASE_DIR, d, 'blueprint.json');
      if (fs.existsSync(bPath)) {
        try {
          const bp = JSON.parse(fs.readFileSync(bPath, 'utf8'));
          results.push({
            key: d,
            name: bp.modelName || d,
            partsCount: bp.parts ? bp.parts.length : 0,
            date: fs.statSync(bPath).mtime
          });
        } catch (e) {}
      }
    }
    return results.sort((a, b) => b.date - a.date).slice(0, 12);
  } catch (e) {
    return [];
  }
}

/**
 * Deletes a synthesized model directory and all its files from disk storage.
 */
function deleteSynthesizedModel(modelKey) {
  try {
    const rawKey = (modelKey || '').toString().trim();
    if (!rawKey) return { success: false, error: 'Invalid model key' };
    const cleanKey = rawKey.toLowerCase().replace(/[^a-z0-9_-]/gi, '');
    
    // Direct match
    let targetDir = path.join(MODELS_BASE_DIR, cleanKey);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`[AI3D] Permanently deleted model directory "${cleanKey}" from disk`);
      return { success: true, message: `Model "${cleanKey}" deleted from storage.`, modelKey: cleanKey };
    }

    // Case-insensitive / hyphen-underscore fuzzy match
    if (fs.existsSync(MODELS_BASE_DIR)) {
      const dirs = fs.readdirSync(MODELS_BASE_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      const targetSlug = cleanKey.replace(/[-_]/g, '');
      const matched = dirs.find(d => {
        const dSlug = d.toLowerCase().replace(/[^a-z0-9]/gi, '');
        return d.toLowerCase() === cleanKey || dSlug === targetSlug || d.toLowerCase() === rawKey.toLowerCase();
      });

      if (matched) {
        fs.rmSync(path.join(MODELS_BASE_DIR, matched), { recursive: true, force: true });
        console.log(`[AI3D] Permanently deleted model directory "${matched}" from disk`);
        return { success: true, message: `Model "${matched}" deleted from storage.`, modelKey: cleanKey };
      }
    }

    // If not found, still return success so the front-end list can purge the missing reference
    console.log(`[AI3D] Model directory "${cleanKey}" was already removed from disk.`);
    return { success: true, message: `Model "${cleanKey}" removed from registry.`, modelKey: cleanKey, alreadyGone: true };
  } catch (err) {
    console.error(`[AI3D] Error deleting model "${modelKey}":`, err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  synthesize3DModel,
  getRecentSynthesizedModels,
  deleteSynthesizedModel,
  MODELS_BASE_DIR
};
