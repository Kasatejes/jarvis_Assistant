import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { playChimeSFX } from '../utils/soundFX';
import './Holo3DViewportModal.css';

// --- Realistic PBR Materials & Shaders ---
function getProceduralMaterial(type, defaultColor, isRealistic = true, isWireframe = false) {
  if (!isRealistic) {
    const baseColor = new THREE.Color(defaultColor);
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor.clone().multiplyScalar(0.65),
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.92,
      wireframe: isWireframe
    });
  }

  // Realistic PBR Materials with natural physical surfaces
  switch (type) {
    case 'iron_armor':
      return new THREE.MeshStandardMaterial({
        color: 0xa81b2a, // Metallic Crimson Red
        metalness: 0.85,
        roughness: 0.22,
        wireframe: isWireframe
      });
    case 'iron_gold':
      return new THREE.MeshStandardMaterial({
        color: 0xe5a93c, // Polished Titanium Gold
        metalness: 0.92,
        roughness: 0.18,
        wireframe: isWireframe
      });
    case 'arc_glow':
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.8,
        roughness: 0.1,
        wireframe: isWireframe
      });
    case 'car_paint':
      return new THREE.MeshStandardMaterial({
        color: 0xd90429, // Supercar Gloss Red
        metalness: 0.45,
        roughness: 0.16,
        wireframe: isWireframe
      });
    case 'car_glass':
      return new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Smoked glass canopy
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.48,
        wireframe: isWireframe
      });
    case 'rubber_tire':
      return new THREE.MeshStandardMaterial({
        color: 0x111114, // Matte rubber tire
        metalness: 0.05,
        roughness: 0.92,
        wireframe: isWireframe
      });
    case 'alloy_silver':
      return new THREE.MeshStandardMaterial({
        color: 0xd4d4d8, // Silver alloy rims/accents
        metalness: 0.95,
        roughness: 0.15,
        wireframe: isWireframe
      });
    case 'dog_fur':
      return new THREE.MeshStandardMaterial({
        color: 0xb47238, // Warm golden retriever coat
        metalness: 0.02,
        roughness: 0.82,
        wireframe: isWireframe
      });
    case 'dog_nose':
      return new THREE.MeshStandardMaterial({
        color: 0x141416,
        metalness: 0.15,
        roughness: 0.35,
        wireframe: isWireframe
      });
    case 'cat_fur':
      return new THREE.MeshStandardMaterial({
        color: 0x222225, // Sleek black/charcoal panther fur
        metalness: 0.04,
        roughness: 0.78,
        wireframe: isWireframe
      });
    case 'cat_eye':
      return new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.6,
        roughness: 0.1,
        wireframe: isWireframe
      });
    case 'drone_carbon':
      return new THREE.MeshStandardMaterial({
        color: 0x18181b, // Matte Carbon
        metalness: 0.3,
        roughness: 0.6,
        wireframe: isWireframe
      });
    case 'heli_body':
      return new THREE.MeshStandardMaterial({
        color: 0x334155, // Military Gunmetal
        metalness: 0.72,
        roughness: 0.32,
        wireframe: isWireframe
      });
    case 'jet_body':
      return new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Pearl Aerodynamic White
        metalness: 0.45,
        roughness: 0.22,
        wireframe: isWireframe
      });
    case 'afterburner':
      return new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xf97316,
        emissiveIntensity: 2.8,
        roughness: 0.1,
        wireframe: isWireframe
      });
    case 'blade_steel':
      return new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.98,
        roughness: 0.12,
        wireframe: isWireframe
      });
    case 'plasma_beam':
      return new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.2,
        wireframe: isWireframe
      });
    case 'spaceship_hull':
      return new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.28,
        wireframe: isWireframe
      });
    case 'duck_yellow':
      return new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.05,
        roughness: 0.42,
        wireframe: isWireframe
      });
    case 'duck_orange':
      return new THREE.MeshStandardMaterial({
        color: 0xea580c,
        metalness: 0.05,
        roughness: 0.35,
        wireframe: isWireframe
      });
    case 'brake_caliper':
      return new THREE.MeshStandardMaterial({
        color: 0xef4444,
        metalness: 0.2,
        roughness: 0.15,
        wireframe: isWireframe
      });
    case 'brake_disc':
      return new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.92,
        roughness: 0.25,
        wireframe: isWireframe
      });
    case 'taillight_red':
      return new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 2.2,
        roughness: 0.1,
        wireframe: isWireframe
      });
    case 'headlight_led':
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.8,
        roughness: 0.05,
        wireframe: isWireframe
      });
    case 'leather_brown':
      return new THREE.MeshStandardMaterial({
        color: 0x78350f,
        metalness: 0.05,
        roughness: 0.68,
        wireframe: isWireframe
      });
    case 'dog_inner_ear':
      return new THREE.MeshStandardMaterial({
        color: 0xfbcfe8,
        metalness: 0.02,
        roughness: 0.75,
        wireframe: isWireframe
      });
    case 'missile_white':
      return new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.35,
        roughness: 0.28,
        wireframe: isWireframe
      });
    default:
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(defaultColor),
        metalness: 0.35,
        roughness: 0.35,
        wireframe: isWireframe
      });
  }
}

function resolveBlueprintPBR(part, isRealistic = true, isWireframe = false, fallbackColor = '#00f0ff') {
  if (!isRealistic) {
    const pColor = part.color ? new THREE.Color(part.color) : new THREE.Color(fallbackColor);
    return new THREE.MeshStandardMaterial({
      color: pColor,
      emissive: pColor.clone().multiplyScalar(0.65),
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.92,
      wireframe: isWireframe
    });
  }

  const name = (part.name || '').toLowerCase();
  const matType = (part.material || part.materialType || '').toLowerCase();
  let rawColor = part.color;
  if (!rawColor || rawColor === 'null' || rawColor === 'undefined' || (rawColor.toLowerCase() === '#00f0ff' && isRealistic)) {
    if (name.includes('eye') || name.includes('pupil')) {
      rawColor = '#f59e0b';
    } else if (name.includes('teeth') || name.includes('tooth') || name.includes('fang') || name.includes('claw') || name.includes('nail') || name.includes('bone')) {
      rawColor = '#f8fafc';
    } else if (name.includes('tongue') || name.includes('mouth') || name.includes('throat') || name.includes('gum')) {
      rawColor = '#be123c';
    } else if (name.includes('belly') || name.includes('chest') || name.includes('under')) {
      rawColor = '#d4a373';
    } else if (name.includes('ridge') || name.includes('spine') || name.includes('horn') || name.includes('spike') || name.includes('scute') || name.includes('brow')) {
      rawColor = '#1e300d';
    } else if (name.includes('snout') || name.includes('jaw') || name.includes('head') || name.includes('skull')) {
      rawColor = '#284410';
    } else if (name.includes('body') || name.includes('torso') || name.includes('thigh') || name.includes('leg') || name.includes('tail') || name.includes('shin') || name.includes('dino')) {
      rawColor = '#365314';
    } else if (name.includes('tire') || name.includes('wheel') || name.includes('rubber')) {
      rawColor = '#141416';
    } else if (name.includes('glass') || name.includes('window') || name.includes('visor')) {
      rawColor = '#7dd3fc';
    } else if (name.includes('metal') || name.includes('steel') || name.includes('chrome') || name.includes('armor')) {
      rawColor = '#94a3b8';
    } else if (name.includes('gold')) {
      rawColor = '#e5a93c';
    } else {
      rawColor = isRealistic ? '#475569' : fallbackColor;
    }
  }
  const color = new THREE.Color(rawColor);

  // 1. Strings / slender wires
  if (name.includes('string') || name.includes('wire') || name.includes('cable') || name.includes('spoke')) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'),
      metalness: 0.95,
      roughness: 0.15,
      wireframe: isWireframe
    });
  }

  // 2. Tuners / tuning pegs / knobs
  if (name.includes('tuner') || name.includes('peg') || name.includes('knob')) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      metalness: 0.92,
      roughness: 0.18,
      wireframe: isWireframe
    });
  }

  // 3. Soundhole / dark cavity
  if (name.includes('soundhole') || name.includes('hole') || name.includes('cavity')) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141416'),
      roughness: 0.96,
      metalness: 0.02,
      wireframe: isWireframe
    });
  }

  // 4. Glow / lights / core / thrusters
  if (matType === 'glow' || name.includes('light') || name.includes('glow') || name.includes('core') || name.includes('reactor') || name.includes('eye') || name.includes('laser') || name.includes('beam') || name.includes('flame') || name.includes('fire')) {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.1,
      wireframe: isWireframe
    });
  }

  // 5. Glass / visors / canopies
  if (matType === 'glass' || name.includes('glass') || name.includes('window') || name.includes('visor') || name.includes('canopy') || name.includes('windshield')) {
    return new THREE.MeshStandardMaterial({
      color: color.equals(new THREE.Color('#94a3b8')) ? new THREE.Color('#7dd3fc') : color,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      wireframe: isWireframe
    });
  }

  // 6. Rubber / tires
  if (matType === 'rubber' || name.includes('tire') || name.includes('wheel') || name.includes('tread') || name.includes('rubber') || name.includes('grip')) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141416'),
      roughness: 0.92,
      metalness: 0.05,
      wireframe: isWireframe
    });
  }

  // 7. Metal / chrome / blade / armor
  if (matType === 'metal' || name.includes('metal') || name.includes('steel') || name.includes('chrome') || name.includes('blade') || name.includes('armor') || name.includes('engine') || name.includes('barrel') || name.includes('rim') || name.includes('gold') || name.includes('silver') || name.includes('titanium')) {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.88,
      roughness: 0.22,
      wireframe: isWireframe
    });
  }

  // 8. Wood & Musical Instrument Components
  if (matType === 'wood' || name.includes('wood') || name.includes('timber') || name.includes('log') || name.includes('handle') || name.includes('trunk') || name.includes('fretboard') || name.includes('neck') || name.includes('bridge') || name.includes('headstock') || name.includes('bout') || name.includes('waist') || name.includes('rosette')) {
    return new THREE.MeshStandardMaterial({
      color: color.equals(new THREE.Color('#94a3b8')) ? new THREE.Color('#8b4513') : color,
      roughness: 0.65,
      metalness: 0.04,
      wireframe: isWireframe
    });
  }

  // 9. Stone & Bone
  if (matType === 'stone' || name.includes('stone') || name.includes('rock') || name.includes('brick') || name.includes('wall') || name.includes('concrete') || name.includes('bone') || name.includes('saddle')) {
    return new THREE.MeshStandardMaterial({
      color: color.equals(new THREE.Color('#94a3b8')) ? new THREE.Color('#64748b') : color,
      roughness: 0.85,
      metalness: 0.04,
      wireframe: isWireframe
    });
  }

  // 10. Paint / vehicle body
  if (matType === 'paint' || name.includes('body') || name.includes('hull') || name.includes('wing') || name.includes('fuselage')) {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.35,
      roughness: 0.2,
      wireframe: isWireframe
    });
  }

  // Default natural PBR
  return new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.25,
    roughness: 0.45,
    wireframe: isWireframe
  });
}

function createDogFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matFur = getProceduralMaterial('dog_fur', colorHex, isRealistic, isWireframe);
  const matNose = getProceduralMaterial('dog_nose', '#141416', isRealistic, isWireframe);
  const matCollar = getProceduralMaterial('leather_brown', '#78350f', isRealistic, isWireframe);
  const matTag = getProceduralMaterial('iron_gold', '#e5a93c', isRealistic, isWireframe);
  const matEye = getProceduralMaterial('dog_nose', '#0f172a', isRealistic, isWireframe);
  const matEarInner = getProceduralMaterial('dog_inner_ear', '#fbcfe8', isRealistic, isWireframe);
  const matChest = getProceduralMaterial('jet_body', '#f8fafc', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Ribcage, Torso & Flank (Anatomical canine curves)
  add(new THREE.CapsuleGeometry(0.48, 0.72, 8, 16), matFur, 0.35, 1.25, 0, 0, 0, Math.PI / 2 + 0.15);
  add(new THREE.SphereGeometry(0.38, 12, 12), matChest, 0.65, 1.28, 0, 0, 0, 0, 0.6, 1.1, 0.75); // Chest highlight
  add(new THREE.CapsuleGeometry(0.4, 0.55, 8, 14), matFur, -0.22, 1.22, 0, 0, 0, Math.PI / 2); // Tucked waist
  add(new THREE.CapsuleGeometry(0.44, 0.45, 8, 14), matFur, -0.62, 1.28, 0, 0, 0, Math.PI / 2 - 0.15); // Rump

  // 2. Neck & Head
  add(new THREE.CylinderGeometry(0.28, 0.38, 0.7, 12), matFur, 0.75, 1.62, 0, 0, 0, -Math.PI / 5);
  add(new THREE.SphereGeometry(0.34, 16, 16), matFur, 1.05, 1.95, 0, 0, 0, 0, 1.05, 0.95, 0.9); // Cranium
  add(new THREE.SphereGeometry(0.24, 12, 12), matFur, 1.25, 1.95, 0, 0, 0, 0, 1.1, 0.8, 0.75); // Stop
  add(new THREE.CylinderGeometry(0.14, 0.22, 0.46, 12), matFur, 1.48, 1.82, 0, 0, 0, -Math.PI / 2); // Muzzle
  add(new THREE.BoxGeometry(0.38, 0.1, 0.22), matFur, 1.42, 1.73, 0); // Lower jaw
  add(new THREE.SphereGeometry(0.08, 12, 12), matNose, 1.72, 1.84, 0, 0, 0, 0, 0.8, 1, 1.2); // Nose

  // Eyes & Brow
  [-0.18, 0.18].forEach(z => {
    add(new THREE.SphereGeometry(0.05, 10, 10), matEye, 1.22, 2.02, z);
    add(new THREE.SphereGeometry(0.02, 6, 6), matChest, 1.25, 2.04, z + (z > 0 ? -0.01 : 0.01));
    add(new THREE.BoxGeometry(0.12, 0.04, 0.08), matFur, 1.18, 2.08, z, 0, z > 0 ? -0.2 : 0.2, 0);
  });

  // Shepherd alert ears
  [-0.24, 0.24].forEach(z => {
    add(new THREE.ConeGeometry(0.16, 0.44, 4), matFur, 0.95, 2.32, z, z > 0 ? -0.25 : 0.25, 0, -0.2);
    add(new THREE.ConeGeometry(0.12, 0.38, 4), matEarInner, 0.98, 2.32, z, z > 0 ? -0.25 : 0.25, 0, -0.2);
  });

  // 3. Front Legs & Paws
  [-0.32, 0.32].forEach(z => {
    add(new THREE.CapsuleGeometry(0.14, 0.35, 6, 12), matFur, 0.52, 1.05, z, 0, 0, 0.2);
    add(new THREE.CapsuleGeometry(0.09, 0.65, 6, 10), matFur, 0.56, 0.52, z);
    add(new THREE.BoxGeometry(0.24, 0.09, 0.2), matFur, 0.62, 0.05, z);
    [-0.06, 0, 0.06].forEach(tz => {
      add(new THREE.SphereGeometry(0.04, 8, 8), matFur, 0.74, 0.04, z + tz);
    });
  });

  // 4. Hind Legs (Muscular thigh -> Stifle -> Hock -> Paw)
  [-0.34, 0.34].forEach(z => {
    add(new THREE.CapsuleGeometry(0.2, 0.42, 6, 12), matFur, -0.55, 0.98, z, 0, 0, -0.42);
    add(new THREE.CapsuleGeometry(0.11, 0.48, 6, 10), matFur, -0.68, 0.58, z, 0, 0, 0.38);
    add(new THREE.CapsuleGeometry(0.08, 0.35, 6, 10), matFur, -0.74, 0.25, z);
    add(new THREE.BoxGeometry(0.22, 0.09, 0.18), matFur, -0.7, 0.05, z);
  });

  // 5. Tail (Curved TubeGeometry)
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.82, 1.35, 0),
    new THREE.Vector3(-1.15, 1.48, 0),
    new THREE.Vector3(-1.42, 1.72, 0.05),
    new THREE.Vector3(-1.38, 1.95, -0.02)
  ]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 16, 0.075, 8, false), matFur);
  tailMesh.castShadow = true;
  group.add(tailMesh);

  // 6. Leather Collar & Gold ID Tag
  add(new THREE.TorusGeometry(0.32, 0.04, 8, 20), matCollar, 0.88, 1.74, 0, 0, Math.PI / 2, 0.4);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 14), matTag, 0.96, 1.55, 0, 0, 0, Math.PI / 2);

  return group;
}

function createCatFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matFur = getProceduralMaterial('cat_fur', colorHex, isRealistic, isWireframe);
  const matEye = getProceduralMaterial('cat_eye', '#10b981', isRealistic, isWireframe);
  const matNose = getProceduralMaterial('dog_inner_ear', '#fbcfe8', isRealistic, isWireframe);
  const matWhite = getProceduralMaterial('jet_body', '#f8fafc', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Sleek Feline Body (Arched supple spine & waist)
  add(new THREE.CapsuleGeometry(0.32, 0.65, 8, 16), matFur, 0.22, 1.15, 0, 0, 0, Math.PI / 2 + 0.12);
  add(new THREE.SphereGeometry(0.26, 12, 12), matWhite, 0.46, 1.14, 0, 0, 0, 0, 0.6, 1.0, 0.8); // White chest bib
  add(new THREE.CapsuleGeometry(0.28, 0.5, 8, 14), matFur, -0.32, 1.18, 0, 0, 0, Math.PI / 2 - 0.1); // Arched back

  // 2. Sculpted Feline Head & Whisker Pads
  add(new THREE.CylinderGeometry(0.18, 0.24, 0.45, 12), matFur, 0.52, 1.42, 0, 0, 0, -Math.PI / 5); // Neck
  add(new THREE.SphereGeometry(0.28, 16, 16), matFur, 0.78, 1.62, 0, 0, 0, 0, 1.0, 0.92, 0.95); // Head cranium
  // Whisker cheek tufts
  [-0.1, 0.1].forEach(z => {
    add(new THREE.SphereGeometry(0.1, 10, 10), matWhite, 0.98, 1.54, z, 0, 0, 0, 1.1, 0.8, 1.0);
  });
  add(new THREE.SphereGeometry(0.04, 10, 10), matNose, 1.06, 1.58, 0); // Delicate nose

  // Emerald almond eyes with pupil depth
  [-0.12, 0.12].forEach(z => {
    add(new THREE.SphereGeometry(0.055, 12, 12), matEye, 0.94, 1.68, z);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), matFur, 0.98, 1.68, z); // Vertical pupil
  });

  // Tall triangular ears
  [-0.16, 0.16].forEach(z => {
    add(new THREE.ConeGeometry(0.12, 0.32, 4), matFur, 0.74, 1.95, z, z > 0 ? -0.2 : 0.2, 0, -0.15);
    add(new THREE.ConeGeometry(0.08, 0.26, 4), matNose, 0.76, 1.95, z, z > 0 ? -0.2 : 0.2, 0, -0.15);
  });

  // 3. Limbs & Delicate Paws
  [-0.22, 0.22].forEach(z => {
    add(new THREE.CapsuleGeometry(0.07, 0.55, 6, 10), matFur, 0.42, 0.52, z);
    add(new THREE.SphereGeometry(0.08, 8, 8), matWhite, 0.46, 0.05, z, 0, 0, 0, 1.2, 0.6, 1.0); // Paws
  });

  // Crouch hindquarters
  [-0.24, 0.24].forEach(z => {
    add(new THREE.CapsuleGeometry(0.14, 0.35, 6, 12), matFur, -0.42, 0.92, z, 0, 0, -0.45);
    add(new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), matFur, -0.52, 0.52, z, 0, 0, 0.4);
    add(new THREE.SphereGeometry(0.08, 8, 8), matWhite, -0.56, 0.05, z, 0, 0, 0, 1.2, 0.6, 1.0);
  });

  // 4. Long Graceful S-Curved Tail
  const catTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 1.25, 0),
    new THREE.Vector3(-0.92, 1.38, 0.08),
    new THREE.Vector3(-1.18, 1.72, 0.04),
    new THREE.Vector3(-1.12, 2.05, -0.06),
    new THREE.Vector3(-0.95, 2.15, -0.04)
  ]);
  const catTailMesh = new THREE.Mesh(new THREE.TubeGeometry(catTailCurve, 24, 0.055, 8, false), matFur);
  catTailMesh.castShadow = true;
  group.add(catTailMesh);

  return group;
}

function createIronManFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matArmor = getProceduralMaterial('iron_armor', colorHex, isRealistic, isWireframe);
  const matGold = getProceduralMaterial('iron_gold', '#e5a93c', isRealistic, isWireframe);
  const matArc = getProceduralMaterial('arc_glow', '#ffffff', isRealistic, isWireframe);
  const matCarbon = getProceduralMaterial('drone_carbon', '#1e293b', isRealistic, isWireframe);
  const matSteel = getProceduralMaterial('blade_steel', '#94a3b8', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Sculpted Helmet
  add(new THREE.SphereGeometry(0.28, 16, 16), matArmor, 0, 2.76, 0, 0, 0, 0, 0.95, 1.15, 1.0);
  add(new THREE.BoxGeometry(0.34, 0.28, 0.44), matArmor, -0.06, 2.65, 0);
  add(new THREE.BoxGeometry(0.18, 0.38, 0.36), matGold, 0.16, 2.72, 0, 0, 0, -0.12);
  add(new THREE.BoxGeometry(0.14, 0.18, 0.32), matGold, 0.22, 2.58, 0);
  [-0.1, 0.1].forEach(z => {
    add(new THREE.BoxGeometry(0.08, 0.035, 0.1), matArc, 0.26, 2.78, z, 0, z > 0 ? -0.15 : 0.15, -0.12);
    add(new THREE.BoxGeometry(0.06, 0.055, 0.12), matCarbon, 0.24, 2.78, z, 0, z > 0 ? -0.15 : 0.15, -0.12);
  });

  // 2. Torso, Pectoral Plates & Arc Reactor
  [-0.22, 0.22].forEach(z => {
    add(new THREE.BoxGeometry(0.42, 0.46, 0.34), matArmor, 0.1, 2.12, z, 0, z > 0 ? 0.15 : -0.15, -0.12);
    add(new THREE.BoxGeometry(0.12, 0.38, 0.24), matGold, 0.26, 2.12, z, 0, z > 0 ? 0.15 : -0.15, -0.12);
  });
  add(new THREE.BoxGeometry(0.44, 0.62, 0.68), matArmor, -0.14, 2.05, 0); // Back armor shell
  [-0.22, 0.22].forEach(z => {
    add(new THREE.BoxGeometry(0.12, 0.24, 0.16), matGold, -0.32, 2.18, z, 0, 0, 0.2); // Dorsal flaps
  });

  add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 24), matSteel, 0.3, 2.12, 0, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 16), matArc, 0.31, 2.12, 0, 0, 0, Math.PI / 2);

  // 3-tier articulated abdominal plates
  [
    { y: 1.76, s: 1.0, mat: matGold },
    { y: 1.58, s: 0.92, mat: matArmor },
    { y: 1.42, s: 0.86, mat: matCarbon }
  ].forEach(ab => {
    add(new THREE.BoxGeometry(0.38 * ab.s, 0.14, 0.52 * ab.s), ab.mat, 0.04, ab.y, 0);
  });

  add(new THREE.BoxGeometry(0.42, 0.26, 0.54), matArmor, 0, 1.25, 0); // Codpiece
  add(new THREE.BoxGeometry(0.12, 0.22, 0.22), matGold, 0.18, 1.25, 0);

  // 3. Deltoids, Arms & Palm Repulsors
  [-0.48, 0.48].forEach(z => {
    add(new THREE.SphereGeometry(0.24, 12, 12), matArmor, 0, 2.22, z, 0, 0, 0, 1.1, 0.8, 1.1); // Pauldron
    add(new THREE.BoxGeometry(0.22, 0.12, 0.28), matGold, 0.06, 2.26, z);
    add(new THREE.SphereGeometry(0.12, 10, 10), matCarbon, 0, 2.05, z);
    add(new THREE.CapsuleGeometry(0.12, 0.34, 6, 12), matArmor, 0, 1.72, z); // Bicep
    add(new THREE.BoxGeometry(0.14, 0.22, 0.08), matGold, 0.08, 1.72, z);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), matSteel, 0, 1.45, z, Math.PI / 2, 0, 0);
    add(new THREE.CapsuleGeometry(0.13, 0.38, 6, 12), matArmor, 0.04, 1.18, z); // Forearm
    add(new THREE.BoxGeometry(0.12, 0.28, 0.09), matGold, 0.14, 1.18, z);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.12), matArmor, 0.04, 0.92, z); // Hand
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), matArc, 0.04, 0.84, z); // Repulsor palm
  });

  // 4. Legs, Kneepads & Thruster Boots
  [-0.24, 0.24].forEach(z => {
    add(new THREE.SphereGeometry(0.14, 10, 10), matCarbon, 0, 1.18, z);
    add(new THREE.CapsuleGeometry(0.16, 0.44, 6, 12), matArmor, 0.02, 0.88, z);
    add(new THREE.BoxGeometry(0.14, 0.34, 0.08), matGold, 0.02, 0.88, z * 1.62);
    add(new THREE.BoxGeometry(0.16, 0.14, 0.18), matGold, 0.14, 0.58, z);
    add(new THREE.CapsuleGeometry(0.15, 0.42, 6, 12), matArmor, 0, 0.32, z);
    add(new THREE.BoxGeometry(0.12, 0.28, 0.14), matCarbon, -0.12, 0.35, z);
    add(new THREE.BoxGeometry(0.38, 0.12, 0.24), matArmor, 0.08, 0.06, z);
    add(new THREE.BoxGeometry(0.14, 0.06, 0.16), matGold, 0.18, 0.08, z);
    add(new THREE.BoxGeometry(0.22, 0.02, 0.12), matArc, 0.06, 0.01, z);
  });

  return group;
}

function createDroneFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matBody = getProceduralMaterial('drone_carbon', '#18181b', isRealistic, isWireframe);
  const matArm = getProceduralMaterial('alloy_silver', '#94a3b8', isRealistic, isWireframe);
  const matRotor = getProceduralMaterial('heli_body', colorHex || '#0284c7', isRealistic, isWireframe);
  const matSensor = getProceduralMaterial('arc_glow', '#00f0ff', isRealistic, isWireframe);
  const matLens = getProceduralMaterial('car_glass', '#0f172a', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Aerodynamic Fuselage & Top GPS Satellite Dome
  add(new THREE.CapsuleGeometry(0.42, 0.85, 8, 16), matBody, 0, 1.25, 0, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.28, 0.38, 0.15, 16), matArm, 0, 1.5, 0); // CNC top mount
  add(new THREE.SphereGeometry(0.2, 16, 16), matBody, 0, 1.56, 0); // GPS dome
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), matSensor, 0, 1.66, 0); // Status beacon

  // 4 Diagonal Carbon Fiber Boom Arms with CNC Motor Mounts
  const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  armAngles.forEach((ang) => {
    const rx = Math.cos(ang) * 1.5;
    const rz = Math.sin(ang) * 1.5;
    add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), matArm, rx / 2, 1.25, rz / 2, Math.PI / 2, 0, -ang);
    // CNC Motor housing
    add(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 14), matBody, rx, 1.28, rz);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12), matArm, rx, 1.42, rz); // Motor bell
    // Dual Aerodynamic Propeller Blades
    const propGroup = new THREE.Group();
    propGroup.position.set(rx, 1.48, rz);
    [-0.45, 0.45].forEach((offset) => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.015, 0.08), matRotor);
      blade.position.x = offset / 2;
      blade.rotation.z = offset > 0 ? 0.08 : -0.08;
      blade.castShadow = true;
      propGroup.add(blade);
    });
    group.add(propGroup);

    // Motor navigation LED
    add(new THREE.SphereGeometry(0.035, 8, 8), matSensor, rx, 1.18, rz);
  });

  // 3-Axis Motorized Camera Gimbal & 4K Lens
  add(new THREE.SphereGeometry(0.12, 12, 12), matArm, 0.35, 1.05, 0); // Gimbal yaw motor
  add(new THREE.BoxGeometry(0.24, 0.22, 0.24), matBody, 0.52, 0.98, 0); // Camera body
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 16), matArm, 0.68, 0.98, 0, 0, 0, Math.PI / 2); // Lens barrel
  add(new THREE.SphereGeometry(0.09, 12, 12), matLens, 0.74, 0.98, 0); // Optical glass element

  // Carbon Landing Gear Struts
  [-0.55, 0.55].forEach(z => {
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), matArm, 0.25, 0.8, z, 0.3 * (z > 0 ? 1 : -1), 0, -0.2);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), matArm, -0.25, 0.8, z, 0.3 * (z > 0 ? 1 : -1), 0, 0.2);
    add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), matBody, 0, 0.44, z, Math.PI / 2, 0, 0); // Ground skid
  });

  return group;
}

function createCarFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matPaint = getProceduralMaterial('car_paint', colorHex, isRealistic, isWireframe);
  const matGlass = getProceduralMaterial('car_glass', '#0f172a', isRealistic, isWireframe);
  const matTire = getProceduralMaterial('rubber_tire', '#111114', isRealistic, isWireframe);
  const matAlloy = getProceduralMaterial('alloy_silver', '#d4d4d8', isRealistic, isWireframe);
  const matLight = getProceduralMaterial('headlight_led', '#ffffff', isRealistic, isWireframe);
  const matTail = getProceduralMaterial('taillight_red', '#ef4444', isRealistic, isWireframe);
  const matCarbon = getProceduralMaterial('drone_carbon', '#18181b', isRealistic, isWireframe);
  const matBrake = getProceduralMaterial('brake_caliper', '#ef4444', isRealistic, isWireframe);
  const matDisc = getProceduralMaterial('brake_disc', '#94a3b8', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Aerodynamic Floor & Rear Diffuser with 4 vertical fins
  add(new THREE.BoxGeometry(3.6, 0.12, 1.62), matCarbon, 0, 0.22, 0);
  add(new THREE.BoxGeometry(0.8, 0.08, 1.7), matCarbon, 1.5, 0.2, 0); // Front splitter
  add(new THREE.BoxGeometry(0.6, 0.18, 1.65), matCarbon, -1.58, 0.26, 0); // Rear diffuser
  [-0.45, -0.15, 0.15, 0.45].forEach(z => {
    add(new THREE.BoxGeometry(0.5, 0.12, 0.04), matCarbon, -1.6, 0.28, z);
  });

  // 2. Sculpted Supercar Bodywork
  add(new THREE.BoxGeometry(1.6, 0.38, 1.6), matPaint, 0, 0.44, 0); // Mid body
  add(new THREE.BoxGeometry(1.15, 0.28, 1.52), matPaint, 1.05, 0.42, 0, 0, 0, -0.09); // Sloped hood
  add(new THREE.BoxGeometry(0.42, 0.24, 1.48), matPaint, 1.62, 0.33, 0); // Nose
  add(new THREE.BoxGeometry(0.08, 0.16, 1.15), matCarbon, 1.83, 0.31, 0); // Grille
  add(new THREE.BoxGeometry(1.1, 0.36, 1.56), matPaint, -1.05, 0.49, 0, 0, 0, 0.04); // Rear deck

  // Engine heat louvers
  for (let i = -0.6; i <= -0.1; i += 0.15) {
    add(new THREE.BoxGeometry(0.08, 0.04, 0.85), matCarbon, i, 0.69, 0);
  }

  // Fenders & Side Intakes
  [-0.78, 0.78].forEach(z => {
    add(new THREE.BoxGeometry(0.72, 0.34, 0.18), matPaint, 1.0, 0.47, z); // Front arches
    add(new THREE.BoxGeometry(0.75, 0.38, 0.2), matPaint, -0.95, 0.51, z); // Rear haunches
    add(new THREE.BoxGeometry(0.45, 0.22, 0.1), matCarbon, -0.38, 0.42, z * 0.94); // Side intake
    add(new THREE.BoxGeometry(0.12, 0.06, 0.14), matPaint, 0.45, 0.74, z * 0.74); // Aero mirror
    add(new THREE.BoxGeometry(0.02, 0.05, 0.1), matAlloy, 0.43, 0.74, z * 0.74);
  });

  // 3. Greenhouse (Cockpit & Raked Glass)
  add(new THREE.BoxGeometry(0.75, 0.06, 1.12), matGlass, 0.42, 0.76, 0, 0, 0, -0.52); // Windshield
  add(new THREE.BoxGeometry(0.72, 0.06, 1.04), matPaint, -0.02, 0.94, 0); // Roof
  add(new THREE.BoxGeometry(0.85, 0.06, 0.96), matGlass, -0.55, 0.8, 0, 0, 0, 0.42); // Fastback glass
  [-0.53, 0.53].forEach(z => {
    add(new THREE.BoxGeometry(0.78, 0.28, 0.04), matGlass, -0.02, 0.78, z);
    add(new THREE.BoxGeometry(0.06, 0.36, 0.06), matPaint, 0.42, 0.76, z, 0, 0, -0.52);
    add(new THREE.BoxGeometry(0.06, 0.38, 0.06), matPaint, -0.52, 0.78, z, 0, 0, 0.42);
  });

  // 4. Wheels, 5-Spoke Alloys & Brake Calipers
  const wheelConfig = [
    { x: 1.05, z: 0.82, w: 0.24, r: 0.36 },
    { x: 1.05, z: -0.82, w: 0.24, r: 0.36 },
    { x: -1.02, z: 0.84, w: 0.28, r: 0.38 },
    { x: -1.02, z: -0.84, w: 0.28, r: 0.38 }
  ];

  wheelConfig.forEach(wc => {
    add(new THREE.CylinderGeometry(wc.r, wc.r, wc.w, 24), matTire, wc.x, wc.r, wc.z, Math.PI / 2, 0, 0);
    add(new THREE.CylinderGeometry(wc.r * 0.72, wc.r * 0.72, wc.w + 0.01, 20), matAlloy, wc.x, wc.r, wc.z, Math.PI / 2, 0, 0);
    add(new THREE.CylinderGeometry(0.09, 0.09, wc.w + 0.03, 12), matCarbon, wc.x, wc.r, wc.z, Math.PI / 2, 0, 0);
    for (let s = 0; s < 5; s++) {
      const ang = (s / 5) * Math.PI * 2;
      const spokeLength = wc.r * 0.65;
      add(new THREE.BoxGeometry(0.04, spokeLength, 0.03), matAlloy,
        wc.x + Math.sin(ang) * (spokeLength / 2),
        wc.r + Math.cos(ang) * (spokeLength / 2),
        wc.z + (wc.z > 0 ? (wc.w / 2) : -(wc.w / 2)),
        0, 0, -ang
      );
    }
    add(new THREE.CylinderGeometry(wc.r * 0.58, wc.r * 0.58, 0.04, 16), matDisc, wc.x, wc.r, wc.z * 0.88, Math.PI / 2, 0, 0);
    add(new THREE.BoxGeometry(0.12, 0.16, 0.08), matBrake, wc.x, wc.r + wc.r * 0.3, wc.z * 0.88);
  });

  // 5. Angular LED Headlights & Rear OLED Lightbar
  [-0.56, 0.56].forEach(z => {
    add(new THREE.BoxGeometry(0.22, 0.08, 0.28), matLight, 1.62, 0.44, z, 0, 0.22 * (z > 0 ? -1 : 1), -0.15);
  });
  add(new THREE.BoxGeometry(0.06, 0.08, 1.42), matTail, -1.82, 0.55, 0);

  // 6. Quad Chrome Exhaust Tips
  [-0.42, -0.32, 0.32, 0.42].forEach(z => {
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12), matAlloy, -1.82, 0.28, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), matCarbon, -1.82, 0.28, z, 0, 0, Math.PI / 2);
  });

  // 7. Carbon Fiber Rear Spoiler Wing
  add(new THREE.BoxGeometry(0.32, 0.04, 1.65), matCarbon, -1.68, 0.86, 0);
  [-0.82, 0.82].forEach(z => {
    add(new THREE.BoxGeometry(0.42, 0.14, 0.03), matCarbon, -1.68, 0.86, z);
  });
  [-0.38, 0.38].forEach(z => {
    add(new THREE.BoxGeometry(0.18, 0.28, 0.04), matCarbon, -1.55, 0.74, z, 0, 0, 0.3);
  });

  return group;
}

function createHelicopterFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matBody = getProceduralMaterial('heli_body', colorHex, isRealistic, isWireframe);
  const matGlass = getProceduralMaterial('car_glass', '#0f172a', isRealistic, isWireframe);
  const matBlack = getProceduralMaterial('drone_carbon', '#111827', isRealistic, isWireframe);
  const matSteel = getProceduralMaterial('blade_steel', '#94a3b8', isRealistic, isWireframe);
  const matMissile = getProceduralMaterial('missile_white', '#f1f5f9', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Fuselage & Stepped Tandem Cockpit
  add(new THREE.CapsuleGeometry(0.58, 1.8, 8, 16), matBody, 0.15, 1.35, 0, 0, 0, Math.PI / 2);
  add(new THREE.ConeGeometry(0.52, 1.1, 16), matBody, 1.55, 1.35, 0, 0, 0, -Math.PI / 2); // Pointed nose
  add(new THREE.BoxGeometry(1.2, 0.48, 0.68), matGlass, 0.85, 1.62, 0, 0, 0, -0.22); // Tandem canopy

  // 2. Chin Cannon & Electro-Optical FLIR Turret
  add(new THREE.SphereGeometry(0.18, 14, 14), matBlack, 1.85, 1.15, 0); // FLIR ball
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 10), matSteel, 1.45, 0.95, 0, 0, 0, Math.PI / 2); // 30mm gun barrel
  add(new THREE.BoxGeometry(0.24, 0.18, 0.16), matBlack, 1.05, 0.95, 0); // Gun mount

  // 3. Main Rotor Mast, Longbow Radar & 4 Airfoil Blades
  add(new THREE.CylinderGeometry(0.12, 0.16, 0.65, 12), matSteel, 0.1, 2.05, 0); // Mast
  add(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 20), matBlack, 0.1, 2.52, 0); // Longbow radar disc
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0.1, 2.38, 0);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.035, 0.18), matBlack);
    b.position.x = 1.4;
    b.rotation.y = (i * Math.PI) / 2;
    b.castShadow = true;
    bladeGroup.add(b);
  }
  group.add(bladeGroup);

  // 4. Twin Turboshaft Engines with Upward IR Suppressors
  [-0.45, 0.45].forEach(z => {
    add(new THREE.CapsuleGeometry(0.25, 1.1, 6, 12), matBody, 0, 1.72, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.16, 0.22, 0.35, 12), matBlack, -0.55, 1.88, z, 0.2 * (z > 0 ? 1 : -1), 0, 0);
  });

  // 5. Weapon Wings with Rocket Pods & Hellfire Missiles
  [-0.95, 0.95].forEach(z => {
    add(new THREE.BoxGeometry(0.38, 0.08, 0.9), matBody, 0.3, 1.35, z / 2); // Stub wing
    // Hydra 70 rocket pod
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.85, 12), matBlack, 0.3, 1.15, z * 0.8, 0, 0, Math.PI / 2);
    // Quad Hellfire missile rack
    [-0.1, 0.1].forEach(mz => {
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), matMissile, 0.3, 0.98, z * 0.8 + mz, 0, 0, Math.PI / 2);
    });
  });

  // 6. Tail Boom, Fin & 4-Blade Tail Rotor
  add(new THREE.CylinderGeometry(0.16, 0.38, 3.2, 12), matBody, -2.1, 1.42, 0, 0, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(0.55, 1.05, 0.08), matBody, -3.6, 1.85, 0, 0, 0, 0.3); // Vertical fin
  add(new THREE.BoxGeometry(0.28, 0.06, 1.1), matBody, -3.3, 1.5, 0); // Horizontal stabilizer
  // Tail rotor
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.1), matBlack);
  tailRotor.position.set(-3.7, 1.85, 0.12);
  tailRotor.castShadow = true;
  group.add(tailRotor);

  // 7. Tubular Landing Gear Skids
  [-0.58, 0.58].forEach(z => {
    add(new THREE.CylinderGeometry(0.055, 0.055, 2.6, 10), matBlack, 0.2, 0.32, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), matBlack, 0.85, 0.8, z * 0.75, 0, 0, -0.35);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), matBlack, -0.45, 0.8, z * 0.75, 0, 0, 0.35);
  });

  return group;
}

function createAirplaneFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matBody = getProceduralMaterial('jet_body', colorHex, isRealistic, isWireframe);
  const matGlass = getProceduralMaterial('car_glass', '#0f172a', isRealistic, isWireframe);
  const matAfterburner = getProceduralMaterial('afterburner', '#f97316', isRealistic, isWireframe);
  const matEngine = getProceduralMaterial('drone_carbon', '#1e293b', isRealistic, isWireframe);
  const matMissile = getProceduralMaterial('missile_white', '#f1f5f9', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Chined Stealth Fuselage & Radome Nose
  add(new THREE.CapsuleGeometry(0.48, 2.8, 8, 16), matBody, 0, 1.25, 0, 0, 0, Math.PI / 2);
  add(new THREE.ConeGeometry(0.46, 1.4, 16), matBody, 2.1, 1.25, 0, 0, 0, -Math.PI / 2); // Radome
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), matEngine, 2.9, 1.25, 0, 0, 0, -Math.PI / 2); // Pitot tube
  add(new THREE.SphereGeometry(0.34, 16, 16), matGlass, 1.15, 1.58, 0, 0, 0, 0, 1.8, 0.75, 0.85); // Canopy

  // 2. Swept Delta Wings with LERX (Leading Edge Root Extensions)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.8, 0);
  wingShape.lineTo(-1.4, -2.8);
  wingShape.lineTo(-2.1, -2.8);
  wingShape.lineTo(-1.6, 0);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
  add(wingGeo, matBody, 0.5, 1.22, 0, Math.PI / 2, 0, 0);
  add(wingGeo, matBody, 0.5, 1.22, 0, -Math.PI / 2, 0, 0);

  // 3. Twin Canted Vertical Stabilizers (28 degree stealth cant)
  [-0.68, 0.68].forEach(z => {
    add(new THREE.BoxGeometry(0.95, 1.1, 0.05), matBody, -1.5, 1.82, z, z > 0 ? 0.42 : -0.42, 0, 0.3);
    add(new THREE.BoxGeometry(0.72, 0.05, 0.85), matBody, -1.6, 1.25, z * 1.5, 0, 0, -0.1); // Stabilators
  });

  // 4. Twin Vectoring Engine Nozzles with Glowing Afterburners
  [-0.38, 0.38].forEach(z => {
    add(new THREE.CylinderGeometry(0.24, 0.28, 1.1, 14), matEngine, -0.85, 1.18, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.21, 0.21, 0.15, 14), matAfterburner, -1.45, 1.18, z, 0, 0, Math.PI / 2);
  });

  // 5. Wingtip Missile Rails with AIM-9 Sidewinders
  [-2.8, 2.8].forEach(z => {
    add(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), matMissile, -0.6, 1.18, z, 0, 0, Math.PI / 2);
  });

  return group;
}

function createSwordFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matSteel = getProceduralMaterial('blade_steel', '#e2e8f0', isRealistic, isWireframe);
  const matPlasma = getProceduralMaterial('plasma_beam', colorHex, isRealistic, isWireframe);
  const matGrip = getProceduralMaterial('leather_brown', '#78350f', isRealistic, isWireframe);
  const matGold = getProceduralMaterial('iron_gold', '#e5a93c', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Ribbed Leather Hilt with Brass Spacers
  add(new THREE.CylinderGeometry(0.08, 0.09, 1.05, 14), matGrip, 0, 0.65, 0);
  for (let y = 0.25; y <= 1.05; y += 0.2) {
    add(new THREE.TorusGeometry(0.085, 0.015, 8, 16), matGold, 0, y, 0, Math.PI / 2, 0, 0);
  }

  // Faceted Octagonal Pommel & Counterweight
  add(new THREE.DodecahedronGeometry(0.16, 0), matGold, 0, 0.12, 0);

  // Ornate Swept Crossguard with Central Jewel
  add(new THREE.BoxGeometry(0.14, 0.16, 1.35), matGold, 0, 1.22, 0);
  [-0.65, 0.65].forEach(z => {
    add(new THREE.ConeGeometry(0.1, 0.35, 6), matGold, 0, 1.32, z, 0, 0, z > 0 ? -0.5 : 0.5);
  });
  add(new THREE.SphereGeometry(0.06, 12, 12), matPlasma, 0.08, 1.22, 0); // Sapphire gem

  // Double-Edged Forged Steel Blade with Fuller Groove
  add(new THREE.BoxGeometry(0.06, 2.6, 0.32), isRealistic ? matSteel : matPlasma, 0, 2.55, 0);
  add(new THREE.ConeGeometry(0.16, 0.55, 4), isRealistic ? matSteel : matPlasma, 0, 4.1, 0, 0, Math.PI / 4, 0); // Needle tip
  add(new THREE.BoxGeometry(0.075, 2.4, 0.06), matPlasma, 0, 2.48, 0); // Runic core glow

  return group;
}

function createSpaceshipFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matHull = getProceduralMaterial('spaceship_hull', colorHex, isRealistic, isWireframe);
  const matCanopy = getProceduralMaterial('car_glass', '#0f172a', isRealistic, isWireframe);
  const matIon = getProceduralMaterial('plasma_beam', '#00f0ff', isRealistic, isWireframe);
  const matEngine = getProceduralMaterial('drone_carbon', '#0f172a', isRealistic, isWireframe);
  const matAlloy = getProceduralMaterial('blade_steel', '#94a3b8', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Forward-Swept Armored Hull
  add(new THREE.ConeGeometry(1.35, 3.4, 4), matHull, 0, 1.35, 0, Math.PI / 4, 0, -Math.PI / 2);
  add(new THREE.BoxGeometry(1.8, 0.42, 1.6), matHull, -0.6, 1.35, 0); // Main fuselage
  add(new THREE.SphereGeometry(0.38, 16, 16), matCanopy, 0.82, 1.52, 0, 0, 0, 0, 1.7, 0.65, 0.8); // Command bridge

  // Twin Outrigger Warp Nacelles on Swept Pylons
  [-1.15, 1.15].forEach(z => {
    add(new THREE.BoxGeometry(0.38, 0.08, 0.9), matHull, -0.6, 1.35, z / 2, 0, 0, 0.2); // Pylon
    add(new THREE.CapsuleGeometry(0.24, 1.8, 8, 14), matEngine, -0.7, 1.42, z, 0, 0, Math.PI / 2); // Nacelle
    add(new THREE.BoxGeometry(0.08, 0.12, 1.2), matIon, -0.7, 1.55, z, 0, Math.PI / 2, 0); // Warp glow strip
  });

  // Stern Heavy Ion Propulsion Bank
  [-0.45, 0.45].forEach(z => {
    add(new THREE.CylinderGeometry(0.26, 0.38, 0.65, 16), matEngine, -1.65, 1.35, z, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), matIon, -1.95, 1.35, z, 0, 0, Math.PI / 2); // Thruster bell glow
  });

  // Dorsal Shield Deflector & Armor Plating
  add(new THREE.SphereGeometry(0.28, 12, 12), matAlloy, -0.4, 1.72, 0, 0, 0, 0, 1, 0.4, 1);

  return group;
}

function createDuckFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matBody = getProceduralMaterial('duck_yellow', '#facc15', isRealistic, isWireframe);
  const matBeak = getProceduralMaterial('duck_orange', '#ea580c', isRealistic, isWireframe);
  const matEye = getProceduralMaterial('dog_nose', '#0f172a', isRealistic, isWireframe);
  const matCatch = getProceduralMaterial('jet_body', '#ffffff', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Plump Waterfowl Body & Curved Breast
  add(new THREE.SphereGeometry(0.85, 16, 16), matBody, 0, 1.05, 0, 0, 0, 0, 1.38, 0.95, 1.05);
  add(new THREE.CylinderGeometry(0.28, 0.38, 0.65, 12), matBody, 0.58, 1.48, 0, 0, 0, -0.35); // Arched neck
  add(new THREE.SphereGeometry(0.44, 16, 16), matBody, 0.78, 1.82, 0, 0, 0, 0, 1.05, 0.95, 0.9); // Head

  // Sculpted Duck Bill with Nostrils
  add(new THREE.BoxGeometry(0.52, 0.12, 0.32), matBeak, 1.25, 1.75, 0);
  add(new THREE.BoxGeometry(0.48, 0.08, 0.28), matBeak, 1.22, 1.68, 0);
  [-0.07, 0.07].forEach(z => {
    add(new THREE.SphereGeometry(0.015, 6, 6), matEye, 1.15, 1.82, z); // Nostrils
    add(new THREE.SphereGeometry(0.055, 10, 10), matEye, 0.92, 1.95, z * 2.8); // Eyes
    add(new THREE.SphereGeometry(0.02, 6, 6), matCatch, 0.94, 1.97, z * 2.8 + (z > 0 ? -0.01 : 0.01));
  });

  // Layered Wings & Upturned Tail
  [-0.82, 0.82].forEach(z => {
    add(new THREE.CapsuleGeometry(0.32, 0.75, 6, 12), matBody, -0.15, 1.15, z, 0, 0, 0.2);
  });
  add(new THREE.ConeGeometry(0.32, 0.65, 4), matBody, -1.18, 1.32, 0, 0, 0, -Math.PI / 3); // Tail feathers

  // Webbed Feet
  [-0.32, 0.32].forEach(z => {
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), matBeak, 0, 0.2, z);
    add(new THREE.BoxGeometry(0.35, 0.04, 0.28), matBeak, 0.12, 0.03, z);
  });

  return group;
}

function createCyberArtifactFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matCore = getProceduralMaterial('iron_gold', '#e5a93c', isRealistic, isWireframe);
  const matRing1 = getProceduralMaterial('blade_steel', '#e2e8f0', isRealistic, isWireframe);
  const matRing2 = getProceduralMaterial('arc_glow', colorHex || '#00f0ff', isRealistic, isWireframe);
  const matPrism = getProceduralMaterial('car_glass', '#38bdf8', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Floating Faceted Dodecahedron Relic Core
  add(new THREE.DodecahedronGeometry(0.85, 0), matCore, 0, 1.45, 0);
  add(new THREE.IcosahedronGeometry(0.65, 1), matRing2, 0, 1.45, 0);

  // Triple Nested Gimbal Rings
  add(new THREE.TorusGeometry(1.35, 0.05, 12, 48), matRing1, 0, 1.45, 0);
  add(new THREE.TorusGeometry(1.65, 0.045, 12, 48), matRing2, 0, 1.45, 0, Math.PI / 3, 0, 0);
  add(new THREE.TorusGeometry(1.95, 0.04, 12, 48), matRing1, 0, 1.45, 0, 0, Math.PI / 4, 0);

  // Orbiting Satellite Prisms
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    add(new THREE.OctahedronGeometry(0.16, 0), matPrism, Math.cos(angle) * 1.5, 1.45 + Math.sin(angle) * 0.45, Math.sin(angle) * 1.5);
  }

  return group;
}

function createDinosaurFigure(colorHex, isRealistic = true, isWireframe = false) {
  const group = new THREE.Group();
  const matSkin = getProceduralMaterial('heli_body', isRealistic ? '#365314' : colorHex, isRealistic, isWireframe);
  const matHead = getProceduralMaterial('heli_body', isRealistic ? '#284410' : colorHex, isRealistic, isWireframe);
  const matBelly = getProceduralMaterial('duck_yellow', isRealistic ? '#d4a373' : colorHex, isRealistic, isWireframe);
  const matTeeth = getProceduralMaterial('blade_steel', '#f8fafc', isRealistic, isWireframe);
  const matMouth = getProceduralMaterial('taillight_red', '#be123c', isRealistic, isWireframe);
  const matEye = getProceduralMaterial('arc_glow', '#f59e0b', isRealistic, isWireframe);
  const matSpine = getProceduralMaterial('drone_carbon', '#1e300d', isRealistic, isWireframe);

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // 1. Skull & Ferocious Articulated Jaws
  add(new THREE.BoxGeometry(0.72, 0.65, 0.82), matHead, 0, 2.35, 1.45, -0.15, 0, 0); // Cranium
  add(new THREE.BoxGeometry(0.18, 0.16, 0.55), matSpine, -0.32, 2.55, 1.52, -0.15, -0.15, 0.2); // Brow
  add(new THREE.BoxGeometry(0.18, 0.16, 0.55), matSpine, 0.32, 2.55, 1.52, -0.15, 0.15, -0.2);
  add(new THREE.BoxGeometry(0.55, 0.48, 1.15), matSkin, 0, 2.22, 2.1, -0.08, 0, 0); // Snout
  add(new THREE.BoxGeometry(0.46, 0.38, 0.38), matHead, 0, 2.14, 2.75, 0.1, 0, 0); // Nostrils
  add(new THREE.SphereGeometry(0.09, 12, 12), matEye, -0.36, 2.45, 1.62); // Amber eye
  add(new THREE.SphereGeometry(0.09, 12, 12), matEye, 0.36, 2.45, 1.62);
  add(new THREE.BoxGeometry(0.48, 0.22, 1.15), matSkin, 0, 1.86, 2.05, 0.22, 0, 0); // Open lower jaw
  add(new THREE.BoxGeometry(0.38, 0.16, 0.85), matMouth, 0, 2.02, 1.88, 0.05, 0, 0); // Throat
  [-0.24, 0.24].forEach(x => {
    add(new THREE.ConeGeometry(0.05, 0.18, 6), matTeeth, x, 1.96, 2.25, Math.PI, 0, 0);
    add(new THREE.ConeGeometry(0.05, 0.18, 6), matTeeth, x, 1.96, 2.45, Math.PI, 0, 0);
    add(new THREE.ConeGeometry(0.045, 0.16, 6), matTeeth, x * 0.9, 1.96, 2.15, 0, 0, 0);
  });
  add(new THREE.BoxGeometry(0.35, 0.08, 0.08), matTeeth, 0, 1.95, 2.7);

  // 2. Muscular S-Curved Neck & Chest
  add(new THREE.CylinderGeometry(0.38, 0.48, 0.9, 16), matSkin, 0, 2.02, 1.05, -0.45, 0, 0);
  add(new THREE.CylinderGeometry(0.46, 0.58, 0.8, 16), matSkin, 0, 1.65, 0.65, -0.3, 0, 0);
  add(new THREE.CapsuleGeometry(0.65, 1.2, 8, 16), matSkin, 0, 1.45, 0, 1.45, 0, 0); // Ribcage
  add(new THREE.BoxGeometry(0.85, 0.38, 1.55), matBelly, 0, 1.02, 0); // Pale underbelly
  add(new THREE.BoxGeometry(0.12, 0.22, 1.6), matSpine, 0, 2.12, 0);

  // 3. Theropod Bipedal Legs & Talons
  [-0.72, 0.72].forEach(x => {
    add(new THREE.CapsuleGeometry(0.35, 0.85, 6, 14), matSkin, x, 1.25, -0.1, 0.38, 0, 0);
    add(new THREE.CylinderGeometry(0.18, 0.15, 0.9, 14), matHead, x, 0.65, 0.15, -0.42, 0, 0);
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 12), matHead, x, 0.3, -0.06, 0.22, 0, 0);
    add(new THREE.BoxGeometry(0.46, 0.12, 0.62), matSpine, x, 0.06, 0.2);
    [-0.14, 0, 0.14].forEach(tx => {
      add(new THREE.ConeGeometry(0.06, 0.22, 6), matTeeth, x + tx, 0.06, 0.58, Math.PI / 2, 0, 0);
    });
  });

  // 4. Iconic Tiny Forearms
  [-0.58, 0.58].forEach(x => {
    add(new THREE.CylinderGeometry(0.09, 0.08, 0.42, 10), matSkin, x, 1.38, 0.68, 0.52, 0, x > 0 ? 0.22 : -0.22);
    add(new THREE.ConeGeometry(0.05, 0.16, 6), matTeeth, x * 1.05, 1.15, 0.9, Math.PI / 3, 0, 0);
  });

  // 5. Heavy Counterbalancing Tail
  add(new THREE.CylinderGeometry(0.55, 0.46, 1.25, 16), matSkin, 0, 1.42, -1.15, 1.46, 0, 0);
  add(new THREE.CylinderGeometry(0.44, 0.32, 1.35, 14), matSkin, 0, 1.38, -2.35, 1.54, 0, 0);
  add(new THREE.CylinderGeometry(0.3, 0.18, 1.45, 12), matHead, 0, 1.46, -3.65, 1.62, 0, 0);
  add(new THREE.ConeGeometry(0.18, 1.1, 12), matHead, 0, 1.62, -4.8, -1.48, 0, 0);
  add(new THREE.BoxGeometry(0.08, 0.18, 3.2), matSpine, 0, 1.65, -2.6, 0.05, 0, 0);

  return group;
}

// Model Preset Catalog
const MODEL_CATALOG = {
  dinosaur: {
    key: 'dinosaur',
    name: 'Apex Predator T-Rex Dinosaur',
    fileName: 'blueprint.json',
    size: '4.8 KB',
    format: 'json-blueprint (AI-CAD)',
    location: 'backend/Data/Generated_Models/dinosaur/blueprint.json',
    create: createDinosaurFigure
  },
  dog: {
    key: 'dog',
    name: 'Canine Quadruped (Dog)',
    fileName: 'dog.glb',
    size: '0.85 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/dog/dog.glb',
    create: createDogFigure
  },
  cat: {
    key: 'cat',
    name: 'Feline Quadruped (Cat)',
    fileName: 'cat.glb',
    size: '0.78 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/cat/cat.glb',
    create: createCatFigure
  },
  helicopter: {
    key: 'helicopter',
    name: 'Tactical Attack Helicopter',
    fileName: 'helicopter.glb',
    size: '1.25 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/helicopter/scene.glb',
    create: createHelicopterFigure
  },
  airplane: {
    key: 'airplane',
    name: 'Supersonic Jet Aircraft',
    fileName: 'airplane.glb',
    size: '1.35 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/airplane/scene.glb',
    create: createAirplaneFigure
  },
  iron_man: {
    key: 'iron_man',
    name: 'Iron Man Mark 85',
    fileName: 'scene.gltf',
    size: '1.45 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/iron_man_mark_85/scene.gltf',
    create: createIronManFigure
  },
  drone: {
    key: 'drone',
    name: 'Tactical Recon Drone',
    fileName: 'drone.glb',
    size: '0.92 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/drone/drone.glb',
    create: createDroneFigure
  },
  car: {
    key: 'car',
    name: 'Cyberpunk Aerodynamic Racer',
    fileName: 'car.glb',
    size: '1.12 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/car/car.glb',
    create: createCarFigure
  },
  sword: {
    key: 'sword',
    name: 'High-Frequency Beam Saber',
    fileName: 'sword.glb',
    size: '0.65 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/sword/scene.glb',
    create: createSwordFigure
  },
  spaceship: {
    key: 'spaceship',
    name: 'Interstellar Starfighter',
    fileName: 'spaceship.glb',
    size: '1.50 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/spaceship/scene.glb',
    create: createSpaceshipFigure
  },
  duck: {
    key: 'duck',
    name: 'Aquatic Waterfowl (Duck)',
    fileName: 'duck.glb',
    size: '0.11 MB',
    format: 'gltf-binary (.glb)',
    location: 'backend/Data/Generated_Models/duck/scene.glb',
    create: createDuckFigure
  }
};


