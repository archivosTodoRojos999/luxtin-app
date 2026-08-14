/* ====================================================================
   LUXTIN APP — Todo funciona SIN API KEYS
   
   APIs (todas gratuitas, sin registro):
   - ESPN:   site.api.espn.com → fútbol en vivo (15 ligas)
   - iTunes: itunes.apple.com → música y películas (tienda España = español)
   - Apple RSS: rss.applemarketingtools.com → tendencias
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
  loadMoviesByCategory('ninos');
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

  // Ordenar: en vivo primero, luego próximos, luego finalizados
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
  trending: null, // usa Apple RSS
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
      // Apple RSS — 25 canciones tendencia
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
        // Enriquecer con previews
        await enrichMusicPreviews(tracks);
      } catch (e) { /* fallback abajo */ }
    }

    // Si trending falló o es un género específico, buscar en iTunes
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

    // Si todavía hay pocas, buscar más con variaciones
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
        // Merge sin duplicar
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

  // Genre chips
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

// ===================== PELÍCULAS — iTunes (tienda España = español) =====================
let moviesList = [];
let loadedMovieCategories = {};

const MOVIE_CATEGORIES = {
  ninos: ['pelicula animacion', 'pelicula infantil', 'pelicula familiar disney', 'pelicula pixar'],
  adolescentes: ['pelicula accion', 'pelicula aventura', 'pelicula superheroes', 'pelicula fantastica'],
  adultos: ['pelicula drama', 'pelicula thriller', 'pelicula comedia', 'pelicula terror'],
};

async function loadMoviesByCategory(cat) {
  const container = document.getElementById('movies-grid');

  if (loadedMovieCategories[cat]) {
    moviesList = loadedMovieCategories[cat];
    renderMovies(container, moviesList);
    return;
  }

  container.innerHTML = '<div class="loading">🎬 Cargando películas...</div>';

  const searchTerms = MOVIE_CATEGORIES[cat] || [cat];
  let allMovies = [];

  // Buscar cada término y combinar resultados
  for (const term of searchTerms) {
    try {
      const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=movie&limit=25&country=es`);
      const movies = (d.results || []).map(m => ({
        title: m.trackName,
        artwork: (m.artworkUrl100 || '').replace('100x100', '400x600'),
        releaseDate: m.releaseDate || '',
        genres: m.primaryGenreName || '',
        itunesUrl: m.trackViewUrl || '',
        artist: m.artistName || '',
        previewUrl: m.previewUrl || '',
        description: m.longDescription || m.shortDescription || '',
      }));
      allMovies = allMovies.concat(movies);
    } catch (e) { /* skip */ }
  }

  // Quitar duplicados
  const seen = new Set();
  allMovies = allMovies.filter(m => {
    if (seen.has(m.title)) return false;
    seen.add(m.title);
    return true;
  });

  loadedMovieCategories[cat] = allMovies;
  moviesList = allMovies;
  renderMovies(container, allMovies);
}

function renderMovies(container, movies) {
  if (!movies || movies.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas en esta categoría.</div>';
    return;
  }
  container.innerHTML = movies.map((m, i) => `
    <div class="movie-card" onclick="openMovieModal(${i})">
      <img class="movie-poster" src="${m.artwork}" alt="" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%2315151f%22 width=%22300%22 height=%22450%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 font-size=%2240%22>🎬</text></svg>'">
      <div class="movie-card-info">
        <div class="movie-card-title">${m.title}</div>
        <div class="movie-card-meta">
          <span>${m.releaseDate?.substring(0,4) || ''}</span>
          ${m.genres ? `<span>· ${m.genres}</span>` : ''}
          ${m.previewUrl ? '<span style="color:var(--accent);">▶ Tráiler</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function openMovieModal(i) {
  const m = moviesList[i];
  if (!m) return;

  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');

  const ytTrailer = encodeURIComponent(m.title + ' ' + (m.releaseDate?.substring(0,4) || '') + ' pelicula completa español');
  const ytTrailerLink = encodeURIComponent(m.title + ' ' + (m.releaseDate?.substring(0,4) || '') + ' trailer español');

  body.innerHTML = `
    ${m.artwork ? `<div class="modal-backdrop" style="background-image:url('${m.artwork.replace('400x600','w780')}')"></div>` : ''}
    <div class="modal-body-info">
      <h2 class="modal-title">${m.title}</h2>
      <div class="modal-meta">
        ${m.releaseDate ? `<span>📅 ${m.releaseDate.substring(0,4)}</span>` : ''}
        ${m.genres ? `<span>🎬 ${m.genres}</span>` : ''}
        ${m.artist ? `<span>⭐ ${m.artist}</span>` : ''}
      </div>
      <p class="modal-overview">${m.description || 'Sin descripción disponible.'}</p>
      
      ${m.previewUrl ? `
        <h3 style="font-size:1rem;margin:1rem 0 0.5rem;">▶ Tráiler en Español</h3>
        <div class="trailer-container">
          <video controls autoplay width="100%" style="position:absolute;inset:0;width:100%;height:100%;background:#000;">
            <source src="${m.previewUrl}" type="video/mp4">
          </video>
        </div>
      ` : ''}
      
      <div style="margin-top:1.2rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${ytTrailerLink}" target="_blank" class="btn-primary" style="text-decoration:none;">
          🎬 Ver tráiler en YouTube
        </a>
        <a href="https://www.youtube.com/results?search_query=${ytTrailer}" target="_blank" class="btn-primary" style="text-decoration:none;background:var(--bg-card-hover);border:1px solid var(--border);">
          🔍 Ver película completa en YouTube
        </a>
        ${m.itunesUrl ? `<a href="${m.itunesUrl}" target="_blank" class="btn-primary" style="text-decoration:none;background:var(--bg-card-hover);border:1px solid var(--border);">Ver en iTunes</a>` : ''}
      </div>
    </div>
  `;
}

function setupMovieControls() {
  // Categorías
  document.querySelectorAll('#movie-categories .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadMoviesByCategory(chip.dataset.cat);
    });
  });

  // Búsqueda
  document.getElementById('movie-search-btn').addEventListener('click', () => {
    const q = document.getElementById('movie-search').value;
    if (q.trim()) searchMovies(q);
  });
  document.getElementById('movie-search').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchMovies(e.target.value);
  });

  // Modal
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
    const d = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&limit=50&country=es`);
    moviesList = (d.results || []).map(m => ({
      title: m.trackName,
      artwork: (m.artworkUrl100 || '').replace('100x100', '400x600'),
      releaseDate: m.releaseDate || '',
      genres: m.primaryGenreName || '',
      itunesUrl: m.trackViewUrl || '',
      artist: m.artistName || '',
      previewUrl: m.previewUrl || '',
      description: m.longDescription || m.shortDescription || '',
    }));
    renderMovies(container, moviesList);
  } catch (e) {
    container.innerHTML = '<div class="loading">Error en la búsqueda. Reintentá.</div>';
  }
}