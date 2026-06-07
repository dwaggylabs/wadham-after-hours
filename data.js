/* =============================================================================
   WADHAM AFTER HOURS — game content & config
   -----------------------------------------------------------------------------
   Edit THIS file to change people, places, anecdotes, quests and the passphrase.
   The engine (game.js) reads everything from here.

   COORDINATES (top-down):  +X = EAST,  -X = WEST,  +Z = SOUTH,  -Z = NORTH.
   Front Quad is centred on (0,0). Real Wadham layout (from the college map):
       Parks Road runs N–S on the WEST. You enter the Front Quad from the west.
       GARDENS are to the NORTH  (reached from the NE corner of the quad).
       BACK QUAD is to the SOUTH (reached from the SW & SE corners).
       The Hall, Old Library & Chapel stick out EAST of the quad.
       Modern bit (Bar Quad, Library, Bowra, JCR) is SOUTH-EAST, partly RAISED.
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
   x,z = centre; w = width(X), d = depth(Z); h = height.
   Optional: archway+archOffset (one passage), arches:[..] (several), gate:true,
             walled:true + gates:[{side,at,width}] (gardens), raised:true,
             project:{...} (a wing sticking out), style:"hall"|"chapel".
----------------------------------------------------------------------------- */
export const LOCATIONS = [
  // ---------------- APPROACH (west, off Parks Road) ----------------
  { id: "forecourt",  name: "Forecourt",          type: "garden", x: -36, z: 0,  w: 20, d: 30 },
  { id: "gatetower",  name: "Porters' Lodge",      type: "gate",   x: -19, z: 0,  w: 8,  d: 8,  h: 15, gate: true },

  // ============ FRONT QUAD (historic, on Parks Road — WEST) ============
  // Square, three-storey ranges. Gate/Lodge on the W; Warden's Lodgings N;
  // SCR S; the Hall + Frontispiece + Chapel form the EAST range (the spine it
  // shares with the Back Quad). Old Library is above the Chapel; Cloisters N.
  { id: "frontquad",  name: "Front Quad",          type: "quad",   x: 0,  z: 0,   w: 38, d: 38 },
  { id: "westrange",  name: "West Range",          type: "range",  x: -18, z: 0,  w: 4,  d: 38, h: 12 },
  { id: "northrange", name: "Warden's Lodgings",   type: "range",  x: 0,  z: -18, w: 38, d: 4,  h: 12, archway: true, archOffset: 13 }, // NE corner → gardens
  { id: "southrange", name: "SCR & South Range",   type: "range",  x: 0,  z: 18,  w: 38, d: 4,  h: 12, arches: [-13] },                 // SW corner → Holywell
  { id: "chapel",     name: "Chapel & Old Library", type: "range", x: 19, z: -10, w: 5,  d: 16, h: 17, style: "chapel" },               // z -18..-2
  { id: "frontispiece",name:"The Frontispiece",    type: "marker", x: 17, z: -1,  w: 4,  d: 4,  h: 18 },
  { id: "hall",       name: "Hall",                type: "range",  x: 19, z: 8,   w: 5,  d: 9,  h: 15, style: "hall", cupola: true },    // z 3.5..12.5; SE gap = the slype to Back Quad
  { id: "cloisters",  name: "The Cloisters",       type: "range",  x: 19, z: -23, w: 7,  d: 6,  h: 10 },                                 // N of the chapel, toward the gardens

  // ============ BACK QUAD (directly EAST of the Hall) ============
  // You reach it from the Front Quad's SE corner (the slype, past the Hall).
  // Surrounded by ranges; the JCR/bar colonnade on its W side.
  { id: "backquad",   name: "Back Quad",           type: "quad",   x: 44, z: 0,   w: 38, d: 38 },
  { id: "bq-west",    name: "Back Quad (W range)",  type: "range",  x: 26, z: -4,  w: 4,  d: 28, h: 11 },  // z -18..10, leaves the slype open at z 10..18
  { id: "bq-north",   name: "Back Quad (N range)",  type: "range",  x: 44, z: -18, w: 40, d: 4,  h: 12 },
  { id: "bq-south",   name: "Back Quad (S range)",  type: "range",  x: 44, z: 18,  w: 40, d: 4,  h: 12 },
  // E range = an undercroft: raised on the upper floor, open at ground level so
  // you walk E–W through the gap into Bar Quad.
  { id: "bq-east",    name: "Undercroft Range",    type: "range",  x: 63, z: 0,   w: 4,  d: 38, h: 13, archway: true, archOffset: 0 },

  // ============ BAR QUAD / WEBB QUAD (east, through the undercroft) ========
  { id: "barquad",    name: "Bar Quad",            type: "quad",   x: 80, z: 0,   w: 32, d: 34 },
  { id: "jcr",        name: "JCR & Bar",           type: "range",  x: 80, z: -15, w: 16, d: 6,  h: 9 },   // Penrose tiling outside

  // ============ MODERN RAISED CLUSTER (north-east) ============
  // The Access Centre is lower; you climb its north side up to the Library, and
  // behind it sits Bowra. Library + Bowra are on the only higher ground.
  { id: "ac",         name: "Access Centre",       type: "modern", x: 48, z: -24, w: 16, d: 11, h: 12 },
  { id: "library",    name: "Ferdowsi Library",    type: "modern", x: 50, z: -42, w: 22, d: 15, h: 14, raised: true }, // brutalist, up the steps
  { id: "bowra",      name: "Bowra Building",      type: "modern", x: 74, z: -40, w: 14, d: 24, h: 16, raised: true },

  // ============ GARDENS (north of both quads; walled rooms per the site plan) ==
  { id: "cloister",      name: "Cloister Garden",  type: "garden", x: 30, z: -36, w: 16, d: 14, walled: true,
      gates: [ {side:"w", at:-36, width: 5}, {side:"s", at: 30, width: 4} ] },                                          // former cemetery, by the Cloisters
  { id: "fellowsgarden", name: "Fellows' Garden",  type: "garden", x: -2, z: -48, w: 42, d: 26, walled: true,
      gates: [ {side:"s", at: 13, width: 6}, {side:"n", at:-2, width: 5}, {side:"w", at:-48, width: 5}, {side:"e", at:-48, width: 5} ] },
  { id: "wardensgarden", name: "Warden's Garden",  type: "garden", x: -32, z: -48, w: 22, d: 28, walled: true,
      gates: [ {side:"e", at:-48, width: 5} ] },
  { id: "privategarden", name: "Fellows' Private Garden", type: "garden", x: -2, z: -78, w: 42, d: 26, walled: true,
      gates: [ {side:"s", at:-2, width: 5} ] },
  { id: "terrace",    name: "Civil War Terrace",   type: "marker", x: 17, z: -78, w: 4,  d: 24, h: 3 },

  // ---------------- HOLYWELL (south edge, Holywell Street) ------------------
  { id: "holywell",   name: "Holywell Music Room", type: "range",  x: -2, z: 42,  w: 16, d: 12, h: 10 },

  // ---------------- PLUSH (off-site, down Broad St & Cornmarket) ------------
  { id: "plush",      name: "PLUSH",               type: "goal",   x: -70, z: 28, w: 8, d: 8, h: 7, goal: true },
];

