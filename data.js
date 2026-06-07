/* =============================================================================
   WADHAM AFTER HOURS — game content & config
   -----------------------------------------------------------------------------
   Edit THIS file to change people, places, anecdotes, quests and the passphrase.
   The engine (game.js) reads everything from here.

   COORDINATES (top-down):  +X = EAST,  -X = WEST,  +Z = SOUTH,  -Z = NORTH.
   Front Quad is centred on (0,0). Simplified, enclosed campus:
       FRONT QUAD — one continuous medieval ring (crenellated, gate tower W,
         tall mullioned windows) around the open ~38×38 courtyard. chapel & hall
         are anchor "spots" on the ring, not separate blocks.
       BACK QUAD — directly SOUTH of Front Quad, an open court enclosed N (Front
         Quad's south range), W (a brick range), S (the south range) and E (the
         glass AC/LSK). Leave the Front Quad by its SE/SW corners, walk south.
       AC/LSK — glass (the ONLY glass building), EAST of Back Quad.
       RAISED TERRACE (~2.4 m) — sits NORTH of the AC/LSK and wraps east then
         north to the Library. The ONLY way east of the Back Quad is up onto it
         (steps up on the AC side, steps down into the Bar). BOWRA is brick, on
         the terrace's east run; the LIBRARY is at the north end, enterable only
         from the south — a fence seals its west/garden side.
       GARDENS — aligned, contiguous, walled on the outer edge, to the NORTH.
         cloister opens straight into fellowsgarden; warden's & private gardens
         are LOCKED sub-rooms (found keys).
       A continuous SOUTHERN range + SW/SE links enclose the whole college.
       Holywell SW. Plush off-site, W down Broad St then left down Cornmarket.
============================================================================= */

export const CONFIG = {
  title: "WADHAM AFTER HOURS",
  subtitle: "It's Tuesday. The gates are locked. Tuesgays awaits.",
  passphrase: "queerfest",                 // friends-only splash; tell your mates
  passphrasePrompt: "Whisper the password to the Porter:",
  timeOfDay: "night",

  // You wake INSIDE the Front Quad facing the locked west gate.
  startPosition: { x: -6, z: 0 },
  startFacing: "west",

  friendsNeeded: 6,                        // talk to every role:"friend" NPC

  // Plush club music. By default the engine plays a built-in procedural
  // four-on-the-floor house beat (no file needed, always works). To use a real
  // track, download a royalty-free one (e.g. from pixabay.com/music — CC0, no
  // attribution), save it next to index.html as plush.mp3, and set this to
  // "plush.mp3". If it ever fails to load, the procedural beat takes over.
  plushMusicUrl: "",
  plushMusicVolume: 0.55,
};

