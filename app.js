const BASE = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-";
const TRACKS = [
  { title: "Nascer do Sol", artist: "Marina Costa", genre: "Pop", file: BASE+"1.mp3", grad: ["#7c5cff","#00e5cc"] },
  { title: "Noite Elétrica", artist: "DJ Andrô", genre: "Eletrônica", file: BASE+"2.mp3", grad: ["#ff4d6d","#7c5cff"] },
  { title: "Estrada Aberta", artist: "Os Viajantes", genre: "Rock", file: BASE+"3.mp3", grad: ["#ff9a3c","#ff4d6d"] },
  { title: "Café & Chuva", artist: "Luna Jazz Trio", genre: "Jazz", file: BASE+"4.mp3", grad: ["#2b5876","#4e4376"] },
  { title: "Maré Alta", artist: "Caio Maré", genre: "MPB", file: BASE+"5.mp3", grad: ["#00b09b","#96c93d"] },
  { title: "Cidade Neon", artist: "Synthwave BR", genre: "Eletrônica", file: BASE+"6.mp3", grad: ["#0f0c29","#7c5cff"] },
  { title: "Coração Acústico", artist: "Paula Violão", genre: "Acústico", file: BASE+"7.mp3", grad: ["#8e2de2","#ff9a3c"] },
  { title: "Funk da Quebrada", artist: "MC Tempestade", genre: "Funk", file: BASE+"8.mp3", grad: ["#f7971e","#ffd200"] },
  { title: "Sertão e Luar", artist: "Duo Sertanejo", genre: "Sertanejo", file: BASE+"9.mp3", grad: ["#283c86","#45a247"] },
  { title: "Rap de Verdade", artist: "Rima Livre", genre: "Hip-Hop", file: BASE+"10.mp3", grad: ["#232526","#414345"] },
  { title: "Forró no Salão", artist: "Sanfona de Ouro", genre: "Forró", file: BASE+"11.mp3", grad: ["#c31432","#f9c80e"] },
  { title: "Clássica Manhã", artist: "Orquestra Aurora", genre: "Clássica", file: BASE+"12.mp3", grad: ["#434343","#9aa3c7"] },
];

const state = {
  queue: TRACKS.map((_, i) => i),
  index: 0, // posição na queue
  shuffle: false,
  repeat: 0, // 0 off, 1 all, 2 one
  view: "inicio",
  genre: "Todas",
  query: "",
  playlist: "Todas",
  likes: new Set(JSON.parse(localStorage.getItem("ondas:likes") || "[]")),
  playlists: JSON.parse(localStorage.getItem("ondas:playlists") || '{"Treino":[],"Foco":[]}'),
  playlistTracks: JSON.parse(localStorage.getItem("ondas:ptracks") || '{}'),
  custom: [], // {title, artist, file(objectURL), genre}
};

const $ = (id) => document.getElementById(id);
const audio = $("audio");
audio.volume = 0.9;

