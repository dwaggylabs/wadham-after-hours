/* =============================================================================
   WADHAM AFTER HOURS — game content & config
   -----------------------------------------------------------------------------
   This is the ONLY file you need to edit to add your own people, anecdotes,
   quests and items. The engine (game.js) reads everything from here.

   COORDINATE SYSTEM (top-down):
     +X = EAST,  -X = WEST   (you enter from the WEST, off Parks Road)
     +Z = SOUTH, -Z = NORTH  (the gardens are to the NORTH)
     Units are roughly metres. Front Quad is centred on (0,0).
     These match the real relative arrangement of the college — tweak freely.

   HOW TO ADD A FRIEND:
     Copy one of the NPC objects in NPCS, give it a name, a position (drop it
     near the right building), a colour, and 2–4 anecdote lines. Done.
============================================================================= */

export const CONFIG = {
  title: "WADHAM AFTER HOURS",
  subtitle: "It's Tuesday. The gates are locked. Tuesgays awaits.",
  // Basic friends-only gate (NOT real security — the site URL is still public).
  passphrase: "queerfest",                // <-- change this; tell your friends
  passphrasePrompt: "Whisper the password to the Porter:",
  timeOfDay: "night",                     // night | golden | day

  // WHERE YOU WAKE UP. You're INSIDE the locked college (Front Quad) at night,
  // facing WEST at the barred gate tower — the whole point is to ESCAPE westward
  // out to the forecourt and on to Plush. (Put this somewhere east of the gate,
  // i.e. x greater than about -18, or the gate-lock won't make sense.)
  startPosition: { x: -8, z: 0 },         // Front Quad, just inside the gate
  startFacing: "west",                    // look straight at the locked gate tower
};

/* -----------------------------------------------------------------------------
   LOCATIONS — buildings/zones the engine should construct & label.
   type: "quad" (open court w/ lawn), "range" (building block), "garden", "marker".
   x,z = centre; w = width (X), d = depth (Z). h = approx height for buildings.
----------------------------------------------------------------------------- */
export const LOCATIONS = [
  // --- Approach & entrance (west, off Parks Road) ---
  { id: "forecourt",   name: "Forecourt",            type: "garden", x: -40, z: 0,  w: 30, d: 40 },
  { id: "gatetower",   name: "Porters' Lodge",       type: "range",  x: -22, z: 0,  w: 8,  d: 8,  h: 14, gate: true },

  // --- FRONT QUAD (square, three-storey ranges around a square lawn) ---
  { id: "frontquad",   name: "Front Quad",           type: "quad",   x: 0,   z: 0,  w: 44, d: 44 },
  { id: "westrange",   name: "West Range",           type: "range",  x: -22, z: 0,  w: 4,  d: 44, h: 12 },
  { id: "chapel",      name: "Chapel",               type: "range",  x: 22,  z: -12,w: 5,  d: 20, h: 16 }, // NE: garden passage runs past here
  { id: "hall",        name: "Hall",                 type: "range",  x: 22,  z: 12, w: 5,  d: 20, h: 14 },
  { id: "frontispiece",name: "The Frontispiece",     type: "marker", x: 20,  z: 0,  w: 4,  d: 4,  h: 18 }, // ornate centrepiece, statues
  // archway: true cuts a walk-through passage. archOffset shifts it along the
  // range's LONG axis (here +X = toward the chapel) so you exit at the NE corner,
  // "past the chapel", into the gardens. archGate: true makes it lockable (the
  // main gate). Tweak archOffset to move any passage.
  { id: "northrange",  name: "Warden's Lodgings",    type: "range",  x: 0,   z: -22,w: 44, d: 4,  h: 12, archway: true, archOffset: 15 }, // NE passage to the gardens
  { id: "southrange",  name: "SCR & South Range",    type: "range",  x: 0,   z: 22, w: 44, d: 4,  h: 12, archway: true }, // passage to Back Quad

  // --- BACK QUAD (rectangular, south of Front Quad) ---
  { id: "backquad",    name: "Back Quad",            type: "quad",   x: 0,   z: 52, w: 40, d: 30 },

  // --- GARDENS (north, via NE-corner passage past the chapel) ---
  { id: "fellowsgarden",name: "Fellows' Garden",     type: "garden", x: 6,   z: -56, w: 46, d: 50 }, // walled, lawn + big trees
  { id: "cloister",    name: "Cloister Garden",      type: "garden", x: 34,  z: -34, w: 18, d: 22 }, // W half = former cemetery
  { id: "privategarden",name: "Fellows' Private Garden", type: "garden", x: 6, z: -98, w: 44, d: 36 },
  { id: "terrace",     name: "Civil War Terrace",    type: "marker", x: 28,  z: -98, w: 4,  d: 36, h: 3 }, // raised earthwork walk
  { id: "wardensgarden",name: "Warden's Garden",     type: "garden", x: -28, z: -92, w: 30, d: 30 },

  // --- East & modern ---
  { id: "library",     name: "Library",              type: "range",  x: 50,  z: -30,w: 16, d: 26, h: 14 },
  { id: "webbquad",    name: "Webb Quad",            type: "quad",   x: 36,  z: 44, w: 30, d: 26 },
  { id: "jcr",         name: "JCR & Bar",            type: "range",  x: 18,  z: 44, w: 12, d: 10, h: 8 }, // Tuesgays pre-drinks happen here
  { id: "holywell",    name: "Holywell Music Room",  type: "range",  x: -10, z: 74, w: 16, d: 12, h: 10 },

  // --- The destination (off-site; just a glowing marker beyond the gate) ---
  { id: "plush",       name: "Plush",               type: "marker", x: -75, z: 30, w: 6,  d: 6,  h: 6, goal: true },
];