/* -----------------------------------------------------------------------------
   LOCATIONS
   type: "quad" | "garden" | "range" | "marker" | "modern" | "gate" | "goal"
         | "spot" (invisible anchor point for NPCs/quests)
   x,z = centre; w = width(X), d = depth(Z); h = height.
   Optional: archway+archOffset (one passage), arches:[..] (several), gate:true,
             walled:true + gates:[{side,at,width}] (gardens; add locked:true +
             key:"key_id" for a locked gate), raised:true, glass:true (only the
             AC/LSK), brick:true (reddish range/block), cupola:true,
             ring:{t,h,gaps:[{side,at,width}]} (the Front Quad medieval ring).
----------------------------------------------------------------------------- */
export const LOCATIONS = [
  // ---------------- APPROACH (west, off Parks Road) ----------------
  { id: "forecourt",  name: "Forecourt",          type: "garden", x: -36, z: 0,  w: 20, d: 30 },
  { id: "gatetower",  name: "Porters' Lodge",      type: "gate",   x: -19, z: 0,  w: 8,  d: 8,  h: 16, gate: true },

  // ============ FRONT QUAD — ONE continuous medieval ring ============
  // A single crenellated quadrangle of ranges around the open 38×38 courtyard.
  // Gaps: the W gate (with the gate tower), the two S corners (→ Back Quad),
  // and an E opening at the NE (→ the gardens). chapel/hall are anchor spots.
  { id: "frontquad",  name: "Front Quad",          type: "quad",   x: 0, z: 0, w: 38, d: 38,
      ring: { t: 5, h: 13, gaps: [
        { side: "w", at: 0,   width: 7 },     // the gate (Porters' Lodge sits here)
        { side: "s", at: -13, width: 6 },     // SW corner → Back Quad
        { side: "s", at: 13,  width: 6 },     // SE corner → Back Quad
        { side: "e", at: -15, width: 6 },     // NE corner → the gardens
      ] } },
  { id: "chapel",     name: "Chapel & Old Library", type: "spot",  x: 16, z: -9 },   // anchor: Dorothy, Finn (on the E range)
  { id: "hall",       name: "Hall",                type: "spot",   x: 16, z: 9 },     // anchor (on the E range)

  // ============ BACK QUAD — directly SOUTH of the Front Quad ============
  // Open court; enclosed N (Front Quad south range), W (brick), S (south range),
  // E (the glass AC/LSK). Entered from the Front Quad's two south corners.
  { id: "backquad",   name: "Back Quad",           type: "quad",   x: 0, z: 48, w: 32, d: 26 },   // x-16..16, z35..61
  { id: "bq-north",   name: "Back Quad (N range)",  type: "range",  x: 0, z: 35, w: 32, d: 3, h: 12, arches: [-13, 13] }, // openings from Front Quad corners
  { id: "bq-west",    name: "Back Quad (W brick range)", type: "range", x: -16, z: 48, w: 4, d: 26, h: 11, brick: true },
  { id: "bq-south",   name: "Back Quad (S range)",  type: "range",  x: 0, z: 61, w: 32, d: 3, h: 11 },

  // ---- AC / LSK — GLASS (the only glass building), EAST of the Back Quad ----
  // Rotated 90° from before: now runs ~34 wide × 26 deep.
  { id: "ac",         name: "AC/LSK",              type: "modern", x: 46, z: 48, w: 34, d: 26, h: 13, glass: true }, // x29..63, z35..61

  // ============ RAISED TERRACE (~2.4 m) — the ONLY way east ============
  // An L: a west–east arm NORTH of the AC, turning north up to the Library.
  // (The platforms live in RAISED; these are the buildings standing on it.)
  { id: "bowra",      name: "Bowra Building",      type: "modern", x: 70, z: 4,  w: 10, d: 40, h: 16, raised: true, brick: true }, // east run
  { id: "library",    name: "Ferdowsi Library",    type: "modern", x: 72, z: -18, w: 14, d: 12, h: 14, raised: true },             // north end, south-entry only

  // ============ BAR QUAD — east, down the terrace steps ============
  // Enclosed on N/E/S; the ONLY way in is the steps down off the terrace (W).
  { id: "barquad",    name: "Bar Quad",            type: "quad",   x: 92, z: 6,  w: 26, d: 30 },   // x79..105, z-9..21
  { id: "jcr",        name: "JCR & Bar",           type: "range",  x: 92, z: 14, w: 18, d: 6, h: 9 },
  { id: "bar-north",  name: "Bar (N range)",       type: "range",  x: 92, z: -10, w: 28, d: 3, h: 10 },
  { id: "bar-east",   name: "Bar (E range)",       type: "range",  x: 106, z: 6, w: 3, d: 32, h: 10 },
  { id: "bar-south",  name: "Bar (S range)",       type: "range",  x: 92, z: 22, w: 28, d: 3, h: 10 },

  // ============ GARDENS (north; aligned, contiguous, outer wall) ============
  // cloister opens straight into fellowsgarden (wide opening, no real wall);
  // warden's & private gardens are LOCKED sub-rooms within shorter walls.
  { id: "cloister",      name: "Cloister Garden",  type: "garden", x: 36, z: -16, w: 22, d: 20, walled: true,
      gates: [ {side:"w", at:-16, width: 6}, {side:"n", at: 33, width: 14} ] },                         // W = entry from Front Quad; N = open to fellows
  { id: "fellowsgarden", name: "Fellows' Garden",  type: "garden", x: 6, z: -58, w: 62, d: 52, walled: true,
      gates: [ {side:"s", at: 33, width: 14}, {side:"w", at:-52, width: 6}, {side:"n", at: 6, width: 6} ] }, // S↔cloister, W→warden's, N→private
  { id: "wardensgarden", name: "Warden's Garden",  type: "garden", x: -46, z: -52, w: 24, d: 44, walled: true,
      gates: [ {side:"e", at:-52, width: 6, locked: true, key: "key_wardens"} ] },                       // LOCKED
  { id: "privategarden", name: "Fellows' Private Garden", type: "garden", x: 6, z: -104, w: 52, d: 36, walled: true,
      gates: [ {side:"s", at: 6, width: 5, locked: true, key: "key_private"} ] },                        // LOCKED

  // ============ PERIMETER ranges — enclose the whole college ============
  { id: "southrange",  name: "Southern Range",     type: "range",  x: 18, z: 86, w: 118, d: 9, h: 12 },  // continuous south wall
  { id: "sw-link",     name: "SW Range",           type: "range",  x: -39, z: 58, w: 8, d: 56, h: 12 },  // west link down to the south range
  { id: "se-link",     name: "SE Range",           type: "range",  x: 63, z: 63, w: 6, d: 54, h: 12 },   // seals the east at ground (terrace is the only way through)

  // ---------------- HOLYWELL (moved clear of the new Back Quad) -------------
  { id: "holywell",   name: "Holywell Music Room", type: "range",  x: -26, z: 44,  w: 16, d: 12, h: 10 },

  // ---------------- PLUSH (off-site, down Broad St & Cornmarket) ------------
  { id: "plush",      name: "PLUSH",               type: "goal",   x: -70, z: 28, w: 8, d: 8, h: 7, goal: true },
];