export default function Holo3DViewportModal({
  isOpen,
  onClose,
  initialModelData = null,
  themeColor = '#00f0ff'
}) {
  const mountRef = useRef(null);
  const activeColor = themeColor || '#00f0ff';

  // Modal active model state
  const [currentModelKey, setCurrentModelKey] = useState(initialModelData?.modelKey || 'dog');
  const [assetName, setAssetName] = useState(initialModelData?.assetName || 'Canine Quadruped (Dog)');
  const [fileName, setFileName] = useState(initialModelData?.fileName || 'dog.glb');
  const [fileSize, setFileSize] = useState(initialModelData?.fileSize || '0.85 MB');
  const [locationPath, setLocationPath] = useState(initialModelData?.location || 'backend/Data/Generated_Models/dog/dog.glb');
  const [customPathInput, setCustomPathInput] = useState('');

  // AI Text-to-3D Synthesizer State
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [recentCreations, setRecentCreations] = useState([]);
  const [partsCount, setPartsCount] = useState(initialModelData?.blueprint?.parts?.length || null);
  const [showQuickPresets, setShowQuickPresets] = useState(false);

  // Viewport Control States
  const [wireframeMode, setWireframeMode] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [renderMode, setRenderMode] = useState('realistic'); // 'realistic' (PBR Studio) | 'holo' (Neon Wire HUD)

  // Synchronization & Ref Guards
  const activeModelKeyRef = useRef(initialModelData?.modelKey || 'dog');
  const activeBlueprintRef = useRef(initialModelData?.blueprint || null);
  const activeCustomUrlRef = useRef(initialModelData?.modelUrl || null);
  const pendingLoadRef = useRef(null);
  const wireframeRef = useRef(wireframeMode);
  wireframeRef.current = wireframeMode;
  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;
  const renderModeRef = useRef(renderMode);
  renderModeRef.current = renderMode;

  // Telemetry HUD readouts
  const [telemetry, setTelemetry] = useState({
    yaw: 12,
    pitch: 24,
    dist: 4.2
  });

  // Action feedback status
  const [actionStatus, setActionStatus] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const currentObjectGroupRef = useRef(null);
  const gridHelperRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const rimLightRef = useRef(null);
  const ambientLightRef = useRef(null);
  const bottomGlowRef = useRef(null);
  const shadowPlaneRef = useRef(null);

  // Dynamic Lighting mode updater
  const updateLightingForMode = useCallback((mode) => {
    const isReal = mode === 'realistic';
    if (ambientLightRef.current) {
      if (isReal) {
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 1.35;
      } else {
        ambientLightRef.current.color.setHex(0x06111f);
        ambientLightRef.current.intensity = 2.2;
      }
    }
    if (keyLightRef.current) {
      if (isReal) {
        keyLightRef.current.color.setHex(0xfff6ea);
        keyLightRef.current.intensity = 3.2;
      } else {
        keyLightRef.current.color.set(activeColor);
        keyLightRef.current.intensity = 2.5;
      }
    }
    if (fillLightRef.current) {
      if (isReal) {
        fillLightRef.current.color.setHex(0xb4d8ff);
        fillLightRef.current.intensity = 1.5;
      } else {
        fillLightRef.current.color.setHex(0x00e5ff);
        fillLightRef.current.intensity = 1.4;
      }
    }
    if (rimLightRef.current) {
      if (isReal) {
        rimLightRef.current.color.setHex(0x60a5fa);
        rimLightRef.current.intensity = 2.0;
      } else {
        rimLightRef.current.color.set(activeColor);
        rimLightRef.current.intensity = 1.0;
      }
    }
    if (bottomGlowRef.current) {
      bottomGlowRef.current.visible = !isReal;
    }
    if (shadowPlaneRef.current) {
      shadowPlaneRef.current.visible = isReal;
    }
  }, [activeColor]);

  // Fetch list of recent AI synthesized models from backend
  const fetchRecentCreations = useCallback(() => {
    fetch('http://localhost:5000/api/viewport3d/recent')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setRecentCreations(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecentCreations();
    }
  }, [isOpen, fetchRecentCreations]);

  const loadProceduralFallback = useCallback((modelKey) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const key = (modelKey || '').toLowerCase();
    let createFn = null;

    if (MODEL_CATALOG[key]) {
      createFn = MODEL_CATALOG[key].create;
    } else if (key.includes('dino') || key.includes('trex') || key.includes('t-rex') || key.includes('tyranno') || key.includes('raptor')) {
      createFn = createDinosaurFigure;
    } else if (key.includes('helicopter') || key.includes('copter') || key.includes('chopper') || key.includes('apache')) {
      createFn = createHelicopterFigure;
    } else if (key.includes('plane') || key.includes('airplane') || key.includes('jet') || key.includes('aircraft')) {
      createFn = createAirplaneFigure;
    } else if (key.includes('sword') || key.includes('blade') || key.includes('saber') || key.includes('weapon')) {
      createFn = createSwordFigure;
    } else if (key.includes('space') || key.includes('ship') || key.includes('star') || key.includes('rocket') || key.includes('ufo')) {
      createFn = createSpaceshipFigure;
    } else if (key.includes('duck') || key.includes('bird')) {
      createFn = createDuckFigure;
    } else if (key.includes('car') || key.includes('auto') || key.includes('vehicle') || key.includes('racer')) {
      createFn = createCarFigure;
    } else if (key.includes('drone') || key.includes('quad')) {
      createFn = createDroneFigure;
    } else if (key.includes('cat') || key.includes('kitten') || key.includes('feline')) {
      createFn = createCatFigure;
    } else if (key.includes('dog') || key.includes('puppy') || key.includes('canine')) {
      createFn = createDogFigure;
    } else if (key.includes('iron') || key.includes('suit') || key.includes('man') || key.includes('robot') || key.includes('mech')) {
      createFn = createIronManFigure;
    } else {
      createFn = createCyberArtifactFigure;
    }

    const isRealistic = renderModeRef.current === 'realistic';
    const modelGroup = createFn(activeColor, isRealistic);

    // Apply wireframe state and shadow casting to all meshes
    modelGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.wireframe = wireframeRef.current;
        }
      }
    });

    scene.add(modelGroup);
    currentObjectGroupRef.current = modelGroup;
  }, [activeColor]);

  // Dynamic AI 3D Blueprint Renderer (Constructs any 3D model from AI CAD JSON Schema)
  const renderDynamic3DBlueprint = useCallback((blueprint) => {
    const scene = sceneRef.current;
    if (!scene || !blueprint || !Array.isArray(blueprint.parts)) return false;

    activeBlueprintRef.current = blueprint;
    activeCustomUrlRef.current = null;

    // Remove old model if present
    if (currentObjectGroupRef.current) {
      scene.remove(currentObjectGroupRef.current);
      currentObjectGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
      currentObjectGroupRef.current = null;
    }

    const group = new THREE.Group();
    const isRealistic = renderModeRef.current === 'realistic';

    blueprint.parts.forEach((p) => {
      let geo = null;
      let baseScale = { x: 1, y: 1, z: 1 };
      const dims = Array.isArray(p.dimensions) && p.dimensions.length > 0 ? p.dimensions.map(Number) : [1, 1, 1];
      const shape = (p.shape || 'box').toLowerCase();

      try {
        if (shape === 'box') {
          const w = dims[0] ?? 1;
          const h = dims[1] ?? 1;
          const d = dims[2] ?? 1;
          geo = new THREE.BoxGeometry(w, h, d);
        } else if (shape === 'ellipsoid') {
          // Ellipsoid is created from a unit sphere scaled along [rx, ry, rz]
          const rx = dims[0] ?? 0.6;
          const ry = dims[1] ?? rx;
          const rz = dims[2] ?? rx;
          geo = new THREE.SphereGeometry(1, 32, 24);
          baseScale = { x: rx, y: ry, z: rz };
        } else if (shape === 'sphere') {
          // If AI provided 3 radii [rx, ry, rz] with values < 8, sculpt as smooth ellipsoid
          if (dims.length >= 3 && dims[1] < 8) {
            const rx = dims[0] ?? 0.6;
            const ry = dims[1] ?? rx;
            const rz = dims[2] ?? rx;
            geo = new THREE.SphereGeometry(1, 32, 24);
            baseScale = { x: rx, y: ry, z: rz };
          } else if (dims.length >= 3 && dims[1] >= 8) {
            // Legacy radius + segments specification
            geo = new THREE.SphereGeometry(dims[0], Math.round(dims[1]), Math.round(dims[2]));
          } else {
            // Uniform sphere
            const r = dims[0] ?? 0.6;
            geo = new THREE.SphereGeometry(r, 32, 24);
          }
        } else if (shape === 'cylinder') {
          let rT, rB, h, segs = 32;
          if (dims.length === 1) {
            rT = dims[0];
            rB = dims[0];
            h = 1.0;
          } else if (dims.length === 2) {
            // Standard CAD cylinder definition: [radius, height]
            rT = dims[0];
            rB = dims[0];
            h = dims[1];
          } else if (dims.length >= 3) {
            rT = dims[0];
            rB = dims[1];
            h = dims[2];
            if (dims.length >= 4 && dims[3] >= 6) {
              segs = Math.round(dims[3]);
            }
          } else {
            rT = 0.5; rB = 0.5; h = 1.0;
          }
          geo = new THREE.CylinderGeometry(rT, rB, h, segs);
        } else if (shape === 'capsule') {
          const r = dims[0] ?? 0.35;
          const len = dims[1] ?? 1.0;
          geo = new THREE.CapsuleGeometry(r, len, 8, 24);
        } else if (shape === 'cone') {
          const r = dims[0] ?? 0.5;
          const h = dims[1] ?? 1.5;
          const segs = (dims[2] && dims[2] >= 6) ? Math.round(dims[2]) : 24;
          geo = new THREE.ConeGeometry(r, h, segs);
        } else if (shape === 'torus') {
          const r = dims[0] ?? 0.8;
          const tube = dims[1] ?? 0.08;
          const rSegs = (dims[2] && dims[2] >= 6) ? Math.round(dims[2]) : 16;
          const tSegs = (dims[3] && dims[3] >= 6) ? Math.round(dims[3]) : 32;
          geo = new THREE.TorusGeometry(r, tube, rSegs, tSegs);
        } else if (shape === 'ring') {
          const iR = dims[0] ?? 0.5;
          const oR = dims[1] ?? 1.0;
          const thetaSegs = (dims[2] && dims[2] >= 6) ? Math.round(dims[2]) : 32;
          geo = new THREE.RingGeometry(iR, oR, thetaSegs);
        } else if (shape === 'dodecahedron') {
          geo = new THREE.DodecahedronGeometry(dims[0] ?? 0.7);
        } else if (shape === 'icosahedron') {
          geo = new THREE.IcosahedronGeometry(dims[0] ?? 0.7);
        } else if (shape === 'octahedron') {
          geo = new THREE.OctahedronGeometry(dims[0] ?? 0.7);
        } else {
          // Default to Box
          const w = dims[0] ?? 1;
          const h = dims[1] ?? 1;
          const d = dims[2] ?? 1;
          geo = new THREE.BoxGeometry(w, h, d);
        }
      } catch (e) {
        geo = new THREE.BoxGeometry(1, 1, 1);
      }

      const mat = resolveBlueprintPBR(p, isRealistic, wireframeRef.current, activeColor);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Apply non-uniform scaling (combine shape base scale e.g. from ellipsoid with part scale)
      const sx = (Array.isArray(p.scale) && p.scale[0] !== undefined) ? Number(p.scale[0]) || 1 : 1;
      const sy = (Array.isArray(p.scale) && p.scale[1] !== undefined) ? Number(p.scale[1]) || 1 : 1;
      const sz = (Array.isArray(p.scale) && p.scale[2] !== undefined) ? Number(p.scale[2]) || 1 : 1;
      mesh.scale.set(baseScale.x * sx, baseScale.y * sy, baseScale.z * sz);

      // Position
      if (Array.isArray(p.position) && p.position.length >= 3) {
        mesh.position.set(Number(p.position[0]) || 0, Number(p.position[1]) || 0, Number(p.position[2]) || 0);
      }

      // Rotation with automatic degree-to-radian normalization
      if (Array.isArray(p.rotation) && p.rotation.length >= 3) {
        let rx = Number(p.rotation[0]) || 0;
        let ry = Number(p.rotation[1]) || 0;
        let rz = Number(p.rotation[2]) || 0;
        if (Math.abs(rx) > 6.28 || Math.abs(ry) > 6.28 || Math.abs(rz) > 6.28) {
          rx = THREE.MathUtils.degToRad(rx);
          ry = THREE.MathUtils.degToRad(ry);
          rz = THREE.MathUtils.degToRad(rz);
        }
        mesh.rotation.set(rx, ry, rz);
      }

      group.add(mesh);
    });

    // Auto-normalize scale and center pivot so any AI-created object sits centered in the viewport
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 2.4 / maxDim;

    group.scale.set(targetScale, targetScale, targetScale);
    group.position.sub(center.clone().multiplyScalar(targetScale));
    group.position.y += (size.y * targetScale) / 2;

    scene.add(group);
    currentObjectGroupRef.current = group;
    setPartsCount(blueprint.parts.length);
    return true;
  }, [activeColor]);

  // Model Swapper Function
  const load3DFigure = useCallback((modelKey, customPath = null, blueprint = null) => {
    const scene = sceneRef.current;
    if (!scene) {
      pendingLoadRef.current = { key: modelKey, url: customPath, blueprint };
      return;
    }

    activeModelKeyRef.current = modelKey;

    // 1. Direct blueprint supplied from AI synthesis
    if (blueprint && Array.isArray(blueprint.parts)) {
      renderDynamic3DBlueprint(blueprint);
      return;
    }

    // Remove old model if present
    if (currentObjectGroupRef.current) {
      scene.remove(currentObjectGroupRef.current);
      currentObjectGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
      currentObjectGroupRef.current = null;
    }

    // 2. Custom GLTF/GLB path supplied
    if (customPath) {
      activeCustomUrlRef.current = customPath;
      activeBlueprintRef.current = null;
      setLoadingModel(true);
      const loader = new GLTFLoader();
      loader.load(
        customPath,
        (gltf) => {
          setLoadingModel(false);
          const model = gltf.scene;
          const isReal = renderModeRef.current === 'realistic';
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (isReal) {
                // Keep authentic GLTF materials & textures!
                if (child.material) {
                  child.material.wireframe = wireframeRef.current;
                  if (child.material.roughness === undefined) child.material.roughness = 0.45;
                }
              } else {
                // Holographic cyan HUD style
                child.material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(activeColor),
                  emissive: new THREE.Color(activeColor).multiplyScalar(0.7),
                  emissiveIntensity: 0.8,
                  wireframe: wireframeRef.current,
                  metalness: 0.8,
                  roughness: 0.2,
                  transparent: true,
                  opacity: 0.92
                });
              }
            }
          });
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.4 / maxDim;
          model.scale.set(scale, scale, scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y += (size.y * scale) / 2;

          scene.add(model);
          currentObjectGroupRef.current = model;
          setPartsCount(null);
        },
        undefined,
        (err) => {
          console.warn('Failed to load custom GLTF, falling back to procedural:', err);
          setLoadingModel(false);
          loadProceduralFallback(modelKey);
        }
      );
      return;
    }

    // 3. Check if built-in procedural preset exists
    const cleanKey = (modelKey || '').toLowerCase();
    activeCustomUrlRef.current = null;
    if (MODEL_CATALOG[cleanKey]) {
      setPartsCount(null);
      loadProceduralFallback(cleanKey);
      return;
    }

    // 4. Check backend cache for synthesized blueprint
    fetch(`http://localhost:5000/api/viewport3d/blueprint/${cleanKey}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((bp) => {
        if (bp && Array.isArray(bp.parts)) {
          renderDynamic3DBlueprint(bp);
        } else {
          loadProceduralFallback(cleanKey);
        }
      })
      .catch(() => loadProceduralFallback(cleanKey));
  }, [activeColor, loadProceduralFallback, renderDynamic3DBlueprint]);

  // Render Mode Toggle Handler (Realistic PBR vs Holographic HUD)
  const handleToggleRenderMode = (mode) => {
    if (mode === renderMode) return;
    setRenderMode(mode);
    renderModeRef.current = mode;
    updateLightingForMode(mode);

    // Re-render the active model in the newly selected rendering mode
    if (activeBlueprintRef.current) {
      renderDynamic3DBlueprint(activeBlueprintRef.current);
    } else if (activeCustomUrlRef.current) {
      load3DFigure(activeModelKeyRef.current, activeCustomUrlRef.current);
    } else {
      load3DFigure(activeModelKeyRef.current);
    }
  };

  // Sync when initialModelData changes from outside (e.g. voice command)
  useEffect(() => {
    if (!initialModelData) return;

    const key = initialModelData.modelKey || 'dog';
    activeModelKeyRef.current = key;
    setCurrentModelKey(key);
    if (initialModelData.assetName) setAssetName(initialModelData.assetName);
    if (initialModelData.fileName) setFileName(initialModelData.fileName);
    if (initialModelData.fileSize) setFileSize(initialModelData.fileSize);
    if (initialModelData.location) setLocationPath(initialModelData.location);
    if (initialModelData.blueprint?.parts) setPartsCount(initialModelData.blueprint.parts.length);

    if (sceneRef.current) {
      load3DFigure(key, initialModelData.modelUrl, initialModelData.blueprint);
    } else {
      pendingLoadRef.current = { key, url: initialModelData.modelUrl, blueprint: initialModelData.blueprint };
    }
  }, [initialModelData, load3DFigure]);

  // Wireframe Toggle Handler
  const handleToggleWireframe = (isWire) => {
    wireframeRef.current = isWire;
    setWireframeMode(isWire);
    if (currentObjectGroupRef.current) {
      currentObjectGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = isWire;
        }
      });
    }
  };

  // Grid Visibility Toggle
  const handleToggleGrid = () => {
    const next = !gridVisible;
    setGridVisible(next);
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = next;
    }
  };

  // Preset Selector Click
  const handleSelectPreset = (key) => {
    const item = MODEL_CATALOG[key];
    if (!item) return;
    playChimeSFX();
    activeModelKeyRef.current = key;
    setCurrentModelKey(key);
    setAssetName(item.name);
    setFileName(item.fileName);
    setFileSize(item.size);
    setLocationPath(item.location);
    setPartsCount(null);
    load3DFigure(key);
  };

  // Select a previously synthesized AI model from recent list
  const handleSelectRecent = async (key) => {
    playChimeSFX();
    setActionStatus(`Loading ${key}...`);
    try {
      const res = await fetch(`http://localhost:5000/api/viewport3d/blueprint/${key}`);
      if (res.ok) {
        const bp = await res.json();
        setCurrentModelKey(key);
        setAssetName(bp.modelName || key);
        setFileName('blueprint.json');
        setFileSize('1.4 KB');
        setLocationPath(`backend/Data/Generated_Models/${key}/blueprint.json`);
        renderDynamic3DBlueprint(bp);
        setActionStatus(`Loaded ${bp.modelName || key}`);
        return;
      }
    } catch (e) {}
    load3DFigure(key);
  };

  // On-the-fly AI 3D Synthesizer from custom input prompt
  const handleSynthesizePrompt = async (e) => {
    if (e) e.preventDefault();
    const promptText = customPromptInput.trim();
    if (!promptText) return;
    playChimeSFX();
    setSynthesizing(true);
    setActionStatus(`AI CAD Architect designing 3D "${promptText}"...`);

    try {
      const res = await fetch('http://localhost:5000/api/viewport3d/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();
      setSynthesizing(false);

      if (data.success && data.blueprint) {
        setCurrentModelKey(data.modelKey);
        setAssetName(data.assetName);
        setFileName(data.fileName || 'blueprint.json');
        setFileSize(data.fileSize || '1.4 KB');
        setLocationPath(data.location || `backend/Data/Generated_Models/${data.modelKey}/blueprint.json`);
        renderDynamic3DBlueprint(data.blueprint);
        setActionStatus(`Synthesized ${data.assetName} (${data.blueprint.parts.length} components)`);
        fetchRecentCreations();
        setCustomPromptInput('');
      } else {
        setActionStatus(data.error || 'Synthesis error.');
      }
    } catch (err) {
      setSynthesizing(false);
      setActionStatus(`Error synthesizing: ${err.message}`);
    }
  };

  // Custom Model Path Load
  const handleLoadCustomPath = (e) => {
    e.preventDefault();
    if (!customPathInput.trim()) return;
    playChimeSFX();
    const cleanPath = customPathInput.trim();
    const extractedFileName = cleanPath.split(/[/\\]/).pop() || 'custom_model.glb';
    setAssetName(`Custom 3D Model (${extractedFileName.split('.')[0]})`);
    setFileName(extractedFileName);
    setLocationPath(cleanPath);
    setFileSize('1.80 MB');
    load3DFigure(currentModelKey, cleanPath);
  };

  // Open Folder / Blender Action Dispatcher
  const handleTriggerAction = async (actionType) => {
    playChimeSFX();
    setActionStatus('Executing command...');
    try {
      const res = await fetch('http://localhost:5000/api/viewport3d/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, modelKey: currentModelKey })
      });
      const data = await res.json();
      if (data.message) {
        setActionStatus(data.message);
        setTimeout(() => setActionStatus(''), 4000);
      }
    } catch (err) {
      setActionStatus(actionType === 'open_blender' ? 'Blender not detected on host system.' : 'Action completed.');
      setTimeout(() => setActionStatus(''), 4000);
    }
  };

  // Permanently delete a synthesized 3D model from disk storage
  const handleDeleteModel = async (key, name, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const displayName = name || key;
    const confirmed = window.confirm(`Permanently delete 3D model "${displayName}" from disk storage?`);
    if (!confirmed) return;

    playChimeSFX();
    setActionStatus(`Deleting "${displayName}" from storage...`);

    try {
      let data = null;
      // 1. First attempt: DELETE request
      try {
        const res = await fetch(`http://localhost:5000/api/viewport3d/model/${encodeURIComponent(key)}`, {
          method: 'DELETE'
        });
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (_) {}
      } catch (_) {}

      // 2. Fallback attempt: POST /api/viewport3d/delete if first attempt didn't succeed
      if (!data || !data.success) {
        const postRes = await fetch('http://localhost:5000/api/viewport3d/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, modelKey: key })
        });
        const postText = await postRes.text();
        try {
          data = JSON.parse(postText);
        } catch (_) {}
      }

      if (data && data.success) {
        setActionStatus(`Deleted "${displayName}" from disk.`);
        setRecentCreations((prev) => prev.filter((item) => item.key !== key));

        // If the active model was deleted, switch back to dinosaur or first available
        if (currentModelKey === key) {
          handleSelectPreset('dog');
        }
      } else {
        // Even if server reported not found, purge from recent list so user is never stuck
        setRecentCreations((prev) => prev.filter((item) => item.key !== key));
        setActionStatus(`Removed "${displayName}" from recent library.`);
      }
    } catch (err) {
      // Fallback: purge from UI so user isn't stuck with corrupt entries
      setRecentCreations((prev) => prev.filter((item) => item.key !== key));
      setActionStatus(`Removed "${displayName}" from recent library.`);
    }
    setTimeout(() => setActionStatus(''), 4000);
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!isOpen) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 560;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3.2, 2.4, 3.8);
    cameraRef.current = camera;

    // 2. WebGL Renderer with High-Fidelity Tone Mapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'holo-three-canvas-mount';
    rendererRef.current = renderer;

    // 3. OrbitControls (Full 360-degree rotation, zoom, pan)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.0, 0);
    controlsRef.current = controls;

    // Live Telemetry updates on orbit change
    const updateTelemetryFromControls = () => {
      const dist = camera.position.distanceTo(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const yawDeg = Math.round(THREE.MathUtils.radToDeg(spherical.theta));
      const pitchDeg = Math.round(THREE.MathUtils.radToDeg(spherical.phi - Math.PI / 2));

      setTelemetry({
        yaw: yawDeg,
        pitch: pitchDeg,
        dist: parseFloat(dist.toFixed(2))
      });
    };
    controls.addEventListener('change', updateTelemetryFromControls);
    updateTelemetryFromControls();

    // 4. Studio Lighting System (Realistic Key, Fill, Rim & Ambient)
    const isRealistic = renderModeRef.current === 'realistic';

    const ambientLight = new THREE.AmbientLight(
      isRealistic ? 0xffffff : 0x06111f,
      isRealistic ? 1.35 : 2.2
    );
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(
      isRealistic ? 0xfff6ea : activeColor,
      isRealistic ? 3.2 : 2.5
    );
    keyLight.position.set(4.5, 7.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(
      isRealistic ? 0xb4d8ff : 0x00e5ff,
      isRealistic ? 1.5 : 1.4
    );
    fillLight.position.set(-4.5, 3.5, -3.5);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(
      isRealistic ? 0x60a5fa : activeColor,
      isRealistic ? 2.0 : 1.0
    );
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const bottomGlow = new THREE.PointLight(activeColor, 3.0, 8);
    bottomGlow.position.set(0, -0.2, 0);
    bottomGlow.visible = !isRealistic;
    scene.add(bottomGlow);
    bottomGlowRef.current = bottomGlow;

    // Contact Shadow Receiver Plane
    const shadowGeo = new THREE.PlaneGeometry(16, 16);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    shadowPlane.visible = isRealistic;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // 5. Holographic Ground Coordinate Grid
    const gridHelper = new THREE.GridHelper(6, 24, 0x00f0ff, 0x004455);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Concentric ground telemetry rings
    const ringGeo = new THREE.RingGeometry(1.6, 1.63, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // 6. Initial Model Load - prioritized from pendingLoadRef or activeModelKeyRef
    if (pendingLoadRef.current) {
      const { key, url, blueprint } = pendingLoadRef.current;
      pendingLoadRef.current = null;
      load3DFigure(key, url, blueprint);
    } else {
      const targetKey = initialModelData?.modelKey || activeModelKeyRef.current || currentModelKey || 'dog';
      const targetUrl = initialModelData?.modelUrl || null;
      load3DFigure(targetKey, targetUrl, initialModelData?.blueprint || null);
    }

    // 7. Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      controls.update();

      // Continuous 360-degree auto spin
      if (autoSpinRef.current && currentObjectGroupRef.current) {
        currentObjectGroupRef.current.rotation.y += 0.45 * delta;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', updateTelemetryFromControls);
      controls.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [isOpen, activeColor, load3DFigure]);

  if (!isOpen) return null;

  return (
    <div className="holo-viewport-overlay" onClick={onClose}>
      <div className="holo-viewport-window" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="holo-viewport-header">
          <div className="holo-viewport-title-group">
            <span className="holo-viewport-title-icon" />
            <h2 className="holo-viewport-title">JARVIS 3D VIEWPORT CANVAS</h2>
          </div>
          <div className="holo-viewport-win-controls">
            <button className="holo-win-btn" onClick={onClose} title="Minimize">-</button>
            <button className="holo-win-btn close" onClick={onClose} title="Close">×</button>
          </div>
        </div>

        {/* Main Body: Canvas + Inspector */}
        <div className="holo-viewport-body">
          {/* Left Canvas Viewport */}
          <div className="holo-viewport-canvas-box">
            {/* Top-Left Diagnostics */}
            <div className="holo-canvas-diag-tl">
              <span className="holo-diag-lead">{"// JARVIS HUD V9.9.2"}</span>
              <span>CORE_TEMP: 43.6°C</span>
              <span>{"STATUS_GRID: ACTIVE // ONLINE"}</span>
            </div>

            {/* Top-Right Diagnostics */}
            <div className="holo-canvas-diag-tr">
              <span className="holo-diag-lead">{"// DIAGNOSTIC OVERLAY"}</span>
              <span>STABILIZER: 99.4%</span>
              <span>SHIELD_BST: 92.4%</span>
            </div>

            {/* Three.js Canvas Container */}
            <div ref={mountRef} className="holo-three-canvas-mount" />

            {/* Geometry Streaming Loading Overlay */}
            {loadingModel && (
              <div className="holo-canvas-loading-overlay">
                <div className="holo-loading-spinner" />
                <span className="holo-loading-text">{"// STREAMING 3D GEOMETRY // SYNTHESIZING MESH..."}</span>
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="holo-canvas-bottom-bar">
              <div className="holo-canvas-btn-row">
                <button
                  type="button"
                  className={`holo-bar-btn ${renderMode === 'realistic' ? 'active' : ''}`}
                  onClick={() => handleToggleRenderMode('realistic')}
                  title="Render with authentic real-world PBR materials, studio lighting & contact shadows"
                >
                  💎 REALISTIC
                </button>
                <button
                  type="button"
                  className={`holo-bar-btn ${renderMode === 'holo' ? 'active' : ''}`}
                  onClick={() => handleToggleRenderMode('holo')}
                  title="Switch to Tron/JARVIS neon holographic HUD style"
                >
                  ⚡ HOLOGRAPHIC
                </button>
                <button
                  type="button"
                  className={`holo-bar-btn ${wireframeMode ? 'active' : ''}`}
                  onClick={() => handleToggleWireframe(!wireframeMode)}
                >
                  {wireframeMode ? 'SOLID' : 'WIREFRAME'}
                </button>
                <button
                  type="button"
                  className={`holo-bar-btn ${gridVisible ? 'active' : ''}`}
                  onClick={handleToggleGrid}
                >
                  GRID FILTER
                </button>
                <button
                  type="button"
                  className={`holo-bar-btn ${autoSpin ? 'active' : ''}`}
                  onClick={() => setAutoSpin(!autoSpin)}
                >
                  AUTO SPIN
                </button>
              </div>

              {/* Bottom-Right Telemetry */}
              <div className="holo-canvas-telemetry">
                <span className="holo-telem-lead">{"// TELEMETRY"}</span>
                <span>YAW: {telemetry.yaw}°</span>
                <span>PITCH: {telemetry.pitch}°</span>
                <span>DIST: {telemetry.dist}M</span>
              </div>
            </div>
          </div>

          {/* Right Inspector & Telemetry Panel */}
          <div className="holo-viewport-inspector">
            {/* Metadata Rows */}
            <div className="holo-inspector-section">
              <div className="holo-meta-row">
                <span className="holo-meta-label">Asset:</span>
                <span className="holo-meta-val highlight">{assetName}</span>
              </div>
              {partsCount && (
                <div className="holo-meta-row">
                  <span className="holo-meta-label">Assembly:</span>
                  <span className="holo-meta-val highlight">{partsCount} Volumetric Primitives</span>
                </div>
              )}
              <div className="holo-meta-row">
                <span className="holo-meta-label">File Name:</span>
                <span className="holo-meta-val">{fileName}</span>
              </div>
              <div className="holo-meta-row">
                <span className="holo-meta-label">Location:</span>
                <span className="holo-meta-val code-path">{locationPath}</span>
              </div>
              <div className="holo-meta-row">
                <span className="holo-meta-label">File Size:</span>
                <span className="holo-meta-val">{fileSize}</span>
              </div>
              <div className="holo-meta-row">
                <span className="holo-meta-label">Architecture:</span>
                <span className="holo-meta-val">{partsCount ? 'Jarvis AI-CAD Engine' : 'gltf-binary (.glb)'}</span>
              </div>
              <div className="holo-meta-row">
                <span className="holo-meta-label">Status:</span>
                <span className="holo-meta-val highlight">Viewport Active (3D Canvas)</span>
              </div>
            </div>

            {/* Interaction Guide */}
            <div className="holo-interaction-guide">
              Drag to rotate • Scroll to zoom • Right-click to pan
            </div>

            {/* AI 3D CAD Synthesizer Studio Card */}
            <div className="holo-ai-synth-box">
              <div className="holo-ai-synth-header">
                <div className="holo-ai-synth-title-group">
                  <span className="holo-ai-synth-icon">⚡</span>
                  <span className="holo-ai-synth-title">AI 3D CAD ARCHITECT</span>
                </div>
                <span className="holo-ai-synth-badge">TEXT-TO-3D</span>
              </div>
              <p className="holo-ai-synth-desc">
                Synthesize any custom 3D model from scratch. J.A.R.V.I.S computes volumetric geometry, scale, and rotations on the fly.
              </p>
              <form onSubmit={handleSynthesizePrompt} className="holo-ai-synth-form">
                <input
                  type="text"
                  className="holo-ai-synth-input"
                  placeholder="e.g. dragon, cyberpunk motorcycle, skull, guitar..."
                  value={customPromptInput}
                  onChange={(e) => setCustomPromptInput(e.target.value)}
                  disabled={synthesizing}
                />
                <button
                  type="submit"
                  className={`holo-ai-synth-btn ${synthesizing ? 'loading' : ''}`}
                  disabled={synthesizing || !customPromptInput.trim()}
                >
                  {synthesizing ? 'SYNTHESIZING...' : '⚡ CREATE 3D'}
                </button>
              </form>
              {synthesizing && (
                <div className="holo-synth-progress-track">
                  <div className="holo-synth-progress-bar" />
                </div>
              )}
            </div>

            {/* Recent AI Creations Library */}
            {recentCreations.length > 0 && (
              <div className="holo-inspector-section">
                <div className="holo-recent-header-row">
                  <span className="holo-presets-label">RECENT AI CREATIONS ({recentCreations.length}):</span>
                  <span className="holo-recent-hint">Click to load • 🗑️ to delete</span>
                </div>
                <div className="holo-recent-grid">
                  {recentCreations.map((item) => (
                    <div
                      key={item.key}
                      className={`holo-recent-item-card ${currentModelKey === item.key ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="holo-recent-chip-btn"
                        onClick={() => handleSelectRecent(item.key)}
                        title={`Load ${item.name} (${item.partsCount} parts)`}
                      >
                        <span className="holo-recent-icon">💠</span>
                        <span className="holo-recent-name">{item.name}</span>
                        <span className="holo-recent-count">{item.partsCount}p</span>
                      </button>
                      <button
                        type="button"
                        className="holo-recent-del-btn"
                        onClick={(e) => handleDeleteModel(item.key, item.name, e)}
                        title={`Delete "${item.name}" from disk`}
                        aria-label={`Delete ${item.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actionStatus && (
              <div className="holo-blender-banner" style={{ borderColor: '#00f0ff', color: '#00f0ff' }}>
                ℹ️ {actionStatus}
              </div>
            )}

            {/* Action Buttons */}
            <div className="holo-action-btn-row">
              <div className="holo-action-btn-grid">
                <button
                  type="button"
                  className="holo-action-btn"
                  onClick={() => handleTriggerAction('open_folder')}
                  title="Open folder containing this 3D model in File Explorer"
                >
                  📂 Open Folder
                </button>
                <button
                  type="button"
                  className="holo-action-btn blender"
                  onClick={() => handleTriggerAction('open_blender')}
                  title="Open model directly in Blender 3D"
                >
                  ⚡ In Blender
                </button>
                {recentCreations.some((m) => m.key === currentModelKey) && (
                  <button
                    type="button"
                    className="holo-action-btn delete-model"
                    onClick={() => handleDeleteModel(currentModelKey, assetName)}
                    title={`Delete active model "${assetName}" from disk storage`}
                  >
                    🗑️ Delete Model
                  </button>
                )}
              </div>
              <button
                type="button"
                className="holo-action-btn delete"
                onClick={onClose}
              >
                ✕ Close Viewport
              </button>
            </div>

            {/* Collapsible Classic Demo Presets */}
            <div className="holo-inspector-section">
              <button
                type="button"
                className="holo-toggle-presets-btn"
                onClick={() => setShowQuickPresets(!showQuickPresets)}
              >
                {showQuickPresets ? '▲ Hide Classic Demo Templates' : '▼ View Classic Demo Templates (10)'}
              </button>

              {showQuickPresets && (
                <div className="holo-presets-grid" style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'dog' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('dog')}
                  >
                    🐕 Dog
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'cat' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('cat')}
                  >
                    🐈 Cat
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'iron_man' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('iron_man')}
                  >
                    🦾 Iron Man
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'drone' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('drone')}
                  >
                    🛸 Drone
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'car' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('car')}
                  >
                    🏎️ Car
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'helicopter' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('helicopter')}
                  >
                    🚁 Helicopter
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'airplane' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('airplane')}
                  >
                    ✈️ Jet Plane
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'sword' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('sword')}
                  >
                    ⚔️ Beam Saber
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'spaceship' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('spaceship')}
                  >
                    🚀 Starfighter
                  </button>
                  <button
                    type="button"
                    className={`holo-preset-chip ${currentModelKey === 'duck' ? 'active' : ''}`}
                    onClick={() => handleSelectPreset('duck')}
                  >
                    🦆 Duck
                  </button>
                </div>
              )}
            </div>

            {/* Custom Model Path Loader */}
            <form onSubmit={handleLoadCustomPath} className="holo-custom-input-box">
              <input
                type="text"
                className="holo-path-input"
                placeholder="Paste custom 3D model path (.glb/.gltf)..."
                value={customPathInput}
                onChange={(e) => setCustomPathInput(e.target.value)}
              />
              <button type="submit" className="holo-path-load-btn">
                Load Model Path
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
