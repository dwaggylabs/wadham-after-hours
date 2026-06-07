/* =============================================================================
   WADHAM AFTER HOURS — game content & config
   -----------------------------------------------------------------------------
   Edit THIS file to change people, places, anecdotes, quests and the passphrase.
   The engine (game.js) reads everything from here.

   COORDINATES (top-down):  +X = EAST,  -X = WEST,  +Z = SOUTH,  -Z = NORTH.
   Front Quad is centred on (0,0). Simplified, enclosed campus:
       FRONT QUAD — one continuous medieval ring (crenellated, gate tower W,
         tall windows). Garden access leaves through the NE corner heading NORTH.
       BACK QUAD — directly SOUTH of the Front Quad (entered via its SE/SW
         corners). It also connects EAST to the Bar Quad along a ground passage
         SOUTH of the AC/LSK.
       AC/LSK — glass (the only glass), an L of two rectangles (open SE corner =
         the E–W ground passage); its N and W walls bound the Back Quad's east.
       RAISED TERRACE (~2.4 m) — north of the AC; you climb stairs onto it and
         follow it east, then fork NORTH to the LIBRARY (brown glass; its north
         side is the Fellows' Garden wall) or SOUTH past BOWRA (brick). A fence
         seals the Cloister Garden off from the terrace.
       BAR QUAD — east, surrounded by buildings; reached from the Back Quad
         (ground, south of the AC) and from the terrace (stairs down).
       GARDENS — north, one continuous outer wall; cloister↔fellows are one open
         space; warden's & private gardens are LOCKED rooms behind gated dividers.
       Holywell SW. Plush off-site, W down Broad St then left down Cornmarket.
============================================================================= */

export const CONFIG = {
  title: "WADHAM AFTER HOURS",
  subtitle: "It's Tuesday. The gates are locked. Tuesgays awaits.",
  passphrase: "queerfest",                 // friends-only splash; tell your mates
  passphrasePrompt: "Whisper the password to the Porter:",
  timeOfDay: "night",

  startPosition: { x: -6, z: 0 },
  startFacing: "west",

  friendsNeeded: 7,                        // talk to every role:"friend" NPC (now incl. Eleanor)

  plushMusicUrl: "",
  plushMusicVolume: 0.55,
};

