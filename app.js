/* ====================================================================
   LUXTIN APP — Lógica principal (SIN API KEYS — todo funciona de una)
   
   APIs usadas (todas gratuitas, sin registro, sin keys):
   - ESPN:      site.api.espn.com    → partidos en vivo (fútbol mundial)
   - iTunes:    itunes.apple.com     → búsqueda de música y películas
   - Apple RSS: rss.applemarketingtools.com → tendencias de música y películas
   ==================================================================== */

// ===================== SPLASH → APP =====================
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    splash.style.display = 'none';
    app.classList.remove('hidden');
    initApp();
  }, 6000);
});

// ===================== INIT =====================
function initApp() {
  setupNav();
  loadAllSports();
  loadTrendingMusic();
  loadTrendingMovies();
  setupMusicSearch();
  setupMovieSearch();
  setupMovieModal();
  setupMusicTabs();
  setupMovieTabs();
}

// ===================== NAVIGATION =====================
function setupNav() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');
    });
  });
}

// ===================== JSONP HELPER (para iTunes que no soporta CORS) =====================
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_cb_' + Math.round(Math.random() * 1000000);
    const script = document.createElement('script');
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;

    window[callbackName] = function(data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      if (document.body.contains(script)) document.body.removeChild(script);
      reject(new Error('JSONP error'));
    };

    document.body.appendChild(script);

    // Timeout 10s
    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (document.body.contains(script)) document.body.removeChild(script);
        reject(new Error('Timeout'));
      }
    }, 10000);
  });
}

// ===================== DEPORTES — ESPN API (SIN KEY) =====================
// ESPN tiene una API pública gratuita que no requiere autenticación

const ESPN_LEAGUES = [
  { code: 'eng.1', name: 'Premier League' },
  { code: 'esp.1', name: 'La Liga' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'arg.1', name: 'Liga Argentina' },
  { code: 'ned.1', name: 'Eredivisie' },
  { code: 'por.1', name: 'Liga Portugal' },
];

let allMatches = [];
let currentLeagueFilter = 'all';

async function loadAllSports() {
  const container = document.getElementById('matches-list');
  container.innerHTML = '<div class="loading">Cargando partidos en vivo...</div>';

  allMatches = [];

  try {
    // Cargar todas las ligas en paralelo
    const results = await Promise.allSettled(
      ESPN_LEAGUES.map(async (league) => {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('ESPN error');
        const data = await res.json();
        return { league: league.name, events: data.events || [] };
      })
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.events.length > 0) {
        result.value.events.forEach(ev => {
          const competition = ev.competitions?.[0];
          if (!competition) return;

          const home = competition.competitors?.find(c => c.homeAway === 'home');
          const away = competition.competitors?.find(c => c.homeAway === 'away');

          if (!home || !away) return;

          allMatches.push({
            league: result.league,
            home: home.team?.displayName || home.team?.name || 'Local',
            away: away.team?.displayName || away.team?.name || 'Visitante',
            homeScore: home.score !== '' ? home.score : null,
            awayScore: away.score !== '' ? away.score : null,
            homeLogo: home.team?.logo || '',
            awayLogo: away.team?.logo || '',
            status: competition.status?.type?.name || 'STATUS_SCHEDULED',
            statusDetail: competition.status?.type?.detail || '',
            shortDetail: competition.status?.type?.shortDetail || '',
            date: ev.date,
          });
        });
      }
    });

    renderMatches();
  } catch (err) {
    console.error('Error ESPN:', err);
    container.innerHTML = '<div class="loading">Error al cargar. Tocá "Actualizar" para reintentar.</div>';
  }

  // Auto-refresh cada 60s
  clearTimeout(window._sportsTimer);
  window._sportsTimer = setTimeout(loadAllSports, 60000);
}

