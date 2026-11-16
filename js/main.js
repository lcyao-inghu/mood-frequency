"use strict";

const moodGrid = document.querySelector("#mood-grid");
const songGrid = document.querySelector("#song-grid");
const songSection = document.querySelector("#songs");
const songsTitle = document.querySelector("#songs-title");
const resultsStatus = document.querySelector("#results-status");
const showAll = document.querySelector("#show-all");
const sceneFilter = document.querySelector("#scene-filter");
const randomButton = document.querySelector("#random-song");
const retryButton = document.querySelector("#retry-load");
const demoNotice = document.querySelector("#demo-notice");
const cardTemplate = document.querySelector("#song-card-template");
const dialog = document.querySelector("#song-dialog");
const detail = document.querySelector("#song-detail");
const detailBack = document.querySelector("#detail-back");
const sourceLabels = new Map([
  ["user", "Personal Picks"],
  ["ai", "AI Discoveries"],
]);
const songStatuses = new Set(["pending", "approved", "rejected"]);

let moods = new Map();
let songs = [];
let selectedMood = null;
let detailHistory = [];
let detailOpener = null;

function createElement(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}

async function readData(file) {
  try {
    const response = await fetch(new URL(file, document.baseURI));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Expected a JSON array");
    return data;
  } catch (error) {
    throw new Error(`${file}: ${error.message}`, { cause: error });
  }
}

function applyMoodColors(element, mood) {
  if (!mood) return;
  element.style.setProperty("--mood", mood.color);
  element.style.setProperty("--mood-bg", mood.background);
}

function makeMoodCard(mood) {
  const button = createElement("button", "mood-card");
  button.type = "button";
  button.dataset.mood = mood.id;
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-controls", "song-grid");
  applyMoodColors(button, mood);

  const art = createElement("span", "mood-art");
  art.setAttribute("aria-hidden", "true");
  const label = createElement("span", "mood-label", mood.id);
  label.lang = "en";
  button.append(
    art,
    label,
    createElement("span", "mood-name", mood.name),
    createElement("span", "mood-description", mood.description),
  );
  button.addEventListener("click", () => {
    selectedMood = mood.id;
    renderSongs();
    songsTitle.focus({ preventScroll: true });
    songSection.scrollIntoView();
  });
  return button;
}

function safeWebUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, document.baseURI);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function setSongArt(container, song) {
  applyMoodColors(container, moods.get(song.moods[0]));
  const imageUrl = safeWebUrl(song.image);
  if (!imageUrl) return;

  // The CSS artwork stays visible until a cover loads successfully.
  const image = createElement("img");
  image.alt = "";
  image.addEventListener("load", () => container.append(image), { once: true });
  image.src = imageUrl.href;
}

function appendMoodTags(container, song) {
  for (const id of song.moods) {
    const mood = moods.get(id);
    const tag = createElement("span", "tag", mood.name);
    applyMoodColors(tag, mood);
    container.append(tag);
  }
}

function isDemo(song) {
  return song.id.startsWith("demo-");
}

function makeSongCard(song) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const button = card.querySelector("button");
  applyMoodColors(button, moods.get(song.moods[0]));
  setSongArt(card.querySelector(".song-art"), song);
  card.querySelector(".song-title").textContent = song.title;
  card.querySelector(".song-artist").textContent =
    isDemo(song) && song.artist !== "示範曲目" ? `${song.artist}・示範曲目` : song.artist;
  const source = card.querySelector(".song-source");
  source.textContent = sourceLabels.get(song.source) ?? "";
  source.hidden = !source.textContent;
  appendMoodTags(card.querySelector(".song-tags"), song);
  button.addEventListener("click", () => openSong(song, button));
  return card;
}

