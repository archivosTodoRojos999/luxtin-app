/* ====================================================================
   LUXTIN APP — Todo funciona SIN API KEYS
   
   APIs (todas gratuitas, sin registro):
   - ESPN:        site.api.espn.com → fútbol en vivo (15 ligas)
   - iTunes:      itunes.apple.com → música (tienda España = español)
   - Apple RSS:   rss.applemarketingtools.com → tendencias musicales
   - DevsAPIHub:  devsapihub.com/api-movies → 30 películas reales
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

// ===================== DEPORTES — ESPN (15 LIGAS, SIN KEY) =====================
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
        home: home.team?.displayName || home.team?.name || 'Local',
        away: away.team?.displayName || away.team?.name || 'Visitante',
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
    container.innerHTML = '<div class="loading">No hay partidos en esta liga ahora. Probá "Todas" o esperá al refresh automático (cada 60s).</div>';
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
      badge = `<span style="color:var(--text-muted);font-weight:600;">Finalizado</span>`;
    } else if (m.date) {
      badge = `<span style="color:var(--text-muted);">${new Date(m.date).toLocaleString('es-AR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`;
    } else {
      badge = '<span style="color:var(--text-muted);">Próximo</span>';
    }

    const homeLogo = m.homeLogo ? `<img src="${m.homeLogo}" class="team-logo" alt="">` : `<div class="team-badge">${m.home[0]}</div>`;
    const awayLogo = m.awayLogo ? `<img src="${m.awayLogo}" class="team-logo" alt="">` : `<div class="team-badge">${m.away[0]}</div>`;

    const score = (m.homeScore !== null)
      ? `<div class="match-score ${isLive ? 'live' : ''}">${m.homeScore} - ${m.awayScore}</div>`
      : `<div class="match-score" style="color:var(--text-muted);font-size:0.9rem;">VS</div>`;

    return `
      <div class="match-card ${isLive ? 'live' : ''}">
        <div class="match-header">
          <span class="match-league">${m.league}</span>
          ${badge}
        </div>
        <div class="match-teams">
          <div class="team">${homeLogo}<div class="team-name">${m.home}</div></div>
          ${score}
          <div class="team">${awayLogo}<div class="team-name">${m.away}</div></div>
        </div>
      </div>`;
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
  trending: null,
  pop: 'musica pop',
  reggaeton: 'reggaeton',
  rock: 'rock en español',
  electronica: 'musica electronica',
  'hip hop': 'hip hop',
  cumbia: 'cumbia',
  salsa: 'salsa',
  bachata: 'bachata',
  romantica: 'balada romantica',
  rap: 'rap en español',
  trap: 'trap latino',
};

async function loadMusicByGenre(genre) {
  const container = document.getElementById('music-grid');
  if (loadedGenres[genre]) {
    musicPlaylist = loadedGenres[genre];
    renderMusicCards(container, musicPlaylist);
    return;
  }

  container.innerHTML = '<div class="loading">🎵 Cargando canciones...</div>';

  try {
    let tracks = [];

    if (genre === 'trending') {
      try {
        const res = await fetch('https://rss.applemarketingtools.com/api/v2/us/music/most-popular/50/songs.json');
        const data = await res.json();
        tracks = (data.feed?.results || []).map(s => ({
          title: s.name,
          artist: s.artistName,
          artwork: (s.artworkUrl100 || '').replace('100x100', '300x300'),
          previewUrl: '',
          itunesUrl: s.url || '',
        }));
        await enrichMusicPreviews(tracks);
      } catch (e) { /* fallback */ }
    }

    if (tracks.length === 0) {
      const term = MUSIC_GENRES[genre] || genre;
      const data = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=50&country=es`);
      tracks = (data.results || []).filter(s => s.previewUrl).map(s => ({
        title: s.trackName,
        artist: s.artistName,
        artwork: (s.artworkUrl100 || '').replace('100x100', '300x300'),
        previewUrl: s.previewUrl,
        itunesUrl: s.trackViewUrl || '',
      }));
    }

    if (tracks.length < 20 && genre !== 'trending') {
      const extraTerm = MUSIC_GENRES[genre] + ' 2026';
      try {
        const data2 = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(extraTerm)}&media=music&limit=25&country=es`);
        const extra = (data2.results || []).filter(s => s.previewUrl).map(s => ({
          title: s.trackName,
          artist: s.artistName,
          artwork: (s.artworkUrl100 || '').replace('100x100', '300x300'),
          previewUrl: s.previewUrl,
          itunesUrl: s.trackViewUrl || '',
        }));
        const existing = new Set(tracks.map(t => t.title + t.artist));
        extra.forEach(t => { if (!existing.has(t.title + t.artist)) tracks.push(t); });
      } catch (e) { /* ok */ }
    }

    loadedGenres[genre] = tracks;
    musicPlaylist = tracks;
    renderMusicCards(container, tracks);
  } catch (err) {
    console.error('Error cargando música:', err);
    container.innerHTML = '<div class="loading">Error al cargar. Tocá otra categoría o reintentá.</div>';
  }
}

