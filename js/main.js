(async function () {
  "use strict";

  if (window.DS_DATA_READY && typeof window.DS_DATA_READY.then === "function") {
    await window.DS_DATA_READY;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const PLACEHOLDER_IMAGE = "assets/placeholders/release-generic.svg";
  const BLOCKED_PROTOCOL_RE = /^(?:javascript|data|vbscript|file):/i;
  const SAFE_RELATIVE_RE =
    /^(?:\.{1,2}\/|\/|assets\/|data\/|music\/|css\/|js\/|images\/|audio\/|video\/|fonts\/|favicon\.|robots\.txt|sitemap\.xml)/i;
  const SAFE_HTML_RE = /^(?:\.{1,2}\/)?[^\s?#]+\.(?:html)(?:[?#].*)?$/i;
  const SAFE_ASSET_EXT_RE =
    /^(?:\.{1,2}\/)?[^\s?#]+\.(?:png|jpe?g|webp|gif|svg|avif|mp3|wav|m4a|ogg|webm|mp4|json|txt|pdf)(?:[?#].*)?$/i;
  const SAFE_HTTP_PROTOCOLS = new Set(["http:", "https:"]);
  const SAFE_LINK_PROTOCOLS = new Set([
    "http:",
    "https:",
    "mailto:",
    "tel:",
    "sms:",
  ]);

  const hasUnsafeCharacters = (value) => /[\u0000-\u001F\u007F\s]/.test(value);

  const isSafeRelativeUrl = (value) =>
    SAFE_HTML_RE.test(value) ||
    SAFE_RELATIVE_RE.test(value) ||
    SAFE_ASSET_EXT_RE.test(value);

  const escapeUrl = (value, options = {}) => {
    if (!value || typeof value !== "string") return "";

    const trimmed = value.trim();
    if (
      !trimmed ||
      hasUnsafeCharacters(trimmed) ||
      BLOCKED_PROTOCOL_RE.test(trimmed)
    ) {
      return "";
    }

    if (isSafeRelativeUrl(trimmed)) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed, window.location.origin);
      const protocols = options.allowContactProtocols
        ? SAFE_LINK_PROTOCOLS
        : SAFE_HTTP_PROTOCOLS;
      return protocols.has(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  };

  const isExternalUrl = (href) =>
    href.startsWith("http://") || href.startsWith("https://");

  function bindImageFallback(image, fallbackSrc = PLACEHOLDER_IMAGE) {
    if (!image) return image;
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied === "true") {
        image.removeAttribute("src");
        return;
      }
      image.dataset.fallbackApplied = "true";
      image.src = fallbackSrc;
    });
    return image;
  }

  function setSafeHref(link, href, options = {}) {
    if (!link) return "";
    const safeHref = escapeUrl(href, options) || "#";
    link.href = safeHref;
    if (isExternalUrl(safeHref)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
    return safeHref;
  }

  function setSafeMediaSrc(node, src, fallbackSrc = "") {
    if (!node) return "";
    const safeSrc = escapeUrl(src) || fallbackSrc;
    if (safeSrc) {
      node.src = safeSrc;
    } else {
      node.removeAttribute("src");
    }
    return safeSrc;
  }

  function hardenDocumentLinks() {
    $$("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const safeHref = escapeUrl(href, { allowContactProtocols: true });
      if (!safeHref) {
        link.setAttribute("href", "#");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        return;
      }
      link.setAttribute("href", safeHref);
      if (isExternalUrl(safeHref)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } else {
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    });
  }

  const moneyToNumber = (value) =>
    Number(String(value || "0").replace(/[^0-9.]/g, "")) || 0;

  function setCurrentNav() {
    const current = location.pathname.split("/").pop() || "index.html";
    $$(".site-nav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === current || (current === "" && href === "index.html")) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function initNav() {
    const toggle = $(".nav-toggle");
    const nav = $(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function img(src, alt) {
    const image = document.createElement("img");
    bindImageFallback(image);
    image.src = escapeUrl(src) || PLACEHOLDER_IMAGE;
    image.alt = alt || "";
    image.loading = "lazy";
    return image;
  }

  function playerIcon(kind) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("player-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const makeTriangle = (points) => {
      const polygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon",
      );
      polygon.setAttribute("points", points);
      polygon.setAttribute("fill", "currentColor");
      polygon.setAttribute("stroke", "var(--ink)");
      polygon.setAttribute("stroke-width", "1.25");
      polygon.setAttribute("stroke-linejoin", "round");
      return polygon;
    };

    if (kind === "play") {
      const playGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      playGroup.classList.add("player-icon-play");
      playGroup.append(makeTriangle("8,5 19,12 8,19"));
      const pauseGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      pauseGroup.classList.add("player-icon-pause");
      pauseGroup.setAttribute("style", "display:none;");
      const pauseLeft = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      pauseLeft.setAttribute("x", "7");
      pauseLeft.setAttribute("y", "5");
      pauseLeft.setAttribute("width", "3");
      pauseLeft.setAttribute("height", "14");
      pauseLeft.setAttribute("rx", "0.5");
      pauseLeft.setAttribute("fill", "currentColor");
      pauseLeft.setAttribute("stroke", "var(--ink)");
      pauseLeft.setAttribute("stroke-width", "1.25");
      pauseLeft.setAttribute("stroke-linejoin", "round");
      const pauseRight = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      pauseRight.setAttribute("x", "14");
      pauseRight.setAttribute("y", "5");
      pauseRight.setAttribute("width", "3");
      pauseRight.setAttribute("height", "14");
      pauseRight.setAttribute("rx", "0.5");
      pauseRight.setAttribute("fill", "currentColor");
      pauseRight.setAttribute("stroke", "var(--ink)");
      pauseRight.setAttribute("stroke-width", "1.25");
      pauseRight.setAttribute("stroke-linejoin", "round");
      pauseGroup.append(pauseLeft, pauseRight);
      svg.append(playGroup, pauseGroup);
      return svg;
    }

    if (kind === "next") {
      svg.append(makeTriangle("6,5 14,12 6,19"));
      svg.append(makeTriangle("14,5 22,12 14,19"));
      return svg;
    }

    svg.append(makeTriangle("18,5 10,12 18,19"));
    svg.append(makeTriangle("10,5 2,12 10,19"));
    return svg;
  }

  function textEl(tag, text, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text || "";
    return el;
  }

  function linkEl(text, href, className) {
    const a = document.createElement("a");
    a.textContent = text;
    if (className) a.className = className;
    setSafeHref(a, href, { allowContactProtocols: true });
    return a;
  }

  function releaseUrl(release) {
    return (
      release?.links?.bandcamp ||
      release?.bandcampUrl ||
      release?.links?.spotify ||
      release?.spotifyUrl ||
      "#"
    );
  }

  function formatDuration(duration) {
    const totalSeconds = Math.round(Number(duration || 0));
    if (!totalSeconds) return "";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function formatTotalDuration(tracklist) {
    const totalSeconds = (tracklist || []).reduce(
      (sum, track) => sum + Math.max(0, Number(track?.duration || 0)),
      0,
    );
    if (!totalSeconds) return "";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function formatReleaseType(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Release";
    const lower = raw.toLowerCase();
    if (lower === "track" || lower === "single") return "Single";
    if (lower === "ep") return "EP";
    if (lower === "album") return "Album";
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  function resolveTrackAudioUrl(release, track) {
    const source = String(track?.audioFile || track?.audioUrl || "").trim();
    if (!source) return "";
    if (release?.audioFolder) {
      return escapeUrl(encodeURI(`${release.audioFolder}${source}`));
    }
    return escapeUrl(encodeURI(source));
  }

  function renderLatestRelease() {
    const target = $("[data-latest-release]");
    if (!target || !window.DS_RELEASES) return;
    const release = window.DS_RELEASES[0];
    if (!release) return;
    const playableTracks = (release.tracklist || [])
      .map((track, index) => ({
        ...track,
        index,
        src: resolveTrackAudioUrl(release, track),
      }))
      .filter((track) => track.src);

    const shell = document.createElement("div");
    shell.className = "latest-release-shell";

    const art = document.createElement("div");
    art.className = "latest-release-art";
    const coverImage = img(release.coverImage, `${release.title} cover art`);
    const releaseTitle = textEl("h2", release.title, "latest-title");
    art.append(coverImage, releaseTitle);

    const body = document.createElement("div");
    body.className = "latest-release-body";
    const meta = document.createElement("div");
    meta.className = "latest-meta-grid";
    const metaItems = [
      ["Type", formatReleaseType(release.type)],
      ["Date", release.displayDate || release.releaseDate || ""],
      ["Tracks", String(release.tracklist?.length || 0)],
      ["Runtime", formatTotalDuration(release.tracklist) || "0:00"],
    ];
    metaItems.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "latest-meta-item";
      item.append(textEl("span", label, "latest-meta-label"));
      item.append(textEl("strong", value, "latest-meta-value"));
      meta.append(item);
    });

    const currentTrackTitle = textEl("h3", "", "player-title");
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.hidden = true;

    if (!playableTracks.length) {
      body.append(meta);
      body.append(
        textEl(
          "p",
          "Add audioFile entries to the release tracklist in releases.json to populate this player.",
          "muted player-empty",
        ),
      );
      shell.append(art, body, audio);
      target.replaceChildren(shell);
      return;
    }

    const controls = document.createElement("div");
    controls.className = "player-controls";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "player-control player-step";
    prev.setAttribute("aria-label", "Previous track");
    prev.append(playerIcon("prev"));
    const seek = document.createElement("input");
    seek.type = "range";
    seek.min = "0";
    seek.max = "100";
    seek.step = "0.1";
    seek.value = "0";
    seek.className = "player-seek";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "player-control player-step";
    next.setAttribute("aria-label", "Next track");
    next.append(playerIcon("next"));
    const play = document.createElement("button");
    play.type = "button";
    play.className = "player-control player-play";
    play.setAttribute("aria-label", "Play or pause");
    const playIcon = playerIcon("play");
    play.append(playIcon);
    controls.append(prev, seek, next, play);

    const trackColumns = document.createElement("div");
    trackColumns.className = "player-track-columns";
    const tracklistLeft = document.createElement("ol");
    tracklistLeft.className = "player-tracklist";
    const tracklistRight = document.createElement("ol");
    tracklistRight.className = "player-tracklist";

    const streamLinks = document.createElement("div");
    streamLinks.className = "latest-stream-links";
    const streamButtons = [
      ["spotify", "Spotify", "assets/spotifyicon.png", "#1DB954"],
      ["appleMusic", "Apple Music", "assets/appleicon.png", "#e94b5f"],
      ["youtube", "YouTube", "assets/youtubeicon.png", "#d63b2f"],
    ];
    for (const [key, label, iconSrc, background] of streamButtons) {
      const href = release?.links?.[key];
      if (!href) continue;
      const link = document.createElement("a");
      link.className = "button latest-stream-button";
      setSafeHref(link, href);
      link.style.background = background;
      link.style.color = "var(--color-white)";
      const icon = bindImageFallback(document.createElement("img"));
      icon.src = escapeUrl(iconSrc) || PLACEHOLDER_IMAGE;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      icon.className = "latest-stream-button-icon";
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      link.append(icon, labelSpan);
      streamLinks.append(link);
    }
    const streamRail = document.createElement("div");
    streamRail.className = "latest-stream-rail";
    streamRail.append(streamLinks);
    const allMusic = document.createElement("a");
    allMusic.className = "button-secondary latest-stream-button";
    setSafeHref(allMusic, "./music.html");
    const allMusicIcon = bindImageFallback(document.createElement("img"));
    allMusicIcon.src = escapeUrl("assets/listen-icon.png") || PLACEHOLDER_IMAGE;
    allMusicIcon.alt = "";
    allMusicIcon.setAttribute("aria-hidden", "true");
    allMusicIcon.className = "latest-stream-button-icon";
    const allMusicLabel = document.createElement("span");
    allMusicLabel.textContent = "All Music";
    allMusic.append(allMusicIcon, allMusicLabel);
    streamRail.append(allMusic);

    const currentTrackTitleEl = currentTrackTitle;
    let currentIndex = 0;
    const playIconPlay = $(".player-icon-play", play);
    const playIconPause = $(".player-icon-pause", play);

    const setActiveTrack = (index, shouldPlay = false) => {
      if (index < 0 || index >= playableTracks.length) return;
      currentIndex = index;
      const track = playableTracks[currentIndex];
      setSafeMediaSrc(audio, track.src);
      currentTrackTitleEl.textContent = track.title || release.title || "";
      $$("button", trackColumns).forEach((button) =>
        button.setAttribute("aria-pressed", "false"),
      );
      const activeButton = $(
        `button[data-track-index="${currentIndex}"]`,
        trackColumns,
      );
      if (activeButton) activeButton.setAttribute("aria-pressed", "true");
      seek.value = "0";
      if (playIconPlay && playIconPause) {
        playIconPlay.style.display = "block";
        playIconPause.style.display = "none";
      }
      if (shouldPlay) {
        audio.play().catch(() => {});
      }
    };

    const splitIndex = Math.ceil(playableTracks.length / 2);
    const leftTracks = playableTracks.slice(0, splitIndex);
    const rightTracks = playableTracks.slice(splitIndex);

    const appendTrack = (track, list) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "player-track-button";
      button.dataset.trackIndex = String(track.index);
      button.append(
        textEl(
          "span",
          `${String(track.trackNumber || track.index + 1).padStart(2, "0")}. ${track.title || ""}`,
          "player-track-title",
        ),
      );
      button.append(
        textEl(
          "span",
          formatDuration(track.duration) || "",
          "player-track-duration",
        ),
      );
      button.addEventListener("click", () => setActiveTrack(track.index, true));
      li.append(button);
      list.append(li);
    };

    leftTracks.forEach((track) => appendTrack(track, tracklistLeft));
    rightTracks.forEach((track) => appendTrack(track, tracklistRight));
    trackColumns.append(tracklistLeft, tracklistRight);

    const updateProgress = () => {
      const duration = audio.duration || 0;
      const current = audio.currentTime || 0;
      if (duration) {
        seek.value = String((current / duration) * 100);
      }
      if (playIconPlay && playIconPause) {
        playIconPlay.style.display = audio.paused ? "block" : "none";
        playIconPause.style.display = audio.paused ? "none" : "block";
      }
    };

    play.addEventListener("click", () => {
      if (!audio.src) {
        setActiveTrack(currentIndex, true);
        return;
      }
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      updateProgress();
    });

    prev.addEventListener("click", () => {
      const nextIndex =
        currentIndex - 1 < 0 ? playableTracks.length - 1 : currentIndex - 1;
      setActiveTrack(nextIndex, true);
    });

    next.addEventListener("click", () => {
      const nextIndex =
        currentIndex + 1 >= playableTracks.length ? 0 : currentIndex + 1;
      setActiveTrack(nextIndex, true);
    });

    seek.addEventListener("input", () => {
      if (!audio.duration) return;
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
      updateProgress();
    });

    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", updateProgress);
    audio.addEventListener("pause", updateProgress);
    audio.addEventListener("ended", () => {
      const nextIndex =
        currentIndex + 1 >= playableTracks.length ? 0 : currentIndex + 1;
      setActiveTrack(nextIndex, true);
    });

    setActiveTrack(0, false);

    body.append(meta, controls, trackColumns, streamRail);
    shell.append(art, body, audio);
    target.replaceChildren(shell);
  }

  function renderEpkLatestRelease() {
    const target = $("[data-epk-latest-release]");
    if (!target || !window.DS_RELEASES) return;
    const release = window.DS_RELEASES[0];
    const spotifyUrl = release?.links?.spotify || release?.spotifyUrl || "";
    const match = String(spotifyUrl).match(
      /open\.spotify\.com\/album\/([A-Za-z0-9]+)/i,
    );
    const embedUrl = match
      ? `https://open.spotify.com/embed/album/${match[1]}?utm_source=generator&theme=0`
      : spotifyUrl.replace("/album/", "/embed/album/");
    if (!embedUrl || !embedUrl.includes("spotify.com")) return;

    const iframe = document.createElement("iframe");
    if (!setSafeMediaSrc(iframe, embedUrl)) return;
    iframe.title = `${release?.title || "Latest release"} Spotify player`;
    iframe.loading = "lazy";
    iframe.allow =
      "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    target.replaceChildren(iframe);
  }

  function renderReleaseGrid() {
    const target = $("[data-release-grid]");
    if (!target || !window.DS_RELEASES) return;
    const countTarget = $("[data-release-count]");
    if (countTarget) {
      countTarget.textContent = `${window.DS_RELEASES.length} releases`;
    }
    const releaseAccents = [
      "var(--color-blue)",
      "var(--olive)",
      "var(--color-yellow)",
    ];
    window.DS_RELEASES.forEach((release) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "release-card release-card-button";
      card.style.setProperty(
        "--release-accent",
        releaseAccents[target.children.length % releaseAccents.length],
      );
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", `Open ${release.title}`);
      card.append(img(release.coverImage, `${release.title} cover art`));
      card.append(textEl("h3", release.title));
      const meta = document.createElement("div");
      meta.className = "release-meta";
      meta.append(
        textEl("span", formatReleaseType(release.type), "release-type"),
      );
      meta.append(
        textEl(
          "span",
          release.displayDate || release.releaseDate || release.year || "",
          "release-date",
        ),
      );
      card.append(meta);
      card.addEventListener("click", () => openReleaseModal(release));
      target.append(card);
    });
  }

  function initReleaseModal() {
    let state = $("#release-modal");
    if (state) return state;

    state = document.createElement("div");
    state.id = "release-modal";
    state.className = "release-modal";
    state.hidden = true;
    state.setAttribute("role", "dialog");
    state.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "release-modal-panel";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-close";
    close.setAttribute("aria-label", "Close release details");
    const closeIcon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    closeIcon.setAttribute("viewBox", "0 0 24 24");
    closeIcon.setAttribute("aria-hidden", "true");
    closeIcon.classList.add("modal-close-icon");
    const closeLineA = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    closeLineA.setAttribute("d", "M6 6L18 18");
    closeLineA.setAttribute("fill", "none");
    closeLineA.setAttribute("stroke", "currentColor");
    closeLineA.setAttribute("stroke-width", "3");
    closeLineA.setAttribute("stroke-linecap", "round");
    const closeLineB = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    closeLineB.setAttribute("d", "M18 6L6 18");
    closeLineB.setAttribute("fill", "none");
    closeLineB.setAttribute("stroke", "currentColor");
    closeLineB.setAttribute("stroke-width", "3");
    closeLineB.setAttribute("stroke-linecap", "round");
    closeIcon.append(closeLineA, closeLineB);
    close.append(closeIcon);

    const content = document.createElement("div");
    content.className = "release-modal-content";

    const media = document.createElement("div");
    media.className = "release-modal-media";
    const cover = document.createElement("img");
    cover.alt = "";
    media.append(cover);

    const body = document.createElement("div");
    body.className = "release-modal-body";

    const title = document.createElement("h2");
    const meta = document.createElement("p");
    meta.className = "release-modal-meta";

    const trackHeading = document.createElement("h3");
    trackHeading.textContent = "Tracklist";
    const tracklist = document.createElement("ol");
    tracklist.className = "release-tracklist";
    const links = document.createElement("div");
    links.className = "release-modal-links";

    body.append(title, meta, trackHeading, tracklist, links);
    content.append(media, body);

    panel.append(close, content);
    state.append(panel);
    document.body.append(state);

    const closeModal = () => {
      state.hidden = true;
      document.body.style.overflow = "";
    };

    close.addEventListener("click", closeModal);
    state.addEventListener("click", (event) => {
      if (event.target === state) closeModal();
    });
    panel.addEventListener("click", (event) => event.stopPropagation());
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !state.hidden) closeModal();
    });

    state._releaseModal = {
      cover,
      title,
      meta,
      tracklist,
      links,
      close,
      closeModal,
    };
    return state;
  }

  function openReleaseModal(release) {
    const state = initReleaseModal();
    const refs = state._releaseModal;
    if (!refs) return;

    bindImageFallback(refs.cover);
    refs.cover.src = escapeUrl(release.coverImage) || PLACEHOLDER_IMAGE;
    refs.cover.alt = `${release.title} cover art`;
    refs.title.textContent = release.title || "";
    refs.meta.replaceChildren();
    refs.meta.append(
      textEl("span", formatReleaseType(release.type), "release-type"),
    );
    refs.meta.append(
      textEl(
        "span",
        release.displayDate || release.releaseDate || "",
        "release-date",
      ),
    );

    refs.tracklist.replaceChildren();
    (release.tracklist || []).forEach((track, index) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${String(index + 1).padStart(2, "0")}. ${track.title || ""}`;
      const duration = formatDuration(track.duration);
      item.append(label);
      if (duration) {
        const time = document.createElement("span");
        time.className = "track-duration";
        time.textContent = duration;
        item.append(time);
      }
      refs.tracklist.append(item);
    });

    refs.links.replaceChildren();
    const buttons = [
      [
        "Spotify",
        release.links?.spotify || release.spotifyUrl,
        "assets/spotifyicon.png",
        "#1DB954",
      ],
      [
        "Apple Music",
        release.links?.appleMusic || release.appleMusicUrl,
        "assets/appleicon.png",
        "#e94b5f",
      ],
      [
        "YouTube",
        release.links?.youtube || release.youtubeUrl,
        "assets/youtubeicon.png",
        "#d63b2f",
      ],
      [
        "Bandcamp",
        release.links?.bandcamp || release.bandcampUrl,
        "assets/bandcamp-icon.png",
        "#629AA9",
      ],
    ];
    buttons.forEach(([label, href, iconSrc, background]) => {
      if (!href) return;
      const link = document.createElement("a");
      link.className = "button latest-stream-button";
      setSafeHref(link, href);
      link.style.background = background;
      link.style.color = "var(--color-white)";
      const icon = bindImageFallback(document.createElement("img"));
      icon.src = escapeUrl(iconSrc) || PLACEHOLDER_IMAGE;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      icon.className = "latest-stream-button-icon";
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      link.append(icon, labelSpan);
      refs.links.append(link);
    });

    state.hidden = false;
    document.body.style.overflow = "hidden";
    refs.close.focus();
  }

  function productCard(product, compact) {
    const card = document.createElement("a");
    card.className = "merch-card";
    card.dataset.category = product.category;
    setSafeHref(
      card,
      product.shopifyUrl || "https://dxnnystyles.myshopify.com/",
    );
    card.append(img(product.image, `${product.title} product image`));
    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.append(textEl("span", product.category, "tag"));
    meta.append(textEl("span", product.price, "year"));
    card.append(meta);
    card.append(textEl("h3", product.title));
    if (!compact) card.append(textEl("p", product.description));
    card.append(textEl("span", "Open in Shopify", "button-small"));
    return card;
  }

  function carouselCard(product, accent) {
    const card = document.createElement("a");
    card.className = "merch-card";
    setSafeHref(
      card,
      product.shopifyUrl || "https://dxnnystyles.myshopify.com/",
    );
    card.dataset.image = escapeUrl(product.image) || "";
    card.dataset.hoverImage =
      escapeUrl(product.hoverImage) || escapeUrl(product.image) || "";
    card.dataset.carouselAccent = accent || "";
    if (accent) card.style.setProperty("--merch-accent", accent);

    const image = img(product.image, `${product.title} product image`);
    image.dataset.currentSrc = image.src;
    card.append(image);
    card.append(textEl("span", product.price || "", "merch-price"));
    card.append(textEl("h3", product.title || ""));

    return card;
  }

  function bindCarouselHover(card) {
    const image = $("img", card);
    if (!card || !image) return;

    const defaultSrc =
      card.dataset.image || image.dataset.currentSrc || image.src;
    const hoverSrc = card.dataset.hoverImage || defaultSrc;
    image.dataset.currentSrc = defaultSrc;

    const swapImage = (nextSrc) => {
      if (!nextSrc || image.dataset.currentSrc === nextSrc) return;
      image.dataset.currentSrc = nextSrc;
      image.src = escapeUrl(nextSrc) || PLACEHOLDER_IMAGE;
    };

    card.addEventListener("mouseenter", () => {
      swapImage(card.dataset.hoverImage);
    });
    card.addEventListener("mouseleave", () => {
      swapImage(card.dataset.image);
    });
    card.addEventListener("focus", () => {
      swapImage(card.dataset.hoverImage);
    });
    card.addEventListener("blur", () => {
      swapImage(defaultSrc);
    });
  }
  function renderMerch() {
    const carousel = $("[data-merch-carousel]");

    if (!carousel || !Array.isArray(window.DS_MERCH_CAROUSEL)) return;

    const carouselAccents = [
      "var(--color-blue)",
      "var(--color-green)",
      "var(--color-yellow)",
    ];

    window.DS_MERCH_CAROUSEL.forEach((item, index) =>
      carousel.append(
        carouselCard(item, carouselAccents[index % carouselAccents.length]),
      ),
    );
  }

  function initMerchWheel() {
    const wheel = $("[data-merch-wheel]");
    const track = $("[data-merch-carousel]");
    const prev = $("[data-merch-prev]");
    const next = $("[data-merch-next]");
    if (!wheel || !track || !prev || !next) return;

    const originalCards = Array.from(track.children).map((card) => {
      const clone = card.cloneNode(true);
      bindCarouselHover(clone);
      return clone;
    });
    if (!originalCards.length) return;

    let visible = 1;
    let index = 0;
    let step = 0;
    let isMoving = false;
    let resizeTimer;

    const readVisibleCount = () => {
      const value = Number(
        getComputedStyle(wheel).getPropertyValue("--merch-visible"),
      );
      return Math.max(1, Math.min(originalCards.length, value || 1));
    };

    const moveTo = (nextIndex, animate) => {
      index = nextIndex;
      track.classList.toggle("is-ready", Boolean(animate));
      track.style.transform = `translateX(${-index * step}px)`;
    };

    const measure = () => {
      const firstCard = track.querySelector(".merch-card");
      if (!firstCard) return;
      const gap =
        Number.parseFloat(
          getComputedStyle(track).columnGap || getComputedStyle(track).gap,
        ) || 0;
      step = firstCard.getBoundingClientRect().width + gap;
      moveTo(index, false);
      requestAnimationFrame(() => track.classList.add("is-ready"));
    };

    const build = () => {
      visible = readVisibleCount();
      const startClones = originalCards
        .slice(-visible)
        .map((card) => card.cloneNode(true));
      const endClones = originalCards
        .slice(0, visible)
        .map((card) => card.cloneNode(true));
      track.replaceChildren(
        ...startClones,
        ...originalCards.map((card) => card.cloneNode(true)),
        ...endClones,
      );
      $$(".merch-card", track).forEach(bindCarouselHover);
      index = visible;
      measure();
    };

    const advance = (direction) => {
      if (isMoving) return;
      isMoving = true;
      moveTo(index + direction, true);
    };

    track.addEventListener("transitionend", () => {
      const firstReal = visible;
      const lastReal = visible + originalCards.length - 1;
      if (index > lastReal) {
        moveTo(firstReal, false);
      } else if (index < firstReal) {
        moveTo(lastReal, false);
      }
      isMoving = false;
    });

    next.addEventListener("click", () => advance(1));
    prev.addEventListener("click", () => advance(-1));
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 120);
    });

    build();
  }

  function renderGear() {
    const root = $("[data-gear-sections]");
    const countTarget = $("[data-gear-count]");
    if (!root || !window.DS_GEAR) return;
    if (countTarget) {
      countTarget.textContent = `${window.DS_GEAR.length} items`;
    }
    const gearAccents = [
      "var(--color-blue)",
      "var(--olive)",
      "var(--color-yellow)",
    ];
    let gearIndex = 0;
    const categoryOrder = [
      "Software",
      "Drum Machines/Samplers",
      "Microphones",
      "Guitars/Basses",
      "Pedalboard/Amps",
      "Outboard Gear/Hardware",
      "Headphones",
      "Misc. Equipment",
      "Furniture",
    ];
    const groups = window.DS_GEAR.reduce((acc, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});
    const orderedCategories = [
      ...categoryOrder.filter((category) => Array.isArray(groups[category])),
      ...Object.keys(groups).filter(
        (category) => !categoryOrder.includes(category),
      ),
    ];
    orderedCategories.forEach((category) => {
      const items = groups[category];
      if (!items?.length) return;
      const section = document.createElement("section");
      section.className = "section";
      section.append(
        textEl(
          "h2",
          category === "Drum Machines/Samplers"
            ? "Samplers & Drum Machines"
            : category,
        ),
      );
      const grid = document.createElement("div");
      grid.className = "gear-grid";
      items.forEach((item) => {
        const card = item.link
          ? linkEl("", item.link, "gear-card")
          : document.createElement("article");
        if (!item.link) card.className = "gear-card";
        if (item.link) {
          card.target = "_blank";
          card.rel = "noopener noreferrer";
        }
        card.style.setProperty(
          "--gear-accent",
          gearAccents[gearIndex % gearAccents.length],
        );
        gearIndex += 1;
        const frame = document.createElement("div");
        frame.className = "gear-image-frame";
        const image = img(item.image, `${item.name} gear image`);
        frame.append(image);
        card.append(frame);
        card.append(textEl("h3", item.name));
        if (item.price) card.append(textEl("p", item.price, "gear-price"));
        grid.append(card);
      });
      section.append(grid);
      root.append(section);
    });
  }

  function renderCredits() {
    const desktopCards = $("[data-credit-desktop-cards]");
    const cards = $("[data-credit-cards]");
    const countTarget = $("[data-credit-count]");
    if (!window.DS_CREDITS) return;
    if (countTarget) {
      countTarget.textContent = `${window.DS_CREDITS.length} releases`;
    }

    const buildCreditTitle = (credit) => {
      const title = document.createElement("h3");
      title.classList.add("credit-title");
      const baseTitle = String(credit.title || "").trim();
      const type = String(credit.type || "")
        .trim()
        .toLowerCase();
      const needsItalic = type === "album" || type === "ep";
      const displayTitle =
        type === "ep"
          ? `${baseTitle} - EP`
          : type === "single"
            ? `"${baseTitle}"`
            : baseTitle;
      if (needsItalic) {
        const italic = document.createElement("em");
        italic.textContent = displayTitle;
        title.append(italic);
      } else {
        title.textContent = displayTitle;
      }
      return title;
    };

    const buildCreditCard = (credit) => {
      const card = document.createElement("article");
      card.className = "credit-card";
      card.append(textEl("p", credit.artist || credit.artistClient || ""));
      card.append(buildCreditTitle(credit));
      card.append(textEl("p", `${credit.year} / ${credit.role}`));
      if (credit.vocals) {
        card.append(textEl("p", `Vocals on: ${credit.vocals}`, "muted"));
      }
      if (credit.notes) {
        card.append(textEl("p", credit.notes, "credit-notes"));
      }
      return card;
    };

    window.DS_CREDITS.forEach((credit) => {
      if (desktopCards) {
        desktopCards.append(buildCreditCard(credit));
      }
      if (cards) {
        cards.append(buildCreditCard(credit));
      }
    });
  }

  function renderFooter() {
    const footer = $(".site-footer");
    const inner = footer ? $(".footer-inner", footer) : null;
    if (!inner) return;

    inner.replaceChildren();

    const brand = document.createElement("div");
    brand.className = "footer-brand";
    const brandTop = document.createElement("div");
    brandTop.className = "footer-brand-top";
    const brandMark = img("assets/sushi.png", "");
    brandMark.className = "footer-brand-mark";
    brandMark.alt = "";
    const brandName = textEl("h2", "Danny Styles", "footer-brand-name");
    brandTop.append(brandMark, brandName);
    brand.append(brandTop);

    const quick = document.createElement("nav");
    quick.className = "footer-links-column footer-quick-links";
    quick.setAttribute("aria-label", "Quick links");
    quick.append(textEl("h3", "Quick Links", "footer-heading"));
    const quickGrid = document.createElement("div");
    quickGrid.className = "footer-link-grid";
    [
      ["Home", "index.html"],
      ["Music", "music.html"],
      ["Merch", "https://dxnnystyles.myshopify.com/"],
      ["Gear", "gear.html"],
      ["Credits", "credits.html"],
      ["About", "about.html"],
      ["EPK", "epk.html"],
      ["Contact", "contact.html"],
    ].forEach(([label, href]) => {
      const safeHref = escapeUrl(href) || "#";
      const link = document.createElement("a");
      link.className = "footer-quick-link";
      link.textContent = label;
      setSafeHref(link, safeHref);

      quickGrid.append(link);
    });
    quick.append(quickGrid);

    const follow = document.createElement("section");
    follow.className = "footer-links-column footer-follow";
    follow.append(textEl("h3", "Follow Danny", "footer-heading"));
    const socials = document.createElement("div");
    socials.className = "social-icons footer-social-icons";
    [
      ["Instagram", "https://instagram.com/dxnnystyles", "assets/igicon.png"],
      ["TikTok", "https://tiktok.com/@dxnnystyles", "assets/tiktokicon2.webp"],
      [
        "Apple Music",
        "https://music.apple.com/us/artist/danny-styles/1522118514",
        "assets/appleicon.png",
      ],
      [
        "Spotify",
        "https://open.spotify.com/artist/0Hh1myvGPs7x9RQwoANmkr",
        "assets/spotifyicon.png",
      ],
      [
        "YouTube",
        "https://music.youtube.com/channel/UCTHdQH06sluH9XLmZ9aQPAw",
        "assets/youtubeicon.png",
      ],
    ].forEach(([label, href, src]) => {
      const link = document.createElement("a");
      link.className = "social-icon";
      setSafeHref(link, href);
      link.setAttribute("aria-label", label);
      const icon = bindImageFallback(document.createElement("img"));
      icon.src = escapeUrl(src) || PLACEHOLDER_IMAGE;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      link.append(icon);
      socials.append(link);
    });
    follow.append(socials);

    const copy = textEl(
      "p",
      "© 2026 DANNY STYLES. ALL RIGHTS RESERVED.",
      "footer-copy",
    );

    inner.append(brand, quick, follow, copy);
  }

  function renderContactDetails() {
    const contact = window.DS_CONTACT;
    if (!contact) return;

    const email = String(contact.email || "").trim();
    const phoneDisplay = String(contact.phoneDisplay || "").trim();
    const phoneE164 = String(contact.phoneE164 || "").trim();
    const smsE164 = String(contact.smsE164 || phoneE164).trim();

    const hrefByType = {
      email: email ? `mailto:${email}` : "",
      phone: phoneE164 ? `tel:${phoneE164}` : "",
      sms: smsE164 ? `sms:${smsE164}` : "",
    };

    const textByType = {
      email,
      phone: phoneDisplay,
      sms: phoneDisplay,
    };

    $$("[data-contact-link]").forEach((link) => {
      const type = link.getAttribute("data-contact-link");
      const mode = link.getAttribute("data-contact-text") || "value";
      const href = hrefByType[type] || "";
      if (!href) {
        link.hidden = true;
        return;
      }
      setSafeHref(link, href, { allowContactProtocols: true });
      if (mode === "value") {
        link.textContent = textByType[type] || "";
      }
      link.hidden = false;
    });
  }

  function renderEpkSelectedReleases() {
    const root = $("[data-selected-releases]");
    if (!root || !window.DS_RELEASES) return;
    const selected = [...window.DS_RELEASES]
      .filter((release) => Number.isFinite(Number(release.selected)))
      .sort((a, b) => Number(a.selected) - Number(b.selected));

    root.replaceChildren();
    selected.forEach((release) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "release-card release-card-button epk-release-card";
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", `Open ${release.title}`);
      card.append(textEl("h3", release.title || "", "epk-preview-title"));
      const meta = document.createElement("p");
      meta.className = "release-meta";
      meta.append(
        textEl("span", formatReleaseType(release.type), "release-type"),
      );
      meta.append(
        textEl(
          "span",
          release.displayDate || release.releaseDate || "",
          "release-date",
        ),
      );
      card.append(meta);
      card.addEventListener("click", () => openReleaseModal(release));
      root.append(card);
    });
  }

  window.DS_UTILS = { moneyToNumber };

  hardenDocumentLinks();
  setCurrentNav();
  initNav();
  renderFooter();
  renderLatestRelease();
  renderEpkLatestRelease();
  renderReleaseGrid();
  renderMerch();
  initMerchWheel();
  renderGear();
  renderCredits();
  renderEpkSelectedReleases();
  renderContactDetails();
})();
