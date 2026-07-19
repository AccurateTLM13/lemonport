/* ─────────────────────────────────────────────────────────────
   LemonteedFM — Station Engine
   LFM 93.7 / Static Signal / License-Aware Audio Nonsense
   ───────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ── Track Data ─────────────────────────────────────────────── */
  const TRACKS = [
    {
      id: "lemonteed-fm-93-7-internet-s-least-funded-booth",
      title: "Internet's Least Funded Booth",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "station-id",
      mood: "late-night editing",
      vibe: ["intro", "station dj"],
      tags: ["lemonteedfm"],
      duration: "1:12",
      durationSec: 72,
      artworkSmall: "/images/lemonteed-fm/lemonteed-fm-93-7-internet-s-least-funded-booth-480.webp",
      artworkLarge: "/images/lemonteed-fm/lemonteed-fm-93-7-internet-s-least-funded-booth.webp",
      fullAudio: "/images/lemonteed-fm/audio/internets-least-funded-booth.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/the_lemon_is_strong",
      license: "All Rights Reserved",
      attribution: "Internet's Least Funded Booth by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "The booth theme. The signal that tells you something mildly unusual is about to happen.",
      program: "Internet's Least Funded Booth",
      addedDate: "2025-11-04",
      featured: true,
      canHost: true,
      canDownload: false
    },
    {
      id: "impressions-before-coffee",
      title: "Impressions Before Coffee",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "lo-fi",
      mood: "lo-fi focus",
      vibe: ["lofi"],
      tags: [],
      duration: "2:34",
      durationSec: 154,
      artworkSmall: "/images/lemonteed-fm/impressions-before-coffee-480.webp",
      artworkLarge: "/images/lemonteed-fm/impressions-before-coffee.webp",
      fullAudio: "/images/lemonteed-fm/audio/impressions_before_coffee.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/impressions-before-coffee",
      license: "All Rights Reserved",
      attribution: "Impressions Before Coffee by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "Dusty morning loops for work that should have been finished yesterday.",
      program: "Internet's Least Funded Booth",
      addedDate: "2025-12-01",
      featured: false,
      canHost: true,
      canDownload: false
    },
    {
      id: "dance-for-legal-s-sake",
      title: "Dance For Legal's Sake",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "corporate-satire",
      mood: "corporate menace",
      vibe: ["corporate dance-pop", "corporate satire"],
      tags: [],
      duration: "1:27",
      durationSec: 87,
      artworkSmall: "/images/lemonteed-fm/dance-for-legal-s-sake-480.webp",
      artworkLarge: "/images/lemonteed-fm/dance-for-legal-s-sake.webp",
      fullAudio: "/images/lemonteed-fm/audio/dance_for_legals_sake.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/dance-for-legals-sake",
      license: "All Rights Reserved",
      attribution: "Dance For Legal's Sake by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "A compliance anthem for teams that forgot fun was optional.",
      program: "Songs the Algorithm Forgot",
      addedDate: "2025-12-08",
      featured: false,
      canHost: true,
      canDownload: false
    },
    {
      id: "monopoly-is-the-condition-of-every-business",
      title: "Monopoly Is The Condition Of Every Business",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "novelty-rap",
      mood: "quiet panic",
      vibe: ["90s Monopoly Rap", "Peter Thiel"],
      tags: [],
      duration: "2:33",
      durationSec: 153,
      artworkSmall: "/images/lemonteed-fm/monopoly-is-the-condition-of-every-business-480.webp",
      artworkLarge: "/images/lemonteed-fm/monopoly-is-the-condition-of-every-business.webp",
      fullAudio: "/images/lemonteed-fm/audio/monopoly-is-the-condition-of-every-successful-business-compressed.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/monopoly-business",
      license: "All Rights Reserved",
      attribution: "Monopoly Is The Condition Of Every Business by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "Inspired by a quote that sounds like a threat but got a book deal instead.",
      program: "Songs the Algorithm Forgot",
      addedDate: "2026-01-15",
      featured: false,
      canHost: true,
      canDownload: false
    },
    {
      id: "turn-the-lemon-dial",
      title: "Turn the Lemon Dial",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "synthwave",
      mood: "midnight radio",
      vibe: ["synthwave", "midnight radio"],
      tags: [],
      duration: "1:40",
      durationSec: 100,
      artworkSmall: "/images/lemonteed-fm/turn-the-lemon-dial-480.webp",
      artworkLarge: "/images/lemonteed-fm/turn-the-lemon-dial.webp",
      fullAudio: "/images/lemonteed-fm/audio/turn-the-lemon-dial.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/turn-the-lemon-dial",
      license: "All Rights Reserved",
      attribution: "Turn the Lemon Dial by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "The station's unofficial closing theme. Works best at 1 AM with the brightness down.",
      program: "Midnight Lemon Dial",
      addedDate: "2026-01-22",
      featured: false,
      canHost: true,
      canDownload: false
    },
    {
      id: "trust-me-bro",
      title: "Trust Me Bro",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "garage-rock",
      mood: "late-night editing",
      vibe: ["punky garage rock", "chaotic internet anthem"],
      tags: [],
      duration: "2:32",
      durationSec: 152,
      artworkSmall: "/images/lemonteed-fm/trust-me-bro-2-480.webp",
      artworkLarge: "/images/lemonteed-fm/trust-me-bro-2.webp",
      fullAudio: "/images/lemonteed-fm/audio/trust-me-bro.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/trust_me_bro",
      license: "All Rights Reserved",
      attribution: "Trust Me Bro by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "The official anthem of every pitch deck that did not include a source.",
      program: "Songs the Algorithm Forgot",
      addedDate: "2026-02-05",
      featured: false,
      canHost: true,
      canDownload: false
    },
    {
      id: "track-seven",
      title: "Track Seven",
      artist: "Lemonteed FM",
      album: "Station Originals",
      genre: "indie-pop",
      mood: "quiet panic",
      vibe: ["sad indie pop", "lo-fi bedroom music"],
      tags: [],
      duration: "2:41",
      durationSec: 161,
      artworkSmall: "/images/lemonteed-fm/track-seven-480.webp",
      artworkLarge: "/images/lemonteed-fm/track-seven.webp",
      fullAudio: "/images/lemonteed-fm/audio/track-seven.mp3",
      sourceName: "SoundCloud",
      sourceUrl: "https://soundcloud.com/lemonteedfm/track-seven",
      license: "All Rights Reserved",
      attribution: "Track Seven by Lemonteed FM. All Rights Reserved.",
      usage: "Verify the original source before using in any project. This track is not licensed for reuse.",
      curatorNote: "Named Track Seven because that is what the file was called and nothing better came to mind.",
      program: "Midnight Lemon Dial",
      addedDate: "2026-03-01",
      featured: false,
      canHost: true,
      canDownload: false
    }
  ];

  /* ── Schedule Programs ──────────────────────────────────────── */
  const SCHEDULE = [
    {
      id: "least-funded",
      name: "Internet's Least Funded Booth",
      time: "9:00 AM",
      timeHour: 9,
      desc: "Original compositions and station IDs from the booth. Unexpectedly sincere.",
      state: "now"
    },
    {
      id: "algo-forgot",
      name: "Songs the Algorithm Forgot",
      time: "12:00 PM",
      timeHour: 12,
      desc: "Tracks the recommendation engine passed over. Justified, possibly.",
      state: "next"
    },
    {
      id: "midnight-dial",
      name: "Midnight Lemon Dial",
      time: "10:00 PM",
      timeHour: 22,
      desc: "Late night synthwave and bedroom recordings for people who should be asleep.",
      state: "later"
    }
  ];

  /* ── Freshly Added (most recent 4) ─────────────────────────── */
  const FRESH_IDS = [
    "track-seven",
    "trust-me-bro",
    "turn-the-lemon-dial",
    "monopoly-is-the-condition-of-every-business"
  ];

  /* ── Player State ───────────────────────────────────────────── */
  const state = {
    currentIndex: 0,
    isPlaying: false,
    progressSec: 0,
    volume: 0.8,
    filteredTracks: [...TRACKS],
    expandedRow: null,
    openMenu: null,
    progressTimer: null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const fmt = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("data-")) node.setAttribute(k, v);
      else node[k] = v;
    }
    for (const child of children) {
      if (child == null) continue;
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  /* ── Toast ──────────────────────────────────────────────────── */
  const toast = (() => {
    const t = el("div", { class: "fm-toast", role: "status", "aria-live": "polite" });
    document.body.appendChild(t);
    let timer;
    return (msg) => {
      t.textContent = msg;
      t.classList.add("is-visible");
      clearTimeout(timer);
      timer = setTimeout(() => t.classList.remove("is-visible"), 2400);
    };
  })();

  /* ── Audio Engine ───────────────────────────────────────────── */
  const audio = el("audio", { preload: "none" });
  document.body.appendChild(audio);

  function trackAt(index) {
    return TRACKS[index] ?? TRACKS[0];
  }

  function currentTrack() {
    return trackAt(state.currentIndex);
  }

  function loadTrack(track) {
    audio.src = track.fullAudio || "";
    audio.volume = state.volume;
    updatePlayerUI(track);
  }

  function play() {
    const track = currentTrack();
    if (!audio.src || audio.src === window.location.href) {
      loadTrack(track);
    }
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => {
        // Fallback: simulate playback if audio fails
        startSimulation();
      });
    }
    state.isPlaying = true;
    startProgressSync();
    syncPlayState(true);
    $(".fm-hero__wave")?.classList.add("is-playing");
  }

  function pause() {
    audio.pause();
    state.isPlaying = false;
    stopProgressSync();
    syncPlayState(false);
    $(".fm-hero__wave")?.classList.remove("is-playing");
  }

  function togglePlay() {
    state.isPlaying ? pause() : play();
  }

  function goPrev() {
    state.currentIndex = (state.currentIndex - 1 + TRACKS.length) % TRACKS.length;
    state.progressSec = 0;
    const track = currentTrack();
    loadTrack(track);
    if (state.isPlaying) play();
    syncCrateHighlight();
  }

  function goNext() {
    state.currentIndex = (state.currentIndex + 1) % TRACKS.length;
    state.progressSec = 0;
    const track = currentTrack();
    loadTrack(track);
    if (state.isPlaying) play();
    syncCrateHighlight();
  }

  function selectTrack(id) {
    const idx = TRACKS.findIndex(t => t.id === id);
    if (idx < 0) return;
    state.currentIndex = idx;
    state.progressSec = 0;
    const track = currentTrack();
    loadTrack(track);
    play();
    syncCrateHighlight();
    // Scroll to hero
    document.getElementById("live")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Simulation (when real audio is unavailable) ─────────────── */
  let simTimer = null;

  function startSimulation() {
    stopSimulation();
    const track = currentTrack();
    const total = track.durationSec;
    simTimer = setInterval(() => {
      if (!state.isPlaying) return;
      state.progressSec += 0.5;
      if (state.progressSec >= total) {
        state.progressSec = 0;
        goNext();
      } else {
        updateProgress();
      }
    }, 500);
  }

  function stopSimulation() {
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
  }

  /* ── Progress Sync ──────────────────────────────────────────── */
  function startProgressSync() {
    stopProgressSync();
    if (audio.src && audio.src !== window.location.href) {
      state.progressTimer = setInterval(updateProgress, 500);
    } else {
      startSimulation();
    }
  }

  function stopProgressSync() {
    if (state.progressTimer) { clearInterval(state.progressTimer); state.progressTimer = null; }
    stopSimulation();
  }

  function updateProgress() {
    const track = currentTrack();
    const current = audio.duration ? audio.currentTime : state.progressSec;
    const total = audio.duration || track.durationSec;
    const pct = total ? (current / total) * 100 : 0;

    // Hero progress
    const heroRange = $("[data-hero-progress]");
    if (heroRange) {
      heroRange.value = pct;
      heroRange.style.setProperty("--progress", pct + "%");
    }
    $("[data-current-time]")?.textContent && ($("[data-current-time]").textContent = fmt(current));
    $("[data-duration-time]")?.textContent && ($("[data-duration-time]").textContent = fmt(total));

    // Player dock progress
    const playerRange = $("[data-player-progress]");
    if (playerRange) {
      playerRange.value = pct;
      playerRange.style.setProperty("--progress", pct + "%");
    }
    $("[data-player-current]")?.textContent !== undefined && ($("[data-player-current]").textContent = fmt(current));
    $("[data-player-total]")?.textContent !== undefined && ($("[data-player-total]").textContent = fmt(total));

    // Top-edge progress line on player
    document.querySelector(".fm-player")?.style.setProperty("--player-progress", pct + "%");
  }

  /* ── UI Sync ────────────────────────────────────────────────── */
  function syncPlayState(playing) {
    const icon = playing ? "⏸" : "▶";
    const label = playing ? "Pause" : "Play";
    $$("[data-play-btn]").forEach(btn => {
      btn.textContent = icon;
      btn.setAttribute("aria-label", label);
    });
    $$("[data-hero-play]").forEach(btn => {
      btn.textContent = icon;
      btn.setAttribute("aria-label", label);
    });
  }

  function updatePlayerUI(track) {
    // Player dock
    const playerArt = $("[data-player-art]");
    if (playerArt) { playerArt.src = track.artworkSmall; playerArt.alt = track.title; }
    const playerTitle = $("[data-player-title]");
    if (playerTitle) playerTitle.textContent = track.title;
    const playerArtist = $("[data-player-artist]");
    if (playerArtist) playerArtist.textContent = track.artist;
    const playerProgram = $("[data-player-program]");
    if (playerProgram) playerProgram.textContent = track.program;

    // Hero
    const heroArt = $("[data-hero-art]");
    if (heroArt) { heroArt.src = track.artworkLarge; heroArt.alt = track.title; }
    const heroTitle = $("[data-hero-title]");
    if (heroTitle) heroTitle.textContent = track.title;
    const heroArtist = $("[data-hero-artist]");
    if (heroArtist) heroArtist.textContent = track.artist;
    const heroAlbum = $("[data-hero-album]");
    if (heroAlbum) heroAlbum.textContent = track.album;
    const heroProgram = $("[data-hero-program]");
    if (heroProgram) heroProgram.textContent = "Program: " + track.program;
    const heroNote = $("[data-hero-note]");
    if (heroNote) heroNote.textContent = track.curatorNote;
    const heroLicense = $("[data-hero-license]");
    if (heroLicense) heroLicense.textContent = track.license;
    const heroSource = $("[data-hero-source]");
    if (heroSource) heroSource.textContent = track.sourceName;

    // Duration
    $("[data-duration-time]")?.textContent !== undefined && ($("[data-duration-time]").textContent = track.duration);
    $("[data-player-total]")?.textContent !== undefined && ($("[data-player-total]").textContent = track.duration);

    // Reset progress
    $("[data-current-time]") && ($("[data-current-time]").textContent = "0:00");
    $("[data-player-current]") && ($("[data-player-current]").textContent = "0:00");
    const heroRange = $("[data-hero-progress]");
    if (heroRange) { heroRange.value = 0; heroRange.style.setProperty("--progress", "0%"); }
    const playerRange = $("[data-player-progress]");
    if (playerRange) { playerRange.value = 0; playerRange.style.setProperty("--progress", "0%"); }
    document.querySelector(".fm-player")?.style.setProperty("--player-progress", "0%");
  }

  function syncCrateHighlight() {
    $$(".fm-track-row").forEach(row => {
      row.classList.toggle("is-playing", row.dataset.trackId === currentTrack().id);
    });
  }

  /* ── Crate Rendering ────────────────────────────────────────── */
  function licenseBadgeHtml(license) {
    const isCC = license.startsWith("CC");
    return `<span class="fm-license-badge${isCC ? " fm-license-badge--cc" : ""}">${escHtml(license)}</span>`;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderCrate() {
    const list = $("[data-track-list]");
    if (!list) return;

    if (state.filteredTracks.length === 0) {
      list.innerHTML = `<div class="fm-no-results">No tracks match your search. The algorithm would call this a success.</div>`;
      $("[data-crate-count]") && ($("[data-crate-count]").textContent = "0 tracks");
      return;
    }

    $("[data-crate-count]") && ($("[data-crate-count]").textContent = `${state.filteredTracks.length} track${state.filteredTracks.length !== 1 ? "s" : ""}`);

    list.innerHTML = state.filteredTracks.map((track, i) => {
      const isPlaying = track.id === currentTrack().id && state.isPlaying;
      return `
        <div class="fm-track-row${isPlaying ? " is-playing" : ""}" data-track-id="${track.id}">
          <div class="fm-track-row__main" tabindex="0" role="button" aria-expanded="false" aria-label="Expand details for ${escHtml(track.title)}">
            <div class="fm-track-row__num">
              <span class="fm-track-row__num-val">${i + 1}</span>
              <span class="fm-track-row__play-icon" aria-hidden="true">${isPlaying ? "▶" : "▶"}</span>
            </div>
            <div class="fm-track-row__identity">
              <div class="fm-track-row__thumb">
                <img src="${track.artworkSmall}" alt="" loading="lazy" width="40" height="40">
              </div>
              <div>
                <span class="fm-track-row__title">${escHtml(track.title)}</span>
                <span class="fm-track-row__artist">${escHtml(track.artist)}</span>
              </div>
            </div>
            <div class="fm-track-row__vibes">
              ${track.vibe.slice(0, 2).map(v => `<span class="fm-vibe-tag">${escHtml(v)}</span>`).join("")}
            </div>
            <div class="fm-track-row__license">
              ${licenseBadgeHtml(track.license)}
            </div>
            <div class="fm-track-row__menu">
              <button class="fm-overflow-btn" type="button" aria-label="More options for ${escHtml(track.title)}" aria-haspopup="true" aria-expanded="false">⋯</button>
              <div class="fm-overflow-menu" role="menu">
                <button type="button" data-action="play" role="menuitem">▶ Play now</button>
                <button type="button" data-action="copy-attr" role="menuitem">⎘ Copy attribution</button>
                <button type="button" data-action="open-source" role="menuitem">↗ Open original source</button>
                <button type="button" data-action="view-license" role="menuitem">⊙ View license details</button>
              </div>
            </div>
          </div>
          <div class="fm-track-detail" id="detail-${track.id}">
            <div class="fm-track-detail__grid">
              <div>
                <span class="fm-detail-block__label">Curator note</span>
                <p class="fm-detail-block__val">${escHtml(track.curatorNote)}</p>
              </div>
              <div>
                <span class="fm-detail-block__label">Full attribution</span>
                <p class="fm-detail-block__val">${escHtml(track.attribution)}</p>
              </div>
              <div>
                <span class="fm-detail-block__label">License</span>
                <p class="fm-detail-block__val">${licenseBadgeHtml(track.license)}</p>
              </div>
              <div>
                <span class="fm-detail-block__label">Source</span>
                <p class="fm-detail-block__val"><a href="${escHtml(track.sourceUrl)}" target="_blank" rel="noopener">Open on ${escHtml(track.sourceName)} ↗</a></p>
              </div>
              <div>
                <span class="fm-detail-block__label">Duration</span>
                <p class="fm-detail-block__val">${escHtml(track.duration)}</p>
              </div>
              <div>
                <span class="fm-detail-block__label">Added</span>
                <p class="fm-detail-block__val">${escHtml(track.addedDate)}</p>
              </div>
            </div>
            <div class="fm-usage-warning">
              ⚠ ${escHtml(track.usage)}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Attach crate row events
    $$(".fm-track-row", list).forEach(row => {
      const trackId = row.dataset.trackId;
      const track = TRACKS.find(t => t.id === trackId);

      // Expand on main click
      const mainRow = row.querySelector(".fm-track-row__main");
      mainRow?.addEventListener("click", () => toggleRowDetail(row, trackId));
      mainRow?.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRowDetail(row, trackId); }
      });

      // Overflow button
      const overflowBtn = row.querySelector(".fm-overflow-btn");
      const overflowMenu = row.querySelector(".fm-overflow-menu");

      overflowBtn?.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = overflowMenu.classList.contains("is-open");
        closeAllMenus();
        if (!isOpen) {
          overflowMenu.classList.add("is-open");
          overflowBtn.setAttribute("aria-expanded", "true");
          state.openMenu = overflowMenu;
        }
      });

      // Overflow menu actions
      overflowMenu?.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const action = btn.dataset.action;
          closeAllMenus();
          if (!track) return;
          if (action === "play") selectTrack(track.id);
          else if (action === "copy-attr") copyAttribution(track);
          else if (action === "open-source") window.open(track.sourceUrl, "_blank", "noopener");
          else if (action === "view-license") { toggleRowDetail(row, trackId, true); }
        });
      });
    });
  }

  function toggleRowDetail(row, trackId, forceOpen = false) {
    const detail = row.querySelector(".fm-track-detail");
    const mainRow = row.querySelector(".fm-track-row__main");
    if (!detail) return;

    const isOpen = detail.classList.contains("is-open");

    // Close previously open row
    if (state.expandedRow && state.expandedRow !== row) {
      state.expandedRow.querySelector(".fm-track-detail")?.classList.remove("is-open");
      state.expandedRow.querySelector(".fm-track-row__main")?.setAttribute("aria-expanded", "false");
    }

    const shouldOpen = forceOpen || !isOpen;
    detail.classList.toggle("is-open", shouldOpen);
    mainRow?.setAttribute("aria-expanded", String(shouldOpen));
    state.expandedRow = shouldOpen ? row : null;
  }

  function closeAllMenus() {
    $$(".fm-overflow-menu.is-open").forEach(m => m.classList.remove("is-open"));
    $$(".fm-overflow-btn[aria-expanded=true]").forEach(b => b.setAttribute("aria-expanded", "false"));
    state.openMenu = null;
  }

  /* ── Freshly Added ──────────────────────────────────────────── */
  function renderFreshlyAdded() {
    const grid = $("[data-fresh-grid]");
    if (!grid) return;

    const freshTracks = FRESH_IDS.map(id => TRACKS.find(t => t.id === id)).filter(Boolean);

    grid.innerHTML = freshTracks.map(track => `
      <article class="fm-track-card" data-track-id="${track.id}">
        <div class="fm-track-card__art">
          <img src="${track.artworkSmall}" alt="${escHtml(track.title)} artwork" loading="lazy" width="400" height="400">
          <div class="fm-track-card__play">
            <button type="button" aria-label="Play ${escHtml(track.title)}">▶</button>
          </div>
          <div class="fm-track-card__tags">
            <span class="fm-tag">${escHtml(track.mood)}</span>
          </div>
        </div>
        <div class="fm-track-card__body">
          <div class="fm-track-card__title">${escHtml(track.title)}</div>
          <div class="fm-track-card__artist">${escHtml(track.artist)}</div>
          <p class="fm-track-card__note">${escHtml(track.curatorNote)}</p>
          <div class="fm-track-card__footer">
            <span class="fm-track-card__date">Added ${track.addedDate}</span>
            ${licenseBadgeHtml(track.license)}
          </div>
        </div>
      </article>
    `).join("");

    // Attach play events
    $$(".fm-track-card", grid).forEach(card => {
      const id = card.dataset.trackId;
      const playBtn = card.querySelector("button");
      card.addEventListener("click", () => selectTrack(id));
      playBtn?.addEventListener("click", e => { e.stopPropagation(); selectTrack(id); });
    });
  }

  /* ── Featured Track ─────────────────────────────────────────── */
  function renderFeatured() {
    const wrap = $("[data-featured-track]");
    if (!wrap) return;
    const track = TRACKS.find(t => t.featured) ?? TRACKS[0];
    wrap.innerHTML = `
      <div class="fm-featured-track">
        <div class="fm-featured-track__art">
          <img src="${track.artworkSmall}" alt="${escHtml(track.title)}" loading="lazy" width="64" height="64">
        </div>
        <div class="fm-featured-track__info">
          <div class="fm-featured-track__title">${escHtml(track.title)}</div>
          <div class="fm-featured-track__artist">${escHtml(track.artist)}</div>
          <div class="fm-featured-track__note">${escHtml(track.curatorNote)}</div>
        </div>
        <div class="fm-featured-track__actions">
          <button class="fm-btn fm-btn--primary" type="button" data-play-featured>▶ Play</button>
          <button class="fm-btn" type="button" data-copy-featured>⎘ Copy attribution</button>
        </div>
      </div>
    `;

    wrap.querySelector("[data-play-featured]")?.addEventListener("click", () => selectTrack(track.id));
    wrap.querySelector("[data-copy-featured]")?.addEventListener("click", () => copyAttribution(track));
  }

  /* ── Schedule Strip ─────────────────────────────────────────── */
  function renderSchedule() {
    const strip = $("[data-schedule-strip]");
    if (!strip) return;
    strip.innerHTML = SCHEDULE.map(prog => `
      <div class="fm-schedule-item${prog.state === "now" ? " is-now" : ""}">
        <div class="fm-schedule-item__label">
          ${prog.state === "now" ? '<span class="fm-on-air__dot" aria-hidden="true"></span>' : ""}
          ${prog.state === "now" ? "On Air Now" : prog.state === "next" ? "Up Next" : "Later Tonight"}
        </div>
        <span class="fm-schedule-item__time">${prog.time}</span>
        <div class="fm-schedule-item__name">${escHtml(prog.name)}</div>
        <p class="fm-schedule-item__desc">${escHtml(prog.desc)}</p>
      </div>
    `).join("");
  }

  /* ── Search & Filter ────────────────────────────────────────── */
  let filterState = { query: "", license: "", mood: "", genre: "", sort: "default" };
  const activeChips = [];

  function applyFilters() {
    const { query, license, mood, genre, sort } = filterState;
    let tracks = [...TRACKS];

    if (query) {
      const q = query.toLowerCase();
      tracks = tracks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.license.toLowerCase().includes(q) ||
        t.vibe.some(v => v.toLowerCase().includes(q)) ||
        t.mood.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.program.toLowerCase().includes(q)
      );
    }

    if (license) tracks = tracks.filter(t => t.license === license);
    if (mood)    tracks = tracks.filter(t => t.mood === mood);
    if (genre)   tracks = tracks.filter(t => t.genre === genre);

    if (sort === "az")      tracks.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "za")      tracks.sort((a, b) => b.title.localeCompare(a.title));
    if (sort === "newest")  tracks.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
    if (sort === "oldest")  tracks.sort((a, b) => a.addedDate.localeCompare(b.addedDate));

    state.filteredTracks = tracks;
    renderCrate();
    syncCrateHighlight();
    renderChips();
    updateStatusLine(tracks.length);
  }

  function renderChips() {
    const container = $("[data-filter-chips]");
    if (!container) return;
    const chips = [];
    if (filterState.license) chips.push({ key: "license", label: "License: " + filterState.license });
    if (filterState.mood)    chips.push({ key: "mood",    label: "Mood: " + filterState.mood });
    if (filterState.genre)   chips.push({ key: "genre",   label: "Genre: " + filterState.genre });

    container.innerHTML = chips.map(c => `
      <span class="fm-filter-chip">
        ${escHtml(c.label)}
        <button type="button" aria-label="Remove ${escHtml(c.label)} filter" data-remove-filter="${c.key}">✕</button>
      </span>
    `).join("");

    $$("[data-remove-filter]", container).forEach(btn => {
      btn.addEventListener("click", () => {
        filterState[btn.dataset.removeFilter] = "";
        const select = $(`[data-filter="${btn.dataset.removeFilter}"]`);
        if (select) select.value = "";
        applyFilters();
      });
    });
  }

  function updateStatusLine(count) {
    const line = $("[data-filter-status]");
    if (!line) return;
    const hasFilters = filterState.query || filterState.license || filterState.mood || filterState.genre;
    line.textContent = hasFilters ? `Showing ${count} of ${TRACKS.length} tracks` : "";
  }

  /* ── Attribution ────────────────────────────────────────────── */
  function copyAttribution(track) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(track.attribution).then(() => toast("Attribution copied ✓")).catch(() => fallbackCopy(track.attribution));
    } else {
      fallbackCopy(track.attribution);
    }
  }

  function fallbackCopy(text) {
    const ta = el("textarea", { value: text, style: "position:fixed;opacity:0" });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Attribution copied ✓");
  }

  /* ── Request Form ───────────────────────────────────────────── */
  function handleRequestForm(form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(form);
      const type    = data.get("requestType") || "";
      const artist  = data.get("artistName") || "";
      const song    = data.get("songTitle") || "";
      const link    = data.get("link") || "";
      const notes   = data.get("licenseNotes") || "";
      const why     = data.get("why") || "";
      const email   = data.get("email") || "";

      const body = [
        `Request type: ${type}`,
        artist && `Artist: ${artist}`,
        song && `Song: ${song}`,
        link && `Link: ${link}`,
        notes && `License / source notes:\n${notes}`,
        why && `Why it should be added:\n${why}`,
        email && `Email: ${email}`
      ].filter(Boolean).join("\n\n");

      const subject = encodeURIComponent(`LFM Request: ${artist || "Artist"} — ${song || "Track"}`);
      window.location.href = `mailto:contact@lemonteed.com?subject=${subject}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ── Mobile Nav ─────────────────────────────────────────────── */
  function initMobileNav() {
    const toggle = $("[data-nav-toggle]");
    const nav = $("[data-mobile-nav]");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      nav.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
      toggle.textContent = isOpen ? "☰" : "✕";
    });

    // Close on link click
    $$("a", nav).forEach(a => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      });
    });
  }

  /* ── Mobile Player Expand ───────────────────────────────────── */
  function initMobilePlayer() {
    const expandBtn = $("[data-player-expand]");
    const player = $(".fm-player");
    if (!expandBtn || !player) return;

    expandBtn.addEventListener("click", () => {
      const isExpanded = player.classList.contains("is-expanded");
      player.classList.toggle("is-expanded", !isExpanded);
      expandBtn.setAttribute("aria-expanded", String(!isExpanded));
      expandBtn.textContent = isExpanded ? "▲" : "▼";
    });
  }

  /* ── Volume ─────────────────────────────────────────────────── */
  function initVolume() {
    $$("[data-volume]").forEach(slider => {
      slider.value = state.volume;
      slider.style.setProperty("--progress", (state.volume * 100) + "%");
      slider.addEventListener("input", () => {
        const val = parseFloat(slider.value);
        state.volume = val;
        audio.volume = val;
        $$("[data-volume]").forEach(s => {
          s.value = val;
          s.style.setProperty("--progress", (val * 100) + "%");
        });
      });
    });
  }

  /* ── Seek ────────────────────────────────────────────────────── */
  function initSeek() {
    $$("[data-hero-progress], [data-player-progress]").forEach(range => {
      range.addEventListener("input", () => {
        const pct = parseFloat(range.value) / 100;
        const track = currentTrack();
        const total = audio.duration || track.durationSec;
        const seekTo = pct * total;
        if (audio.duration) audio.currentTime = seekTo;
        else state.progressSec = seekTo;
        $$("[data-hero-progress], [data-player-progress]").forEach(r => {
          r.value = range.value;
          r.style.setProperty("--progress", range.value + "%");
        });
      });
    });
  }

  /* ── Signup Form ─────────────────────────────────────────────── */
  function initSignup() {
    const form = $("[data-signup-form]");
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      toast("You are now in the queue. Broadcasts are weekly.");
      form.reset();
    });
  }

  /* ── Global Click to close menus ───────────────────────────── */
  document.addEventListener("click", () => closeAllMenus());

  /* ── Audio native events ────────────────────────────────────── */
  audio.addEventListener("ended", goNext);
  audio.addEventListener("error", () => {
    if (state.isPlaying) startSimulation();
  });

  /* ── Active nav link sync on scroll ─────────────────────────── */
  function initNavHighlight() {
    const sections = $$("section[id], header[id]").filter(s => s.id);
    const navLinks = $$(".fm-nav a, .fm-mobile-nav a");

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute("href");
            link.classList.toggle("is-active", href === `#${id}`);
            if (href === `#${id}`) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
          });
        }
      });
    }, { rootMargin: "0px 0px -60% 0px", threshold: 0.1 });

    sections.forEach(s => obs.observe(s));
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    // Render dynamic sections
    renderSchedule();
    renderFreshlyAdded();
    renderFeatured();
    renderCrate();

    // Set initial hero to first track
    updatePlayerUI(currentTrack());

    // Hero play button
    $("[data-hero-play]")?.addEventListener("click", togglePlay);

    // Player buttons
    $("[data-play-btn]")?.addEventListener("click", togglePlay);
    $("[data-prev-btn]")?.addEventListener("click", goPrev);
    $("[data-next-btn]")?.addEventListener("click", goNext);

    // Copy attribution from hero
    $("[data-copy-hero-attribution]")?.addEventListener("click", () => copyAttribution(currentTrack()));
    $("[data-open-source]")?.addEventListener("click", () => window.open(currentTrack().sourceUrl, "_blank", "noopener"));

    // Player dock attribution + source
    $("[data-player-copy-attr]")?.addEventListener("click", () => copyAttribution(currentTrack()));
    $("[data-player-source]")?.addEventListener("click", () => window.open(currentTrack().sourceUrl, "_blank", "noopener"));

    // Search
    $("[data-search]")?.addEventListener("input", e => {
      filterState.query = e.target.value.trim();
      applyFilters();
    });

    // Filters
    $$("[data-filter]").forEach(sel => {
      sel.addEventListener("change", () => {
        filterState[sel.dataset.filter] = sel.value;
        applyFilters();
      });
    });

    // Sort
    $("[data-sort]")?.addEventListener("change", e => {
      filterState.sort = e.target.value;
      applyFilters();
    });

    // Clear filters
    $("[data-clear-filters]")?.addEventListener("click", () => {
      filterState = { query: "", license: "", mood: "", genre: "", sort: "default" };
      $("[data-search]") && ($("[data-search]").value = "");
      $$("[data-filter]").forEach(s => s.value = "");
      $("[data-sort]") && ($("[data-sort]").value = "default");
      applyFilters();
    });

    // Volume
    initVolume();

    // Seek
    initSeek();

    // Mobile nav
    initMobileNav();

    // Mobile player expand
    initMobilePlayer();

    // Nav highlight
    initNavHighlight();

    // Request forms
    $$("[data-request-form]").forEach(handleRequestForm);

    // Signup
    initSignup();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