async function enrichMusicPreviews(tracks) {
  for (let i = 0; i < tracks.length; i += 8) {
    const batch = tracks.slice(i, i + 8);
    await Promise.allSettled(batch.map(async t => {
      if (t.previewUrl) return;
      try {
        const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(t.title + ' ' + t.artist)}&media=music&limit=1`);
        if (d.results?.[0]?.previewUrl) t.previewUrl = d.results[0].previewUrl;
      } catch (e) {}
    }));
  }
}

function renderMusicCards(container, tracks) {
  if (!tracks || tracks.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron canciones.</div>';
    return;
  }
  container.innerHTML = tracks.map((t, i) => `
    <div class="music-card" onclick="playMusic(${i})">
      <img class="music-thumb" src="${t.artwork}" alt="" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><rect fill=%22%231e1e2e%22 width=%22300%22 height=%22300%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 font-size=%2240%22>🎵</text></svg>'">
      <div class="music-info">
        <div class="music-title">${t.title}</div>
        <div class="music-channel">${t.artist}</div>
      </div>
    </div>
  `).join('');
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
  if (t.previewUrl) {
    audio.src = t.previewUrl;
    audio.play().catch(() => {});
  } else {
    audio.removeAttribute('src');
  }

  const yt = encodeURIComponent(t.title + ' ' + t.artist + ' official audio');
  document.getElementById('youtube-full-link').href = `https://www.youtube.com/results?search_query=${yt}`;
  document.getElementById('mini-title').textContent = `${t.title} — ${t.artist}`;
  document.getElementById('music-player').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupMusicControls() {
  document.getElementById('music-search-btn').addEventListener('click', () => {
    const q = document.getElementById('music-search').value;
    if (q.trim()) searchMusic(q);
  });
  document.getElementById('music-search').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchMusic(e.target.value);
  });

  document.getElementById('next-track').addEventListener('click', () => {
    if (currentMusicIndex < musicPlaylist.length - 1) playMusic(currentMusicIndex + 1);
  });
  document.getElementById('prev-track').addEventListener('click', () => {
    if (currentMusicIndex > 0) playMusic(currentMusicIndex - 1);
  });

  document.getElementById('minimize-player').addEventListener('click', () => {
    document.getElementById('music-player').classList.add('hidden');
    document.getElementById('mini-player').classList.remove('hidden');
  });
  document.getElementById('expand-player').addEventListener('click', () => {
    document.getElementById('music-player').classList.remove('hidden');
    document.getElementById('mini-player').classList.add('hidden');
  });

  document.querySelectorAll('#music-genre-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#music-genre-filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadMusicByGenre(chip.dataset.genre);
    });
  });
}

async function searchMusic(query) {
  const container = document.getElementById('music-grid');
  container.innerHTML = '<div class="loading">🔍 Buscando...</div>';
  try {
    const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=50&country=es`);
    const tracks = (d.results || []).filter(s => s.previewUrl).map(s => ({
      title: s.trackName,
      artist: s.artistName,
      artwork: (s.artworkUrl100 || '').replace('100x100', '300x300'),
      previewUrl: s.previewUrl,
      itunesUrl: s.trackViewUrl || '',
    }));
    musicPlaylist = tracks;
    renderMusicCards(container, tracks);
  } catch (e) {
    container.innerHTML = '<div class="loading">Error en la búsqueda. Reintentá.</div>';
  }
}

// ===================== PELÍCULAS — DevsAPIHub (30 películas reales) =====================
// API: https://devsapihub.com/api-movies
// Endpoints:
//   GET /api-movies              → todas
//   GET /api-movies/genre/:g     → filtra por género (coma para varios)
//   GET /api-movies/year/:year   → filtra por año
//   GET /api-movies/stars/:stars → filtra por calificación

const MOVIES_API = 'https://devsapihub.com/api-movies';

let moviesList = [];
let loadedMovieCategories = {};

// Mapeo de categorías a géneros de la API
const MOVIE_CATEGORY_GENRES = {
  destacadas: null, // todas las películas
  ninos: 'Animation,Family,Comedy,Adventure,Fantasy',
  adolescentes: 'Action,Adventure,Sci-Fi,Fantasy,Thriller,Suspense',
  adultos: 'Drama,Crime,Biography,Western,History,Romance,Dark Comedy,Science Fiction',
};

async function loadMoviesByCategory(cat) {
  const container = document.getElementById('movies-grid');

  if (loadedMovieCategories[cat]) {
    moviesList = loadedMovieCategories[cat];
    renderMovies(container, moviesList);
    return;
  }

  container.innerHTML = '<div class="loading">🎬 Cargando películas...</div>';

  try {
    let url;
    if (cat === 'destacadas') {
      // Todas las películas
      url = MOVIES_API;
    } else {
      // Filtrar por género
      const genres = MOVIE_CATEGORY_GENRES[cat] || cat;
      url = `${MOVIES_API}/genre/${genres}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('API error: ' + res.status);
    const data = await res.json();

    // La API devuelve el formato: { id, title, description, year, image_url, genre:[], stars }
    moviesList = data.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      year: m.year,
      image_url: m.image_url,
      genre: m.genre,
      stars: m.stars,
    }));

    loadedMovieCategories[cat] = moviesList;
    renderMovies(container, moviesList);
  } catch (err) {
    console.error('Error cargando películas:', err);
    // Fallback: intentar con todas
    try {
      const res = await fetch(MOVIES_API);
      const data = await res.json();
      moviesList = data.map(m => ({
        id: m.id, title: m.title, description: m.description,
        year: m.year, image_url: m.image_url, genre: m.genre, stars: m.stars,
      }));
      loadedMovieCategories[cat] = moviesList;
      renderMovies(container, moviesList);
    } catch (err2) {
      container.innerHTML = '<div class="loading">Error al cargar películas. Reintentá más tarde.</div>';
    }
  }
}