/* -----------------------------------------------------------------------------
   ITEMS — pickups and quest objects.
----------------------------------------------------------------------------- */
export const ITEMS = [
  { id: "key_bar",     name: "Brass key (JCR)",      foundAt: "jcr",          hint: "Someone left it by the beer fridge." },
  { id: "key_garden",  name: "Brass key (Garden)",   reward: "invisible_college", hint: "Wilkins hands it over once the Royal Society reconvenes." },
  { id: "key_chapel",  name: "Brass key (Chapel)",   reward: "founders_blessing", hint: "The Founder's gift." },
  { id: "bodcard",     name: "Your Bod card",        foundAt: "fellowsgarden", hint: "You dropped it under a tree, obviously." },
  { id: "collegedrink",name: "The Wadham college drink", foundAt: "jcr",      hint: "Sticky, blue, regrettable. Essential." },
  { id: "subfusc",     name: "Subfusc & gown",       foundAt: "backquad",     hint: "Optional drip for the dancefloor." },
  // Wren's three garden curiosities (for the Invisible College quest):
  { id: "apiary",      name: "Glass apiary",         foundAt: "fellowsgarden", hint: "Wren's transparent beehive." },
  { id: "statue",      name: "Speaking statue",      foundAt: "fellowsgarden", hint: "It mutters when you pass." },
  { id: "rainbow",     name: "Artificial rainbow",   foundAt: "fellowsgarden", hint: "Made of misted water." },
];

/* -----------------------------------------------------------------------------
   QUESTS
   requires: item ids needed to complete. unlocks: item/quest ids granted.
----------------------------------------------------------------------------- */
export const QUESTS = [
  {
    id: "after_hours",
    title: "After Hours",
    type: "main",
    brief: "The gates are locked. Find 3 brass keys and your Bod card, then open the Porters' Lodge.",
    requires: ["key_bar", "key_garden", "key_chapel", "bodcard"],
    unlocks: ["gate_open"],
  },
  {
    id: "invisible_college",
    title: "The Invisible College",
    type: "side",
    brief: "Help Warden Wilkins find Wren's curiosities in the Fellows' Garden to reconvene the Royal Society.",
    requires: ["apiary", "statue", "rainbow"],
    unlocks: ["key_garden"],
    giver: "wilkins",
  },
  {
    id: "founders_blessing",
    title: "The Founder's Blessing",
    type: "side",
    brief: "Find Dorothy Wadham in the ante-chapel.",
    unlocks: ["key_chapel"],
    giver: "dorothy",
  },
  {
    id: "tuesgays",
    title: "Tuesgays",
    type: "win",
    brief: "Out at last. Rally your friends, grab the college drink, and get to Plush.",
    requires: ["gate_open", "collegedrink"],         // + talk to every friend NPC
    requiresAllFriends: true,
    goalMarker: "plush",
    winText: "You burst into Plush as the drag host calls your name. The night is yours. 🪩",
  },
];