function renderSongs() {
  const scene = sceneFilter.value;
  for (const card of moodGrid.children) {
    card.setAttribute("aria-pressed", String(card.dataset.mood === selectedMood));
  }
  showAll.setAttribute("aria-pressed", String(selectedMood === null && scene === ""));
  if (showAll.disabled) return;

  const visibleSongs = songs.filter((song) =>
    (selectedMood === null || song.moods.includes(selectedMood)) &&
    (scene === "" || song.listeningScenes.includes(scene)),
  );
  const moodName = selectedMood === null ? "全部情緒" : moods.get(selectedMood).name;
  const selection = scene ? `${moodName} · ${scene}` : moodName;
  resultsStatus.textContent = `${selection} · ${visibleSongs.length} 首歌曲`;
  if (songs.length === 0) {
    resultsStatus.textContent = "策展收藏目前還沒有已核准的歌曲。";
  } else if (visibleSongs.length === 0) {
    resultsStatus.textContent += "。可以切換情緒或聆聽情境，或查看全部歌曲。";
  }
  songGrid.replaceChildren(...visibleSongs.map(makeSongCard));
}

function resetFilters() {
  selectedMood = null;
  sceneFilter.value = "";
  renderSongs();
}

function relatedSongs(song) {
  const tags = new Set(song.moods);
  return songs
    .filter((candidate) => candidate.id !== song.id)
    .map((candidate) => ({
      candidate,
      matches: candidate.moods.filter((id) => tags.has(id)).length,
    }))
    .filter(({ matches }) => matches > 0)
    .sort((first, second) => second.matches - first.matches)
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}

function textSection(heading, content) {
  const section = createElement("section");
  section.append(createElement("h3", null, heading), createElement("p", null, content));
  return section;
}

function renderDetail(song) {
  const header = createElement("div", "detail-header");
  const art = createElement("div", "song-art");
  art.setAttribute("aria-hidden", "true");
  setSongArt(art, song);

  const information = createElement("div");
  const title = createElement("h2", null, song.title);
  title.id = "detail-title";
  title.tabIndex = -1;
  const meta = [song.artist, song.year, isDemo(song) && "示範曲目"]
    .filter(Boolean);
  const tags = createElement("div", "song-tags");
  appendMoodTags(tags, song);
  const source = createElement("p", "song-source", sourceLabels.get(song.source) ?? "");
  source.lang = "en";
  source.hidden = !source.textContent;
  information.append(title, createElement("p", "detail-meta", [...new Set(meta)].join(" · ")),
    source, createElement("p", "detail-meta", song.genres.join("、")), tags);
  if (song.listeningScenes.length) {
    information.append(createElement("p", "detail-meta", `聆聽情境　${song.listeningScenes.join("、")}`));
  }
  header.append(art, information);

  const copy = createElement("div", "detail-copy");
  copy.append(textSection("Sound & Mood｜音樂特色", song.description),
    textSection("Why This Song｜推薦理由", song.recommendation));
  if (song.personalNote?.trim()) {
    const note = textSection("Personal Notes｜個人聆聽心得", song.personalNote);
    note.classList.add("personal-note");
    copy.append(note);
  }

  const listenUrl = safeWebUrl(song.listenUrl);
  if (listenUrl) {
    const link = createElement("a", "button button-primary", "前往聆聽 ↗");
    link.href = listenUrl.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const listen = createElement("div", "detail-listen");
    listen.append(link);
    information.append(listen);
  } else {
    information.append(createElement("p", "detail-meta", "目前沒有外部聆聽連結。"));
  }

  const related = relatedSongs(song);
  const recommendations = createElement("section");
  recommendations.append(createElement("h3", null, "Keep Exploring｜相關歌曲"));
  if (related.length) {
    const grid = createElement("div", "song-grid related-grid");
    grid.append(...related.map(makeSongCard));
    recommendations.append(grid);
  } else {
    recommendations.append(createElement("p", null, "目前沒有具備共同情緒的歌曲。"));
  }

  copy.append(recommendations);
  detail.replaceChildren(header, copy);
  detailBack.hidden = detailHistory.length < 2;
  dialog.scrollTop = 0;
  return title;
}