function renderMovies(container, movies) {
  if (!movies || movies.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas en esta categoría.</div>';
    return;
  }
  container.innerHTML = movies.map((m, i) => {
    const year = String(m.year || '');
    const genres = Array.isArray(m.genre) ? m.genre.join(', ') : '';
    const stars = m.stars || 0;

    return `
    <div class="movie-card" onclick="openMovieModal(${i})">
      <img class="movie-poster" src="${m.image_url}" alt="${m.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%2315151f%22 width=%22300%22 height=%22450%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 font-size=%2240%22>🎬</text></svg>'">
      <div class="movie-card-info">
        <div class="movie-card-title">${m.title}</div>
        <div class="movie-card-meta">
          <span>${year}</span>
          ${genres ? `<span>· ${genres}</span>` : ''}
          <span style="color:#fdcb6e;font-weight:700;">★ ${stars}</span>
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

  const year = String(m.year || '');
  const genres = Array.isArray(m.genre) ? m.genre.join(', ') : '';
  const stars = m.stars || 0;
  const desc = m.description || 'Sin descripción disponible.';

  // Crear estrellas visuales
  const fullStars = Math.floor(stars);
  const hasHalf = (stars % 1) >= 0.5;
  let starsHtml = '';
  for (let s = 0; s < 5; s++) {
    if (s < fullStars) starsHtml += '<span style="color:#fdcb6e;">★</span>';
    else if (s === fullStars && hasHalf) starsHtml += '<span style="color:#fdcb6e;">☆</span>';
    else starsHtml += '<span style="color:#555;">★</span>';
  }

  // Links a YouTube
  const ytTrailer = encodeURIComponent(m.title + ' ' + year + ' tráiler español');
  const ytFull = encodeURIComponent(m.title + ' ' + year + ' pelicula completa español');

  body.innerHTML = `
    ${m.image_url ? `<div class="modal-backdrop" style="background-image:url('${m.image_url}')"></div>` : ''}
    <div class="modal-body-info">
      <h2 class="modal-title">${m.title}</h2>
      <div class="modal-meta">
        ${year ? `<span>📅 ${year}</span>` : ''}
        ${genres ? `<span>🎬 ${genres}</span>` : ''}
        <span>${starsHtml} ${stars}/5</span>
      </div>
      <p class="modal-overview">${desc}</p>

      <div style="margin-top:1.2rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${ytTrailer}" target="_blank" class="btn-primary" style="text-decoration:none;">
          🎬 Ver tráiler en YouTube
        </a>
        <a href="https://www.youtube.com/results?search_query=${ytFull}" target="_blank" class="btn-primary" style="text-decoration:none;background:var(--bg-card-hover);border:1px solid var(--border);">
          🔍 Ver película completa en YouTube
        </a>
      </div>
    </div>
  `;
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

async function searchMovies(query) {
  const container = document.getElementById('movies-grid');
  container.innerHTML = '<div class="loading">🔍 Buscando películas...</div>';
  try {
    // La API no tiene búsqueda por texto, así que traemos todas y filtramos
    const res = await fetch(MOVIES_API);
    const data = await res.json();
    const q = query.toLowerCase();
    moviesList = data.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (Array.isArray(m.genre) && m.genre.some(g => g.toLowerCase().includes(q)))
    ).map(m => ({
      id: m.id, title: m.title, description: m.description,
      year: m.year, image_url: m.image_url, genre: m.genre, stars: m.stars,
    }));

    // Quitar chip activo de categorías
    document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));

    if (moviesList.length === 0) {
      container.innerHTML = '<div class="loading">No se encontraron películas para "' + query + '".</div>';
    } else {
      renderMovies(container, moviesList);
    }
  } catch (e) {
    container.innerHTML = '<div class="loading">Error en la búsqueda. Reintentá.</div>';
  }
}