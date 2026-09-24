export type AtlasSystem = 'SKELETON' | 'CARDIOVASCULAR' | 'NERVOUS' | 'ORGANS';
export type AtlasStructure = { id: string; name: string; system: AtlasSystem; color: string; desc: string; cats: string[]; count?: number; group?: 'AXIAL' | 'APPENDICULAR'; breakdown?: string[] };

export const SYSTEMS: { id: AtlasSystem; label: string; color: string }[] = [
  { id: 'SKELETON', label: 'SKELETON', color: '#e9dcc0' },
  { id: 'CARDIOVASCULAR', label: 'CARDIO', color: '#ff3b3b' },
  { id: 'NERVOUS', label: 'NERVOUS', color: '#ffe066' },
  { id: 'ORGANS', label: 'ORGANS', color: '#f0906a' },
];

export const STRUCTURES: AtlasStructure[] = [
  // ── skeleton (206) ──
  { id: 'skull', name: 'SKULL', system: 'SKELETON', color: '#ffe680', count: 22, group: 'AXIAL', desc: 'The bony case that protects the brain and shapes the face, built from 22 bones knit together at seam-like joints called sutures.', breakdown: ['CRANIAL 8 — Frontal 1 · Parietal 2 · Temporal 2 · Occipital 1 · Sphenoid 1 · Ethmoid 1', 'FACIAL 14 — Maxilla 2 · Mandible 1 · Zygomatic 2 · Nasal 2 · Lacrimal 2 · Palatine 2 · Vomer 1 · Inf. nasal concha 2'], cats: ['bone', 'dental'] },
  { id: 'ossicles', name: 'AUDITORY OSSICLES', system: 'SKELETON', color: '#ffb0d0', count: 6, group: 'AXIAL', desc: 'Malleus, incus and stapes — the three smallest bones, relaying vibration from the eardrum to the inner ear.', breakdown: ['Malleus 2 · Incus 2 · Stapes 2'], cats: ['ear', 'bone'] },
  { id: 'hyoid', name: 'HYOID', system: 'SKELETON', color: '#c8ff9a', count: 1, group: 'AXIAL', desc: 'U-shaped bone in the neck anchoring the tongue and larynx; the only bone not articulating with another bone.', breakdown: ['Hyoid 1'], cats: ['bone'] },
  { id: 'spine', name: 'SPINE', system: 'SKELETON', color: '#b8a0ff', count: 26, group: 'AXIAL', desc: 'The backbone: a stack of vertebrae that holds the body upright, lets it bend, and shields the spinal cord inside.', breakdown: ['Cervical 7 (C1–C7) · Thoracic 12 (T1–T12) · Lumbar 5 (L1–L5)', 'Sacrum 1 (S1–S5 fused) · Coccyx 1 (3–5 fused) — 33 at birth → 26 adult'], cats: ['bone', 'pain', 'nervous'] },
  { id: 'ribs', name: 'RIBCAGE', system: 'SKELETON', color: '#9ad8ff', count: 24, group: 'AXIAL', desc: 'Twelve pairs of curved ribs that form a protective, expandable cage around the heart and lungs.', breakdown: ['12 pairs — 7 true · 3 false · 2 floating'], cats: ['bone', 'respiratory'] },
  { id: 'sternum', name: 'STERNUM', system: 'SKELETON', color: '#ffd0a0', count: 1, group: 'AXIAL', desc: 'The breastbone — manubrium, body and xiphoid process fused into one flat bone anchoring the ribs.', breakdown: ['Sternum 1 (3 parts fused)'], cats: ['bone'] },
  { id: 'pectoral', name: 'SHOULDER GIRDLE', system: 'SKELETON', color: '#a0ffd8', count: 4, group: 'APPENDICULAR', desc: 'Clavicles and scapulae connect the arms to the axial skeleton and give the shoulder its huge range of motion.', breakdown: ['Clavicle 2 · Scapula 2'], cats: ['bone', 'pain'] },
  { id: 'upper', name: 'ARMS & HANDS', system: 'SKELETON', color: '#ffc0c0', count: 60, group: 'APPENDICULAR', desc: 'Long lever bones of the arm plus 27 hand bones per side make fine manipulation possible.', breakdown: ['Per side 30 — Humerus · Radius · Ulna', 'Hand 27 — Carpals 8 · Metacarpals 5 · Phalanges 14'], cats: ['bone', 'pain'] },
  { id: 'pelvis', name: 'PELVIS', system: 'SKELETON', color: '#d0c0ff', count: 2, group: 'APPENDICULAR', desc: 'A bony basin at the base of the spine that carries the body\u2019s weight onto the legs and cradles the lower organs.', breakdown: ['Hip bone 2 — Ilium · Ischium · Pubis (fused)'], cats: ['bone', 'reproductive'] },
  { id: 'lower', name: 'LEGS & FEET', system: 'SKELETON', color: '#c0e8ff', count: 60, group: 'APPENDICULAR', desc: 'Femur, patella, tibia and fibula plus 26 foot bones per side — the longest and strongest bones in the body.', breakdown: ['Per side 30 — Femur · Patella · Tibia · Fibula', 'Foot 26 — Tarsals 7 · Metatarsals 5 · Phalanges 14'], cats: ['bone', 'pain'] },
  // ── cardiovascular ──
  { id: 'heart', name: 'HEART', system: 'CARDIOVASCULAR', color: '#ff3b3b', desc: 'A fist-sized muscular pump with four chambers that beats about 100,000 times a day, moving roughly 7,500 liters of blood.', cats: ['cardiovascular', 'blood'] },
  { id: 'aorta', name: 'AORTA', system: 'CARDIOVASCULAR', color: '#ff5a3b', desc: 'The body\u2019s largest artery, arching up from the left ventricle and running down through the chest and abdomen to feed every other artery.', cats: ['cardiovascular', 'blood'] },
  { id: 'arteries', name: 'ARTERIES', system: 'CARDIOVASCULAR', color: '#ff2a2a', desc: 'Thick, muscular vessels that carry oxygen-rich blood away from the heart under high pressure and branch out to the tissues.', cats: ['cardiovascular', 'blood'] },
  { id: 'veins', name: 'VEINS', system: 'CARDIOVASCULAR', color: '#4a6bff', desc: 'Thin-walled vessels that return oxygen-poor blood back to the heart, helped by one-way valves and the squeeze of nearby muscles.', cats: ['cardiovascular', 'blood', 'detox'] },
  // ── nervous ──
  { id: 'brain', name: 'BRAIN', system: 'NERVOUS', color: '#f7b8c8', desc: 'Roughly 86 billion neurons in three pounds of tissue: the seat of thought, sensation, movement, and memory.', cats: ['brainwave', 'mental', 'nervous'] },
  { id: 'cord', name: 'SPINAL CORD', system: 'NERVOUS', color: '#ffe066', desc: 'A rope of nerve tissue running down the spine that relays signals between the brain and the body and drives fast reflexes.', cats: ['nervous', 'pain'] },
  { id: 'nerves', name: 'NERVES', system: 'NERVOUS', color: '#ffd23b', desc: 'Bundled cables of neuron fibers that carry electrical signals between the central nervous system and every muscle, gland, and sense organ.', cats: ['nervous', 'pain'] },
  // ── organs ──
  { id: 'lungs', name: 'LUNGS', system: 'ORGANS', color: '#f4a3b0', desc: 'A pair of spongy organs with about 300 million alveoli, giving a gas-exchange surface the size of a tennis court.', cats: ['respiratory'] },
  { id: 'trachea', name: 'TRACHEA', system: 'ORGANS', color: '#d8d0e8', desc: 'The windpipe: a ringed tube that carries air from the throat down to the two bronchi of the lungs.', cats: ['respiratory'] },
  { id: 'thyroid', name: 'THYROID', system: 'ORGANS', color: '#e08a9a', desc: 'A butterfly-shaped gland at the front of the neck that sets the body\u2019s metabolic pace with the hormones it releases.', cats: ['glands'] },
  { id: 'diaphragm', name: 'DIAPHRAGM', system: 'ORGANS', color: '#d88a6a', desc: 'A dome of muscle beneath the lungs that flattens to pull air in and relaxes to push it out: the engine of breathing.', cats: ['respiratory'] },
  { id: 'liver', name: 'LIVER', system: 'ORGANS', color: '#a5442f', desc: 'The body\u2019s chemical plant: filters blood, makes bile, stores energy, and performs 500+ metabolic jobs.', cats: ['detox', 'digestive'] },
  { id: 'stomach', name: 'STOMACH', system: 'ORGANS', color: '#f0906a', desc: 'A muscular acid bath that churns food into a paste and begins protein digestion before the intestines.', cats: ['digestive'] },
  { id: 'spleen', name: 'SPLEEN', system: 'ORGANS', color: '#8a3050', desc: 'A fist-sized organ on the left under the ribs that filters the blood, recycles worn-out red cells, and helps mount immune defenses.', cats: ['immune', 'blood'] },
  { id: 'pancreas', name: 'PANCREAS', system: 'ORGANS', color: '#e8c08a', desc: 'A soft gland behind the stomach: pours digestive enzymes into the gut and releases insulin and glucagon to steer blood sugar.', cats: ['digestive', 'glands'] },
  { id: 'kidneys', name: 'KIDNEYS', system: 'ORGANS', color: '#8a2a2a', desc: 'Two bean-shaped filters that clean about 180 liters of blood a day, balancing water, salts, and pressure.', cats: ['kidney', 'detox'] },
  { id: 'adrenals', name: 'ADRENAL GLANDS', system: 'ORGANS', color: '#f0c040', desc: 'Two small glands capping the kidneys that release adrenaline for fight-or-flight and cortisol to manage stress, salt, and blood sugar.', cats: ['glands'] },
  { id: 'intestines', name: 'INTESTINES', system: 'ORGANS', color: '#f0a070', desc: 'The long, coiled tube past the stomach where most digestion and nearly all nutrient absorption happen, from small intestine to colon.', cats: ['digestive', 'detox'] },
  { id: 'bladder', name: 'BLADDER', system: 'ORGANS', color: '#e8d8a0', desc: 'A muscular reservoir in the pelvis that stores urine from the kidneys until it is released.', cats: ['kidney', 'reproductive'] },
];

export const BONE_TOTAL = STRUCTURES.filter(s => s.count).reduce((a, s) => a + (s.count || 0), 0);
export const AXIAL_TOTAL = STRUCTURES.filter(s => s.group === 'AXIAL').reduce((a, s) => a + (s.count || 0), 0);
export const APPENDICULAR_TOTAL = BONE_TOTAL - AXIAL_TOTAL;