/* -----------------------------------------------------------------------------
   RAISED levels — the only higher ground: the walk on the N side of the Access
   Centre toward the Library, and behind it where Bowra is. y = height in metres.
   Engine builds a stone platform with steps and lifts you onto it.
----------------------------------------------------------------------------- */
export const RAISED = [
  { x: 60, z: -41, w: 52, d: 22, y: 2.4, steps: "s" },  // Library + Bowra terrace; climb the steps on the south (from the AC / Back Quad)
];

/* -----------------------------------------------------------------------------
   STREET to Plush — you leave the gate, go down BROAD STREET, turn LEFT down
   CORNMARKET STREET, and Plush is on the RIGHT. (Not geographically accurate —
   only the college is.) path = lamp-lit gravel polyline.
----------------------------------------------------------------------------- */
export const STREET = {
  path: [ {x:-24,z:0}, {x:-56,z:0}, {x:-56,z:32} ],     // gate → Broad St (W) → left down Cornmarket (S)
  signs: [
    { x:-40, z:-5, text:"Broad Street",      face:"s" },
    { x:-61, z:14, text:"Cornmarket Street", face:"e" },
  ],
  // dark shopfronts for atmosphere along the route
  shops: [ [-46,-7,10,8], [-34,-8,10,8], [-61,8,9,9], [-61,24,9,9], [-48,38,12,9] ],
};