/* -----------------------------------------------------------------------------
   LOCATIONS
   type: "quad" | "garden" | "range" | "marker" | "modern" | "gate" | "goal"
         | "spot" (invisible anchor point for NPCs/quests)
   x,z = centre; w = width(X), d = depth(Z); h = height.
   Optional: archway+archOffset, arches:[..], gate:true, raised:true,
             glass:true (+ optional tint:0xRRGGBB), brick:true, cupola:true,
             ring:{t,h,gaps:[{side,at,width}]} (Front Quad ring).
   Garden/perimeter walls are authored in WALLS (below), not per-location.
----------------------------------------------------------------------------- */
export const LOCATIONS = [
  // ---------------- APPROACH (west, off Parks Road) ----------------
  { id: "forecourt",  name: "Forecourt",          type: "garden", x: -36, z: 0,  w: 20, d: 30 },
  { id: "gatetower",  name: "Porters' Lodge",      type: "gate",   x: -19, z: 0,  w: 8,  d: 8,  h: 16, gate: true },

  // ============ FRONT QUAD — ONE continuous medieval ring ============
  // Gaps: W gate, the two S corners (→ Back Quad), and the NE corner (→ gardens,
  // heading north along the path). chapel/hall are invisible anchor spots.
  { id: "frontquad",  name: "Front Quad",          type: "quad",   x: 0, z: 0, w: 38, d: 38,
      ring: { t: 5, h: 13, gaps: [
        { side: "w", at: 0,   width: 7 },     // the gate (Porters' Lodge)
        { side: "s", at: -13, width: 6 },     // SW corner → Back Quad
        { side: "s", at: 13,  width: 6 },     // SE corner → Back Quad
        { side: "n", at: 13,  width: 6 },     // NE corner → north to the gardens
      ] } },
  { id: "chapel",     name: "Chapel & Old Library", type: "spot",  x: 16, z: -9 },   // anchor: Dorothy, Finn
  { id: "hall",       name: "Hall",                type: "spot",   x: 16, z: 9 },     // anchor

  // ============ BACK QUAD — directly SOUTH of the Front Quad ============
  { id: "backquad",   name: "Back Quad",           type: "quad",   x: 0, z: 48, w: 32, d: 26 },   // x-16..16, z35..61
  { id: "bq-north",   name: "Back Quad (N range)",  type: "range",  x: 0, z: 35, w: 32, d: 3, h: 12, arches: [-13, 13] },
  { id: "bq-west",    name: "Back Quad (W brick range)", type: "range", x: -16, z: 48, w: 4, d: 26, h: 11, brick: true },
  { id: "bq-south",   name: "Back Quad (S range)",  type: "range",  x: 0, z: 61, w: 32, d: 3, h: 11 },

  // ---- AC / LSK — GLASS, an L of two rectangles (SE corner open = passage) ----
  // Keeps its N edge (z35) and W edge (x29); the open SE corner is the E–W
  // ground passage linking the Back Quad (W) to the Bar Quad (E), south of it.
  { id: "ac",  name: "AC (north range)", type: "modern", x: 46, z: 39, w: 34, d: 8,  h: 13, glass: true }, // x29..63, z35..43
  { id: "lsk", name: "LSK (west range)", type: "modern", x: 34, z: 52, w: 10, d: 18, h: 13, glass: true }, // x29..39, z43..61

  // ============ RAISED TERRACE (~2.4 m) — Library + Bowra ============
  // Climb stairs on the AC side; follow east; fork N to the Library or S past Bowra.
  { id: "library", name: "Ferdowsi Library", type: "modern", x: 84, z: -4, w: 20, d: 14, h: 14, raised: true, glass: true, tint: 0x6f4a2c }, // brown glass, north end
  { id: "bowra",   name: "Bowra Building",   type: "modern", x: 99, z: 16, w: 10, d: 34, h: 16, raised: true, brick: true },                  // brick, east run

  // ============ BAR QUAD — east; surrounded by buildings ============
  { id: "barquad", name: "Bar Quad", type: "quad",  x: 80, z: 54, w: 28, d: 24 },   // x66..94, z42..66
  { id: "jcr",     name: "JCR & Bar", type: "range", x: 80, z: 60, w: 16, d: 5, h: 9 },

  // ============ GARDENS (north; lawns only — walls are in WALLS) ============
  { id: "cloister",      name: "Cloister Garden",  type: "garden", x: 10, z: -36, w: 78, d: 14 },   // x-29..49, z-43..-29 (open, S strip)
  { id: "fellowsgarden", name: "Fellows' Garden",  type: "garden", x: 10, z: -67, w: 78, d: 44 },   // x-29..49, z-89..-45 (open, continuous w/ cloister)
  { id: "wardensgarden", name: "Warden's Garden",  type: "garden", x: -46, z: -66, w: 30, d: 30 },  // x-61..-31, z-81..-51 (LOCKED)
  { id: "privategarden", name: "Fellows' Private Garden", type: "garden", x: 10, z: -109, w: 78, d: 36 }, // x-29..49, z-127..-91 (LOCKED)

  // ============ PERIMETER ranges — enclose the college ============
  { id: "southrange", name: "Southern Range", type: "range", x: 22, z: 86, w: 132, d: 9, h: 12 }, // x-44..88
  { id: "sw-link",    name: "SW Range",       type: "range", x: -44, z: 58, w: 8, d: 56, h: 12 }, // west link
  { id: "se-link",    name: "SE Range",       type: "range", x: 100, z: 60, w: 8, d: 52, h: 12 }, // east link (bar/bowra → south range)

  // ---------------- HOLYWELL (clear of the Back Quad) -------------
  { id: "holywell",   name: "Holywell Music Room", type: "range",  x: -30, z: 44,  w: 16, d: 12, h: 10 },

  // ---------------- PLUSH (off-site, down Broad St & Cornmarket) ------------
  { id: "plush",      name: "PLUSH",               type: "goal",   x: -70, z: 28, w: 8, d: 8, h: 7, goal: true },
];

/* -----------------------------------------------------------------------------
   RAISED — the terrace (Library + Bowra), an L: a west–east arm north of the AC
   and a north arm up to the Library. steps:"none" → use explicit STEPS.
----------------------------------------------------------------------------- */
export const RAISED = [
  { x: 62, z: 28, w: 68, d: 14, y: 2.4, steps: "none" },  // x28..96, z21..35 — arm north of the AC
  { x: 84, z: 8,  w: 20, d: 40, y: 2.4, steps: "none" },  // x74..94, z-12..28 — north arm to the Library
];

/* -----------------------------------------------------------------------------
   STEPS — ramps onto/off the terrace.
----------------------------------------------------------------------------- */
export const STEPS = [
  { x: 30, z: 28, w: 6, d: 10, axis: "x", high: "e", y: 2.4 },  // up onto the terrace just NW of the AC (from the Back Quad's NW)
  { x: 80, z: 38, w: 8, d: 6,  axis: "z", high: "n", y: 2.4 },  // up from the Bar Quad onto the terrace
];