function allTracks() {
  return [...TRACKS.map((t, i) => ({ ...t, id: "base-" + i })), ...state.custom];
}
function trackById(id) {
  if (id.startsWith("base-")) return TRACKS[Number(id.slice(5))];
  return state.custom.find((t) => t.id === id);
}
function fmt(s) {
  if (!isFinite(s) || s == null) return "0:00";
  s = Math.floor(s);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function save() {
  localStorage.setItem("ondas:likes", JSON.stringify([...state.likes]));
  localStorage.setItem("ondas:playlists", JSON.stringify(state.playlists));
  localStorage.setItem("ondas:ptracks", JSON.stringify(state.playlistTracks));
}

// ---- Lista / filtros ----
function genres() {
  return ["Todas", ...new Set(allTracks().map((t) => t.genre))];
}
function renderChips() {
  const c = $("genreChips");
  c.innerHTML = "";
  genres().forEach((g) => {
    const b = document.createElement("button");
    b.className = "chip" + (state.genre === g ? " active" : "");
    b.textContent = g;
    b.onclick = () => { state.genre = g; renderChips(); renderList(); };
    c.appendChild(b);
  });
}
function filteredIds() {
  let list = allTracks();
  if (state.view === "favoritos") list = list.filter((t) => state.likes.has(t.id));
  if (state.view === "upload") list = list.filter((t) => t.id.startsWith("up-"));
  if (state.playlist !== "Todas") {
    const ids = state.playlistTracks[state.playlist] || [];
    list = list.filter((t) => ids.includes(t.id));
  }
  if (state.genre !== "Todas") list = list.filter((t) => t.genre === state.genre);
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((t) => (t.title + " " + t.artist + " " + t.genre).toLowerCase().includes(q));
  }
  return list;
}
function renderList() {
  const list = filteredIds();
  const el = $("trackList");
  el.innerHTML = "";
  $("sectionTitle").textContent =
    state.view === "favoritos" ? "❤️ Favoritos" :
    state.view === "upload" ? "📁 Minhas músicas" :
    state.playlist !== "Todas" ? "🎶 " + state.playlist : "Todas as músicas";
  if (!list.length) {
    el.innerHTML = `<p class="muted">Nenhuma música encontrada. Tente outra busca ou envie seus MP3s. 📤</p>`;
    return;
  }
  list.forEach((t) => {
    const row = document.createElement("div");
    row.className = "track" + (currentId() === t.id ? " active" : "");
    const initial = (t.title[0] || "♪").toUpperCase();
    const bg = t.grad ? `linear-gradient(135deg,${t.grad[0]},${t.grad[1]})` : `linear-gradient(135deg,#7c5cff,#00e5cc)`;
    row.innerHTML = `
      <div class="cover" style="background:${bg}">${initial}</div>
      <div><div class="t-title">${escapeHtml(t.title)}</div><div class="t-artist">${escapeHtml(t.artist)}</div></div>
      <span class="t-genre">${escapeHtml(t.genre)}</span>
      <button class="icon-btn like">${state.likes.has(t.id) ? "❤️" : "🤍"}</button>
      <span class="t-time">${t.duration || "--:--"}</span>`;
    row.onclick = (e) => {
      if (e.target.classList.contains("like")) {
        toggleLike(t.id);
        return;
      }
      playById(t.id);
    };
    el.appendChild(row);
  });
  $("favCount").textContent = state.likes.size;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// ---- Playlists ----
function renderPlaylists() {
  const el = $("playlistList");
  el.innerHTML = "";
  ["Todas", ...Object.keys(state.playlists)].forEach((name) => {
    const b = document.createElement("button");
    b.textContent = (name === "Todas" ? "🎵 Todas" : "🎶 " + name);
    b.className = state.playlist === name ? "active" : "";
    b.onclick = () => { state.playlist = name; state.view = "inicio"; syncNav(); renderPlaylists(); renderList(); };
    b.ondblclick = () => {
      if (name === "Todas") return;
      if (confirm(`Excluir playlist "${name}"?`)) {
        delete state.playlists[name]; delete state.playlistTracks[name];
        state.playlist = "Todas"; save(); renderPlaylists(); renderList();
      }
    };
    el.appendChild(b);
  });
}

// ---- Player ----
function currentId() { return state.currentId; }
function playById(id) {
  const ids = filteredIds().map((t) => t.id);
  state.queue = ids.length ? ids : allTracks().map((t) => t.id);
  let i = state.queue.indexOf(id);
  if (i < 0) { state.queue = allTracks().map((t) => t.id); i = state.queue.indexOf(id); }
  state.index = Math.max(0, i);
  loadCurrent(true);
}
function loadCurrent(autoplay) {
  const id = state.queue[state.index];
  const t = trackById(id);
  if (!t) return;
  state.currentId = id;
  audio.src = t.file;
  audio.playbackRate = Number($("speed").value || 1);
  $("pTitle").textContent = t.title;
  $("pArtist").textContent = t.artist + " • " + t.genre;
  $("heroTitle").textContent = t.title;
  $("heroArtist").textContent = t.artist + " • " + t.genre;
  const bg = t.grad ? `linear-gradient(135deg,${t.grad[0]},${t.grad[1]})` : `linear-gradient(135deg,#7c5cff,#00e5cc)`;
  $("heroArt").style.background = bg;
  $("heroArt").textContent = (t.title[0] || "🎧").toUpperCase();
  $("coverMini").style.background = bg;
  $("coverMini").textContent = (t.title[0] || "♪").toUpperCase();
  $("likeBtn").textContent = state.likes.has(id) ? "❤️" : "🤍";
  document.title = `▶ ${t.title} — Ondas`;
  renderList();
  if (autoplay) audio.play().catch(() => setPlayUI(false));
}
function setPlayUI(playing) {
  $("playBtn").textContent = playing ? "⏸" : "▶";
  $("heroPlay").textContent = playing ? "⏸ Pausar" : "▶ Tocar";
  document.querySelector(".hero").classList.toggle("playing", playing);
}
function next(auto = false) {
  if (state.repeat === 2 && auto) { audio.currentTime = 0; audio.play(); return; }
  if (state.shuffle) {
    state.index = Math.floor(Math.random() * state.queue.length);
  } else {
    state.index++;
    if (state.index >= state.queue.length) {
      if (state.repeat === 1 || !auto) state.index = 0;
      else { state.index = state.queue.length - 1; setPlayUI(false); return; }
    }
  }
  loadCurrent(true);
}
function prev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  state.index = (state.index - 1 + state.queue.length) % state.queue.length;
  loadCurrent(true);
}
function toggleLike(id) {
  id = id || state.currentId;
  if (!id) return;
  state.likes.has(id) ? state.likes.delete(id) : state.likes.add(id);
  save(); renderList();
  if (id === state.currentId) $("likeBtn").textContent = state.likes.has(id) ? "❤️" : "🤍";
}