function renderMatches() {
  const container = document.getElementById('matches-list');

  let filtered = allMatches;
  if (currentLeagueFilter !== 'all') {
    const leagueName = ESPN_LEAGUES.find(l => l.code === currentLeagueFilter)?.name;
    filtered = allMatches.filter(m => m.league === leagueName);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="loading">No hay partidos ahora mismo en esta liga. Probá "Todas" o actualizá en unos minutos.</div>';
    return;
  }

  container.innerHTML = filtered.map(m => {
    const isLive = m.status === 'STATUS_IN_PROGRESS' || m.status === 'STATUS_HALFTIME';
    const isFinal = m.status === 'STATUS_FINAL';

    let statusBadge = '';
    if (isLive) {
      const label = m.status === 'STATUS_HALFTIME' ? 'Descanso' : (m.shortDetail || 'EN VIVO');
      statusBadge = `<span class="live-badge"><span class="live-dot"></span> ${label}</span>`;
    } else if (isFinal) {
      statusBadge = `<span style="color:var(--text-muted);font-weight:600;">Finalizado</span>`;
    } else if (m.date) {
      const d = new Date(m.date);
      statusBadge = `<span style="color:var(--text-muted);">${d.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>`;
    }

    const homeLogo = m.homeLogo
      ? `<img src="${m.homeLogo}" class="team-logo" alt="${m.home}">`
      : `<div class="team-badge">${m.home.charAt(0)}</div>`;

    const awayLogo = m.awayLogo
      ? `<img src="${m.awayLogo}" class="team-logo" alt="${m.away}">`
      : `<div class="team-badge">${m.away.charAt(0)}</div>`;

    const scoreDisplay = (m.homeScore !== null && m.homeScore !== undefined)
      ? `<div class="match-score ${isLive ? 'live' : ''}">${m.homeScore} - ${m.awayScore}</div>`
      : `<div class="match-score" style="color:var(--text-muted);font-size:0.9rem;">VS</div>`;

    return `
      <div class="match-card ${isLive ? 'live' : ''}">
        <div class="match-header">
          <span class="match-league">${m.league}</span>
          ${statusBadge}
        </div>
        <div class="match-teams">
          <div class="team">
            ${homeLogo}
            <div class="team-name">${m.home}</div>
          </div>
          ${scoreDisplay}
          <div class="team">
            ${awayLogo}
            <div class="team-name">${m.away}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Filtros de liga
document.addEventListener('click', (e) => {
  if (e.target.closest('#league-filters .chip')) {
    document.querySelectorAll('#league-filters .chip').forEach(c => c.classList.remove('active'));
    e.target.closest('.chip').classList.add('active');
    currentLeagueFilter = e.target.closest('.chip').dataset.league;
    renderMatches();
  }
});

document.getElementById('refresh-matches')?.addEventListener('click', loadAllSports);

// ===================== MÚSICA — iTunes + Apple RSS (SIN KEY) =====================

let musicPlaylist = [];
let currentMusicIndex = -1;

// Cargar tendencias de música (Apple Marketing Tools RSS — sin key)
async function loadTrendingMusic() {
  const container = document.getElementById('music-trending');
  container.innerHTML = '<div class="loading">Cargando tendencias musicales...</div>';

  try {
    const url = 'https://rss.applemarketingtools.com/api/v2/us/music/most-popular/25/songs.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('RSS error');
    const data = await res.json();

    musicPlaylist = (data.feed?.results || []).map(song => ({
      title: song.name,
      artist: song.artistName,
      artwork: song.artworkUrl100?.replace('100x100', '300x300') || '',
      previewUrl: '', // Apple RSS no da previewUrl, lo buscamos en iTunes
      itunesUrl: song.url || '',
      genre: song.genres?.[0]?.name || '',
    }));

    // Buscar preview URLs usando iTunes Search API
    await enrichWithPreviews(musicPlaylist);

    renderMusicCards(container, musicPlaylist);
  } catch (err) {
    console.error('Error trending music:', err);
    // Fallback: buscar canciones populares en iTunes
    try {
      const data = await jsonpRequest('https://itunes.apple.com/search?term=top+hits+2026&media=music&limit=25');
      musicPlaylist = (data.results || []).map(song => ({
        title: song.trackName,
        artist: song.artistName,
        artwork: (song.artworkUrl100 || '').replace('100x100', '300x300'),
        previewUrl: song.previewUrl || '',
        itunesUrl: song.trackViewUrl || '',
        genre: song.primaryGenreName || '',
      }));
      renderMusicCards(container, musicPlaylist);
    } catch (err2) {
      container.innerHTML = '<div class="loading">Error al cargar música. Reintentá más tarde.</div>';
    }
  }
}

async function enrichWithPreviews(tracks) {
  // Buscar preview URLs para las canciones trending (lotes de 5)
  for (let i = 0; i < tracks.length; i += 5) {
    const batch = tracks.slice(i, i + 5);
    await Promise.allSettled(batch.map(async (track) => {
      if (track.previewUrl) return;
      try {
        const query = encodeURIComponent(track.title + ' ' + track.artist);
        const data = await jsonpRequest(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`);
        if (data.results?.[0]?.previewUrl) {
          track.previewUrl = data.results[0].previewUrl;
        }
      } catch (e) { /* skip */ }
    }));
  }
}