/* -----------------------------------------------------------------------------
   FENCES — impassable iron railings (collider + rail).
----------------------------------------------------------------------------- */
export const FENCES = [
  { x: 50, z: -36, w: 1, d: 16 },   // seals the Cloister Garden off from the terrace (east edge)
];

/* -----------------------------------------------------------------------------
   WALLS — authored stone walls (one continuous outer wall for the garden block
   + single internal dividers). A segment with locked:true,key:"…" becomes a
   wrought-iron gate that opens when you carry the key (like the old garden gates).
     {x,z,w,d, h?, locked?, key?, name?}
----------------------------------------------------------------------------- */
export const WALLS = [
  // ---- Garden block outer wall (x-30..50, z-128..-28) + the warden's bump ----
  // South side (z-28) with the ACCESS GATE gap at x9..17 (the path from the Front Quad NE)
  { x: -10.5, z: -28, w: 39, d: 1 },                 // x-30..9
  { x: 33.5,  z: -28, w: 33, d: 1 },                 // x17..50  (east end; cloister east is a FENCE, above)
  // North side (z-128)
  { x: 10, z: -128, w: 80, d: 1 },                   // x-30..50
  // East side (x50): walled north of the cloister (cloister east z-43..-29 is the fence)
  { x: 50, z: -85.5, w: 1, d: 85 },                  // z-128..-43
  // West side (x-30): walled except the warden's divider (z-82..-50)
  { x: -30, z: -105, w: 1, d: 46 },                  // z-128..-82
  { x: -30, z: -39,  w: 1, d: 22 },                  // z-50..-28
  // Warden's divider (x-30, z-82..-50) with a LOCKED gate at z-70..-62
  { x: -30, z: -76, w: 1, d: 12 },                   // z-82..-70
  { x: -30, z: -66, w: 1, d: 8, locked: true, key: "key_wardens", name: "Warden's Garden" },
  { x: -30, z: -56, w: 1, d: 12 },                   // z-62..-50
  // Warden's garden outer (sticks out west)
  { x: -62, z: -66, w: 1, d: 32 },                   // west (z-82..-50)
  { x: -46, z: -50, w: 32, d: 1 },                   // south (x-62..-30)
  { x: -46, z: -82, w: 32, d: 1 },                   // north (x-62..-30)
  // Private|Fellows divider (z-90, x-30..50) with a LOCKED gate at x9..17
  { x: -10.5, z: -90, w: 39, d: 1 },                 // x-30..9
  { x: 13,    z: -90, w: 8,  d: 1, locked: true, key: "key_private", name: "Fellows' Private Garden" },
  { x: 33.5,  z: -90, w: 33, d: 1 },                 // x17..50
];

/* -----------------------------------------------------------------------------
   STREET to Plush — leave the gate, down BROAD STREET, LEFT down CORNMARKET.
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
  { x:8, z:-36, s:1.4 }, { x:10, z:-66, s:1.9 }, { x:-12, z:-60, s:1.5 }, { x:32, z:-72, s:1.5 },
  { x:10, z:-108, s:1.7 }, { x:-8, z:-114, s:1.3 },
  { x:-46, z:-66, s:1.6 }, { x:-52, z:-58, s:1.4 },
];

/* -----------------------------------------------------------------------------
   MAGGIE MAE — dog poo you can step in.
----------------------------------------------------------------------------- */
export const POO = [ {x:3, z:46}, {x:-4, z:52}, {x:6, z:55} ];

/* -----------------------------------------------------------------------------
   ITEMS — pickups & quest objects.
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
   NPCS  — walk up and press E.
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

  // ===================== CAMEOS (notable Wadhamites) ========================
  { id:"rosamund", name:"Rosamund Pike", at:"frontquad", colour:"#9a7faa", hair:"#c9b27a", role:"flavour", lines:[
    "Rosamund. Yes, I read English here. No, I will not 'do the line from Gone Girl'. It's a Tuesday.",
    "People think Oxford is all punting and Pimm's. It's mostly crying in this exact quad. Builds range, darling." ] },
  { id:"felicity", name:"Felicity Jones", at:"backquad", colour:"#8a6f9a", hair:"#4a3320", role:"flavour", lines:[
    "Felicity. English, Wadham. Did a film about stealing the Death Star plans; couldn't steal a library book without a fine.",
    "Best advice I got here: nobody has read the whole reading list. Nobody. Go to the bop." ] },

  // ===================== ENCOUNTERS =========================================
  // Arran — the villain. He prowls the college and corners you for a "bump".
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
