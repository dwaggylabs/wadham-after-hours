/* =============================================================================
   WADHAM AFTER HOURS — game content & config
   -----------------------------------------------------------------------------
   Edit THIS file to change people, places, anecdotes, quests and the passphrase.
   The engine (game.js) reads everything from here.

   COORDINATES (top-down):  +X = EAST,  -X = WEST,  +Z = SOUTH,  -Z = NORTH.
   Front Quad centred on (0,0). Enclosed campus (you can only leave via the gate):
       FRONT QUAD — one continuous medieval ring; a TUNNEL through the N range
         (NE corner) leads north to the gardens; the two S corners lead to the
         Back Quad; the gate is W.
       GARDENS — fellows+cloister are ONE open L-shaped garden wrapping the N and
         E of the Front Quad (no south wall — the college/terrace bounds it); its
         EAST wall joins the Library. Warden's & Private gardens are LOCKED rooms
         off it. Reached only by the Front Quad N tunnel.
       BACK QUAD — directly SOUTH, fully enclosed (N range, W brick range, S
         range, E = the AC). The ONLY ways out are the Front Quad (N) and a
         ground TUNNEL east THROUGH the AC (the gap between its two parts) to the
         Bar Quad.
       AC/LSK — glass (the only glass), two parts with an E–W ground tunnel
         between them.
       RAISED TERRACE (~2.4 m) — N of the AC; stairs up from the Back Quad. Walk
         it east; N end = the LIBRARY (brown glass, south-entry only, its N wall =
         the Fellows' Garden wall); BOWRA (brick) is the east run. The BAR QUAD
         is a raised court reached by stairs up (eastward) from the AC tunnel.
       Fences seal the Cloister from the terrace. Perimeter ranges enclose the S.
       Plush off-site, W down Broad St then left down Cornmarket.
============================================================================= */

export const CONFIG = {
  title: "WADHAM AFTER HOURS",
  subtitle: "It's Tuesday. The gates are locked. Tuesgays awaits.",
  passphrase: "queerfest",
  passphrasePrompt: "Whisper the password to the Porter:",
  timeOfDay: "night",

  startPosition: { x: -6, z: 0 },
  startFacing: "west",

  friendsNeeded: 7,

  plushMusicUrl: "",
  plushMusicVolume: 0.55,
};