function renderMusicCards(container, tracks) {
  if (tracks.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron canciones.</div>';
    return;
  }
  container.innerHTML = tracks.map((track, i) => `
    <div class="music-card" onclick="playMusic(${i})">
      <img class="music-thumb" src="${track.artwork}" alt="${track.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22170%22><rect fill=%22%231e1e2e%22 width=%22300%22 height=%22170%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>🎵</text></svg>'">
      <div class="music-info">
        <div class="music-title">${track.title}</div>
        <div class="music-channel">${track.artist}</div>
      </div>
    </div>
  `).join('');
}

function playMusic(index) {
  if (index < 0 || index >= musicPlaylist.length) return;
  currentMusicIndex = index;
  const track = musicPlaylist[index];

  const player = document.getElementById('music-player');
  player.classList.remove('hidden');

  document.getElementById('now-playing-title').textContent = track.title;
  document.getElementById('now-playing-channel').textContent = track.artist;
  document.getElementById('player-artwork').src = track.artwork;

  const audio = document.getElementById('audio-preview');
  if (track.previewUrl) {
    audio.src = track.previewUrl;
    audio.play().catch(e => console.log('Auto-play bloqueado:', e));
  } else {
    audio.removeAttribute('src');
  }

  // Link a YouTube para escuchar la canción completa
  const ytQuery = encodeURIComponent(track.title + ' ' + track.artist + ' official audio');
  document.getElementById('youtube-full-link').href = `https://www.youtube.com/results?search_query=${ytQuery}`;

  // Mini player
  document.getElementById('mini-title').textContent = `${track.title} — ${track.artist}`;

  // Scroll al player
  player.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupMusicSearch() {
  const input = document.getElementById('music-search');
  const btn = document.getElementById('music-search-btn');

  btn.addEventListener('click', () => searchMusic(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMusic(input.value);
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
}

async function searchMusic(query) {
  if (!query.trim()) return;

  // Cambiar a tab de resultados
  document.querySelectorAll('#music-tabs .chip').forEach(c => c.classList.remove('active'));
  document.querySelector('#music-tabs .chip[data-tab="results"]').classList.add('active');
  document.getElementById('music-trending').classList.add('hidden');
  document.getElementById('music-results').classList.remove('hidden');

  const container = document.getElementById('music-results');
  container.innerHTML = '<div class="loading">Buscando canciones...</div>';

  try {
    const data = await jsonpRequest(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=25`);
    const results = (data.results || []).map(song => ({
      title: song.trackName,
      artist: song.artistName,
      artwork: (song.artworkUrl100 || '').replace('100x100', '300x300'),
      previewUrl: song.previewUrl || '',
      itunesUrl: song.trackViewUrl || '',
      genre: song.primaryGenreName || '',
    }));

    musicPlaylist = results;
    renderMusicCards(container, results);
  } catch (err) {
    console.error('Error búsqueda música:', err);
    container.innerHTML = '<div class="loading">Error al buscar. Reintentá.</div>';
  }
}

function setupMusicTabs() {
  document.querySelectorAll('#music-tabs .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#music-tabs .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tab = chip.dataset.tab;
      document.getElementById('music-trending').classList.toggle('hidden', tab !== 'trending');
      document.getElementById('music-results').classList.toggle('hidden', tab !== 'results');
    });
  });
}

// ===================== PELÍCULAS — iTunes + Apple RSS (SIN KEY) =====================

let moviesPlaylist = [];

async function loadTrendingMovies() {
  const container = document.getElementById('movies-trending');
  container.innerHTML = '<div class="loading">Cargando películas...</div>';

  try {
    const url = 'https://rss.applemarketingtools.com/api/v2/us/movies/most-popular/25/movies.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('RSS error');
    const data = await res.json();

    moviesPlaylist = (data.feed?.results || []).map(movie => ({
      title: movie.name,
      artwork: movie.artworkUrl100?.replace('100x100', '400x600') || '',
      releaseDate: movie.releaseDate,
      genres: movie.genres?.map(g => g.name).join(', ') || '',
      itunesUrl: movie.url || '',
      artist: movie.artistName || '',
      previewUrl: '', // lo buscamos abajo
      description: '',
    }));

    // Buscar trailers y descripciones via iTunes Search
    await enrichMovies(moviesPlaylist);

    renderMovies(container, moviesPlaylist);
  } catch (err) {
    console.error('Error trending movies:', err);
    try {
      // Fallback: buscar películas populares
      const data = await jsonpRequest('https://itunes.apple.com/search?term=top+movies+2026&media=movie&limit=25');
      moviesPlaylist = (data.results || []).map(movie => ({
        title: movie.trackName,
        artwork: (movie.artworkUrl100 || '').replace('100x100', '400x600'),
        releaseDate: movie.releaseDate || '',
        genres: movie.primaryGenreName || '',
        itunesUrl: movie.trackViewUrl || '',
        artist: movie.artistName || '',
        previewUrl: movie.previewUrl || '',
        description: movie.longDescription || movie.shortDescription || '',
      }));
      renderMovies(container, moviesPlaylist);
    } catch (err2) {
      container.innerHTML = '<div class="loading">Error al cargar películas. Reintentá.</div>';
    }
  }
}

async function enrichMovies(movies) {
  for (let i = 0; i < movies.length; i += 5) {
    const batch = movies.slice(i, i + 5);
    await Promise.allSettled(batch.map(async (movie) => {
      if (movie.previewUrl && movie.description) return;
      try {
        const query = encodeURIComponent(movie.title);
        const data = await jsonpRequest(`https://itunes.apple.com/search?term=${query}&media=movie&limit=1`);
        if (data.results?.[0]) {
          const r = data.results[0];
          if (!movie.previewUrl) movie.previewUrl = r.previewUrl || '';
          if (!movie.description) movie.description = r.longDescription || r.shortDescription || '';
          if (!movie.artwork || movie.artwork.includes('undefined')) {
            movie.artwork = (r.artworkUrl100 || '').replace('100x100', '400x600');
          }
        }
      } catch (e) { /* skip */ }
    }));
  }
}

