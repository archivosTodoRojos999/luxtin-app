/* ====================================================================
   LUXTIN APP — Todo funciona SIN API KEYS
   
   APIs (todas gratuitas, sin registro):
   - ESPN:        site.api.espn.com → fútbol en vivo (15 ligas)
   - iTunes:      itunes.apple.com → música (tienda España = español)
   - Apple RSS:   rss.applemarketingtools.com → tendencias musicales
   - MOVIES_DB:  80+ películas locales en español
   - VidSrc:      vsembed.ru → reproductor de video de las películas
   ==================================================================== */

// ===================== SPLASH =====================
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    initApp();
  }, 6000);
});

// ===================== INIT =====================
function initApp() {
  setupNav();
  loadAllSports();
  loadMusicByGenre('trending');
  loadMoviesByCategory('destacadas');
  setupMusicControls();
  setupMovieControls();
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(btn.dataset.section).classList.add('active');
    });
  });
}

// ===================== JSONP =====================
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = 'jsonp_' + Math.round(Math.random() * 1e9);
    const s = document.createElement('script');
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    window[cb] = data => { delete window[cb]; s.remove(); resolve(data); };
    s.onerror = () => { delete window[cb]; s.remove(); reject(new Error('JSONP fail')); };
    document.body.appendChild(s);
    setTimeout(() => { if (window[cb]) { delete window[cb]; s.remove(); reject(new Error('timeout')); } }, 12000);
  });
}

// ===================== DEPORTES — ESPN (15 LIGAS) =====================
const ESPN_LEAGUES = [
  { code: 'arg.1', name: 'Argentina' },
  { code: 'eng.1', name: 'Premier League' },
  { code: 'esp.1', name: 'La Liga' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'fra.1', name: 'Ligue 1' },
  { code: 'bra.1', name: 'Brasileirão' },
  { code: 'mex.1', name: 'Liga MX' },
  { code: 'uefa.champions', name: 'Champions League' },
  { code: 'uefa.europa', name: 'Europa League' },
  { code: 'usa.1', name: 'MLS' },
  { code: 'ned.1', name: 'Eredivisie' },
  { code: 'por.1', name: 'Liga Portugal' },
  { code: 'col.1', name: 'Liga Colombia' },
];

let allMatches = [];
let currentLeagueFilter = 'all';

