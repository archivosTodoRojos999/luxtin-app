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
  trending: null, hits2026: null, clasicos2015: null,
  pop: 'musica pop', reggaeton: 'reggaeton', rock: 'rock en español',
  electronica: 'musica electronica', 'hip hop': 'hip hop', cumbia: 'cumbia',
  salsa: 'salsa', bachata: 'bachata', romantica: 'balada romantica', rap: 'rap en español', trap: 'trap latino',
};

// Términos de búsqueda multi-consulta para años específicos (mezcla varios artistas/estilos actuales)
const YEAR_SEARCH_TERMS = {
  hits2026: ['top hits 2026', 'exitos 2026', 'reggaeton 2026', 'pop 2026', 'musica nueva 2026'],
  clasicos2015: ['top hits 2015', 'exitos 2015', 'pop 2015', 'reggaeton 2015', 'rock 2015'],
};

function dedupeTracks(tracks) {
  const seen = new Set();
  const out = [];
  tracks.forEach(t => {
    const key = (t.title + t.artist).toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(t); }
  });
  return out;
}

async function loadMusicByGenre(genre) {
  const container = document.getElementById('music-grid');
  if (loadedGenres[genre]) { musicPlaylist = loadedGenres[genre]; renderMusicCards(container, musicPlaylist); return; }
  container.innerHTML = '<div class="loading">🎵 Cargando canciones...</div>';
  try {
    let tracks = [];

    // Tendencias globales (Apple Music charts)
    if (genre === 'trending') {
      try {
        const res = await fetch('https://rss.applemarketingtools.com/api/v2/us/music/most-popular/50/songs.json');
        const data = await res.json();
        tracks = (data.feed?.results || []).map(s => ({ title: s.name, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: '', itunesUrl: s.url||'' }));
        await enrichMusicPreviews(tracks);
      } catch (e) {}
    }

    // Éxitos 2026 / Clásicos 2015 — múltiples búsquedas combinadas para más variedad
    if ((genre === 'hits2026' || genre === 'clasicos2015') && YEAR_SEARCH_TERMS[genre]) {
      const queries = YEAR_SEARCH_TERMS[genre];
      const results = await Promise.allSettled(
        queries.map(q => jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=25&country=es`))
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.results) {
          const mapped = r.value.results.filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'', releaseYear: (s.releaseDate||'').slice(0,4) }));
          tracks.push(...mapped);
        }
      });
      tracks = dedupeTracks(tracks);
    }

    // Géneros normales
    if (tracks.length === 0 && genre !== 'trending') {
      const term = MUSIC_GENRES[genre] || genre;
      const data = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=50&country=es`);
      tracks = (data.results||[]).filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'' }));
    }

    // Relleno extra si hace falta más variedad (géneros normales, no trending/años)
    if (tracks.length < 20 && genre !== 'trending' && genre !== 'hits2026' && genre !== 'clasicos2015') {
      try {
        const data2 = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(MUSIC_GENRES[genre]+' 2026')}&media=music&limit=25&country=es`);
        const extra = (data2.results||[]).filter(s => s.previewUrl).map(s => ({ title: s.trackName, artist: s.artistName, artwork: (s.artworkUrl100||'').replace('100x100','300x300'), previewUrl: s.previewUrl, itunesUrl: s.trackViewUrl||'' }));
        tracks = dedupeTracks(tracks.concat(extra));
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

// ===================== PELÍCULAS — 4800+ películas (TMDB dataset) =====================
// Base de datos local en movie-database.js
// Campos: t=título, o=original, y=año, id=TMDB ID, g=géneros, r=rating, d=desc, c=categoría

let moviesToShow = [];
let moviesPage = 0;
const MOVIES_PER_PAGE = 60;

// Colores por género — cada género tiene su propio gradiente
const GENRE_COLORS = {
  'Animación':     ['#f39c12', '#e67e22'],
  'Familiar':      ['#e67e22', '#d35400'],
  'Acción':        ['#e74c3c', '#c0392b'],
  'Aventura':      ['#e67e22', '#e74c3c'],
  'Ciencia Ficción': ['#0984e3', '#00cec9'],
  'Fantasía':      ['#6c5ce7', '#a29bfe'],
  'Comedia':       ['#00b894', '#55a630'],
  'Drama':         ['#5f27cd', '#341f97'],
  'Terror':        ['#2c2c54', '#474787'],
  'Suspenso':      ['#2c3e50', '#c0392b'],
  'Crimen':        ['#2c3e50', '#e74c3c'],
  'Romance':       ['#e84393', '#e74c3c'],
  'Misterio':      ['#34495e', '#2c3e50'],
  'Musical':       ['#fd79a8', '#e84393'],
  'Guerra':        ['#2c3e50', '#7f8c8d'],
  'Biografía':     ['#3498db', '#2980b9'],
  'Historia':      ['#d4a017', '#b8860b'],
  'Documental':    ['#00cec9', '#0984e3'],
  'Western':       ['#d4a017', '#8B4513'],
  'Internacional': ['#6c5ce7', '#0984e3'],
};

function getGenreGradient(genres) {
  if (genres && genres.length > 0) {
    const colors = GENRE_COLORS[genres[0]];
    if (colors) return colors;
  }
  return ['#6c5ce7', '#00cec9']; // fallback
}

function getGenreIcon(genres) {
  const g = genres.join(' ').toLowerCase();
  if (g.includes('animación') || g.includes('familiar')) return '🎬';
  if (g.includes('acción') || g.includes('aventura')) return '💥';
  if (g.includes('ciencia ficción') || g.includes('fantasía')) return '🚀';
  if (g.includes('comedia')) return '😂';
  if (g.includes('drama')) return '🎭';
  if (g.includes('terror') || g.includes('suspenso')) return '👻';
  if (g.includes('romance')) return '❤️';
  if (g.includes('crimen')) return '🔫';
  if (g.includes('documental')) return '📹';
  if (g.includes('musical')) return '🎵';
  return '🎬';
}

function loadMoviesByCategory(cat) {
  const container = document.getElementById('movies-grid');
  moviesList = MOVIES_DB.filter(m => m.c === cat);
  moviesToShow = moviesList;
  moviesPage = 0;
  renderMoviesPage(container);
}

function renderMoviesPage(container) {
  const start = 0;
  const end = (moviesPage + 1) * MOVIES_PER_PAGE;
  const display = moviesToShow.slice(0, end);

  container.innerHTML = display.map((m, i) => {
    const [c1, c2] = getGenreGradient(m.g);
    const icon = getGenreIcon(m.g);
    const rating = m.r > 0 ? `<span style="color:#fdcb6e;font-weight:700;">★ ${m.r}</span>` : '';
    const genres = m.g.slice(0, 2).join(', ');
    const posterUrl = m.pi ? `https://image.tmdb.org/t/p/w342/${m.pi}` : '';
    const posterHtml = posterUrl
      ? `<img class="movie-poster-img" src="${posterUrl}" alt="${m.t}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="movie-poster-placeholder" style="background:linear-gradient(145deg, ${c1}, ${c2});display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0.8rem;aspect-ratio:2/3;position:relative;overflow:hidden;">
           <div style="font-size:2rem;margin-bottom:0.5rem;opacity:0.9;">${icon}</div>
           <div style="font-size:0.85rem;font-weight:700;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);line-height:1.25;">${m.t}</div>
           <div style="font-size:0.65rem;color:rgba(255,255,255,0.75);margin-top:0.3rem;">${m.y || ''}</div>
         </div>`
      : `<div class="movie-poster-placeholder" style="background:linear-gradient(145deg, ${c1}, ${c2});display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0.8rem;aspect-ratio:2/3;position:relative;overflow:hidden;">
           <div style="font-size:2rem;margin-bottom:0.5rem;opacity:0.9;">${icon}</div>
           <div style="font-size:0.85rem;font-weight:700;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);line-height:1.25;">${m.t}</div>
           <div style="font-size:0.65rem;color:rgba(255,255,255,0.75);margin-top:0.3rem;">${m.y || ''}</div>
         </div>`;
    return `<div class="movie-card" onclick="openMovieModal(${i})">
      ${posterHtml}
      <div class="movie-card-info">
        <div class="movie-card-title">${m.t}</div>
        <div class="movie-card-meta">
          ${rating}
          <span>${m.y || ''}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  if (moviesToShow.length > end) {
    container.innerHTML += `<div style="grid-column:1/-1;text-align:center;padding:1.2rem;">
      <button onclick="loadMoreMovies()" class="btn-primary">Cargar más películas (${moviesToShow.length - end} restantes)</button>
    </div>`;
  } else if (moviesToShow.length > MOVIES_PER_PAGE) {
    container.innerHTML += `<div style="grid-column:1/-1;text-align:center;padding:0.8rem;color:var(--text-muted);font-size:0.75rem;">✅ ${moviesToShow.length} películas cargadas</div>`;
  }
}

function loadMoreMovies() {
  moviesPage++;
  renderMoviesPage(document.getElementById('movies-grid'));
}

function renderMovies(container, movies) {
  moviesToShow = movies;
  moviesPage = 0;
  renderMoviesPage(container);
}

function openMovieModal(i) {
  const m = moviesToShow[i] || moviesList[i];
  if (!m) return;
  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');

  const [c1, c2] = getGenreGradient(m.g);
  const genres = m.g.join(', ');
  const embedUrl = `https://multiembed.mov/?video_id=${m.id}&tmdb=1`;

  const fullStars = Math.floor(m.r / 2);
  let starsHtml = '';
  for (let s = 0; s < 5; s++) {
    starsHtml += s < fullStars ? '<span style="color:#fdcb6e;">★</span>' : '<span style="color:#444;">★</span>';
  }

  const posterLarge = m.pi ? `https://image.tmdb.org/t/p/w780/${m.pi}` : '';
  const backdropStyle = posterLarge
    ? `background-image:url('${posterLarge}');background-size:cover;background-position:center top;`
    : `background:linear-gradient(135deg, ${c1}, ${c2});`;
  const backdropContent = posterLarge
    ? `<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.85));display:flex;align-items:flex-end;padding:1.5rem;">
        <div>
          <div style="font-size:1.6rem;font-weight:800;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.8);">${m.t}</div>
          <div style="font-size:0.85rem;color:rgba(255,255,255,0.85);margin-top:0.3rem;">${m.o !== m.t ? m.o + ' (' : ''}${m.y || ''}${m.o !== m.t ? ')' : ''}</div>
        </div>
      </div>`
    : `<div>
        <div style="font-size:2.5rem;margin-bottom:0.5rem;">${getGenreIcon(m.g)}</div>
        <div style="font-size:1.6rem;font-weight:800;color:white;text-shadow:0 2px 6px rgba(0,0,0,0.6);">${m.t}</div>
        <div style="font-size:0.85rem;color:rgba(255,255,255,0.8);margin-top:0.3rem;">${m.o !== m.t ? m.o + ' (' : ''}${m.y || ''}${m.o !== m.t ? ')' : ''}</div>
      </div>`;

  body.innerHTML = `
    <div class="modal-backdrop" style="position:relative;${backdropStyle}display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;aspect-ratio:16/9;overflow:hidden;">
      ${backdropContent}
    </div>
    <div class="modal-body-info">
      <h2 class="modal-title">${m.t}</h2>
      <div class="modal-meta">
        <span>📅 ${m.y || 'N/A'}</span>
        <span>🎬 ${genres}</span>
        <span>${starsHtml} ${m.r}/10</span>
      </div>
      <p class="modal-overview">${m.d}</p>

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
    m.t.toLowerCase().includes(q) ||
    m.o.toLowerCase().includes(q) ||
    m.g.some(g => g.toLowerCase().includes(q)) ||
    m.d.toLowerCase().includes(q)
  );
  document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
  if (moviesList.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas para "' + query + '".</div>';
  } else {
    moviesToShow = moviesList;
    moviesPage = 0;
    renderMoviesPage(container);
  }
}

// ===================== DISNEY JUNIOR — EPISODIOS =====================
const DISNEY_EPISODES = [
  { title: 'Mickey Mouse Clubhouse', videoId: 'bQkXyq7K8gA', thumb: 'https://image.tmdb.org/t/p/w342/4M7jg5n7n9k6rH4Ut3gYAwRJDQM.jpg' },
  { title: 'Doc McStuffins', videoId: 'rY0H7jF9KvE', thumb: 'https://i.ytimg.com/vi/rY0H7jF9KvE/hqdefault.jpg' },
  { title: 'Sofia the First', videoId: 'a3KL2f6o5kQ', thumb: 'https://i.ytimg.com/vi/a3KL2f6o5kQ/hqdefault.jpg' },
  { title: 'PJ Masks', videoId: 'x5j8M3vq2yU', thumb: 'https://i.ytimg.com/vi/x5j8M3vq2yU/hqdefault.jpg' },
  { title: 'Bluey', videoId: '0H5mQ3m6oXw', thumb: 'https://i.ytimg.com/vi/0H5mQ3m6oXw/hqdefault.jpg' },
  { title: 'Spidey and His Amazing Friends', videoId: 'k3nKqLp8jWc', thumb: 'https://i.ytimg.com/vi/k3nKqLp8jWc/hqdefault.jpg' },
  { title: 'T.O.T.S. (Tiny Ones Transport Service)', videoId: 'mW8R7p3vN6s', thumb: 'https://i.ytimg.com/vi/mW8R7p3vN6s/hqdefault.jpg' },
  { title: 'Muppet Babies', videoId: 'fR2kP9n3qLw', thumb: 'https://i.ytimg.com/vi/fR2kP9n3qLw/hqdefault.jpg' },
  { title: 'Vampirina', videoId: '7Kq8m2n9pXs', thumb: 'https://i.ytimg.com/vi/7Kq8m2n9pXs/hqdefault.jpg' },
  { title: 'Miles from Tomorrowland', videoId: 'jP5k3r8vN2d', thumb: 'https://i.ytimg.com/vi/jP5k3r8vN2d/hqdefault.jpg' },
  { title: 'Handy Manny', videoId: 'p9Kq2m7nR3x', thumb: 'https://i.ytimg.com/vi/p9Kq2m7nR3x/hqdefault.jpg' },
  { title: 'Little Einsteins', videoId: 'wN7k3p8m2qL', thumb: 'https://i.ytimg.com/vi/wN7k3p8m2qL/hqdefault.jpg' }
];

function renderDisneyEpisodes() {
  const grid = document.getElementById('disney-episodes-grid');
  if (!grid) return;
  grid.innerHTML = DISNEY_EPISODES.map(ep => `
    <div class="disney-episode-card" onclick="playDisneyEpisode('${ep.videoId}', '${ep.title.replace(/'/g, "\\'")}')">
      <div class="disney-episode-thumb">
        <img src="${ep.thumb}" alt="${ep.title}" loading="lazy" onerror="this.style.display='none';">
        <div class="disney-play-overlay">▶</div>
      </div>
      <div class="disney-episode-title">${ep.title}</div>
    </div>
  `).join('');
}

function playDisneyEpisode(videoId, title) {
  const iframe = document.getElementById('disney-live-iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===================== CANAL 13 — NOTICIAS EN VIVO (YouTube) =====================
// Clips de eltrece para cuando no hay stream en vivo
const NOTICIAS_CLIPS = [
  { title: 'Telenoche — Programa completo', videoId: 'HvBz7qCJ-14', thumb: 'https://i.ytimg.com/vi/HvBz7qCJ-14/hqdefault.jpg' },
  { title: 'Mediodía Noticias', videoId: 'W-r1md78L2U', thumb: 'https://i.ytimg.com/vi/W-r1md78L2U/hqdefault.jpg' },
  { title: 'Arriba Argentinos', videoId: '_W9hxilbXh8', thumb: 'https://i.ytimg.com/vi/_W9hxilbXh8/hqdefault.jpg' },
  { title: 'El Trece — ID y gráfica', videoId: 'VccOfbirnQg', thumb: 'https://i.ytimg.com/vi/VccOfbirnQg/hqdefault.jpg' },
  { title: 'Canal 13 en vivo', videoId: '8WvBEksNx60', thumb: 'https://i.ytimg.com/vi/8WvBEksNx60/hqdefault.jpg' },
  { title: 'TUCUMÁN REGISTRADO', videoId: '2ZNUsoLTehU', thumb: 'https://i.ytimg.com/vi/2ZNUsoLTehU/hqdefault.jpg' }
];

function renderNoticiasClips() {
  const grid = document.getElementById('noticias-clips-grid');
  if (!grid) return;
  grid.innerHTML = NOTICIAS_CLIPS.map(clip => `
    <div class="disney-episode-card" onclick="playNoticiasClip('${clip.videoId}')">
      <div class="disney-episode-thumb">
        <img src="${clip.thumb}" alt="${clip.title}" loading="lazy" onerror="this.style.display='none';">
        <div class="disney-play-overlay">▶</div>
      </div>
      <div class="disney-episode-title">${clip.title}</div>
    </div>
  `).join('');
}

function playNoticiasClip(videoId) {
  const iframe = document.getElementById('noticias-live-iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Inicializar contenido al cargar
renderDisneyEpisodes();
renderNoticiasClips();

// Re-inicializar al cambiar de pestaña
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.section === 'disney') {
      renderDisneyEpisodes();
    } else if (btn.dataset.section === 'noticias') {
      renderNoticiasClips();
    }
  });
});

// Scroll infinito para películas (cargar más al hacer scroll)
window.addEventListener('scroll', () => {
  if (typeof moviesToShow !== 'undefined' && moviesToShow.length > 0) {
    const container = document.getElementById('movies-grid');
    if (container && document.getElementById('peliculas').classList.contains('active')) {
      const scrollPos = window.innerHeight + window.scrollY;
      const docHeight = document.body.offsetHeight;
      if (scrollPos >= docHeight - 300) {
        const section = document.getElementById('peliculas');
        if (section.classList.contains('active') && typeof loadMoreMovies === 'function') {
          loadMoreMovies();
        }
      }
    }
  }
});

function loadMoreMovies() {
  const container = document.getElementById('movies-grid');
  if (!container) return;
  moviesPage++;
  renderMoviesPage(container);
}
