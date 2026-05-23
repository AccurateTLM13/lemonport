(function () {
  "use strict";

  const artworkSmall = "/images/lemonteed-fm/disco-lemon.webp";
  const artworkLarge = "/images/lemonteed-fm/lemonteed-fm.webp";
  const fallbackTracks = [
    {
      id: "easy-lemon",
      title: "Easy Lemon",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Easy_Lemon_%28ISRC_USUAN1200076%29.mp3",
      previewAudio: "audio/easy-lemon-preview.mp3",
      fullAudio: "audio/easy-lemon.mp3",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "2:06",
      license: "CC BY 3.0",
      attribution: "Easy Lemon by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 License. https://creativecommons.org/licenses/by/3.0/",
      vibe: ["bright", "calm", "lemon-coded"],
      tags: ["bright", "calm", "lemon-coded", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    },
    {
      id: "funk-game-loop",
      title: "Funk Game Loop",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Funk_Game_Loop_%28ISRC_USUAN1100839%29.mp3",
      previewAudio: "audio/funk-game-loop-preview.mp3",
      fullAudio: "audio/funk-game-loop.mp3",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "0:57",
      license: "CC BY 3.0",
      attribution: "Funk Game Loop by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 License. https://creativecommons.org/licenses/by/3.0/",
      vibe: ["funk", "loop", "game"],
      tags: ["funk", "loop", "game", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    },
    {
      id: "disco-lounge",
      title: "Disco Lounge",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Disco_Lounge_%28ISRC_USUAN1100602%29.mp3",
      previewAudio: "audio/disco-lounge-preview.mp3",
      fullAudio: "audio/disco-lounge.mp3",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "4:13",
      license: "CC BY 3.0",
      attribution: "Disco Lounge by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 License. https://creativecommons.org/licenses/by/3.0/",
      vibe: ["disco", "lounge", "gold"],
      tags: ["disco", "lounge", "gold", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    },
    {
      id: "airport-lounge",
      title: "Airport Lounge",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Airport_Lounge_%28ISRC_USUAN1100806%29.mp3",
      previewAudio: "audio/airport-lounge-preview.mp3",
      fullAudio: "audio/airport-lounge.mp3",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "5:08",
      license: "CC BY 3.0",
      attribution: "Airport Lounge by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 License. https://creativecommons.org/licenses/by/3.0/",
      vibe: ["jazz", "lounge", "airport"],
      tags: ["jazz", "lounge", "elevator-adjacent", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    },
    {
      id: "home-base-groove",
      title: "Home Base Groove",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Home_Base_Groove_%28Kevin_MacLeod%29_Time_0-22_%28ISRC_USUAN1100563%29.oga",
      previewAudio: "audio/home-base-groove-preview.mp3",
      fullAudio: "audio/home-base-groove.oga",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "0:22",
      license: "CC BY 3.0 US",
      attribution: "Home Base Groove by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 US. https://creativecommons.org/licenses/by/3.0/us/",
      vibe: ["short", "groove", "game"],
      tags: ["short", "groove", "game", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    },
    {
      id: "sneaky-snitch",
      title: "Sneaky Snitch",
      artist: "Kevin MacLeod",
      sourceName: "Incompetech",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sneaky_Snitch_%28ISRC_USUAN1100772%29.mp3",
      previewAudio: "audio/sneaky-snitch-preview.mp3",
      fullAudio: "audio/sneaky-snitch.mp3",
      artwork: artworkSmall,
      artworkSmall,
      artworkLarge,
      duration: "2:17",
      license: "CC BY 3.0",
      attribution: "Sneaky Snitch by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 3.0 License. https://creativecommons.org/licenses/by/3.0/",
      vibe: ["humorous", "mystery", "internet-classic"],
      tags: ["humorous", "mystery", "internet-classic", "free-to-use"],
      usage: "Verify the original source before using in your own project.",
      canDownload: false,
      canHost: true
    }
  ];
  const tracks = Array.isArray(window.LEMONTEED_FM_TRACKS) && window.LEMONTEED_FM_TRACKS.length
    ? window.LEMONTEED_FM_TRACKS
    : fallbackTracks;

  const audio = document.querySelector("[data-audio]");
  const trackList = document.querySelector("[data-track-list]");
  const featuredTrack = document.querySelector("[data-featured-track]");
  const searchInput = document.querySelector("[data-search]");
  const filterStatus = document.querySelector("[data-filter-status]");
  const trackCount = document.querySelector("[data-track-count]");
  const playerArt = document.querySelector("[data-player-art]");
  const playerTitle = document.querySelector("[data-player-title]");
  const playerArtist = document.querySelector("[data-player-artist]");
  const playerLicense = document.querySelector("[data-player-license]");
  const playButton = document.querySelector("[data-play]");
  const prevButton = document.querySelector("[data-prev]");
  const nextButton = document.querySelector("[data-next]");
  const progress = document.querySelector("[data-progress]");
  const currentTime = document.querySelector("[data-current-time]");
  const duration = document.querySelector("[data-duration]");
  const volume = document.querySelector("[data-volume]");
  const openSource = document.querySelector("[data-open-source]");
  const copyAttribution = document.querySelector("[data-copy-attribution]");
  const playerStatus = document.querySelector("[data-player-status]");
  const embedHost = document.querySelector("[data-embed-host]");
  const startListening = document.querySelector("[data-start-listening]");
  const openRequestButtons = Array.from(document.querySelectorAll("[data-open-request]"));
  const closeRequestButton = document.querySelector("[data-close-request]");
  const requestPanel = document.querySelector("[data-request-panel]");
  const requestForm = document.querySelector("[data-request-form]");
  const requestStatus = document.querySelector("[data-request-status]");
  const modeCopyEls = Array.from(document.querySelectorAll("[data-mode-copy]"));
  const modeAriaLabelEls = Array.from(document.querySelectorAll("[data-mode-aria-label]"));
  const modeArt = document.querySelector("[data-mode-art]");
  const pietToggle = document.querySelector("[data-piet-toggle]");
  const pietToggleLabel = document.querySelector("[data-piet-toggle-label]");
  const pietScheduleButton = document.querySelector("[data-piet-schedule-button]");
  const pietQuote = document.querySelector("[data-piet-quote]");
  const pietListenerCount = document.querySelector("[data-piet-listeners]");
  const pietSignalStatus = document.querySelector("[data-piet-signal-status]");
  const pietSignal = document.querySelector("[data-piet-signal]");
  const pietClockEls = Array.from(document.querySelectorAll("[data-piet-clock]"));

  let currentIndex = 0;
  let filteredIndexes = tracks.map((track, index) => index);
  let isSeeking = false;
  let embeddedTrackId = "";
  let soundCloudApiPromise = null;
  let soundCloudWidget = null;
  let soundCloudDuration = 0;
  let soundCloudPosition = 0;
  let soundCloudPlaying = false;

  /* ======================================================
     Piet Late Night Mode - Temporary Prototype
     TODO: Replace temporary toggle with final local-time activation.
  ====================================================== */

  const PIET_MODE_STORAGE_KEY = "lemonteedFmPietMode";
  const PIET_MODE_DEFAULT_ON = false;
  const pietQuotes = [
    "You are not behind. You are buffering.",
    "The algorithm is just a vending machine for your worst instincts.",
    "Being awake at 2:17 AM is not a schedule. It is a side quest.",
    "Every group chat has one unpaid executive producer.",
    "Nobody reads the terms. That's where they keep the goblins.",
    "If the signal sounds bad, that means it's authentic.",
    "A playlist is just a diary with plausible deniability.",
    "You cannot optimize your way out of needing a nap.",
    "The booth fan says we are cleared for one more bad idea.",
    "Questionable? Yes. Incorrect? Rarely."
  ];
  const pietSignalStatuses = [
    "Signal drift detected.",
    "Piet is checking the booth fan.",
    "Static break incoming.",
    "Transmission quality: questionable.",
    "Current vibe recalibrated.",
    "The hill is receiving."
  ];
  const pietTagRotation = [
    ["lofi", "late night", "internet radio"],
    ["morning regret", "official radio", "airwaves"],
    ["corporate dance", "peter thinks", "late night"],
    ["sad indie pop", "lo-fi before music", "internet radio"]
  ];
  let pietQuoteIndex = 0;
  let pietSignalIndex = 0;
  let isPietModeActive = PIET_MODE_DEFAULT_ON;
  let pietIntervalsStarted = false;

  function readStoredPietMode() {
    try {
      const storedValue = window.localStorage.getItem(PIET_MODE_STORAGE_KEY);

      if (storedValue === "on") {
        return true;
      }

      if (storedValue === "off") {
        return false;
      }
    } catch (error) {
      // localStorage can be unavailable in restricted browser contexts.
    }

    return PIET_MODE_DEFAULT_ON;
  }

  function storePietMode(isEnabled) {
    try {
      window.localStorage.setItem(PIET_MODE_STORAGE_KEY, isEnabled ? "on" : "off");
    } catch (error) {
      // The toggle still works for the current page view without persistence.
    }
  }

  function getIsPietHours() {
    // TODO: Integration phase:
    // Replace the temporary toggle state with local browser time activation.
    // Piet Mode should activate from 11 PM to 5 AM based on visitor browser time.
    return isPietModeActive;
  }

  function updatePietClock() {
    if (!getIsPietHours() || !pietClockEls.length) {
      return;
    }

    const time = new Intl.DateTimeFormat([], {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());

    pietClockEls.forEach((element) => {
      element.textContent = time;
    });
  }

  function rotatePietQuote() {
    if (!getIsPietHours() || !pietQuote || !pietQuotes.length) {
      return;
    }

    pietQuote.classList.add("is-fading");
    window.setTimeout(() => {
      pietQuoteIndex = (pietQuoteIndex + 1) % pietQuotes.length;
      pietQuote.textContent = `"${pietQuotes[pietQuoteIndex]}"`;
      pietQuote.classList.remove("is-fading");
    }, 320);
  }

  function updateFakeListenerCount() {
    if (!getIsPietHours() || !pietListenerCount) {
      return;
    }

    // Flavor-only fake listener count. Not real analytics.
    const baseListeners = 1337;
    const variance = Math.floor(Math.sin(Date.now() / 45000) * 8);
    pietListenerCount.textContent = (baseListeners + variance).toLocaleString("en-US");
  }

  function rotateSignalStatus() {
    if (!getIsPietHours() || !pietSignalStatuses.length) {
      return;
    }

    pietSignalIndex = (pietSignalIndex + 1) % pietSignalStatuses.length;
    const status = pietSignalStatuses[pietSignalIndex];

    if (pietSignalStatus) {
      pietSignalStatus.textContent = status;
    }

    if (pietSignal) {
      pietSignal.textContent = status.replace(/\.$/, "");
    }
  }

  function scrollToPietSchedule() {
    if (!getIsPietHours()) {
      setPietMode(true, true);
    }

    document.querySelector("#piet-schedule")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  }

  function pietTagsForTrack(track, index) {
    if (!getIsPietHours()) {
      return track.vibe || track.tags || [];
    }

    const title = String(track.title || "").toLowerCase();

    if (title.includes("coffee")) {
      return ["lofi", "morning regret", "peter thinks"];
    }

    if (title.includes("dance")) {
      return ["corporate dance", "official radio", "late night"];
    }

    if (title.includes("monopoly")) {
      return ["peter thinks", "internet radio", "airwaves"];
    }

    if (title.includes("trust")) {
      return ["late night", "questionable", "official radio"];
    }

    if (title.includes("seven")) {
      return ["sad indie pop", "lo-fi before music", "morning regret"];
    }

    if (title.includes("dial")) {
      return ["airwaves", "late night", "internet radio"];
    }

    return pietTagRotation[index % pietTagRotation.length];
  }

  function applyModeContent() {
    const mode = getIsPietHours() ? "piet" : "default";

    modeCopyEls.forEach((element) => {
      const nextValue = element.dataset[mode];

      if (typeof nextValue === "string") {
        element.textContent = nextValue;
      }
    });

    modeAriaLabelEls.forEach((element) => {
      const nextValue = element.dataset[mode];

      if (typeof nextValue === "string") {
        element.setAttribute("aria-label", nextValue);
      }
    });

    if (modeArt) {
      const nextSrc = modeArt.dataset[`${mode}Src`];
      const nextAlt = modeArt.dataset[`${mode}Alt`];

      if (nextSrc) {
        modeArt.src = nextSrc;
      }

      if (typeof nextAlt === "string") {
        modeArt.alt = nextAlt;
      }
    }

    if (pietToggle) {
      pietToggle.setAttribute("aria-pressed", getIsPietHours() ? "true" : "false");
    }

    if (pietToggleLabel) {
      pietToggleLabel.textContent = getIsPietHours() ? "On" : "Off";
    }
  }

  function startPietIntervals() {
    if (pietIntervalsStarted) {
      return;
    }

    pietIntervalsStarted = true;
    window.setInterval(updatePietClock, 30000);
    window.setInterval(updateFakeListenerCount, 5000);
    window.setInterval(rotatePietQuote, 45000);
    window.setInterval(rotateSignalStatus, 60000);
  }

  function setPietMode(isEnabled, shouldPersist) {
    isPietModeActive = Boolean(isEnabled);
    document.body.classList.toggle("piet-mode", isPietModeActive);
    applyModeContent();

    if (shouldPersist) {
      storePietMode(isPietModeActive);
    }

    if (isPietModeActive) {
      // TODO: Integration phase:
      // Current segment should be calculated from the visitor's local time.
      // Segment times are local to the visitor, not a fixed server timezone.
      updatePietClock();
      updateFakeListenerCount();
      startPietIntervals();
    }

    if (tracks[currentIndex]) {
      updatePlayer(currentTrack());
      applyFilter();
    }
  }

  function initPietMode() {
    setPietMode(readStoredPietMode(), false);

    if (pietToggle) {
      pietToggle.addEventListener("click", () => {
        setPietMode(!getIsPietHours(), true);
      });
    }

    if (pietScheduleButton) {
      pietScheduleButton.addEventListener("click", scrollToPietSchedule);
    }
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) {
      return "0:00";
    }

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function setStatus(message) {
    if (playerStatus) {
      playerStatus.textContent = message;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function safeHref(value) {
    const href = String(value || "").trim();

    if (!href || href === "#") {
      return "#";
    }

    if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) {
      return href;
    }

    try {
      const parsed = new URL(href, window.location.origin);

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (error) {
      return "#";
    }

    return "#";
  }

  function currentTrack() {
    return tracks[currentIndex];
  }

  function playbackUrl(track) {
    return track.previewAudio || track.fullAudio || "";
  }

  function canPlayHere(track) {
    return Boolean(track && track.canHost && playbackUrl(track));
  }

  function isSoundCloudTrack(track) {
    return Boolean(track && /soundcloud\.com/i.test(`${track.sourceUrl || ""} ${track.sourceName || ""}`));
  }

  function canEmbedHere(track) {
    return Boolean(track && !canPlayHere(track) && isSoundCloudTrack(track) && track.sourceUrl);
  }

  function soundCloudEmbedUrl(track, autoPlay) {
    const sourceUrl = safeHref(track.sourceUrl);

    if (!/^https:\/\/(www\.)?soundcloud\.com\//i.test(sourceUrl)) {
      return null;
    }

    const params = new URLSearchParams({
      url: sourceUrl,
      color: "#f6c84f",
      auto_play: autoPlay ? "true" : "false",
      hide_related: "true",
      show_comments: "false",
      show_user: "true",
      show_reposts: "false",
      show_teaser: "false",
      visual: "false"
    });
    return `https://w.soundcloud.com/player/?${params.toString()}`;
  }

  function loadSoundCloudApi() {
    if (window.SC && window.SC.Widget) {
      return Promise.resolve(window.SC);
    }

    if (soundCloudApiPromise) {
      return soundCloudApiPromise;
    }

    soundCloudApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.async = true;
      script.onload = () => {
        if (window.SC && window.SC.Widget) {
          resolve(window.SC);
        } else {
          reject(new Error("SoundCloud widget API did not initialize."));
        }
      };
      script.onerror = () => reject(new Error("SoundCloud widget API failed to load."));
      document.head.append(script);
    });

    return soundCloudApiPromise;
  }

  function updateSoundCloudProgress(position, total) {
    if (progress && total > 0 && !isSeeking) {
      progress.value = String(Math.round((position / total) * 1000));
    }

    if (currentTime) {
      currentTime.textContent = formatTime(position / 1000);
    }

    if (duration && total > 0) {
      duration.textContent = formatTime(total / 1000);
    }
  }

  function stopEmbeddedPlayback() {
    if (soundCloudWidget) {
      try {
        soundCloudWidget.pause();
      } catch (error) {
        // The iframe may already be gone.
      }
    }

    if (embedHost) {
      embedHost.hidden = true;
      embedHost.textContent = "";
    }

    soundCloudWidget = null;
    soundCloudDuration = 0;
    soundCloudPosition = 0;
    soundCloudPlaying = false;
    embeddedTrackId = "";
    document.body.classList.remove("is-playing");
  }

  function playEmbeddedTrack(track) {
    if (!embedHost || !canEmbedHere(track)) {
      return false;
    }

    if (embeddedTrackId === track.id && soundCloudWidget) {
      soundCloudWidget.play();
      return true;
    }

    audio.pause();
    audio.removeAttribute("src");
    delete audio.dataset.trackId;
    audio.load();

    soundCloudWidget = null;
    soundCloudDuration = 0;
    soundCloudPosition = 0;
    soundCloudPlaying = false;
    embedHost.hidden = false;
    embedHost.innerHTML = `
      <iframe
        title="${escapeHtml(track.title)} on SoundCloud"
        src="${soundCloudEmbedUrl(track, true)}"
        allow="autoplay"
        loading="lazy"></iframe>
    `;
    embeddedTrackId = track.id;
    document.body.classList.add("is-playing");

    if (playButton) {
      playButton.textContent = "Loading";
      playButton.setAttribute("aria-label", "Loading SoundCloud playback");
    }

    if (progress) {
      progress.disabled = false;
      progress.value = "0";
    }

    if (currentTime) {
      currentTime.textContent = "0:00";
    }

    setStatus(`Loading ${track.title} from SoundCloud inside Lemonteed FM.`);

    const iframe = embedHost.querySelector("iframe");
    loadSoundCloudApi()
      .then((SC) => {
        if (!iframe || embeddedTrackId !== track.id) {
          return;
        }

        const widget = SC.Widget(iframe);
        soundCloudWidget = widget;

        widget.bind(SC.Widget.Events.READY, () => {
          if (embeddedTrackId !== track.id) {
            return;
          }

          widget.setVolume(Math.round(Number(volume ? volume.value : 0.8) * 100));
          widget.getDuration((value) => {
            soundCloudDuration = Number(value) || 0;
            updateSoundCloudProgress(soundCloudPosition, soundCloudDuration);
          });
          widget.play();
        });

        widget.bind(SC.Widget.Events.PLAY, () => {
          soundCloudPlaying = true;
          document.body.classList.add("is-playing");
          if (playButton) {
            playButton.textContent = "Pause";
            playButton.setAttribute("aria-label", "Pause SoundCloud playback");
          }
          setStatus(`Now playing from SoundCloud: ${track.title}.`);
        });

        widget.bind(SC.Widget.Events.PAUSE, () => {
          soundCloudPlaying = false;
          document.body.classList.remove("is-playing");
          if (embeddedTrackId === track.id && playButton) {
            playButton.textContent = "Play";
            playButton.setAttribute("aria-label", "Play selected track");
          }
        });

        widget.bind(SC.Widget.Events.FINISH, () => {
          soundCloudPlaying = false;
          moveTrack(1, true);
        });

        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (event) => {
          soundCloudPosition = Number(event.currentPosition) || 0;
          if (!soundCloudDuration) {
            widget.getDuration((value) => {
              soundCloudDuration = Number(value) || 0;
              updateSoundCloudProgress(soundCloudPosition, soundCloudDuration);
            });
          } else {
            updateSoundCloudProgress(soundCloudPosition, soundCloudDuration);
          }
        });
      })
      .catch(() => {
        if (embeddedTrackId !== track.id || !embedHost) {
          return;
        }

        embedHost.innerHTML = `
          <iframe
            title="${escapeHtml(track.title)} on SoundCloud"
            src="${soundCloudEmbedUrl(track, true)}"
            allow="autoplay"
            loading="lazy"></iframe>
        `;
        if (playButton) {
          playButton.textContent = "Stop";
          playButton.setAttribute("aria-label", "Stop SoundCloud playback");
        }
        setStatus("SoundCloud controls were unavailable, so the embedded player is handling playback.");
      });

    return true;
  }

  function renderTracks() {
    if (!trackList) {
      return;
    }

    trackList.textContent = "";

    filteredIndexes.forEach((trackIndex) => {
      const track = tracks[trackIndex];
      const card = document.createElement("article");
      card.className = "fm-track-card";
      card.tabIndex = 0;
      card.dataset.trackIndex = String(trackIndex);
      card.classList.toggle("is-active", trackIndex === currentIndex);
      card.setAttribute("aria-label", `${track.title} by ${track.artist}`);

      const tags = pietTagsForTrack(track, trackIndex).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
      const playLabel = canPlayHere(track) || canEmbedHere(track) ? "Play" : "Source";
      card.innerHTML = `
        <div class="fm-track-main">
          <span class="fm-track-number">${trackIndex + 1}</span>
          <img src="${escapeHtml(track.artworkSmall || track.artwork)}" width="68" height="68" loading="lazy" alt="">
          <div>
            <strong class="fm-track-title">${escapeHtml(track.title)}</strong>
            <span class="fm-track-artist">${escapeHtml(track.artist)} / ${escapeHtml(track.sourceName || "Source")}</span>
            <span class="fm-track-meta">${escapeHtml(track.duration || "0:00")} - ${canPlayHere(track) ? "Hosted audio" : canEmbedHere(track) ? "Embedded stream" : "Source-only"}</span>
          </div>
        </div>
        <div class="fm-tags">${tags}</div>
        <strong class="fm-license-badge">${escapeHtml(track.license || "License needed")}</strong>
        <div class="fm-track-actions">
          <button type="button" data-card-play="${trackIndex}">${playLabel}</button>
          <button type="button" data-card-share="${trackIndex}">Share</button>
          <button type="button" data-card-copy="${trackIndex}">Copy Credit</button>
          <a href="${escapeHtml(safeHref(track.sourceUrl))}" target="_blank" rel="noopener">Source</a>
        </div>
      `;
      trackList.append(card);
    });

    if (filterStatus) {
      const count = filteredIndexes.length;
      filterStatus.textContent = count === tracks.length
        ? getIsPietHours()
          ? `${tracks.length} tracks in tonight's lo-fi rotation. Carefully uncurated. Not a mistake.`
          : `${tracks.length} verified tracks loaded. The recommendation engine is a lemon with a clipboard.`
        : `${count} track${count === 1 ? "" : "s"} match your search.`;
    }
  }

  function renderFeaturedTrack(track) {
    if (!featuredTrack || !track) {
      return;
    }

    const tags = pietTagsForTrack(track, currentIndex).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const featuredLabel = getIsPietHours() ? "NOW PLAYING" : "Now in rotation";
    const featuredSource = getIsPietHours()
      ? `${track.artist} / ${track.sourceName || "SoundCloud"}`
      : track.artist;
    featuredTrack.innerHTML = `
      <img src="${escapeHtml(track.artworkLarge || track.artwork)}" width="210" height="210" loading="lazy" alt="">
      <div class="fm-featured-track__copy">
        <p class="fm-kicker">${featuredLabel}</p>
        <h3>${escapeHtml(track.title)}</h3>
        <p>${escapeHtml(featuredSource)}</p>
        <div class="fm-featured-meta">
          <span>${escapeHtml(track.license || "License needed")}</span>
          <span>${escapeHtml(track.sourceName || "Source")}</span>
          <span>${escapeHtml(track.duration || "0:00")}</span>
        </div>
        <div class="fm-tags">${tags}</div>
        <div class="fm-featured-actions">
          <button class="fm-button fm-button--primary" type="button" data-featured-play>${canPlayHere(track) || canEmbedHere(track) ? "Play Featured" : "Open Source"}</button>
          <button class="fm-button" type="button" data-featured-share>Share Track</button>
          <button class="fm-button" type="button" data-featured-copy>Copy Attribution</button>
          <a class="fm-button" href="${escapeHtml(safeHref(track.sourceUrl))}" target="_blank" rel="noopener">Open Source</a>
        </div>
      </div>
    `;
  }

  function updatePlayer(track) {
    if (!track) {
      return;
    }

    if (playerArt) {
      playerArt.src = track.artworkSmall || track.artwork;
    }

    if (playerTitle) {
      playerTitle.textContent = track.title;
    }

    if (playerArtist) {
      playerArtist.textContent = getIsPietHours()
        ? `${track.artist} / ${track.sourceName || "SoundCloud"}`
        : track.artist;
    }

    if (playerLicense) {
      playerLicense.textContent = getIsPietHours()
        ? "lofi / late night / internet radio"
        : track.license;
    }

    if (duration) {
      duration.textContent = track.duration;
    }

    if (progress && !audio.duration) {
      progress.value = "0";
    }

    if (progress) {
      progress.disabled = !(canPlayHere(track) || canEmbedHere(track));
    }

    if (playButton) {
      const embedded = embeddedTrackId === track.id;
      playButton.textContent = embedded && soundCloudPlaying ? "Pause" : (canPlayHere(track) || canEmbedHere(track) ? "Play" : "Source");
      playButton.setAttribute("aria-label", embedded && soundCloudPlaying ? "Pause SoundCloud playback" : (canPlayHere(track) || canEmbedHere(track) ? "Play selected track" : "Open selected track source"));
    }

    renderFeaturedTrack(track);
    renderTracks();
  }

  function selectTrack(index, shouldPlay) {
    if (!tracks[index]) {
      return;
    }

    const track = tracks[index];
    const changed = currentIndex !== index;
    currentIndex = index;

    if (changed) {
      stopEmbeddedPlayback();
    }

    updatePlayer(track);

    if (!canPlayHere(track)) {
      audio.pause();
      audio.removeAttribute("src");
      delete audio.dataset.trackId;
      audio.load();
      if (playButton) {
        playButton.textContent = canEmbedHere(track) ? "Play" : "Source";
      }
      if (shouldPlay && canEmbedHere(track)) {
        playEmbeddedTrack(track);
      } else if (shouldPlay && track.sourceUrl) {
        window.open(safeHref(track.sourceUrl), "_blank", "noopener");
        setStatus("Opened the source link. Add a local audio upload in Studio to play it here.");
      } else if (canEmbedHere(track)) {
        setStatus("This SoundCloud track can play inside Lemonteed FM. Press Play.");
      } else {
        setStatus("This track is source-only. Add a local audio upload in Studio to play it here.");
      }
      return;
    }

    setStatus(`${track.title} selected. License: ${track.license}.`);

    if (shouldPlay) {
      playCurrent();
    } else if (changed && !audio.paused) {
      pauseCurrent();
    }
  }

  function playCurrent() {
    const track = currentTrack();

    const source = playbackUrl(track);

    if (!canPlayHere(track)) {
      if (embeddedTrackId === track.id && soundCloudWidget) {
        if (soundCloudPlaying) {
          soundCloudWidget.pause();
        } else {
          soundCloudWidget.play();
        }
      } else if (embeddedTrackId === track.id) {
        stopEmbeddedPlayback();
        if (playButton) {
          playButton.textContent = "Play";
          playButton.setAttribute("aria-label", "Play selected track");
        }
      } else if (canEmbedHere(track)) {
        playEmbeddedTrack(track);
      } else if (track.sourceUrl) {
        window.open(safeHref(track.sourceUrl), "_blank", "noopener");
        setStatus("Opened the source link. Add a local audio upload in Studio to play it here.");
      } else {
        setStatus("This track needs a local audio file before it can play here.");
      }
      return;
    }

    if (audio.dataset.trackId !== track.id || !audio.getAttribute("src")) {
      audio.src = source;
      audio.dataset.trackId = track.id;
      audio.load();
    }

    audio.play()
      .then(() => {
        if (playButton) {
          playButton.textContent = "Pause";
        }
        setStatus(`Now playing: ${track.title}.`);
      })
      .catch(() => {
        setStatus("Playback was blocked by the browser. Press Play again.");
      });
  }

  function pauseCurrent() {
    if (embeddedTrackId === currentTrack().id) {
      if (soundCloudWidget) {
        soundCloudWidget.pause();
      } else {
        stopEmbeddedPlayback();
      }
      if (playButton) {
        playButton.textContent = "Play";
        playButton.setAttribute("aria-label", "Play selected track");
      }
      setStatus("Paused SoundCloud playback.");
      return;
    }

    audio.pause();
    stopEmbeddedPlayback();
    if (playButton) {
      playButton.textContent = "Play";
    }
    setStatus("Paused. The lemon is pretending this was intentional.");
  }

  function playableIndexes() {
    return tracks
      .map((track, index) => ({ track, index }))
      .filter((item) => canPlayHere(item.track) || canEmbedHere(item.track))
      .map((item) => item.index);
  }

  function moveTrack(direction, shouldPlay) {
    const indexes = playableIndexes();

    if (!indexes.length) {
      return;
    }

    const position = indexes.indexOf(currentIndex);
    const safePosition = position === -1 ? 0 : position;
    const nextPosition = (safePosition + direction + indexes.length) % indexes.length;
    selectTrack(indexes[nextPosition], shouldPlay);
  }

  function updateProgress() {
    if (!progress || isSeeking) {
      return;
    }

    const total = audio.duration;
    const elapsed = audio.currentTime;

    if (Number.isFinite(total) && total > 0) {
      progress.value = String(Math.round((elapsed / total) * 1000));
      if (duration) {
        duration.textContent = formatTime(total);
      }
    } else {
      progress.value = "0";
    }

    if (currentTime) {
      currentTime.textContent = formatTime(elapsed);
    }
  }

  function applyFilter() {
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();

    if (!query) {
      filteredIndexes = tracks.map((track, index) => index);
      renderTracks();
      return;
    }

    filteredIndexes = tracks
      .map((track, index) => ({ track, index }))
      .filter(({ track }) => {
        const haystack = [
          track.title,
          track.artist,
          track.sourceName,
          track.license,
          track.attribution,
          ...pietTagsForTrack(track, index),
          ...(track.vibe || []),
          ...(track.tags || [])
        ].join(" ").toLowerCase();

        return haystack.includes(query);
      })
      .map((item) => item.index);

    renderTracks();
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();

    return new Promise((resolve, reject) => {
      try {
        const copied = document.execCommand("copy");
        textarea.remove();
        copied ? resolve() : reject(new Error("Copy command failed"));
      } catch (error) {
        textarea.remove();
        reject(error);
      }
    });
  }

  function trackShareUrl(track) {
    const url = new URL(window.location.href);
    url.hash = `track-${track.id}`;
    return url.toString();
  }

  function shareTrack(track) {
    const payload = {
      title: `${track.title} - Lemonteed FM`,
      text: `Lemonteed FM signal check: "${track.title}" by ${track.artist}.`,
      url: trackShareUrl(track)
    };

    if (navigator.share) {
      return navigator.share(payload)
        .then(() => setStatus(`Shared ${track.title}. The signal escaped.`));
    }

    return copyText(`${payload.text}\n${payload.url}`)
      .then(() => setStatus(`Share link copied for ${track.title}.`));
  }

  function buildMailto(form) {
    const data = new FormData(form);
    const lines = [
      "Lemonteed FM Request",
      "",
      `Request type: ${data.get("requestType") || ""}`,
      `Artist name: ${data.get("artistName") || ""}`,
      `Song title: ${data.get("songTitle") || ""}`,
      `Link: ${data.get("link") || ""}`,
      "",
      "License/source notes:",
      data.get("licenseNotes") || "",
      "",
      "Why should it be added?",
      data.get("why") || "",
      "",
      `Optional email: ${data.get("email") || ""}`
    ];

    return `mailto:?subject=${encodeURIComponent("Lemonteed FM Request")}&body=${encodeURIComponent(lines.join("\n"))}`;
  }

  initPietMode();

  if (trackCount) {
    trackCount.textContent = `${tracks.length} tracks`;
  }

  renderTracks();
  const initialTrackId = window.location.hash.replace(/^#track-/, "");
  const initialTrackIndex = initialTrackId
    ? tracks.findIndex((track) => track.id === initialTrackId)
    : -1;
  selectTrack(initialTrackIndex >= 0 ? initialTrackIndex : 0, false);

  if (trackList) {
    trackList.addEventListener("click", (event) => {
      const play = event.target.closest("[data-card-play]");
      const card = event.target.closest("[data-track-index]");

      if (play) {
        selectTrack(Number(play.dataset.cardPlay), true);
        return;
      }

      const share = event.target.closest("[data-card-share]");
      if (share) {
        const track = tracks[Number(share.dataset.cardShare)];
        if (track) {
          shareTrack(track)
            .catch(() => setStatus("Share failed. The booth door got stuck."));
        }
        return;
      }

      const copy = event.target.closest("[data-card-copy]");
      if (copy) {
        const track = tracks[Number(copy.dataset.cardCopy)];
        if (track) {
          copyText(track.attribution)
            .then(() => setStatus(`Attribution copied for ${track.title}.`))
            .catch(() => setStatus("Copy failed. Use the player attribution button instead."));
        }
        return;
      }

      if (card && !event.target.closest("a")) {
        selectTrack(Number(card.dataset.trackIndex), false);
      }
    });

    trackList.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const card = event.target.closest("[data-track-index]");
      if (card) {
        event.preventDefault();
        selectTrack(Number(card.dataset.trackIndex), event.key === "Enter");
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilter);
  }

  if (playButton) {
    playButton.addEventListener("click", () => {
      if (canEmbedHere(currentTrack())) {
        playCurrent();
        return;
      }

      audio.paused ? playCurrent() : pauseCurrent();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => moveTrack(-1, !audio.paused || Boolean(embeddedTrackId)));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => moveTrack(1, !audio.paused || Boolean(embeddedTrackId)));
  }

  if (progress) {
    progress.addEventListener("input", () => {
      isSeeking = true;
      const track = currentTrack();
      const total = canEmbedHere(track) && embeddedTrackId === track.id
        ? soundCloudDuration / 1000
        : audio.duration;

      if (Number.isFinite(total) && total > 0) {
        const nextTime = (Number(progress.value) / 1000) * total;
        if (currentTime) {
          currentTime.textContent = formatTime(nextTime);
        }
      }
    });

    progress.addEventListener("change", () => {
      const track = currentTrack();
      const isEmbedded = canEmbedHere(track) && embeddedTrackId === track.id;
      const total = isEmbedded ? soundCloudDuration / 1000 : audio.duration;

      if (Number.isFinite(total) && total > 0) {
        const nextTime = (Number(progress.value) / 1000) * total;
        if (isEmbedded && soundCloudWidget) {
          soundCloudWidget.seekTo(nextTime * 1000);
        } else {
          audio.currentTime = nextTime;
        }
      }

      isSeeking = false;
      if (isEmbedded) {
        updateSoundCloudProgress(soundCloudPosition, soundCloudDuration);
      } else {
        updateProgress();
      }
    });
  }

  if (volume) {
    audio.volume = Number(volume.value);
    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value);
      if (soundCloudWidget) {
        soundCloudWidget.setVolume(Math.round(Number(volume.value) * 100));
      }
    });
  }

  if (openSource) {
    openSource.addEventListener("click", () => {
      window.open(safeHref(currentTrack().sourceUrl), "_blank", "noopener");
    });
  }

  if (copyAttribution) {
    copyAttribution.addEventListener("click", () => {
      copyText(currentTrack().attribution)
        .then(() => setStatus("Attribution copied. Credit department is briefly calm."))
        .catch(() => setStatus("Copy failed. Select the attribution from the track card instead."));
    });
  }

  if (startListening) {
    startListening.addEventListener("click", () => {
      document.querySelector("#crate")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      selectTrack(currentIndex, true);
    });
  }

  function openRequestPanel() {
    if (!requestPanel) {
      return;
    }

    requestPanel.hidden = false;
    requestPanel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const firstInput = requestPanel.querySelector("select, input, textarea, button");
    if (firstInput && typeof firstInput.focus === "function") {
      firstInput.focus({ preventScroll: true });
    }
  }

  function closeRequestPanel() {
    if (requestPanel) {
      requestPanel.hidden = true;
    }
  }

  openRequestButtons.forEach((button) => {
    button.addEventListener("click", openRequestPanel);
  });

  if (closeRequestButton) {
    closeRequestButton.addEventListener("click", closeRequestPanel);
  }

  if (featuredTrack) {
    featuredTrack.addEventListener("click", (event) => {
      if (event.target.closest("[data-featured-play]")) {
        selectTrack(currentIndex, true);
        return;
      }

      if (event.target.closest("[data-featured-share]")) {
        shareTrack(currentTrack())
          .catch(() => setStatus("Share failed. The booth door got stuck."));
        return;
      }

      if (event.target.closest("[data-featured-copy]")) {
        copyText(currentTrack().attribution)
          .then(() => setStatus(`Attribution copied for ${currentTrack().title}.`))
          .catch(() => setStatus("Copy failed. Use the player attribution button instead."));
      }
    });
  }

  if (requestForm) {
    requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const mailto = buildMailto(requestForm);

      if (requestStatus) {
        requestStatus.textContent = "Opening a mail draft with your request.";
      }

      window.location.href = mailto;
    });
  }

  audio.addEventListener("play", () => {
    document.body.classList.add("is-playing");
    if (playButton) {
      playButton.textContent = "Pause";
    }
  });

  audio.addEventListener("pause", () => {
    if (embeddedTrackId) {
      return;
    }

    document.body.classList.remove("is-playing");
    if (playButton) {
      playButton.textContent = "Play";
    }
  });

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("ended", () => moveTrack(1, true));
  audio.addEventListener("error", () => {
    setStatus("Audio failed to load. Use Open Source and verify the original file.");
  });
}());