/* -----------------------------------------------------------------------------
   RAISED levels — the raised terrace (Library + Bowra). Two platforms form an L:
   a west–east arm north of the AC, and a north arm up to the Library.
   steps:"none" disables the auto flight (we place explicit STEPS).
----------------------------------------------------------------------------- */
export const RAISED = [
  { x: 45, z: 30, w: 50, d: 12, y: 2.4, steps: "none" },  // x20..70, z24..36 — arm north of the AC
  { x: 72, z: 2,  w: 16, d: 52, y: 2.4, steps: "none" },  // x64..80, z-24..28 — east+north arm to the Library
];

/* -----------------------------------------------------------------------------
   STEPS — explicit ramps onto/off the raised terrace.
     x,z = centre; w,d = footprint; axis = slope direction ('x'|'z');
     high = which end is at terrace height ('e'/'w' for x, 'n'/'s' for z); y = top.
----------------------------------------------------------------------------- */
export const STEPS = [
  { x: 17, z: 30, w: 6, d: 8, axis: "x", high: "e", y: 2.4 },  // up onto the terrace, on the AC side (from the Front Quad corridor)
  { x: 83, z: 6,  w: 6, d: 8, axis: "x", high: "w", y: 2.4 },  // down off the terrace's east edge → Bar Quad
];

/* -----------------------------------------------------------------------------
   FENCES — impassable iron railings (collider + visible rail). Seal the terrace
   so the Library can only be approached from the south.
----------------------------------------------------------------------------- */
export const FENCES = [
  { x: 64, z: 2,   w: 1,  d: 52 },   // terrace WEST edge, all the way up to the Library
  { x: 72, z: -25, w: 16, d: 1  },   // across the Library's NORTH side
  { x: 80, z: -14, w: 1,  d: 22 },   // terrace EAST edge by the Library (so it's south-entry only)
];

/* -----------------------------------------------------------------------------
   STREET to Plush — leave the gate, down BROAD STREET, LEFT down CORNMARKET,
   Plush on the RIGHT. (Not geographically accurate — only the college is.)
----------------------------------------------------------------------------- */
export const STREET = {
  path: [ {x:-24,z:0}, {x:-56,z:0}, {x:-56,z:32} ],     // gate → Broad St (W) → left down Cornmarket (S)
  signs: [
    { x:-40, z:-5, text:"Broad Street",      face:"s" },
    { x:-61, z:14, text:"Cornmarket Street", face:"e" },
  ],
  shops: [ [-46,-7,10,8], [-34,-8,10,8], [-61,8,9,9], [-61,24,9,9], [-48,38,12,9] ],
};