// ---- Visualizer ----
let actx, analyser, dataArr;
function initVisualizer() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (!analyser) {
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser); analyser.connect(actx.destination);
      dataArr = new Uint8Array(analyser.frequencyBinCount);
    }
    if (actx.state === "suspended") actx.resume();
  } catch {}
}
function draw() {
  const cv = $("visualizer"), ctx = cv.getContext("2d");
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, cv.width, cv.height);
  let vals = null;
  if (analyser && !audio.paused) { analyser.getByteFrequencyData(dataArr); vals = dataArr; }
  const n = 32;
  for (let i = 0; i < n; i++) {
    const v = vals ? vals[i] / 255 : 0.06 + 0.04 * Math.sin(Date.now() / 500 + i);
    const h = 6 + v * 54;
    const x = i * (cv.width / n);
    const g = ctx.createLinearGradient(0, 64, 0, 64 - h);
    g.addColorStop(0, "#7c5cff"); g.addColorStop(1, "#00e5cc");
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, 64 - h, cv.width / n - 4, h);
  }
}
draw();

// ---- Eventos ----
$("playBtn").onclick = () => { initVisualizer(); audio.paused ? audio.play() : audio.pause(); };
$("heroPlay").onclick = () => {
  initVisualizer();
  if (!state.currentId) { state.queue = filteredIds().map((t) => t.id); state.index = 0; loadCurrent(true); }
  else audio.paused ? audio.play() : audio.pause();
};
$("nextBtn").onclick = () => next(false);
$("prevBtn").onclick = prev;
$("likeBtn").onclick = () => toggleLike();
$("shuffleBtn").onclick = () => {
  const ids = allTracks().map((t) => t.id).sort(() => Math.random() - 0.5);
  state.queue = ids; state.index = 0; loadCurrent(true); initVisualizer();
};
$("shuffleToggle").onclick = (e) => { state.shuffle = !state.shuffle; e.currentTarget.classList.toggle("on", state.shuffle); };
$("repeatBtn").onclick = (e) => {
  state.repeat = (state.repeat + 1) % 3;
  const labels = ["desligado", "repetir tudo", "repetir uma"];
  e.currentTarget.title = "Repetir: " + labels[state.repeat];
  e.currentTarget.classList.toggle("on", state.repeat > 0);
  e.currentTarget.textContent = state.repeat === 2 ? "🔂" : "🔁";
};
audio.onplay = () => setPlayUI(true);
audio.onpause = () => setPlayUI(false);
audio.onended = () => next(true);
audio.ontimeupdate = () => {
  if (audio.duration) $("seek").value = (audio.currentTime / audio.duration) * 1000;
  $("curTime").textContent = fmt(audio.currentTime);
  $("durTime").textContent = fmt(audio.duration);
};
audio.onloadedmetadata = () => { $("durTime").textContent = fmt(audio.duration); };
$("seek").oninput = (e) => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; };
$("vol").oninput = (e) => { audio.volume = e.target.value / 100; $("muteBtn").textContent = audio.volume === 0 ? "🔇" : "🔊"; };
$("muteBtn").onclick = () => { audio.muted = !audio.muted; $("muteBtn").textContent = audio.muted ? "🔇" : "🔊"; };
$("speed").onchange = (e) => { audio.playbackRate = Number(e.target.value); };
$("searchInput").oninput = (e) => { state.query = e.target.value; renderList(); };

document.querySelectorAll(".nav-btn").forEach((b) => {
  b.onclick = () => { state.view = b.dataset.view; state.playlist = "Todas"; syncNav(); renderPlaylists(); renderList(); };
});
function syncNav() {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
}

$("newPlaylistBtn").onclick = () => {
  const name = prompt("Nome da nova playlist:");
  if (!name) return;
  state.playlists[name] = [];
  state.playlistTracks[name] = state.currentId ? [state.currentId] : [];
  save(); renderPlaylists();
};

// Upload de arquivos locais
$("fileInput").onchange = (e) => {
  const files = [...e.target.files];
  files.forEach((f) => {
    const url = URL.createObjectURL(f);
    state.custom.push({
      id: "up-" + Date.now() + "-" + Math.random().toString(36).slice(2),
      title: f.name.replace(/\.[^.]+$/, ""),
      artist: "Arquivo local",
      genre: "Upload",
      file: url,
    });
  });
  state.view = "upload";
  syncNav(); renderChips(); renderList();
  alert(files.length + " música(s) adicionada(s)! 🎉");
};

// Teclado
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" && e.target.type !== "range") return;
  if (e.code === "Space") { e.preventDefault(); $("playBtn").click(); }
  if (e.key === "ArrowRight") audio.currentTime += 5;
  if (e.key === "ArrowLeft") audio.currentTime -= 5;
  if (e.key === "ArrowUp") { e.preventDefault(); next(false); }
  if (e.key === "ArrowDown") { e.preventDefault(); prev(); }
});

// Carregar durações reais (opcional, assíncrono)
function preloadDurations() {
  TRACKS.forEach((t, i) => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = t.file;
    a.onloadedmetadata = () => {
      t.duration = fmt(a.duration);
      if (!state.currentId) renderList();
    };
  });
}

// Init
state.queue = allTracks().map((t) => t.id);
renderChips();
renderPlaylists();
renderList();
preloadDurations();