function openSong(song, button) {
  if (!dialog.open) {
    detailOpener = button;
    detailHistory = [];
  }
  detailHistory.push(song);
  const title = renderDetail(song);
  if (!dialog.open) dialog.showModal();
  title.focus({ preventScroll: true });
}

function normalizeSongs(songData) {
  const songsById = new Map();
  for (const entry of songData) {
    const { listeningScenes = [], personalNote = null, source = null, status = "pending" } = entry ?? {};
    if (typeof entry?.id !== "string" || !entry.id.trim() || songsById.has(entry.id) ||
        typeof entry.title !== "string" || typeof entry.artist !== "string" || !Array.isArray(entry.genres) ||
        !Array.isArray(entry.moods) || entry.moods.length < 1 || entry.moods.length > 3 ||
        new Set(entry.moods).size !== entry.moods.length || entry.moods.some((id) => !moods.has(id)) ||
        !Array.isArray(listeningScenes) ||
        listeningScenes.some((scene) => typeof scene !== "string" || !scene.trim()) ||
        (personalNote !== null && typeof personalNote !== "string") ||
        (source !== null && !sourceLabels.has(source)) || !songStatuses.has(status)) {
      console.warn(`./data/songs.json: skipped invalid or duplicate song ${entry?.id ?? "(missing ID)"}`);
      continue;
    }
    songsById.set(entry.id, { ...entry, listeningScenes, personalNote, source, status });
  }
  if (songData.length && !songsById.size) throw new Error("./data/songs.json: no valid songs");
  return [...songsById.values()];
}

async function loadContent() {
  songSection.setAttribute("aria-busy", "true");
  resultsStatus.textContent = "正在載入歌曲與情緒…";
  retryButton.hidden = true;
  let moodsLoaded = false;
  try {
    if (!moods.size) {
      const moodData = await readData("./data/moods.json");
      const moodMap = new Map(moodData.map((mood) => [mood?.id, mood]));
      if (!moodMap.size || moodMap.size !== moodData.length ||
          moodData.some((mood) => typeof mood?.id !== "string" || !mood.id.trim() ||
            typeof mood.name !== "string")) {
        throw new Error("./data/moods.json: invalid or duplicate mood data");
      }
      moodGrid.replaceChildren(...moodData.map(makeMoodCard));
      moods = moodMap;
    }
    moodsLoaded = true;

    const songData = await readData("./data/songs.json");
    songs = normalizeSongs(songData).filter((song) => song.status === "approved");
    const scenes = [...new Set(songs.flatMap((song) => song.listeningScenes))];
    sceneFilter.replaceChildren(new Option("所有情境", ""),
      ...scenes.map((scene) => new Option(scene, scene)));
    sceneFilter.disabled = scenes.length === 0;
    showAll.disabled = false;
    resetFilters();
    randomButton.disabled = songs.length === 0;
    demoNotice.hidden = songs.length === 0 || !songs.every(isDemo);
  } catch (error) {
    showAll.disabled = true;
    sceneFilter.disabled = true;
    randomButton.disabled = true;
    resultsStatus.textContent = moodsLoaded
      ? "目前無法載入歌曲，請再試一次。"
      : "目前無法載入情緒，請再試一次。";
    retryButton.hidden = false;
    console.error(error);
  } finally {
    songSection.setAttribute("aria-busy", "false");
  }
}

sceneFilter.addEventListener("change", renderSongs);
showAll.addEventListener("click", resetFilters);
document.querySelector('nav a[href="#songs"]').addEventListener("click", () => {
  if (!showAll.disabled) resetFilters();
});
randomButton.addEventListener("click", () => {
  const song = songs[Math.floor(Math.random() * songs.length)];
  openSong(song, randomButton);
});
detailBack.addEventListener("click", () => {
  detailHistory.pop();
  renderDetail(detailHistory.at(-1)).focus({ preventScroll: true });
});
dialog.addEventListener("close", () => {
  detailOpener?.focus({ preventScroll: true });
  detailOpener = null;
  detailHistory = [];
});
retryButton.addEventListener("click", loadContent);

loadContent();