async function loadAllSports() {
  const container = document.getElementById('matches-list');
  container.innerHTML = '<div class="loading">📡 Conectando con ESPN... cargando 15 ligas...</div>';
  allMatches = [];

  const results = await Promise.allSettled(
    ESPN_LEAGUES.map(async lg => {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.code}/scoreboard`);
      if (!res.ok) throw new Error();
      return { league: lg.name, data: await res.json() };
    })
  );

  results.forEach(r => {
    if (r.status !== 'fulfilled' || !r.value?.data?.events) return;
    r.value.data.events.forEach(ev => {
      const c = ev.competitions?.[0];
      if (!c) return;
      const home = c.competitors?.find(t => t.homeAway === 'home');
      const away = c.competitors?.find(t => t.homeAway === 'away');
      if (!home || !away) return;
      allMatches.push({
        league: r.value.league,
        home: home.team?.displayName || 'Local',
        away: away.team?.displayName || 'Visitante',
        homeScore: home.score !== '' ? home.score : null,
        awayScore: away.score !== '' ? away.score : null,
        homeLogo: home.team?.logo || '',
        awayLogo: away.team?.logo || '',
        status: c.status?.type?.name || '',
        shortDetail: c.status?.type?.shortDetail || '',
        date: ev.date,
      });
    });
  });

  allMatches.sort((a, b) => {
    const liveA = a.status === 'STATUS_IN_PROGRESS' || a.status === 'STATUS_HALFTIME';
    const liveB = b.status === 'STATUS_IN_PROGRESS' || b.status === 'STATUS_HALFTIME';
    if (liveA && !liveB) return -1;
    if (!liveA && liveB) return 1;
    return 0;
  });

  renderMatches();
  clearTimeout(window._sportsTimer);
  window._sportsTimer = setTimeout(loadAllSports, 60000);
}

function renderMatches() {
  const container = document.getElementById('matches-list');
  let filtered = allMatches;
  if (currentLeagueFilter !== 'all') {
    const name = ESPN_LEAGUES.find(l => l.code === currentLeagueFilter)?.name;
    filtered = allMatches.filter(m => m.league === name);
  }
  if (filtered.length === 0) {
    container.innerHTML = '<div class="loading">No hay partidos en esta liga ahora. Probá "Todas" o esperá al refresh (cada 60s).</div>';
    return;
  }
  container.innerHTML = filtered.map(m => {
    const isLive = m.status === 'STATUS_IN_PROGRESS' || m.status === 'STATUS_HALFTIME';
    const isFinal = m.status === 'STATUS_FINAL';
    let badge;
    if (isLive) {
      const label = m.status === 'STATUS_HALFTIME' ? 'Descanso' : (m.shortDetail || 'EN VIVO');
      badge = `<span class="live-badge"><span class="live-dot"></span> ${label}</span>`;
    } else if (isFinal) {
      badge = '<span style="color:var(--text-muted);font-weight:600;">Finalizado</span>';
    } else if (m.date) {
      badge = `<span style="color:var(--text-muted);">${new Date(m.date).toLocaleString('es-AR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`;
    } else {
      badge = '<span style="color:var(--text-muted);">Próximo</span>';
    }
    const homeLogo = m.homeLogo ? `<img src="${m.homeLogo}" class="team-logo" alt="">` : `<div class="team-badge">${m.home[0]}</div>`;
    const awayLogo = m.awayLogo ? `<img src="${m.awayLogo}" class="team-logo" alt="">` : `<div class="team-badge">${m.away[0]}</div>`;
    const score = (m.homeScore !== null) ? `<div class="match-score ${isLive ? 'live' : ''}">${m.homeScore} - ${m.awayScore}</div>` : '<div class="match-score" style="color:var(--text-muted);font-size:0.9rem;">VS</div>';
    return `<div class="match-card ${isLive ? 'live' : ''}"><div class="match-header"><span class="match-league">${m.league}</span>${badge}</div><div class="match-teams"><div class="team">${homeLogo}<div class="team-name">${m.home}</div></div>${score}<div class="team">${awayLogo}<div class="team-name">${m.away}</div></div></div></div>`;
  }).join('');
}

document.addEventListener('click', e => {
  const chip = e.target.closest('#league-filters .chip');
  if (chip) {
    document.querySelectorAll('#league-filters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentLeagueFilter = chip.dataset.league;
    renderMatches();
  }
});
document.getElementById('refresh-matches')?.addEventListener('click', loadAllSports);

// ===================== MÚSICA — iTunes + Apple RSS =====================
let musicPlaylist = [];
let currentMusicIndex = -1;
let loadedGenres = {};

const MUSIC_GENRES = {
  trending: null, pop: 'musica pop', reggaeton: 'reggaeton', rock: 'rock en español',
  electronica: 'musica electronica', 'hip hop': 'hip hop', cumbia: 'cumbia',
  salsa: 'salsa', bachata: 'bachata', romantica: 'balada romantica', rap: 'rap en español', trap: 'trap latino',
};

async function loadMusicByGenre(genre) {
  const container = document.getElementById('music-grid');
  if (loadedGenres[genre]) { musicPlaylist = loadedGenres[genre]; renderMusicCards(container, musicPlaylist); return; }
  container.innerHTML = '<div class="loading">🎵 Cargando canciones...</div>';
  try {
    let tracks = [];
    if (genre === 'trending') {
      try {
        const res = await fetch('https://rss.applemarketingtools.com/api/v2/us/music/most-popular/50/songs.json');
        const data = await res.json();
        tracks = (data.feed?.results || []).map(s => ({ title: s.name, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: '', itunesUrl: s.url||'' }));
        await enrichMusicPreviews(tracks);
      } catch (e) {}
    }
    if (tracks.length === 0) {
      const term = MUSIC_GENRES[genre] || genre;
      const data = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=50&country=es`);
      tracks = (data.results||[]).filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'' }));
    }
    if (tracks.length < 20 && genre !== 'trending') {
      try {
        const data2 = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(MUSIC_GENRES[genre]+' 2026')}&media=music&limit=25&country=es`);
        const extra = (data2.results||[]).filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'' }));
        const ex = new Set(tracks.map(t => t.title+t.artist));
        extra.forEach(t => { if (!ex.has(t.title+t.artist)) tracks.push(t); });
      } catch (e) {}
    }
    loadedGenres[genre] = tracks;
    musicPlaylist = tracks;
    renderMusicCards(container, tracks);
  } catch (err) {
    container.innerHTML = '<div class="loading">Error al cargar. Reintentá.</div>';
  }
}

