const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "content", "lemmy.json");
const OUTPUT_PATH = path.join(ROOT, "assets", "js", "lemmy-data.js");

const ALLOWED_ZONES = new Set([
  "home",
  "studio-lab",
  "junk-drawer",
  "fm",
  "vrg-vault",
  "memetic-warfare",
  "what-if",
  "error",
  "studio"
]);
const ALLOWED_STATES = new Set([
  "idle",
  "wave",
  "point",
  "run",
  "jump",
  "thinking",
  "working",
  "concerned",
  "sleep",
  "celebrate",
  "curious"
]);
const ALLOWED_POSITIONS = new Set(["bottom-left", "bottom-right", "top-left", "top-right"]);
const ALLOWED_DESTINATIONS = new Set(["strange", "useful", "loud", "forgotten", "surprise"]);
const ALLOWED_EVENTS = new Set([
  "lemonteed:artifact-opened",
  "lemonteed:track-started",
  "lemonteed:game-started",
  "lemonteed:zone-empty",
  "lemonteed:error"
]);
const SAFE_TIMING_RANGES = {
  ambientDelayMs: { min: 5000, max: 300000 },
  dialogueCooldownMs: { min: 30000, max: 86400000 }
};

function fail(message) {
  throw new Error(`Lemmy config: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertNonEmptyString(value, label) {
  if (!isNonEmptyString(value)) {
    fail(`${label} must be a non-empty string.`);
  }
}

function assertUniqueIds(records, label) {
  const ids = new Set();

  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      fail(`${label}[${index}] must be an object.`);
    }

    assertNonEmptyString(record.id, `${label}[${index}].id`);
    if (ids.has(record.id)) {
      fail(`${label} contains duplicate id "${record.id}".`);
    }
    ids.add(record.id);
  });
}

function isSafeInternalHref(href) {
  if (!isNonEmptyString(href) || href.includes("\\") || href.includes("..")) {
    return false;
  }

  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || !href.startsWith("/")) {
    return false;
  }

  try {
    const url = new URL(href, "https://lemonteed.invalid");
    return url.origin === "https://lemonteed.invalid";
  } catch (error) {
    return false;
  }
}

function assertAssetExists(assetPath, label) {
  assertNonEmptyString(assetPath, label);

  if (!assetPath.startsWith("/") || assetPath.includes("\\") || assetPath.includes("..")) {
    fail(`${label} must be a safe root-relative asset path.`);
  }

  const resolved = path.resolve(ROOT, assetPath.slice(1));
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    fail(`${label} resolves outside the repository.`);
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    fail(`${label} references missing asset "${assetPath}".`);
  }
}

function assertTiming(value, label) {
  const range = SAFE_TIMING_RANGES[label];
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    fail(`${label} must be an integer from ${range.min} to ${range.max}.`);
  }
}

function validateList(value, label, validateItem) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array.`);
  }
  value.forEach((item, index) => validateItem(item, `${label}[${index}]`));
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    fail("root must be an object.");
  }

  if (config.schemaVersion !== 1) {
    fail("schemaVersion must be 1.");
  }

  const character = config.character;
  if (!character || typeof character !== "object" || Array.isArray(character)) {
    fail("character must be an object.");
  }
  assertNonEmptyString(character.id, "character.id");
  if (character.id !== "lemmy") {
    fail("character.id must be \"lemmy\".");
  }
  assertNonEmptyString(character.name, "character.name");
  assertNonEmptyString(character.title, "character.title");
  assertAssetExists(character.defaultAsset, "character.defaultAsset");
  if (!character.stateAssets || typeof character.stateAssets !== "object" || Array.isArray(character.stateAssets)) {
    fail("character.stateAssets must be an object.");
  }
  Object.entries(character.stateAssets).forEach(([state, assetPath]) => {
    if (!ALLOWED_STATES.has(state)) {
      fail(`character.stateAssets.${state} is not an allowed state.`);
    }
    assertAssetExists(assetPath, `character.stateAssets.${state}`);
  });

  const preferences = config.preferences;
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    fail("preferences must be an object.");
  }
  assertNonEmptyString(preferences.storageKey, "preferences.storageKey");
  assertTiming(preferences.ambientDelayMs, "ambientDelayMs");
  assertTiming(preferences.dialogueCooldownMs, "dialogueCooldownMs");

  validateList(config.destinations, "destinations", (destination, label) => {
    if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
      fail(`${label} must be an object.`);
    }
    assertNonEmptyString(destination.id, `${label}.id`);
    if (!ALLOWED_DESTINATIONS.has(destination.id)) {
      fail(`${label}.id \"${destination.id}\" is not allowed.`);
    }
    assertNonEmptyString(destination.label, `${label}.label`);
    validateList(destination.hrefs, `${label}.hrefs`, (href, hrefLabel) => {
      if (!isSafeInternalHref(href)) {
        fail(`${hrefLabel} must be a safe root-relative destination.`);
      }
    });
  });
  assertUniqueIds(config.destinations, "destinations");
  const destinationIds = new Set(config.destinations.map((destination) => destination.id));

  if (!config.zones || typeof config.zones !== "object" || Array.isArray(config.zones)) {
    fail("zones must be an object.");
  }

  Object.entries(config.zones).forEach(([zoneId, zone]) => {
    if (!ALLOWED_ZONES.has(zoneId)) {
      fail(`zones.${zoneId} is not an allowed zone.`);
    }
    if (!zone || typeof zone !== "object" || Array.isArray(zone)) {
      fail(`zones.${zoneId} must be an object.`);
    }
    if (typeof zone.enabled !== "boolean") {
      fail(`zones.${zoneId}.enabled must be boolean.`);
    }
    if (zoneId === "error" && zone.enabled) {
      fail("zones.error must remain disabled until a public error page exists.");
    }
    assertNonEmptyString(zone.position, `zones.${zoneId}.position`);
    if (!ALLOWED_POSITIONS.has(zone.position)) {
      fail(`zones.${zoneId}.position \"${zone.position}\" is not allowed.`);
    }
    validateList(zone.states, `zones.${zoneId}.states`, (state, stateLabel) => {
      if (!ALLOWED_STATES.has(state)) {
        fail(`${stateLabel} \"${state}\" is not allowed.`);
      }
    });
    validateList(zone.messages, `zones.${zoneId}.messages`, (message, messageLabel) => {
      assertNonEmptyString(message, messageLabel);
    });
    validateList(zone.destinationIds, `zones.${zoneId}.destinationIds`, (destinationId, destinationLabel) => {
      if (!destinationIds.has(destinationId)) {
        fail(`${destinationLabel} \"${destinationId}\" is not defined in destinations.`);
      }
    });
    if (zone.reactions !== undefined) {
      if (!zone.reactions || typeof zone.reactions !== "object" || Array.isArray(zone.reactions)) {
        fail(`zones.${zoneId}.reactions must be an object.`);
      }
      Object.entries(zone.reactions).forEach(([eventName, reaction]) => {
        if (!ALLOWED_EVENTS.has(eventName)) {
          fail(`zones.${zoneId}.reactions.${eventName} is not an approved event.`);
        }
        if (!reaction || typeof reaction !== "object" || Array.isArray(reaction)) {
          fail(`zones.${zoneId}.reactions.${eventName} must be an object.`);
        }
        if (!ALLOWED_STATES.has(reaction.state)) {
          fail(`zones.${zoneId}.reactions.${eventName}.state \"${reaction.state}\" is not allowed.`);
        }
        assertNonEmptyString(reaction.message, `zones.${zoneId}.reactions.${eventName}.message`);
      });
    }
  });
  assertUniqueIds(Object.entries(config.zones).map(([id, zone]) => ({ id, ...zone })), "zones");

  return config;
}

function loadConfig() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
  } catch (error) {
    fail(`could not read valid JSON from ${path.relative(ROOT, SOURCE_PATH)} (${error.message}).`);
  }
  return validateConfig(config);
}

function build({ write = true } = {}) {
  const config = loadConfig();
  const output = `window.LEMMY_DATA = ${JSON.stringify(config, null, 2)};\n`;

  if (write) {
    fs.writeFileSync(OUTPUT_PATH, output, "utf8");
  }

  return { config, output, outputPath: OUTPUT_PATH };
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  try {
    const result = build({ write: !dryRun });
    console.log(`${dryRun ? "Validated" : "Built"} ${path.relative(ROOT, SOURCE_PATH)}${dryRun ? "" : ` -> ${path.relative(ROOT, result.outputPath)}`}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  ALLOWED_DESTINATIONS,
  ALLOWED_EVENTS,
  ALLOWED_POSITIONS,
  ALLOWED_STATES,
  ALLOWED_ZONES,
  build,
  validateConfig
};