/* -----------------------------------------------------------------------------
   LOCATIONS
   type: "quad" | "garden" | "range" | "marker" | "modern" | "gate" | "goal"
         | "spot" (invisible anchor)
   x,z = centre; w = width(X), d = depth(Z); h = height.
   Optional: archway+archOffset, arches:[..], gate:true, raised:true,
             glass:true (+ optional tint:0xRRGGBB), brick:true, cupola:true,
             ring:{t,h,gaps:[{side,at,width,arch?}]}.
   Garden/perimeter walls are authored in WALLS (below).
----------------------------------------------------------------------------- */
export const LOCATIONS = [
  // ---------------- APPROACH (west, off Parks Road) ----------------
  { id: "forecourt",  name: "Forecourt",          type: "garden", x: -36, z: 0,  w: 20, d: 30 },
  { id: "gatetower",  name: "Porters' Lodge",      type: "gate",   x: -19, z: 0,  w: 8,  d: 8,  h: 16, gate: true },

  // ============ FRONT QUAD — ONE continuous medieval ring ============
  // Gaps: W gate, S×2 corners (→ Back Quad), N (a TUNNEL through the range → gardens).
  { id: "frontquad",  name: "Front Quad",          type: "quad",   x: 0, z: 0, w: 38, d: 38,
      ring: { t: 5, h: 13, gaps: [
        { side: "w", at: 0,   width: 7 },
        { side: "s", at: -13, width: 6, arch: true },   // tunnel through the range → Back Quad
        { side: "s", at: 13,  width: 6, arch: true },   // tunnel through the range → Back Quad
        { side: "n", at: 13,  width: 6, arch: true },   // tunnel through the range → gardens
      ] } },
  { id: "chapel",     name: "Chapel & Old Library", type: "spot",  x: 16, z: -9 },
  { id: "hall",       name: "Hall",                type: "spot",   x: 16, z: 9 },

  // ============ BACK QUAD — directly SOUTH, fully enclosed ============
  { id: "backquad",   name: "Back Quad",           type: "quad",   x: 0, z: 48, w: 32, d: 26 },   // lawn x-16..16, z35..61
  { id: "bq-north",   name: "Back Quad (N range)",  type: "range",  x: 6, z: 35, w: 46, d: 3, h: 12, arches: [-13, 13] }, // x-17..29
  { id: "bq-west",    name: "Back Quad (W brick range)", type: "range", x: -16, z: 48, w: 4, d: 26, h: 11, brick: true },
  { id: "bq-south",   name: "Back Quad (S range)",  type: "range",  x: 6, z: 61, w: 46, d: 3, h: 11 }, // x-17..29

  // ---- AC / LSK — GLASS, two parts with an E–W ground TUNNEL between them ----
  // L-shape: a north arm + a west arm, with an E–W TUNNEL (z42..47) between them
  // where they join — that's the back-quad↔bar passage; the open SE lets you walk around it.
  { id: "ac",  name: "AC (north range)", type: "modern", x: 48, z: 38, w: 38, d: 8,  h: 13, glass: true }, // x29..67, z34..42 (north arm)
  { id: "lsk", name: "LSK (west range)",  type: "modern", x: 34, z: 55, w: 10, d: 16, h: 13, glass: true }, // x29..39, z47..63 (west arm)

  // ============ RAISED TERRACE (~2.4 m) — Library + Bowra ============
  { id: "library", name: "Ferdowsi Library", type: "modern", x: 84, z: -8, w: 20, d: 14, h: 14, raised: true, glass: true, tint: 0x6f4a2c }, // brown glass, N end
  { id: "bowra",   name: "Bowra Building",   type: "modern", x: 99, z: 12, w: 10, d: 44, h: 16, raised: true, brick: true },                  // brick, east run

  // ============ BAR QUAD — raised; reached by stairs up (eastward) from the AC tunnel
  { id: "barquad", name: "Bar Quad", type: "quad", x: 82, z: 49, w: 26, d: 30, raised: true },   // x69..95, z34..64

  // ============ GARDENS (north; lawns only — walls in WALLS) ============
  // fellows + cloister = one open L-shaped garden (N + E of the Front Quad).
  { id: "cloister",      name: "Cloister Garden",  type: "garden", x: 48, z: -4,  w: 48, d: 40 },  // east arm  x24..72, z-24..16 (lit, trees)
  { id: "fellowsgarden", name: "Fellows' Garden",  type: "garden", x: 13, z: -56, w: 74, d: 64 },  // north arm x-24..50, z-88..-24
  { id: "wardensgarden", name: "Warden's Garden",  type: "garden", x: -43, z: -64, w: 38, d: 28 }, // x-62..-24, z-78..-50 (LOCKED)
  { id: "privategarden", name: "Fellows' Private Garden", type: "garden", x: 13, z: -106, w: 74, d: 36 }, // x-24..50, z-124..-88 (LOCKED)

  // ============ PERIMETER ranges — enclose the college ============
  { id: "southrange", name: "Southern Range", type: "range", x: 37, z: 86, w: 122, d: 9, h: 12 }, // x-24..98
  { id: "sw-link",    name: "SW Range",       type: "range", x: -22, z: 55, w: 4, d: 66, h: 12 }, // x-24..-20, z22..88 — seals the west (only the gate gets you out W)
  { id: "se-link",    name: "SE Range",       type: "range", x: 102, z: 40, w: 8, d: 96, h: 12 }, // x98..106, z-8..88 — seals the east

  // ---------------- PLUSH (off-site, down Broad St & Cornmarket) ------------
  { id: "plush",      name: "PLUSH",               type: "goal",   x: -70, z: 28, w: 8, d: 8, h: 7, goal: true },
];

/* -----------------------------------------------------------------------------
   RAISED — terrace (Library + Bowra) + the raised Bar Quad. steps:"none" → STEPS.
----------------------------------------------------------------------------- */
export const RAISED = [
  { x: 60, z: 27, w: 70, d: 14, y: 2.4, steps: "none" },  // terrace arm N of the AC: x25..95, z20..34
  { x: 84, z: 2,  w: 20, d: 48, y: 2.4, steps: "none" },  // terrace arm up to the Library: x74..94, z-22..26
  { x: 82, z: 49, w: 26, d: 30, y: 2.4, steps: "none" },  // raised Bar Quad: x69..95, z34..64 (abuts the terrace at z34)
];

