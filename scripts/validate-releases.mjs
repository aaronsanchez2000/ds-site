#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releasesPath = path.join(root, "data/releases.json");

const fail = (messages) => {
  for (const message of messages) {
    console.error(message);
  }
  process.exit(1);
};

let releases;
try {
  releases = JSON.parse(fs.readFileSync(releasesPath, "utf8"));
} catch (error) {
  fail([`Unable to read ${path.relative(root, releasesPath)}: ${error.message}`]);
}

if (!Array.isArray(releases)) {
  fail(["data/releases.json must contain a top-level array."]);
}

const isHttpUrl = (value) => /^https?:\/\//i.test(value);
const isAbsoluteFsPath = (value) => path.isAbsolute(value);

const resolveTrackPath = (release, track) => {
  const source = String(track?.audioFile || track?.audioUrl || "").trim();
  if (!source) return "";
  if (track?.audioUrl) return source;
  if (release?.audioFolder && !source.includes("/")) {
    return `${release.audioFolder}${source}`;
  }
  return source;
};

const errors = [];

releases.forEach((release, releaseIndex) => {
  const title = String(release?.title || "").trim();
  const label = `release[${releaseIndex}] "${title || "(untitled)"}"`;

  if (!title) {
    errors.push(`${label} is missing a title.`);
  }

  const releaseDate = String(release?.releaseDate || "").trim();
  if (releaseDate && Number.isNaN(Date.parse(releaseDate))) {
    errors.push(`${label} has an invalid releaseDate: ${releaseDate}`);
  }

  const tracklist = Array.isArray(release?.tracklist) ? release.tracklist : [];
  tracklist.forEach((track, trackIndex) => {
    const source = String(track?.audioFile || track?.audioUrl || "").trim();
    if (!source) return;

    const trackLabel = `${label} track[${trackIndex}]`;
    const resolved = resolveTrackPath(release, track);

    if (!resolved) {
      errors.push(`${trackLabel} could not resolve an audio path.`);
      return;
    }

    if (isHttpUrl(resolved)) {
      return;
    }

    if (isAbsoluteFsPath(resolved)) {
      errors.push(`${trackLabel} uses an absolute filesystem path: ${resolved}`);
      return;
    }

    const filePath = path.join(root, resolved);
    if (!fs.existsSync(filePath)) {
      errors.push(`${trackLabel} points to a missing file: ${resolved}`);
      return;
    }

    if (release?.audioFolder && track?.audioFile && String(track.audioFile).includes("/")) {
      errors.push(
        `${trackLabel} should use a filename-only audioFile when audioFolder is set.`,
      );
    }
  });
});

if (errors.length) {
  fail(errors);
}

console.log(`Validated ${releases.length} releases.`);