function renderMovies(container, movies) {
  if (movies.length === 0) {
    container.innerHTML = '<div class="loading">No se encontraron películas.</div>';
    return;
  }
  container.innerHTML = movies.map((m, i) => `
    <div class="movie-card" onclick="openMovieModal(${i})">
      <img class="movie-poster" src="${m.artwork}" alt="${m.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%2315151f%22 width=%22300%22 height=%22450%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>🎬</text></svg>'">
      <div class="movie-card-info">
        <div class="movie-card-title">${m.title}</div>
        <div class="movie-card-meta">
          <span>${m.releaseDate?.substring(0, 4) || ''}</span>
          ${m.genres ? `<span>· ${m.genres}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function openMovieModal(index) {
  const movie = (currentMovieSearchMode ? moviesSearchResults : moviesPlaylist)[index];
  if (!movie) return;

  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');

  const ytQuery = encodeURIComponent(movie.title + ' ' + (movie.releaseDate?.substring(0, 4) || '') + ' trailer español');

  body.innerHTML = `
    ${movie.artwork ? `<div class="modal-backdrop" style="background-image:url('${movie.artwork.replace('400x600', 'w780')}')">` : ''}
    </div>
    <div class="modal-body-info">
      <h2 class="modal-title">${movie.title}</h2>
      <div class="modal-meta">
        ${movie.releaseDate ? `<span>📅 ${movie.releaseDate.substring(0, 4)}</span>` : ''}
        ${movie.genres ? `<span>🎬 ${movie.genres}</span>` : ''}
        ${movie.artist ? `<span>⭐ ${movie.artist}</span>` : ''}
      </div>
      <p class="modal-overview">${movie.description || 'Sin descripción disponible.'}</p>
      
      ${movie.previewUrl ? `
        <h3 style="font-size:1rem;margin-bottom:0.5rem;margin-top:1rem;">▶ Tráiler</h3>
        <div class="trailer-container">
          <video controls width="100%" style="position:absolute;inset:0;width:100%;height:100%;background:#000;">
            <source src="${movie.previewUrl}" type="video/mp4">
            Tu navegador no soporta video.
          </video>
        </div>
      ` : '<p style="color:var(--text-muted);margin-top:1rem;">Tráiler no disponible en esta región.</p>'}
      
      <div style="margin-top:1rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${ytQuery}" target="_blank" class="btn-primary" style="text-decoration:none;">
          ▶ Ver tráiler en YouTube
        </a>
        ${movie.itunesUrl ? `<a href="${movie.itunesUrl}" target="_blank" class="btn-primary" style="text-decoration:none;background:var(--bg-card-hover);border:1px solid var(--border);">Ver en iTunes</a>` : ''}
      </div>
    </div>
  `;

  // Auto-play trailer
  if (movie.previewUrl) {
    setTimeout(() => {
      const v = body.querySelector('video');
      if (v) v.play().catch(() => {});
    }, 300);
  }
}

let moviesSearchResults = [];
let currentMovieSearchMode = false;

function setupMovieSearch() {
  const input = document.getElementById('movie-search');
  const btn = document.getElementById('movie-search-btn');

  btn.addEventListener('click', () => searchMovies(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMovies(input.value);
  });
}

async function searchMovies(query) {
  if (!query.trim()) return;

  // Cambiar a tab resultados
  document.querySelectorAll('#movie-tabs .chip').forEach(c => c.classList.remove('active'));
  document.querySelector('#movie-tabs .chip[data-tab="results"]').classList.add('active');
  document.getElementById('movies-trending').classList.add('hidden');
  document.getElementById('movies-grid').classList.remove('hidden');

  const container = document.getElementById('movies-grid');
  container.innerHTML = '<div class="loading">Buscando películas...</div>';

  try {
    const data = await jsonpRequest(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&limit=25`);
    moviesSearchResults = (data.results || []).map(movie => ({
      title: movie.trackName,
      artwork: (movie.artworkUrl100 || '').replace('100x100', '400x600'),
      releaseDate: movie.releaseDate || '',
      genres: movie.primaryGenreName || '',
      itunesUrl: movie.trackViewUrl || '',
      artist: movie.artistName || '',
      previewUrl: movie.previewUrl || '',
      description: movie.longDescription || movie.shortDescription || '',
    }));

    currentMovieSearchMode = true;
    renderMovies(container, moviesSearchResults);
  } catch (err) {
    console.error('Error búsqueda películas:', err);
    container.innerHTML = '<div class="loading">Error al buscar. Reintentá.</div>';
  }
}

function setupMovieTabs() {
  document.querySelectorAll('#movie-tabs .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#movie-tabs .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tab = chip.dataset.tab;
      document.getElementById('movies-trending').classList.toggle('hidden', tab !== 'trending');
      document.getElementById('movies-grid').classList.toggle('hidden', tab !== 'results');
      currentMovieSearchMode = tab === 'results';
    });
  });
}

function setupMovieModal() {
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('movie-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    // Pausar video
    const v = document.querySelector('#modal-body video');
    if (v) v.pause();
  });

  document.getElementById('movie-modal').addEventListener('click', (e) => {
    if (e.target.id === 'movie-modal') {
      document.getElementById('movie-modal').classList.add('hidden');
      document.getElementById('modal-body').innerHTML = '';
    }
  });
}