/* -----------------------------------------------------------------------------
   STEPS — ramps onto the raised terrace / bar.
----------------------------------------------------------------------------- */
export const STEPS = [
  { x: 27, z: 30, w: 8, d: 10, axis: "x", high: "e", y: 2.4 },  // Back Quad (NW of AC) up onto the terrace
  { x: 66, z: 47, w: 8, d: 8,  axis: "x", high: "e", y: 2.4 },  // AC tunnel up (eastward) into the Bar Quad
];

/* -----------------------------------------------------------------------------
   FENCES — impassable iron railings (collider + rail).
----------------------------------------------------------------------------- */
export const FENCES = [
  { x: 48, z: 20.5, w: 48, d: 1 },  // ON the terrace's north edge — seals the Cloister off from the terrace
  { x: 75, z: -2,   w: 1,  d: 40 }, // ON the terrace's west edge up to the Library — cloister side
  { x: 84, z: -16,  w: 22, d: 1 },  // Library north side (south-entry only)
];

/* -----------------------------------------------------------------------------
   WALLS — authored stone walls: ONE continuous outer wall for the garden block
   (no south wall — the college/terrace bounds it; the E wall joins the Library) +
   single gated dividers for the two LOCKED gardens. locked:true,key → iron gate.
----------------------------------------------------------------------------- */
export const WALLS = [
  // Private garden (north of fellows) — outer + locked divider
  { x: 13,   z: -124, w: 74, d: 1 },                 // north
  { x: -24,  z: -106, w: 1,  d: 36 },                // west
  { x: 50,   z: -106, w: 1,  d: 36 },                // east
  { x: -7.5, z: -88,  w: 33, d: 1 },                 // divider z-88: x-24..9 (meets the gate at x9)
  { x: 13,   z: -88,  w: 8,  d: 1, locked: true, key: "key_private", name: "Fellows' Private Garden" },
  { x: 33.5, z: -88,  w: 33, d: 1 },                 // divider: x17..50
  // Fellows garden outer (north arm)
  { x: 50,   z: -56,  w: 1,  d: 64 },                // east (z-88..-24)
  { x: -24,  z: -83,  w: 1,  d: 10 },                // west, below warden's (z-88..-78)
  { x: -24,  z: -37,  w: 1,  d: 26 },                // west, above warden's (z-50..-24)
  // (fellows SOUTH at x-24..24 = the Front Quad N range; no wall. Tunnel access at x13.)
  // Warden's garden (west bump) — locked divider + outer
  { x: -24,  z: -73,  w: 1,  d: 10 },                // divider z-78..-68
  { x: -24,  z: -64,  w: 1,  d: 8, locked: true, key: "key_wardens", name: "Warden's Garden" },
  { x: -24,  z: -55,  w: 1,  d: 10 },                // divider z-60..-50
  { x: -62,  z: -64,  w: 1,  d: 28 },                // west
  { x: -43,  z: -78,  w: 38, d: 1 },                 // north
  { x: -43,  z: -50,  w: 38, d: 1 },                 // south
  // Cloister garden (east arm) — N stub (east of fellows) + east wall joining the Library
  { x: 61,   z: -24,  w: 22, d: 1 },                 // north stub x50..72
  { x: 73,   z: -4,   w: 1,  d: 40 },                // east wall x73, z-24..16 — joins the Library
  // (cloister WEST at x24 = the Front Quad E range; cloister SOUTH = FENCE, above.)
];

/* -----------------------------------------------------------------------------
   STREET to Plush.
----------------------------------------------------------------------------- */
export const STREET = {
  path: [ {x:-24,z:0}, {x:-56,z:0}, {x:-56,z:32} ],
  signs: [
    { x:-40, z:-5, text:"Broad Street",      face:"s" },
    { x:-61, z:14, text:"Cornmarket Street", face:"e" },
  ],
  shops: [ [-46,-7,10,8], [-34,-8,10,8], [-61,8,9,9], [-61,24,9,9], [-48,38,12,9] ],
};

