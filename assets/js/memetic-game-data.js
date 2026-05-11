(function () {
  const STAT_KEYS = ["damage", "defense", "range", "magic", "chaos", "speed", "reliability"];

  const weapons = [
    {
      id: "keyboard-war-club",
      title: "Keyboard War Club",
      artifactId: "mwf-003",
      cost: 4,
      prefix: "KEY",
      fallbackLabel: "CTRL ALT SMASH",
      pickerCopy: "High damage, slow swing.",
      tags: ["melee", "heavy"],
      stats: { damage: 5, defense: 1, range: 1, magic: 0, chaos: 1, speed: 1, reliability: 4 },
      behavior: { type: "single-hit", cooldownTicks: 3, target: "front", baseDamage: 18, critChance: 0.08, missChance: 0.04 },
      logTemplates: {
        hit: "Keyboard War Club performs CTRL+ALT+DEFEAT on {enemy}.",
        miss: "Keyboard War Club jams on a missing key.",
        crit: "Keyboard War Club finds the any key and caves in {enemy}."
      }
    },
    {
      id: "vhs-greatsword",
      title: "VHS Greatsword",
      artifactId: "mwf-005",
      cost: 4,
      prefix: "VHS",
      fallbackLabel: "BE KIND REWIND",
      pickerCopy: "Heavy damage with clunky splash hits.",
      tags: ["melee", "heavy", "splash"],
      stats: { damage: 5, defense: 2, range: 1, magic: 0, chaos: 2, speed: 1, reliability: 3 },
      behavior: { type: "splash", cooldownTicks: 4, target: "front", baseDamage: 24, splashDamage: 9, critChance: 0.06, missChance: 0.08 },
      logTemplates: {
        hit: "VHS Greatsword rewinds {enemy} into a previous life.",
        miss: "VHS Greatsword gets stuck in tracking snow.",
        crit: "VHS Greatsword lands the director's cut on {enemy}."
      }
    },
    {
      id: "wand-of-low-battery",
      title: "Wand of Low Battery",
      artifactId: "mwf-009",
      cost: 4,
      prefix: "LOW",
      fallbackLabel: "1% MANA",
      pickerCopy: "Strong magic with a chance to fizzle.",
      tags: ["magic", "burst"],
      stats: { damage: 3, defense: 0, range: 3, magic: 5, chaos: 2, speed: 2, reliability: 2 },
      behavior: { type: "magic-burst", cooldownTicks: 3, target: "weakest", baseDamage: 22, critChance: 0.1, missChance: 0.16 },
      logTemplates: {
        hit: "Wand of Low Battery spends its final percent on {enemy}.",
        miss: "Wand of Low Battery flashes red and refuses to cast.",
        crit: "Wand of Low Battery overcharges {enemy} with panic lightning."
      }
    },
    {
      id: "spellbook-of-corrupted-files",
      title: "Spellbook of Corrupted Files",
      artifactId: "mwf-011",
      cost: 4,
      prefix: "ZIP",
      fallbackLabel: "FINAL_FINAL_REAL",
      pickerCopy: "Chaotic magic with random dungeon errors.",
      tags: ["magic", "chaos", "debuff"],
      stats: { damage: 3, defense: 0, range: 3, magic: 4, chaos: 5, speed: 2, reliability: 1 },
      behavior: { type: "corrupt", cooldownTicks: 3, target: "random", baseDamage: 16, critChance: 0.12, missChance: 0.12 },
      logTemplates: {
        hit: "Spellbook of Corrupted Files opens a bad attachment under {enemy}.",
        miss: "Spellbook of Corrupted Files cannot locate Final_Final_REAL_v7.",
        crit: "Spellbook of Corrupted Files blue-sparks {enemy} into unreadable data."
      }
    },
    {
      id: "aol-disc-throwing-stars",
      title: "AOL Disc Throwing Stars",
      artifactId: "mwf-001",
      cost: 3,
      prefix: "AOL",
      fallbackLabel: "700 FREE HOURS",
      pickerCopy: "Multi-hit ranged attacks.",
      tags: ["ranged", "multi"],
      stats: { damage: 3, defense: 0, range: 4, magic: 0, chaos: 2, speed: 4, reliability: 3 },
      behavior: { type: "multi-hit", cooldownTicks: 2, target: "multi", baseDamage: 9, hits: 3, critChance: 0.06, missChance: 0.06 },
      logTemplates: {
        hit: "AOL Disc Throwing Stars mail free trials into {enemy}.",
        miss: "AOL Disc Throwing Stars skip off the dungeon wall.",
        crit: "AOL Disc Throwing Stars connect at 56k and shred {enemy}."
      }
    },
    {
      id: "bluetooth-longbow",
      title: "Bluetooth Longbow",
      artifactId: "mwf-010",
      cost: 3,
      prefix: "BTL",
      fallbackLabel: "PAIRING...",
      pickerCopy: "Long range damage with disconnect risk.",
      tags: ["ranged", "unreliable"],
      stats: { damage: 4, defense: 0, range: 5, magic: 1, chaos: 2, speed: 2, reliability: 2 },
      behavior: { type: "single-hit", cooldownTicks: 2, target: "weakest", baseDamage: 15, critChance: 0.12, missChance: 0.18 },
      logTemplates: {
        hit: "Bluetooth Longbow pairs an arrow with {enemy}.",
        miss: "Bluetooth Longbow disconnects at the worst possible time.",
        crit: "Bluetooth Longbow pairs instantly and pierces {enemy}."
      }
    },
    {
      id: "discman-shield",
      title: "Discman Shield",
      artifactId: "mwf-007",
      cost: 3,
      prefix: "DSC",
      fallbackLabel: "ANTI-SKIP",
      pickerCopy: "Defense, block chance, and small reflects.",
      tags: ["defense", "reflect"],
      stats: { damage: 1, defense: 5, range: 0, magic: 0, chaos: 1, speed: 1, reliability: 4 },
      behavior: { type: "guard", cooldownTicks: 3, target: "self", baseDamage: 0, blockBonus: 0.08, reflectDamage: 6, critChance: 0, missChance: 0 },
      logTemplates: {
        hit: "Discman Shield hums an anti-skip prayer.",
        miss: "Discman Shield skips, but somehow keeps spinning.",
        crit: "Discman Shield reflects a cursed chorus back at {enemy}."
      }
    },
    {
      id: "flail-of-forgotten-passwords",
      title: "Flail of Forgotten Passwords",
      artifactId: "mwf-006",
      cost: 3,
      prefix: "PWD",
      fallbackLabel: "RESET LINK SENT",
      pickerCopy: "Random debuffs and confusion effects.",
      tags: ["melee", "debuff", "chaos"],
      stats: { damage: 3, defense: 1, range: 1, magic: 2, chaos: 4, speed: 2, reliability: 2 },
      behavior: { type: "debuff", cooldownTicks: 3, target: "front", baseDamage: 13, critChance: 0.08, missChance: 0.1 },
      logTemplates: {
        hit: "Flail of Forgotten Passwords locks {enemy} out for suspicious activity.",
        miss: "Flail of Forgotten Passwords sends a reset link to nowhere.",
        crit: "Flail of Forgotten Passwords makes {enemy} fail the security questions."
      }
    },
    {
      id: "blackberry-dagger",
      title: "Blackberry Dagger",
      artifactId: "mwf-002",
      cost: 2,
      prefix: "BBY",
      fallbackLabel: "HOSTILE TAKEOVER",
      pickerCopy: "Fast attacks with critical hit chance.",
      tags: ["melee", "fast", "crit"],
      stats: { damage: 3, defense: 0, range: 1, magic: 0, chaos: 1, speed: 5, reliability: 4 },
      behavior: { type: "single-hit", cooldownTicks: 1, target: "weakest", baseDamage: 8, critChance: 0.22, missChance: 0.04 },
      logTemplates: {
        hit: "Blackberry Dagger schedules a hostile meeting with {enemy}.",
        miss: "Blackberry Dagger gets trapped in calendar sync.",
        crit: "Blackberry Dagger silently acquires {enemy}."
      }
    },
    {
      id: "pager-knuckle-dusters",
      title: "Pager Knuckle Dusters",
      artifactId: "mwf-004",
      cost: 2,
      prefix: "PGR",
      fallbackLabel: "911 PAGE",
      pickerCopy: "Combo punches that build momentum.",
      tags: ["melee", "combo"],
      stats: { damage: 3, defense: 1, range: 0, magic: 0, chaos: 1, speed: 4, reliability: 4 },
      behavior: { type: "combo", cooldownTicks: 1, target: "front", baseDamage: 7, comboBonus: 3, maxCombo: 4, critChance: 0.1, missChance: 0.05 },
      logTemplates: {
        hit: "Pager Knuckle Dusters buzz twice across {enemy}.",
        miss: "Pager Knuckle Dusters vibrate off-beat.",
        crit: "Pager Knuckle Dusters send {enemy} an urgent page."
      }
    },
    {
      id: "webcam-crossbow",
      title: "Webcam Crossbow",
      artifactId: "mwf-012",
      cost: 2,
      prefix: "CAM",
      fallbackLabel: "YOU ARE MUTED",
      pickerCopy: "Marks enemies for cleaner follow-up hits.",
      tags: ["ranged", "utility"],
      stats: { damage: 2, defense: 0, range: 4, magic: 1, chaos: 1, speed: 3, reliability: 4 },
      behavior: { type: "mark", cooldownTicks: 2, target: "weakest", baseDamage: 10, markBonus: 1.25, critChance: 0.08, missChance: 0.05 },
      logTemplates: {
        hit: "Webcam Crossbow catches {enemy} at an unflattering angle.",
        miss: "Webcam Crossbow stays muted and misses the cue.",
        crit: "Webcam Crossbow zooms in on {enemy}'s weak spot."
      }
    },
    {
      id: "tamagotchi-pendant-of-doom",
      title: "Tamagotchi Pendant of Doom",
      artifactId: "mwf-008",
      cost: 2,
      prefix: "PET",
      fallbackLabel: "FEED ME",
      pickerCopy: "Unpredictable wildcard with chaos bonuses.",
      tags: ["chaos", "wildcard"],
      stats: { damage: 2, defense: 1, range: 1, magic: 3, chaos: 5, speed: 2, reliability: 1 },
      behavior: { type: "wildcard", cooldownTicks: 2, target: "random", baseDamage: 10, critChance: 0.15, missChance: 0.13 },
      logTemplates: {
        hit: "Tamagotchi Pendant of Doom demands care from {enemy}.",
        miss: "Tamagotchi Pendant of Doom sulks in its pocket dimension.",
        crit: "Tamagotchi Pendant of Doom evolves directly through {enemy}."
      }
    }
  ];

  const enemyTypes = [
    {
      id: "pop-up-goblin",
      name: "Pop-Up Goblin",
      tier: "basic",
      maxHealth: 18,
      attack: 4,
      speed: 2,
      armor: 0,
      scoreValue: 35,
      traits: ["nuisance"],
      logIntro: "A Pop-Up Goblin appears over the close button.",
      attackText: "Pop-Up Goblin clicks three fake download buttons."
    },
    {
      id: "spam-bat",
      name: "Spam Bat",
      tier: "basic",
      maxHealth: 22,
      attack: 5,
      speed: 3,
      armor: 0,
      scoreValue: 35,
      traits: ["flying"],
      logIntro: "A Spam Bat flaps in with twelve unread offers.",
      attackText: "Spam Bat nips through the firewall."
    },
    {
      id: "trojan-knight",
      name: "Trojan Knight",
      tier: "mid",
      maxHealth: 42,
      attack: 8,
      speed: 2,
      armor: 3,
      scoreValue: 70,
      traits: ["armored"],
      logIntro: "A Trojan Knight offers a free installer.",
      attackText: "Trojan Knight lowers its fake update lance."
    },
    {
      id: "dial-up-wraith",
      name: "Dial-Up Wraith",
      tier: "mid",
      maxHealth: 34,
      attack: 7,
      speed: 2,
      armor: 1,
      scoreValue: 75,
      traits: ["evasive"],
      logIntro: "A Dial-Up Wraith screams through the phone line.",
      attackText: "Dial-Up Wraith ties up the household phone."
    },
    {
      id: "captcha-troll",
      name: "Captcha Troll",
      tier: "mid",
      maxHealth: 58,
      attack: 9,
      speed: 1,
      armor: 4,
      scoreValue: 90,
      traits: ["blocker"],
      logIntro: "A Captcha Troll asks you to identify every cursed bus.",
      attackText: "Captcha Troll makes you prove you are not a relic."
    },
    {
      id: "buffering-hydra",
      name: "Buffering Hydra",
      tier: "boss",
      maxHealth: 130,
      attack: 13,
      speed: 2,
      armor: 2,
      scoreValue: 400,
      traits: ["boss", "regenerating"],
      logIntro: "The Buffering Hydra loads one head at a time.",
      attackText: "Buffering Hydra bites, pauses, and bites again."
    },
    {
      id: "blue-screen-behemoth",
      name: "Blue Screen Behemoth",
      tier: "boss",
      maxHealth: 180,
      attack: 18,
      speed: 1,
      armor: 5,
      scoreValue: 650,
      traits: ["boss", "crash"],
      logIntro: "The Blue Screen Behemoth dumps memory across the dungeon.",
      attackText: "Blue Screen Behemoth throws a fatal exception."
    },
    {
      id: "404-dragon",
      name: "404 Dragon",
      tier: "boss",
      maxHealth: 225,
      attack: 22,
      speed: 2,
      armor: 4,
      scoreValue: 900,
      traits: ["boss", "burst"],
      logIntro: "The 404 Dragon cannot be found until it finds you.",
      attackText: "404 Dragon breathes broken links."
    },
    {
      id: "internet-explorer-lich",
      name: "Internet Explorer Lich",
      tier: "boss",
      maxHealth: 275,
      attack: 25,
      speed: 1,
      armor: 6,
      scoreValue: 1200,
      traits: ["boss", "ancient"],
      logIntro: "The Internet Explorer Lich rises after ignoring every update.",
      attackText: "Internet Explorer Lich casts compatibility mode."
    }
  ];

  window.memeticGameData = {
    statKeys: STAT_KEYS,
    budgetLimit: 12,
    requiredWeapons: 4,
    tickMs: 700,
    maxLogEntries: 80,
    storageKey: "lemonteed.memeticWarfare.scores.v1",
    weapons,
    enemyTypes,
    scoring: {
      wave: 700,
      enemy: 35,
      boss: 1000,
      health: 12,
      chaosCap: 500,
      chaosPerPointPerWave: 10,
      budgetEfficiency: 100
    },
    rulesNote: "Only Clean Run screenshots are eligible for the Hall of Relics. Cursed Runs, cropped screenshots, edited images, or suspicious wizardry may be rejected by the Council of Obsolete Technology."
  };
}());