/* -----------------------------------------------------------------------------
   NPCS
   - Historical figures are written out (they're long dead — fair game).
   - FRIENDS are placeholders: drop in real first names/nicknames + anecdotes.
     Ask people before you put them in, and keep it the kind of ribbing they'd
     enjoy a stranger reading, since the site URL is effectively public.
----------------------------------------------------------------------------- */
export const NPCS = [
  // ---- Historical / flavour NPCs ----
  {
    id: "porter",
    name: "The Porter",
    at: "gatetower",
    colour: "#1b3a2f",
    role: "gatekeeper",
    lines: [
      "Lodge is shut, I'm afraid. No card, no exit.",
      "Find your keys and your Bod card and we'll see.",
      "Off to Tuesgays again? ...Mind how you go.",
    ],
  },
  {
    id: "dorothy",
    name: "Dorothy Wadham (Founder)",
    at: "chapel",
    colour: "#5b4a7a",
    role: "oracle",
    questGiver: "founders_blessing",
    lines: [
      "I founded this place in 1610, you know. Built in three years flat.",
      "I never set foot in Oxford in my life — ran it all by letter from Somerset.",
      "Take my key, child. Go and enjoy yourself. The Hall will still be here Wednesday.",
    ],
  },
  {
    id: "wilkins",
    name: "Warden John Wilkins",
    at: "fellowsgarden",
    colour: "#2f4f6f",
    role: "questgiver",
    questGiver: "invisible_college",
    lines: [
      "Find me Wren's apiary, his speaking statue and his artificial rainbow.",
      "We met in this very garden — the meetings that became the Royal Society.",
      "Reconvene the Invisible College and the garden key is yours.",
    ],
  },

  // ---- YOUR FRIENDS (placeholders — edit these) ----
  // TODO: replace name / at / colour / lines with real people & real anecdotes.
  {
    id: "friend1",
    name: "FRIEND 1",            // e.g. a flatmate — put them near the JCR or their staircase
    at: "jcr",
    colour: "#a23b3b",
    role: "friend",              // friends must all be spoken to for the Tuesgays win
    lines: [
      "ANECDOTE LINE 1 — the running joke about this person.",
      "ANECDOTE LINE 2 — a thing they always say.",
      "Right, are we going or what? Grab the drink.",
    ],
  },
  {
    id: "friend2",
    name: "FRIEND 2",            // e.g. drop someone in the Fellows' Garden or Back Quad
    at: "backquad",
    colour: "#c98a2b",
    role: "friend",
    lines: [
      "ANECDOTE LINE 1.",
      "ANECDOTE LINE 2.",
    ],
  },
  {
    id: "friend3",
    name: "FRIEND 3",            // e.g. a musician friend works nicely at the Holywell Music Room
    at: "holywell",
    colour: "#2b8a6b",
    role: "friend",
    lines: [
      "ANECDOTE LINE 1.",
      "ANECDOTE LINE 2.",
    ],
  },
  // ...copy this block for as many friends as you like.
];

/* -----------------------------------------------------------------------------
   NOTES FOR THE BUILDER (Claude Code):
   - Treat LOCATIONS as the source of truth for placement; build simple boxes.
   - Spawn each ITEM at its foundAt location (small glowing pickup) unless it has
     a `reward` (granted by completing a quest instead).
   - Spawn each NPC at its `at` location with a floating name label.
   - "Talk" = proximity + interact key (E) / tap. Show lines in a dialogue box.
   - The Tuesgays win requires: gates open + college drink + every role:"friend"
     NPC talked to, then reaching the `plush` marker.
----------------------------------------------------------------------------- */
