(function () {
  "use strict";

  const loadJson = async (url) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const base = document.querySelector('meta[name="data-root"]')?.content || "";
  const root = base ? `${base.replace(/\/$/, "")}/` : "";

  const files = {
    releases: `${root}data/releases.json`,
    merchCarousel: `${root}data/merch-carousel.json`,
    credits: `${root}data/credits.json`,
  };

  const normalizeCredit = (credit) => {
    const rawTitle = String(credit?.title || "").trim();
    const type = String(credit?.type || "")
      .trim()
      .toLowerCase();

    return {
      artistClient: String(credit?.artistClient || credit?.artist || "").trim(),
      title: rawTitle.replace(/\s-\sEP$/i, ""),
      type,
      year: String(credit?.year || "").trim(),
      role: String(credit?.role || "").trim(),
      vocals: String(credit?.vocals || "").trim(),
      notes: String(credit?.notes || "").trim(),
    };
  };

  window.DS_DATA_READY = (async () => {
    const [releases, merchCarousel, credits] = await Promise.all([
      loadJson(files.releases),
      loadJson(files.merchCarousel),
      loadJson(files.credits),
    ]);

    window.DS_DATA = window.DS_DATA || {};

    if (Array.isArray(releases)) {
      window.DS_DATA.releases = releases;
      window.DS_RELEASES = releases;
    }

    if (Array.isArray(window.DS_MERCH)) {
      window.DS_DATA.merch = window.DS_MERCH;
    }

    if (Array.isArray(merchCarousel)) {
      window.DS_DATA.merchCarousel = merchCarousel;
      window.DS_MERCH_CAROUSEL = merchCarousel;
    }

    if (Array.isArray(window.DS_GEAR)) {
      window.DS_DATA.gear = window.DS_GEAR;
    }

    if (Array.isArray(credits)) {
      const normalizedCredits = credits.map(normalizeCredit);
      window.DS_DATA.credits = normalizedCredits;
      window.DS_CREDITS = normalizedCredits;
    }
  })();
})();
