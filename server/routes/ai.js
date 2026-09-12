/**
 * Lemonteed Studio V2 — AI Route (Ollama Bridge)
 *
 * GET  /api/ai/status    → { available, models[], activeModel, config }
 * POST /api/ai/suggest   → { suggestion } — field suggestion from local Ollama
 * PATCH /api/ai/config   → save model/temperature/workspace toggles
 *
 * Ollama must be running locally (default: http://localhost:11434).
 * If Ollama is unreachable, all routes return { available: false } gracefully
 * rather than throwing — the UI degrades silently.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { sendJson, readJsonBody } = require("../middleware.js");

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
const CONFIG_FILE = path.resolve(__dirname, "..", "..", "content", "ai-config.json");

// Default config — written on first save
const DEFAULT_CONFIG = {
  activeModel: "llama3.2:latest",
  temperature: 0.7,
  maxTokens: 256,
  workspaces: {
    library: true,
    uploads: true,
    specimens: true,
    seo: true,
    fm: true,
    "junk-drawer": true,
    mutation: false   // operator log phases are intentional, less AI noise
  },
  updatedAt: null
};

// ── Config helpers ────────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(updates) {
  const current = loadConfig();
  const next = {
    ...current,
    ...updates,
    workspaces: { ...current.workspaces, ...(updates.workspaces || {}) },
    updatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

// ── Ollama helpers ────────────────────────────────────────────────────────────

async function ollamaFetch(endpoint, options = {}) {
  const url = `${OLLAMA_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function getOllamaStatus() {
  try {
    const res = await ollamaFetch("/api/tags");
    if (!res.ok) return { available: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at
    }));
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

// ── Prompt builders (per-workspace, per-field) ────────────────────────────────

const SYSTEM_PROMPT = `You are a concise creative writing assistant for a local archive CMS called Lemonteed. 
Your suggestions are short, direct, and match the tone of the content. 
Respond with ONLY the suggested text — no preamble, no explanation, no quotes.`;

function buildPrompt(workspaceId, field, context) {
  const ctx = context || {};

  const prompts = {
    // Gallery / project uploads
    uploads: {
      description: `Write a 1–2 sentence description for a gallery piece.
Title: ${ctx.title || "Untitled"}
Category: ${ctx.category || "unknown"}
Year: ${ctx.year || "unknown"}
Tags already set: ${ctx.tags || "none"}
Filename hint: ${ctx.filename || ""}
Write a punchy, evocative description.`,

      tags: `Suggest 4–6 comma-separated tags for a gallery piece.
Title: ${ctx.title || "Untitled"}
Category: ${ctx.category || "unknown"}
Description: ${ctx.description || ""}
Return only the tags, comma-separated, lowercase, no spaces in individual tags.`,

      alt: `Write concise alt text for a gallery image.
Title: ${ctx.title || "Untitled"}
Description: ${ctx.description || ""}
Keep it under 120 characters.`
    },

    // Specimen Vault
    specimens: {
      notes: `Write brief operator notes for an HTML specimen filed in an AI output archive.
Title: ${ctx.title || "Untitled"}
Model used: ${ctx.model || "unknown"}
Skill/system: ${ctx.skill || "unknown"}
Prompt excerpt: ${ctx.prompt ? ctx.prompt.slice(0, 400) : "not provided"}
Notes should cover: what worked, what was surprising, any visual quirks. 2–4 sentences max.`,

      tags: `Suggest 4–8 comma-separated tags for an HTML specimen.
Title: ${ctx.title || "Untitled"}
Model: ${ctx.model || "unknown"}
Skill: ${ctx.skill || "unknown"}
Return only the tags, comma-separated, lowercase.`
    },

    // SEO Manager
    seo: {
      description: `Write a meta description for this page.
Page title: ${ctx.title || "Untitled"}
Page type: ${ctx.pageType || "general"}
Existing description: ${ctx.existing || "none"}
Aim for 120–155 characters. Make it compelling and specific.`,

      ogDescription: `Write an Open Graph description for social sharing.
Page title: ${ctx.title || "Untitled"}
Meta description: ${ctx.description || ""}
Keep it punchy, under 155 characters.`
    },

    // Lemonteed FM
    fm: {
      attribution: `Write attribution text for a music track.
Title: ${ctx.title || "Untitled"}
Artist: ${ctx.artist || "unknown"}
License: ${ctx.license || "unknown"}
Source: ${ctx.sourceUrl || "unknown"}
1–2 sentences. Factual, clear.`,

      usage: `Write a usage note for a music track in an archive.
License: ${ctx.license || "unknown"}
Be brief. One sentence about what a viewer should know before using this track.`
    },

    // Junk Drawer external tools
    "junk-drawer": {
      description: `Write a description for an external web tool being listed in a creative archive.
Tool name: ${ctx.name || "Untitled"}
Tool URL: ${ctx.url || ""}
Write 1–2 sentences with personality. What does it do? Why would a creative person care?`
    }
  };

  const workspacePrompts = prompts[workspaceId];
  if (!workspacePrompts) return null;
  return workspacePrompts[field] || null;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function getStatus(req, res) {
  const [status, config] = await Promise.all([getOllamaStatus(), Promise.resolve(loadConfig())]);
  sendJson(res, 200, { ...status, activeModel: config.activeModel, config });
}

async function postSuggest(req, res) {
  const body = await readJsonBody(req);
  const { workspaceId, field, context } = body;

  if (!workspaceId || !field) {
    sendJson(res, 400, { error: "workspaceId and field are required." });
    return;
  }

  const config = loadConfig();

  // Check if AI is enabled for this workspace
  if (config.workspaces[workspaceId] === false) {
    sendJson(res, 403, { error: `AI suggestions are disabled for workspace: ${workspaceId}` });
    return;
  }

  const userPrompt = buildPrompt(workspaceId, field, context);
  if (!userPrompt) {
    sendJson(res, 400, { error: `No prompt template for workspace="${workspaceId}" field="${field}".` });
    return;
  }

  let ollamaRes;
  try {
    ollamaRes = await ollamaFetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.activeModel,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
        options: {
          temperature: config.temperature || 0.7,
          num_predict: config.maxTokens || 256
        }
      })
    });
  } catch (err) {
    sendJson(res, 503, { error: "Ollama is not reachable. Make sure it is running.", detail: err.message });
    return;
  }

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text().catch(() => "");
    sendJson(res, 502, { error: "Ollama returned an error.", detail: text });
    return;
  }

  const data = await ollamaRes.json();
  const suggestion = (data.response || "").trim();

  if (!suggestion) {
    sendJson(res, 500, { error: "Ollama returned an empty suggestion." });
    return;
  }

  sendJson(res, 200, {
    suggestion,
    model: config.activeModel,
    workspaceId,
    field
  });
}

async function patchConfig(req, res) {
  const body = await readJsonBody(req);
  const allowed = ["activeModel", "temperature", "maxTokens", "workspaces"];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = body[key];
    }
  }
  const saved = saveConfig(updates);
  sendJson(res, 200, { config: saved });
}

module.exports = { getStatus, postSuggest, patchConfig };