/* -----------------------------------------------------------------------------
   TREES — big specimen trees (the engine also scatters smaller ones in gardens).
----------------------------------------------------------------------------- */
export const TREES = [
  { x:44, z:2, s:2.2, kind:"plane" },     // the great Back Quad plane tree
  { x:-2, z:-48, s:1.8 }, { x:-16, z:-44, s:1.5 }, { x:12, z:-52, s:1.4 },
  { x:-2, z:-78, s:1.7 }, { x:-32, z:-48, s:1.6 }, { x:-28, z:-56, s:1.4 },
  { x:30, z:-36, s:1.3 }, { x:38, z:8, s:1.4 },
];

/* -----------------------------------------------------------------------------
   MAGGIE MAE — dog poo you can step in. (Grim. Sorry.)
----------------------------------------------------------------------------- */
export const POO = [ {x:42, z:-3}, {x:48, z:5}, {x:40, z:6} ];

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
    brief: "Warden Wilkins wants Wren's three garden gadgets found so his Invisible College can pretend to be a real scientific society again. Reward: a key.",
    requires: ["apiary","statue","rainbow"], unlocks: ["key_garden"], giver: "wilkins" },
  { id: "founders_blessing", title: "The Founder's Blessing", type: "side",
    brief: "Dorothy Wadham is haunting the ante-chapel. She founded the place and never once visited; the least she can do is hand over a key.",
    unlocks: ["key_chapel"], giver: "dorothy" },
  { id: "tuesgays", title: "Tuesgays", type: "win",
    brief: "Out at last. Round up your six friends, grab the regrettable blue drink, and get to Plush — down Broad Street, left down Cornmarket, on your right.",
    requires: ["gate_open","collegedrink"], requiresAllFriends: true, goalMarker: "plush",
    winText: "You spill down the stairs into Plush as the DJ drops the one song everyone pretends not to know every word of. Three Jägerbombs for a fiver. Your friends are already on the dancefloor — Eva mid-rant about the Normans, Megan ordering in Spanish, Rupert filming it all. The gates, the keys, the thesis, the dog poo — none of it followed you here. The night is entirely, gloriously yours. 🪩" },
];

/* -----------------------------------------------------------------------------
   NPCS  — walk up and press E.
   role: "gatekeeper" (porter) | "oracle" (ghost) | "questgiver" | "friend" | "flavour"
   action (optional special bit): "elfbar" | "ketamine" | "givebook" | "givegame"
                                  | "dog" | "singer"
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
    "Wren left three toys in these gardens: a glass beehive, a statue that talks, and an engine that makes rainbows. Find all three.",
    "Do that and the garden key is yours. Mind the telescope bolted to the tower — I'll know if you touch it." ] },
  { id:"bowra", name:"Warden Maurice Bowra", at:"barquad", colour:"#8a6a3a", role:"oracle", ghost:true, lines:[
    "Bowra. Warden thirty-two years. They named that concrete monstrosity behind me after me. I'd have preferred a decent claret.",
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
  { id:"arran", name:"Arran", at:"cloister", colour:"#4a4458", hair:"#2a2a2a", role:"flavour", action:"ketamine", lines:[
    "Alright. Arran. You look stressed, man. Locked in, the whole thing, yeah, yeah.",
    "Here. Bit of ket. Just a bump. Smooths the edges right off, you'll float to Plush.",
    "...go on then. Down the hatch. Don't say I never give you anything." ] },
  { id:"finn", name:"Finn Grammaticas", at:"chapel", colour:"#6a5a8a", hair:"#2a1a0a", role:"flavour", action:"singer", lines:[
    "(Finn is mid-rehearsal in the ante-chapel, eyes closed, absolutely going for it.)",
    "Finn. Choir. We've got Evensong in eight hours and I have not slept. The acoustics in here though — listen.",
    "Tuesgays after? One hundred percent. I contain multitudes: plainchant AND poppers." ] },
  { id:"maggie", name:"Maggie Mae", at:"backquad", colour:"#caa472", dog:true, role:"flavour", action:"dog", lines:[
    "(Maggie Mae, the college dog, regards you with profound, ancient judgement.)",
    "She woofs once. It is somehow both a greeting and a warning.",
    "(Mind where you tread near her. Genuinely.)" ] },
];