/* -----------------------------------------------------------------------------
   TREES
----------------------------------------------------------------------------- */
export const TREES = [
  { x:0, z:48, s:2.2, kind:"plane" },      // the great Back Quad plane tree
  { x:48, z:-4, s:1.5 }, { x:40, z:6, s:1.3 }, { x:60, z:-14, s:1.4 },   // cloister (lit + trees)
  { x:10, z:-56, s:1.9 }, { x:-8, z:-72, s:1.5 }, { x:34, z:-44, s:1.5 }, { x:-14, z:-40, s:1.4 },
  { x:13, z:-106, s:1.7 }, { x:-8, z:-112, s:1.3 },
  { x:-43, z:-64, s:1.6 }, { x:-50, z:-58, s:1.4 },
];

/* -----------------------------------------------------------------------------
   MAGGIE MAE — dog poo you can step in.
----------------------------------------------------------------------------- */
export const POO = [ {x:3, z:46}, {x:-4, z:52}, {x:6, z:55} ];

/* -----------------------------------------------------------------------------
   ITEMS
----------------------------------------------------------------------------- */
export const ITEMS = [
  { id: "key_bar",    name: "Brass key (Bar)",     foundAt: "barquad",      hint: "On the Penrose tiling by the bar, in a puddle of snakebite." },
  { id: "key_garden", name: "Brass key (Garden)",  reward: "invisible_college", hint: "Wilkins hands it over once his dead-scientists club is quorate." },
  { id: "key_chapel", name: "Brass key (Chapel)",  reward: "founders_blessing", hint: "Dorothy's gift. She's dead, bored, generous." },
  { id: "bodcard",    name: "Your Bod card",       foundAt: "fellowsgarden", hint: "Dropped in the Fellows' Garden under a tree, obviously." },
  { id: "collegedrink",name:"The college drink",   foundAt: "barquad",      hint: "Sticky, blue, faintly radioactive. The bar insists it's a cocktail." },
  { id: "book",       name: "Violet's book",       reward: "violet",        hint: "Pressed on you by Violet. You will not read it." },
  { id: "game",       name: "Anjali's card game",  reward: "anjali",        hint: "Anjali swears it 'takes two minutes'. It does not." },
  { id: "key_wardens",name: "Iron key (Warden's)", foundAt: "fellowsgarden", hint: "Half-buried in the Fellows' Garden. Opens the Warden's Garden gate." },
  { id: "key_private",name: "Iron key (Private)",  foundAt: "wardensgarden", hint: "Hidden in the Warden's Garden. Opens the Fellows' Private Garden." },
  { id: "apiary",     name: "Glass apiary",        foundAt: "fellowsgarden", hint: "Wren's transparent beehive. Built it BEFORE St Paul's." },
  { id: "statue",     name: "Speaking statue",     foundAt: "fellowsgarden", hint: "A statue that mutters as you pass. Normal garden stuff, per Wilkins." },
  { id: "rainbow",    name: "Artificial rainbow",  foundAt: "privategarden", hint: "A machine that makes a rainbow from mist. More reliable than the WiFi." },
];

/* -----------------------------------------------------------------------------
   QUESTS
----------------------------------------------------------------------------- */
export const QUESTS = [
  { id: "after_hours", title: "After Hours", type: "main",
    brief: "The gates are locked, obviously. Find 3 brass keys and your Bod card, then sweet-talk the Porter into springing the Lodge.",
    requires: ["key_bar","key_garden","key_chapel","bodcard"], unlocks: ["gate_open"] },
  { id: "invisible_college", title: "The Invisible College", type: "side",
    brief: "Warden Wilkins wants Wren's three garden gadgets found so his Invisible College can pretend to be a real scientific society again. One's locked away in the Private Garden — you'll need the garden keys. Reward: a key.",
    requires: ["apiary","statue","rainbow"], unlocks: ["key_garden"], giver: "wilkins" },
  { id: "founders_blessing", title: "The Founder's Blessing", type: "side",
    brief: "Dorothy Wadham is haunting the ante-chapel. She founded the place and never once visited; the least she can do is hand over a key.",
    unlocks: ["key_chapel"], giver: "dorothy" },
  { id: "tuesgays", title: "Tuesgays", type: "win",
    brief: "Out at last. Round up your friends, grab the regrettable blue drink, and get to Plush — down Broad Street, left down Cornmarket, on your right.",
    requires: ["gate_open","collegedrink"], requiresAllFriends: true, goalMarker: "plush",
    winText: "You spill down the stairs into Plush as the DJ drops the one song everyone pretends not to know every word of. Three Jägerbombs for a fiver. Your friends are already on the dancefloor — Eva mid-rant about the Normans, Megan ordering in Spanish, Rupert filming it, Eleanor showing everyone a photo of Stubby. The gates, the keys, the thesis, the dog poo, that creep Arran — none of it followed you here. The night is entirely, gloriously yours. 🪩" },
];