async function enrichMusicPreviews(tracks) {
  for (let i = 0; i < tracks.length; i += 8) {
    await Promise.allSettled(tracks.slice(i, i+8).map(async t => {
      if (t.previewUrl) return;
      try { const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(t.title+' '+t.artist)}&media=music&limit=1`); if (d.results?.[0]?.previewUrl) t.previewUrl = d.results[0].previewUrl; } catch (e) {}
    }));
  }
}

function renderMusicCards(container, tracks) {
  if (!tracks?.length) { container.innerHTML = '<div class="loading">No se encontraron canciones.</div>'; return; }
  container.innerHTML = tracks.map((t, i) => `<div class="music-card" onclick="playMusic(${i})"><img class="music-thumb" src="${t.artwork}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><rect fill=%22%231e1e2e%22 width=%22300%22 height=%22300%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 font-size=%2240%22>🎵</text></svg>'"><div class="music-info"><div class="music-title">${t.title}</div><div class="music-channel">${t.artist}</div></div></div>`).join('');
}

function playMusic(i) {
  if (i < 0 || i >= musicPlaylist.length) return;
  currentMusicIndex = i;
  const t = musicPlaylist[i];
  document.getElementById('music-player').classList.remove('hidden');
  document.getElementById('now-playing-title').textContent = t.title;
  document.getElementById('now-playing-channel').textContent = t.artist;
  document.getElementById('player-artwork').src = t.artwork;
  const audio = document.getElementById('audio-preview');
  if (t.previewUrl) { audio.src = t.previewUrl; audio.play().catch(()=>{}); } else { audio.removeAttribute('src'); }
  document.getElementById('youtube-full-link').href = `https://www.youtube.com/results?search_query=${encodeURIComponent(t.title+' '+t.artist+' official audio')}`;
  document.getElementById('mini-title').textContent = `${t.title} — ${t.artist}`;
  document.getElementById('music-player').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupMusicControls() {
  document.getElementById('music-search-btn').addEventListener('click', () => { const q = document.getElementById('music-search').value; if (q.trim()) searchMusic(q); });
  document.getElementById('music-search').addEventListener('keypress', e => { if (e.key === 'Enter') searchMusic(e.target.value); });
  document.getElementById('next-track').addEventListener('click', () => { if (currentMusicIndex < musicPlaylist.length-1) playMusic(currentMusicIndex+1); });
  document.getElementById('prev-track').addEventListener('click', () => { if (currentMusicIndex > 0) playMusic(currentMusicIndex-1); });
  document.getElementById('minimize-player').addEventListener('click', () => { document.getElementById('music-player').classList.add('hidden'); document.getElementById('mini-player').classList.remove('hidden'); });
  document.getElementById('expand-player').addEventListener('click', () => { document.getElementById('music-player').classList.remove('hidden'); document.getElementById('mini-player').classList.add('hidden'); });
  document.querySelectorAll('#music-genre-filters .chip').forEach(chip => { chip.addEventListener('click', () => { document.querySelectorAll('#music-genre-filters .chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); loadMusicByGenre(chip.dataset.genre); }); });
}

async function searchMusic(query) {
  const container = document.getElementById('music-grid');
  container.innerHTML = '<div class="loading">🔍 Buscando...</div>';
  try {
    const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=50&country=es`);
    musicPlaylist = (d.results||[]).filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'' }));
    renderMusicCards(container, musicPlaylist);
  } catch (e) { container.innerHTML = '<div class="loading">Error en la búsqueda.</div>'; }
}

// ===================== PELÍCULAS — Base de datos local (80+ películas) =====================
// Usa MOVIES_DB de movie-database.js — todo en español, con IMDb IDs para multiembed.mov

function loadMoviesByCategory(cat) {
  const container = document.getElementById('movies-grid');
  moviesList = MOVIES_DB.filter(m => m.cat === cat);
  renderMovies(container, moviesList);
}

function renderMovies(container, movies) {
  if (!movies || movies.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas.</div>';
    return;
  }
  container.innerHTML = movies.map((m, i) => {
    const genres = m.genero.join(', ');
    return `<div class="movie-card" onclick="openMovieModal(${i})">
      <div class="movie-poster-placeholder" style="background:linear-gradient(135deg, var(--primary), var(--accent));display:flex;align-items:center;justify-content:center;text-align:center;padding:1rem;aspect-ratio:2/3;">
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);line-height:1.3;">${m.titulo}</div>
          <div style="font-size:0.7rem;color:rgba(255,255,255,0.8);margin-top:0.3rem;">${m.anio}</div>
        </div>
      </div>
      <div class="movie-card-info">
        <div class="movie-card-title">${m.titulo}</div>
        <div class="movie-card-meta">
          <span style="color:#fdcb6e;font-weight:700;">★ ${m.estrellas}</span>
          <span>${m.anio}</span>
          <span>${genres}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openMovieModal(i) {
  const m = moviesList[i];
  if (!m) return;
  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');

  const genres = m.genero.join(', ');
  const embedUrl = `https://multiembed.mov/?video_id=${m.imdb}`;

  // Sistema de estrellas visual
  const fullStars = Math.floor(m.estrellas);
  const hasHalf = (m.estrellas % 1) >= 0.5;
  let starsHtml = '';
  for (let s = 0; s < 5; s++) {
    if (s < fullStars) starsHtml += '<span style="color:#fdcb6e;">★</span>';
    else if (s === fullStars && hasHalf) starsHtml += '<span style="color:#fdcb6e;">☆</span>';
    else starsHtml += '<span style="color:#555;">★</span>';
  }

  body.innerHTML = `
    <div class="modal-backdrop" style="background:linear-gradient(135deg, var(--primary), var(--accent));display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;aspect-ratio:16/9;">
      <div>
        <div style="font-size:1.8rem;font-weight:800;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.6);">${m.titulo}</div>
        <div style="font-size:0.9rem;color:rgba(255,255,255,0.8);margin-top:0.3rem;">${m.original} (${m.anio})</div>
      </div>
    </div>
    <div class="modal-body-info">
      <h2 class="modal-title">${m.titulo}</h2>
      <div class="modal-meta">
        <span>📅 ${m.anio}</span>
        <span>🎬 ${genres}</span>
        <span>${starsHtml} ${m.estrellas}/5</span>
      </div>
      <p class="modal-overview">${m.desc}</p>

      <div id="player-wrapper" style="position:relative;width:100%;padding-top:56.25%;border-radius:var(--radius-sm);overflow:hidden;background:#000;margin-top:1rem;">
        <iframe id="movie-iframe" src="${embedUrl}" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          style="position:absolute;inset:0;width:100%;height:100%;border:none;"
          scrolling="no" frameborder="0"></iframe>
        <button id="fs-btn" onclick="toggleFullscreen()"
          style="position:absolute;bottom:10px;right:10px;z-index:10;background:rgba(0,0,0,0.7);color:white;border:none;width:40px;height:40px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
          ⛶
        </button>
      </div>
      <p style="color:var(--text-muted);font-size:0.72rem;margin-top:0.5rem;">
        🎬 El reproductor tiene varios servidores. Si uno no tiene audio en español, probá cambiar de servidor dentro del reproductor.
        Puede mostrar publicidad antes de la película.
      </p>
    </div>
  `;
}

function toggleFullscreen() {
  const wrapper = document.getElementById('player-wrapper');
  if (!wrapper) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (wrapper.requestFullscreen) {
    wrapper.requestFullscreen();
  } else if (wrapper.webkitRequestFullscreen) {
    wrapper.webkitRequestFullscreen();
  }
}

function setupMovieControls() {
  document.querySelectorAll('#movie-categories .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadMoviesByCategory(chip.dataset.cat);
    });
  });
  document.getElementById('movie-search-btn').addEventListener('click', () => {
    const q = document.getElementById('movie-search').value;
    if (q.trim()) searchMovies(q);
  });
  document.getElementById('movie-search').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchMovies(e.target.value);
  });
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('movie-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  });
  document.getElementById('movie-modal').addEventListener('click', e => {
    if (e.target.id === 'movie-modal') {
      document.getElementById('movie-modal').classList.add('hidden');
      document.getElementById('modal-body').innerHTML = '';
    }
  });
}

function searchMovies(query) {
  const container = document.getElementById('movies-grid');
  const q = query.toLowerCase();
  moviesList = MOVIES_DB.filter(m =>
    m.titulo.toLowerCase().includes(q) ||
    m.original.toLowerCase().includes(q) ||
    m.genero.some(g => g.toLowerCase().includes(q)) ||
    m.desc.toLowerCase().includes(q)
  );
  document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
  if (moviesList.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas para "' + query + '".</div>';
  } else {
    renderMovies(container, moviesList);
  }
}
