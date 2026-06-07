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
  { id: "library",     name: "Ferdowsi Library",     type: "range",  x: 50,  z: -30,w: 16, d: 26, h: 14 }, // 1977 brutalist, brushed concrete
  { id: "webbquad",    name: "Bar Quad",             type: "quad",   x: 36,  z: 44, w: 30, d: 26 },
  { id: "jcr",         name: "JCR & Bar",            type: "range",  x: 18,  z: 44, w: 12, d: 10, h: 8 }, // Tuesgays pre-drinks; Penrose tiling outside
  { id: "holywell",    name: "Holywell Music Room",  type: "range",  x: -10, z: 74, w: 16, d: 12, h: 10 },

  // --- The destination (off-site; just a glowing marker beyond the gate) ---
  { id: "plush",       name: "Plush",               type: "marker", x: -75, z: 30, w: 6,  d: 6,  h: 6, goal: true },
];

/* -----------------------------------------------------------------------------
   ITEMS — pickups and quest objects.
----------------------------------------------------------------------------- */
export const ITEMS = [
  { id: "key_bar",     name: "Brass key (JCR)",      foundAt: "jcr",          hint: "Last seen on the Penrose tiling by the bar, in a puddle of someone's snakebite." },
  { id: "key_garden",  name: "Brass key (Garden)",   reward: "invisible_college", hint: "Wilkins will surrender it the moment his dead-scientists club is quorate." },
  { id: "key_chapel",  name: "Brass key (Chapel)",   reward: "founders_blessing", hint: "The Foundress's gift. She's dead, she's bored, she's weirdly generous." },
  { id: "bodcard",     name: "Your Bod card",        foundAt: "fellowsgarden", hint: "Dropped in the Fellows' Garden, obviously — probably under the tree you cried beneath in Hilary." },
  { id: "collegedrink",name: "The Wadham college drink", foundAt: "jcr",      hint: "Sticky, blue, faintly radioactive. The bar insists it's a cocktail. Non-negotiable." },
  { id: "subfusc",     name: "Subfusc & gown",       foundAt: "backquad",     hint: "Gown and white tie. Wear it and you'll be the only person at Plush dressed for a viva." },
  // Wren's three garden curiosities (for the Invisible College quest) — all REAL
  // gadgets the 1650s Wadham scientists actually built or wrote about:
  { id: "apiary",      name: "Glass apiary",         foundAt: "fellowsgarden", hint: "Wren's transparent beehive — watch bees commute without being stung. He did this BEFORE St Paul's." },
  { id: "statue",      name: "Speaking statue",      foundAt: "fellowsgarden", hint: "A statue that mutters as you pass. Wilkins thought this was a normal thing to put in a garden." },
  { id: "rainbow",     name: "Artificial rainbow",   foundAt: "fellowsgarden", hint: "A machine that makes a rainbow from mist. 1650s tech, still more reliable than the college WiFi." },
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
    brief: "The gates are locked, because of course they are. Find 3 brass keys and your Bod card, then sweet-talk the Porter into springing the Lodge.",
    requires: ["key_bar", "key_garden", "key_chapel", "bodcard"],
    unlocks: ["gate_open"],
  },
  {
    id: "invisible_college",
    title: "The Invisible College",
    type: "side",
    brief: "Warden Wilkins wants Wren's three garden gadgets found so his Invisible College can pretend to be a real scientific society again. Reward: a key, grudgingly.",
    requires: ["apiary", "statue", "rainbow"],
    unlocks: ["key_garden"],
    giver: "wilkins",
  },
  {
    id: "founders_blessing",
    title: "The Founder's Blessing",
    type: "side",
    brief: "Dorothy Wadham is haunting the ante-chapel. She founded the place and never once visited; the least she can do now is hand over a key.",
    unlocks: ["key_chapel"],
    giver: "dorothy",
  },
  {
    id: "tuesgays",
    title: "Tuesgays",
    type: "win",
    brief: "Out at last. Round up your friends (all 'basically ready'), grab the regrettable blue drink, and get to Plush before they play the good songs.",
    requires: ["gate_open", "collegedrink"],         // + talk to every friend NPC
    requiresAllFriends: true,
    goalMarker: "plush",
    winText: "You spill down the stairs into Plush as the DJ drops the one song everyone pretends not to know every word of. Three Jägerbombs for a fiver. Your friends are already on the dancefloor. The gates, the keys, the thesis — none of it followed you here. The night is entirely, gloriously yours. 🪩",
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
  // ======================= HISTORICAL / FLAVOUR NPCS =======================
  // All long dead, so fair game. Every anecdote below is rooted in real Wadham
  // history — the tone is just... unimpressed. Walk up and press E to talk.

  {
    id: "porter",
    name: "The Porter",
    at: "gatetower",
    colour: "#2f5d45",
    role: "gatekeeper",         // opens the gate once you've got 3 keys + Bod card
    lines: [
      "Lodge is shut. No Bod card, no exit. I don't make the rules — I just enforce them with quiet joy.",
      "Three brass keys and your Bod card. Same shopping list as every soul who's tried to bunk out for Tuesgays since 2010.",
      "Thinking of climbing the gate? Warden Bowra did it for thirty years. He's also the one who had it locked. Funny, that.",
    ],
  },
  {
    id: "dorothy",
    name: "Dorothy Wadham, Foundress",
    at: "chapel",               // she haunts the ante-chapel
    colour: "#6b5a86",
    role: "oracle",
    ghost: true,
    questGiver: "founders_blessing",
    lines: [
      "Dorothy Wadham. I founded this college in 1610 out of my late husband's will and ran it for eight years by post — from Somerset. I never once set foot in Oxford. Wouldn't start now.",
      "Built in three years, paid to the penny, every brick accounted for by letter. Do you have ANY idea how hard it is to micromanage masons you've never met?",
      "Yes, yes — take the chapel key. Go and dance. The Hall will still be here Wednesday, full of people pretending to read.",
    ],
  },
  {
    id: "wilkins",
    name: "Warden John Wilkins",
    at: "fellowsgarden",
    colour: "#3a6f9a",
    role: "questgiver",
    questGiver: "invisible_college",
    lines: [
      "John Wilkins, Warden. In the 1650s I had Boyle, Hooke, Locke and young Wren crammed into my lodgings doing 'experiments'. We called it the Invisible College. The fire brigade would've called it something else.",
      "Wren left three toys in this garden: a glass beehive, a statue that talks, and an engine that makes rainbows. Find all three and the Royal Society reconvenes.",
      "Do that and the garden key is yours. Mind the telescopes — there's a very good one bolted to the tower, and I'll know if you touch it.",
    ],
  },
  {
    id: "bowra",
    name: "Warden Maurice Bowra",
    at: "frontquad",            // holds court in the middle of his quad, naturally
    colour: "#8a6a3a",
    role: "oracle",
    ghost: true,
    lines: [
      "Bowra. Warden here thirty-two years. Once caught a boy climbing in after hours — he hid behind my sofa for three hours while I read. I simply said, 'turn the lights off before you go, there's a good fellow.'",
      "They say I had a 'waspish wit'. They say a great many things. Most of them to me, after I'd already finished insulting them.",
      "Off to Tuesgays? In my day we called Tuesday 'Tuesday'. We were less honest, and far worse dressed.",
    ],
  },
  {
    id: "wren",
    name: "Mr Christopher Wren",
    at: "cloister",             // the cloister garden — a former cemetery, very on-brand for him
    colour: "#3f7f7a",
    role: "oracle",
    ghost: true,
    lines: [
      "Christopher Wren. Undergraduate, then Savilian Professor of Astronomy — rooms just there. Yes, that Wren. No, I can't look at your leaking staircase, I'm reinventing the dome.",
      "I built a transparent beehive so one could watch the bees toil without being stung. Then I built half of London. People only ever ask about the cathedral.",
      "If you find my contraptions out in the garden, do tell Wilkins. He gets so dreadfully excitable.",
    ],
  },
  {
    id: "gardener",
    name: "The Head Gardener",
    at: "privategarden",
    colour: "#4a5d2a",
    role: "flavour",
    lines: [
      "Mind the borders. That mound? Royalist earthworks, 1642 — we dug in against Parliament and got a flower bed out of it. Had a statue of Atlas up top till the wind smashed him to bits in 1753.",
      "Twelve species of bamboo over there, all planted to hide where a beech tree died of honey fungus. And a grapevine older than the Napoleonic wars — two hundred bunches last year, every one eaten at High Table. You'll not see a single grape.",
      "Third-best tree collection in Oxford, this is. We do not discuss first and second.",
    ],
  },
  {
    id: "fresher",
    name: "A Lost Fresher",
    at: "frontquad",
    colour: "#8a6fb0",
    role: "flavour",
    lines: [
      "Is this... is this still Wadham? I've been hunting for my staircase since Michaelmas. Every range is an identical honey-coloured filing cabinet.",
      "Someone told me the statues over the gate are the Founders, sat up there judging us. I believe it. They've got the exact face the Buttery staff make.",
      "Tuesgays? Take me with you. Please. I went to one bop and now I have a whole personality.",
    ],
  },

  // ============================ YOUR FRIENDS ===============================
  // role:"friend" — you must talk to ALL of them before the Tuesgays win.
  // These are editable placeholders with Wadham-flavoured banter. Swap the
  // name/at/colour/lines for your actual mates (ask them first — the URL is
  // effectively public). Copy a block to add as many friends as you like.

  {
    id: "friend1",
    name: "Cat",                // ← rename me. Drop near the JCR / their staircase.
    at: "jcr",
    colour: "#c0392b",
    role: "friend",
    lines: [
      "Cat. Yes, SU exec, yes, I'll have quoted a motion at you by midnight. We're the only Oxford college with a proper Students' Union and not a JCR, and I WILL die on that hill.",
      "Pre-drinks are on the Penrose tiling by the bar. Roger Penrose designed it. Nobel Prize. We pour snakebite on it every single week.",
      "And we are NOT leaving until they've played 'Free Nelson Mandela'. It's been college law since 1987. Non-negotiable. Constitutionally binding.",
    ],
  },
  {
    id: "friend2",
    name: "Dev",                // ← rename me. Back Quad / the brutalist library.
    at: "backquad",
    colour: "#c98a2b",
    role: "friend",
    lines: [
      "Dev. Finalist. I have now read the same paragraph of my thesis four hundred times and it gets measurably worse on each pass.",
      "I basically live in the library — that concrete cliff from 1977. Brushed concrete, half-levels, Grade-II listed, spiritually a multi-storey car park.",
      "Get me out of here. If I see one more footnote I'm defecting to the Royal Society of Lying Down.",
    ],
  },
  {
    id: "friend3",
    name: "Mò",                 // ← rename me. The Holywell Music Room works nicely.
    at: "holywell",
    colour: "#2b8a6b",
    role: "friend",
    lines: [
      "Mò. Yes, in the Holywell Music Room — oldest purpose-built concert hall in Europe, 1748 — and they let undergrads in here to practise scales. Absolutely unhinged.",
      "There's a harp in here nobody will admit to owning. Pluck it just right and apparently something happens. Allegedly. I've told no one.",
      "Two ticks — let me finish pretending I can sight-read this, and then we are gone.",
    ],
  },
  // ...copy a friend block to add more. Each one is another person to rally.
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
