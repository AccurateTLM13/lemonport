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
  const startListening = document.querySelector("[data-start-listening]");
  const openRequestButtons = Array.from(document.querySelectorAll("[data-open-request]"));
  const closeRequestButton = document.querySelector("[data-close-request]");
  const requestPanel = document.querySelector("[data-request-panel]");
  const requestForm = document.querySelector("[data-request-form]");
  const requestStatus = document.querySelector("[data-request-status]");

  let currentIndex = 0;
  let filteredIndexes = tracks.map((track, index) => index);
  let isSeeking = false;

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

  function currentTrack() {
    return tracks[currentIndex];
  }

  function playbackUrl(track) {
    return track.previewAudio || track.fullAudio || "";
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

      const tags = (track.vibe || track.tags).slice(0, 3).map((tag) => `<span>${tag}</span>`).join("");
      card.innerHTML = `
        <div class="fm-track-main">
          <span class="fm-track-number">${trackIndex + 1}</span>
          <img src="${track.artworkSmall || track.artwork}" width="68" height="68" loading="lazy" alt="">
          <div>
            <strong class="fm-track-title">${track.title}</strong>
            <span class="fm-track-artist">${track.artist}</span>
            <span class="fm-track-meta">${track.duration} - ${track.sourceName}</span>
          </div>
        </div>
        <div class="fm-tags">${tags}</div>
        <strong class="fm-license-badge">${track.license}</strong>
        <div class="fm-track-actions">
          <button type="button" data-card-play="${trackIndex}">${track.canHost ? "Play" : "Source"}</button>
          <button type="button" data-card-copy="${trackIndex}">Copy Credit</button>
          <a href="${track.sourceUrl}" target="_blank" rel="noopener">Source</a>
        </div>
      `;
      trackList.append(card);
    });

    if (filterStatus) {
      const count = filteredIndexes.length;
      filterStatus.textContent = count === tracks.length
        ? `${tracks.length} verified tracks loaded. The recommendation engine is a lemon with a clipboard.`
        : `${count} track${count === 1 ? "" : "s"} match your search.`;
    }
  }

  function renderFeaturedTrack(track) {
    if (!featuredTrack || !track) {
      return;
    }

    const tags = (track.vibe || track.tags).map((tag) => `<span>${tag}</span>`).join("");
    featuredTrack.innerHTML = `
      <img src="${track.artworkLarge || track.artwork}" width="210" height="210" loading="lazy" alt="">
      <div class="fm-featured-track__copy">
        <p class="fm-kicker">Recently Lemoned</p>
        <h3>${track.title}</h3>
        <p>${track.artist}</p>
        <div class="fm-featured-meta">
          <span>${track.license}</span>
          <span>${track.sourceName}</span>
          <span>${track.duration}</span>
        </div>
        <div class="fm-tags">${tags}</div>
        <div class="fm-featured-actions">
          <button class="fm-button fm-button--primary" type="button" data-featured-play>Play Featured</button>
          <button class="fm-button" type="button" data-featured-copy>Copy Attribution</button>
          <a class="fm-button" href="${track.sourceUrl}" target="_blank" rel="noopener">Open Source</a>
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
      playerArtist.textContent = track.artist;
    }

    if (playerLicense) {
      playerLicense.textContent = track.license;
    }

    if (duration) {
      duration.textContent = track.duration;
    }

    if (progress && !audio.duration) {
      progress.value = "0";
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
    updatePlayer(track);

    if (!track.canHost || !playbackUrl(track)) {
      audio.pause();
      audio.removeAttribute("src");
      delete audio.dataset.trackId;
      audio.load();
      if (playButton) {
        playButton.textContent = "Play";
      }
      setStatus("This track is source-only. Open the source link to listen.");
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

    if (!track.canHost || !source) {
      setStatus("This track cannot be hosted here. Open the source link instead.");
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
    audio.pause();
    if (playButton) {
      playButton.textContent = "Play";
    }
    setStatus("Paused. The lemon is pretending this was intentional.");
  }

  function playableIndexes() {
    return tracks
      .map((track, index) => ({ track, index }))
      .filter((item) => item.track.canHost && playbackUrl(item.track))
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
          ...(track.vibe || []),
          ...track.tags
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

  if (trackCount) {
    trackCount.textContent = `${tracks.length} tracks`;
  }

  renderTracks();
  selectTrack(0, false);

  if (trackList) {
    trackList.addEventListener("click", (event) => {
      const play = event.target.closest("[data-card-play]");
      const card = event.target.closest("[data-track-index]");

      if (play) {
        selectTrack(Number(play.dataset.cardPlay), true);
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
      audio.paused ? playCurrent() : pauseCurrent();
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => moveTrack(-1, !audio.paused));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => moveTrack(1, !audio.paused));
  }

  if (progress) {
    progress.addEventListener("input", () => {
      isSeeking = true;
      const total = audio.duration;

      if (Number.isFinite(total) && total > 0) {
        const nextTime = (Number(progress.value) / 1000) * total;
        if (currentTime) {
          currentTime.textContent = formatTime(nextTime);
        }
      }
    });

    progress.addEventListener("change", () => {
      const total = audio.duration;

      if (Number.isFinite(total) && total > 0) {
        audio.currentTime = (Number(progress.value) / 1000) * total;
      }

      isSeeking = false;
      updateProgress();
    });
  }

  if (volume) {
    audio.volume = Number(volume.value);
    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value);
    });
  }

  if (openSource) {
    openSource.addEventListener("click", () => {
      window.open(currentTrack().sourceUrl, "_blank", "noopener");
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