/* -----------------------------------------------------------------------------
   TREES — big specimen trees (the engine also scatters smaller ones in gardens).
----------------------------------------------------------------------------- */
export const TREES = [
  { x:0, z:48, s:2.2, kind:"plane" },      // the great Back Quad plane tree
  { x:6, z:-58, s:1.9 }, { x:-12, z:-50, s:1.5 }, { x:24, z:-66, s:1.5 },
  { x:6, z:-104, s:1.7 }, { x:-8, z:-110, s:1.3 },
  { x:-46, z:-52, s:1.6 }, { x:-50, z:-62, s:1.4 },
  { x:36, z:-16, s:1.3 }, { x:-30, z:20, s:1.4 },
];

/* -----------------------------------------------------------------------------
   MAGGIE MAE — dog poo you can step in. (Grim. Sorry.)
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
  // Garden gate keys (open the two LOCKED gardens — a little chain):
  { id: "key_wardens",name: "Iron key (Warden's)", foundAt: "fellowsgarden", hint: "Half-buried in the Fellows' Garden. Opens the Warden's Garden gate." },
  { id: "key_private",name: "Iron key (Private)",  foundAt: "wardensgarden", hint: "Hidden in the Warden's Garden. Opens the Fellows' Private Garden." },
  // Wren's three garden curiosities (Invisible College quest):
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
    brief: "Out at last. Round up your six friends, grab the regrettable blue drink, and get to Plush — down Broad Street, left down Cornmarket, on your right.",
    requires: ["gate_open","collegedrink"], requiresAllFriends: true, goalMarker: "plush",
    winText: "You spill down the stairs into Plush as the DJ drops the one song everyone pretends not to know every word of. Three Jägerbombs for a fiver. Your friends are already on the dancefloor — Eva mid-rant about the Normans, Megan ordering in Spanish, Rupert filming it all. The gates, the keys, the thesis, the dog poo, that creep Arran — none of it followed you here. The night is entirely, gloriously yours. 🪩" },
];

/* -----------------------------------------------------------------------------
   NPCS  — walk up and press E.
   role: "gatekeeper" (porter) | "oracle" (ghost) | "questgiver" | "friend" | "flavour"
   action (optional special bit): "elfbar" | "givebook" | "givegame" | "dog" | "singer"
   villain:true → chases the player; on close contact forces a ketamine impairment.
   Extra looks: ghost:true, hair:"#hex", glasses:true, dog:true.
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

  // ===================== YOUR FRIENDS (rally all 6 to win) ==================
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

  // ===================== CAMEOS (notable Wadhamites) ========================
  { id:"rosamund", name:"Rosamund Pike", at:"frontquad", colour:"#9a7faa", hair:"#c9b27a", role:"flavour", lines:[
    "Rosamund. Yes, I read English here. No, I will not 'do the line from Gone Girl'. It's a Tuesday.",
    "People think Oxford is all punting and Pimm's. It's mostly crying in this exact quad. Builds range, darling." ] },
  { id:"felicity", name:"Felicity Jones", at:"backquad", colour:"#8a6f9a", hair:"#4a3320", role:"flavour", lines:[
    "Felicity. English, Wadham. Did a film about stealing the Death Star plans; couldn't steal a library book without a fine.",
    "Best advice I got here: nobody has read the whole reading list. Nobody. Go to the bop." ] },
  { id:"shazia", name:"Prof. Shazia Choudhry", at:"frontquad", colour:"#5a6a8a", hair:"#1a1a1a", role:"flavour", lines:[
    "Professor Choudhry. Law. If you're escaping over the wall, do try not to commit three torts on the way down.",
    "Feminist legal theory tutorial is at nine tomorrow. Nine. I will know if you went to Plush. I always know." ] },

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