/* -----------------------------------------------------------------------------
   NPCS
   role: "gatekeeper" | "oracle" (ghost) | "questgiver" | "friend" | "flavour"
   action: "elfbar" | "givebook" | "givegame" | "dog" | "singer"
   villain:true → chases the player; on close contact forces a ketamine impairment.
----------------------------------------------------------------------------- */
export const NPCS = [
  // ===================== KEEPERS OF THE LORE (the dead) =====================
  { id:"porter", name:"The Porter", at:"gatetower", colour:"#2f5d45", role:"gatekeeper", lines:[
    "Lodge is shut. No Bod card, no exit. I don't make the rules — I enforce them with quiet joy.",
    "Three brass keys and your Bod card. Same shopping list as everyone bunking out for Tuesgays since 2010.",
    "And no, you can't climb out. Bowra did it for thirty years and look where it got him." ] },
  { id:"dorothy", name:"Dorothy Wadham, Foundress", at:"chapel", colour:"#6b5a86", role:"oracle", ghost:true, questGiver:"founders_blessing", lines:[
    "Dorothy Wadham. I founded this college in 1610 and ran it eight years by post — from Somerset. Never once set foot in Oxford.",
    "Built in three years, paid to the penny, every brick by letter. Do you know how hard it is to micromanage masons you've never met?",
    "Yes, take the chapel key. Go and dance. The Hall will still be here Wednesday, full of people pretending to read." ] },
  { id:"wilkins", name:"Warden John Wilkins", at:"fellowsgarden", colour:"#3a6f9a", role:"questgiver", questGiver:"invisible_college", lines:[
    "John Wilkins, Warden. In the 1650s I had Boyle, Hooke, Locke and young Wren in my lodgings doing 'experiments'. We called it the Invisible College.",
    "Wren left three toys in these gardens: a glass beehive, a statue that talks, and an engine that makes rainbows. The rainbow's locked away in the Private Garden — find the keys.",
    "Bring me all three and the garden key is yours. Mind the telescope bolted to the tower — I'll know if you touch it." ] },
  { id:"bowra", name:"Warden Maurice Bowra", at:"barquad", colour:"#8a6a3a", role:"oracle", ghost:true, lines:[
    "Bowra. Warden thirty-two years. They named that brick monstrosity behind me after me. I'd have preferred a decent claret.",
    "Caught a boy climbing in once — hid behind my sofa three hours. I said: 'turn the lights off before you go, there's a good fellow.'",
    "Off to Tuesgays? In my day we called Tuesday 'Tuesday'. We were less honest and far worse dressed." ] },

  // ===================== YOUR FRIENDS (rally all 7 to win) ==================
  { id:"zoe", name:"Zoe Tockman", at:"backquad", colour:"#3b7d5a", hair:"#d9622b", role:"friend", action:"elfbar", lines:[
    "Oh thank GOD a friendly face. You look like you need a break — here, have some of my Elf Bar.",
    "Watermelon ice. It's basically a personality at this point. Don't tell my tute partner.",
    "Right — find the others, get the drink, and I'll see you on the Plush dancefloor. Save me a Jägerbomb." ] },
  { id:"eva", name:"Eva Price", at:"frontquad", colour:"#7a4a2a", hair:"#5a3a1e", role:"friend", lines:[
    "Eva. History. Did you KNOW the Normans basically invented the Oxford tutorial just to make us all miserable? Anyway.",
    "I've written four thousand words on a peasant who definitely didn't exist. The medievalists are the most unhinged people in this college and I include myself.",
    "Tuesgays? Obviously. Let me just finish being furious about the Domesday Book and I'm there." ] },
  { id:"megan", name:"Megan James", at:"barquad", colour:"#c98a2b", hair:"#e8d27a", role:"friend", lines:[
    "¡Hola! Megan. Sí, blonde, sí, I did my year abroad and now I can't stop. It's insufferable, lo sé.",
    "I will translate the entire club to you whether you want it or not. 'Tuesgays' doesn't translate. I've tried.",
    "Vámonos — grab the drink and meet me there. ¡No llegues tarde!" ] },
  { id:"violet", name:"Violet Littlewood", at:"library", colour:"#5a6f8a", glasses:true, role:"friend", action:"givebook", lines:[
    "Violet. Yes, the library, yes, it's a 1977 concrete car park that thinks it's a cathedral. I love it.",
    "Here — take this. You absolutely won't read it but I refuse to be the only one carrying a book to a nightclub.",
    "Find me at Plush. I'll be the one judging the DJ's transitions." ] },
  { id:"rupert", name:"Rupert Hill", at:"backquad", colour:"#a23b3b", hair:"#3a2a1a", role:"friend", lines:[
    "Mate. MATE. Stand there a sec — no, the light's better — I'm doing a 'get ready with me to escape college' and you're in it now.",
    "Forty thousand followers think I have my life together. I am currently locked in my own college at 11pm. The irony is the content.",
    "Tuesgays vlog is going to go OFF. Get the drink, I'll get the B-roll, see you there." ] },
  { id:"anjali", name:"Anjali Cheung", at:"barquad", colour:"#2b8a6b", hair:"#1a1a1a", role:"friend", action:"givegame", lines:[
    "Anjali! Perfect timing, I need a fourth — here, take a set, it takes two minutes, I promise.",
    "It does not take two minutes. Nothing I love takes two minutes. But you're committed now, sorry.",
    "Okay GO, get everyone, get the drink — and we finish the round at Plush. No backing out." ] },
  { id:"eleanor", name:"Eleanor Miller", at:"frontquad", colour:"#b0617f", hair:"#6a4a2a", role:"friend", lines:[
    "Eleanor! Oh my god — have you seen Stubby? The pigeon. One leg, no fear, absolute menace of the Front Quad.",
    "He stole a whole panini off a finalist mid-collections, then stood ON the exam timetable like he owned it. There's a JCR motion to make him an honorary fellow. It's passing.",
    "I'm in for Tuesgays, obviously — but if Stubby's at the Lodge we're bringing him. He's seen things. He deserves a night out." ] },

  // ===================== CAMEOS ========================
  { id:"rosamund", name:"Rosamund Pike", at:"frontquad", colour:"#9a7faa", hair:"#c9b27a", role:"flavour", lines:[
    "Rosamund. Yes, I read English here. No, I will not 'do the line from Gone Girl'. It's a Tuesday.",
    "People think Oxford is all punting and Pimm's. It's mostly crying in this exact quad. Builds range, darling." ] },
  { id:"felicity", name:"Felicity Jones", at:"backquad", colour:"#8a6f9a", hair:"#4a3320", role:"flavour", lines:[
    "Felicity. English, Wadham. Did a film about stealing the Death Star plans; couldn't steal a library book without a fine.",
    "Best advice I got here: nobody has read the whole reading list. Nobody. Go to the bop." ] },

  // ===================== ENCOUNTERS =========================================
  { id:"arran", name:"Arran", at:"backquad", colour:"#3a2030", hair:"#141414", role:"flavour", villain:true, lines:[
    "Oi. Oi — where you off to? Don't be like that. I've got something for you.",
    "Just a little bump, yeah? For the nerves. You look tense. Locked in all night, anyone would be.",
    "Run round these quads all you like, mate. I'll find you. I always do." ] },
  { id:"finn", name:"Finn Grammaticas", at:"chapel", colour:"#6a5a8a", hair:"#2a1a0a", role:"flavour", action:"singer", lines:[
    "(Finn is mid-rehearsal in the ante-chapel, eyes closed, absolutely going for it.)",
    "Finn. Choir. We've got Evensong in eight hours and I have not slept. The acoustics in here though — listen.",
    "Tuesgays after? One hundred percent. I contain multitudes: plainchant AND poppers." ] },
  { id:"maggie", name:"Maggie Mae", at:"backquad", colour:"#caa472", dog:true, role:"flavour", action:"dog", lines:[
    "(Maggie Mae, the college dog, regards you with profound, ancient judgement.)",
    "She woofs once. It is somehow both a greeting and a warning.",
    "(Mind where you tread near her. Genuinely.)" ] },
];
