const fs = require("node:fs");
const path = require("node:path");
const { assertSafePublicUrl, assertSafeRelativeAssetPath } = require("./security-utils");

const root = path.resolve(__dirname, "..");
const contentFile = path.join(root, "content", "lemonteed-fm.json");
const outputFile = path.join(root, "lemonteed-fm", "tracks.js");

const defaultArtworkSmall = "/images/lemonteed-fm/disco-lemon.webp";
const defaultArtworkLarge = "/images/lemonteed-fm/lemonteed-fm.webp";

function arrayField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDurationSec(durationStr) {
  const parts = String(durationStr || "").split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return 0;
}

function normalizeTrack(track, index) {
  const title = String(track.title || "").trim();
  const artist = String(track.artist || "").trim();

  if (!title) {
    throw new Error(`Track ${index + 1} is missing a title.`);
  }

  if (!artist) {
    throw new Error(`Track "${title}" is missing an artist.`);
  }

  const id = String(track.id || title)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `track-${index + 1}`;

  const duration = String(track.duration || "").trim();
  const durationSec = Number(track.durationSec) || parseDurationSec(duration);

  return {
    id,
    title,
    artist,
    album: String(track.album || "Station Originals").trim(),
    genre: String(track.genre || "").trim(),
    mood: String(track.mood || "").trim(),
    vibe: arrayField(track.vibe),
    tags: arrayField(track.tags),
    duration,
    durationSec,
    artworkSmall: String(track.artworkSmall || track.artwork || defaultArtworkSmall).trim(),
    artworkLarge: String(track.artworkLarge || track.artwork || defaultArtworkLarge).trim(),
    previewAudio: String(track.previewAudio || "").trim(),
    fullAudio: String(track.fullAudio || "").trim(),
    sourceName: String(track.sourceName || "").trim(),
    sourceUrl: String(track.sourceUrl || "").trim(),
    license: String(track.license || "").trim(),
    attribution: String(track.attribution || "").trim(),
    usage: String(track.usage || "Verify the original source before using in your own project.").trim(),
    curatorNote: String(track.curatorNote || "").trim(),
    program: String(track.program || "").trim(),
    addedDate: String(track.addedDate || "").trim(),
    featured: track.featured === true,
    canHost: track.canHost === true,
    canDownload: track.canDownload === true
  };
}

function validateData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Lemonteed FM content must be an object.");
  }

  if (!Array.isArray(data.tracks)) {
    throw new Error("Lemonteed FM content needs a tracks array.");
  }

  const ids = new Set();
  const tracks = data.tracks.map((track, index) => {
    const normalized = normalizeTrack(track, index);

    if (ids.has(normalized.id)) {
      throw new Error(`Duplicate Lemonteed FM track id: ${normalized.id}`);
    }

    ids.add(normalized.id);

    if (normalized.canHost && !normalized.previewAudio && !normalized.fullAudio) {
      throw new Error(`Hosted track "${normalized.title}" needs previewAudio or fullAudio.`);
    }

    if (!normalized.canHost && !normalized.sourceUrl) {
      throw new Error(`Source-only track "${normalized.title}" needs sourceUrl.`);
    }

    if (normalized.sourceUrl) {
      assertSafePublicUrl(normalized.sourceUrl, `Track "${normalized.title}" sourceUrl`);
    }

    [normalized.previewAudio, normalized.fullAudio, normalized.artworkSmall, normalized.artworkLarge].forEach((assetPath, index) => {
      if (!assetPath) {
        return;
      }

      const labels = ["previewAudio", "fullAudio", "artworkSmall", "artworkLarge"];
      assertSafeRelativeAssetPath(assetPath, `Track "${normalized.title}" ${labels[index]}`);
    });

    return normalized;
  });

  return {
    ...data,
    tracks,
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

function loadLemonteedFm() {
  if (!fs.existsSync(contentFile)) {
    return { tracks: [] };
  }

  return validateData(JSON.parse(fs.readFileSync(contentFile, "utf8")));
}

function buildLemonteedFm() {
  const data = loadLemonteedFm();
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `window.LEMONTEED_FM_TRACKS = ${JSON.stringify(data.tracks, null, 2)};\n`);
  return data;
}

if (require.main === module) {
  const data = buildLemonteedFm();
  console.log(`Built ${data.tracks.length} Lemonteed FM tracks.`);
}

module.exports = {
  contentFile,
  outputFile,
  validateLemonteedFm: validateData,
  loadLemonteedFm,
  buildLemonteedFm
};
