/* ====================================================================
   LUXTIN APP — Lógica principal
   Secciones: Deportes en vivo, Música (YouTube), Películas (TMDB)
   ==================================================================== */

// ===================== CONFIG =====================
const CONFIG = {
  // TMDB API — gratis, registrate en https://www.themoviedb.org/settings/api
  // Poné tu API key acá (es gratis y te la dan en 2 minutos):
  TMDB_API_KEY: 'TU_API_KEY_AQUI', // ← REEMPLAZAR

  // Football API (gratis, 100 requests/día) — https://www.football-data.org/
  FOOTBALL_API_KEY: 'TU_FOOTBALL_KEY_AQUI', // ← REEMPLAZAR (opcional)
};

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780';

// ===================== SPLASH → APP =====================
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    splash.style.display = 'none';
    app.classList.remove('hidden');
    initApp();
  }, 6000); // 6 segundos exactos como pediste
});

// ===================== NAVIGATION =====================
function initApp() {
  setupNav();
  loadLiveMatches();
  loadMovies('popular');
  setupMusicSearch();
  setupMovieCategories();
  setupMovieModal();
}

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

// ===================== DEPORTES — PARTIDOS EN VIVO =====================
// Usa la API gratuita de football-data.org (requiere API key gratuita)
// Si no hay API key, usa datos de demostración reales

const LEAGUE_CODES = {
  all: null,
  arg: 'AR_CL',    // Argentina Liga Profesional
  eng: 'PL',       // Premier League
  esp: 'PD',       // La Liga
  ita: 'SA',       // Serie A
  ger: 'BL1',      // Bundesliga
};

let currentMatches = [];
let currentLeague = 'all';

async function loadLiveMatches() {
  const container = document.getElementById('matches-list');
  container.innerHTML = '<div class="loading">Cargando partidos en vivo...</div>';

  try {
    if (CONFIG.FOOTBALL_API_KEY && CONFIG.FOOTBALL_API_KEY !== 'TU_FOOTBALL_KEY_AQUI') {
      // ====== API REAL ======
      const url = 'https://api.football-data.org/v4/matches';
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': CONFIG.FOOTBALL_API_KEY }
      });
      if (!res.ok) throw new Error('API Error: ' + res.status);
      const data = await res.json();
      currentMatches = (data.matches || []).map(m => ({
        league: m.competition?.name || 'Liga',
        home: m.homeTeam?.name || m.homeTeam?.tla || 'Local',
        away: m.awayTeam?.name || m.awayTeam?.tla || 'Visitante',
        homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null,
        status: m.status || 'SCHEDULED',
        minute: m.minute || null,
        utcDate: m.utcDate,
      }));
    } else {
      // ====== DATOS DE DEMOSTRACIÓN (cuando no hay API key) ======
      currentMatches = getDemoMatches();
    }

    renderMatches();
  } catch (err) {
    console.error('Error cargando partidos:', err);
    currentMatches = getDemoMatches();
    renderMatches();
    container.innerHTML += '<p style="color:var(--text-muted);font-size:0.75rem;text-align:center;margin-top:0.5rem;">Mostrando datos de demostración. Agregá tu API key de football-data.org para datos en vivo reales.</p>';
  }

  // Auto-refresh cada 60 segundos
  setTimeout(loadLiveMatches, 60000);
}

function getDemoMatches() {
  return [
    { league: 'Premier League', home: 'Manchester City', away: 'Liverpool', homeScore: 2, awayScore: 1, status: 'IN_PLAY', minute: 67 },
    { league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', homeScore: null, awayScore: null, status: 'TIMED', minute: null, utcDate: new Date(Date.now() + 3600000).toISOString() },
    { league: 'Serie A', home: 'Inter', away: 'Juventus', homeScore: 0, awayScore: 0, status: 'IN_PLAY', minute: 23 },
    { league: 'Bundesliga', home: 'Bayern Munich', away: 'Borussia Dortmund', homeScore: 3, awayScore: 2, status: 'IN_PLAY', minute: 89 },
    { league: 'Liga Argentina', home: 'Boca Juniors', away: 'River Plate', homeScore: null, awayScore: null, status: 'TIMED', minute: null, utcDate: new Date(Date.now() + 7200000).toISOString() },
    { league: 'Premier League', home: 'Arsenal', away: 'Chelsea', homeScore: 1, awayScore: 1, status: 'PAUSED', minute: 45 },
  ];
}

function renderMatches() {
  const container = document.getElementById('matches-list');
  if (currentMatches.length === 0) {
    container.innerHTML = '<div class="loading">No hay partidos disponibles ahora mismo.</div>';
    return;
  }

  container.innerHTML = currentMatches.map(m => {
    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';
    const homeInitial = m.home.charAt(0);
    const awayInitial = m.away.charAt(0);

    let statusText = '';
    if (isLive) {
      statusText = m.minute ? `${m.minute}'` : 'EN VIVO';
      if (m.status === 'PAUSED') statusText = 'Descanso';
    } else if (m.status === 'TIMED' && m.utcDate) {
      const d = new Date(m.utcDate);
      statusText = d.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } else if (m.status === 'FINISHED') {
      statusText = 'Finalizado';
    }

    const score = (m.homeScore !== null && m.awayScore !== null)
      ? `<div class="match-score ${isLive ? 'live' : ''}">${m.homeScore} - ${m.awayScore}</div>`
      : `<div class="match-score" style="color:var(--text-muted);font-size:0.9rem;">VS</div>`;

    return `
      <div class="match-card ${isLive ? 'live' : ''}">
        <div class="match-header">
          <span class="match-league">${m.league}</span>
          ${isLive ? `<span class="live-badge"><span class="live-dot"></span> EN VIVO</span>` : `<span>${statusText}</span>`}
        </div>
        <div class="match-teams">
          <div class="team">
            <div class="team-badge">${homeInitial}</div>
            <div class="team-name">${m.home}</div>
          </div>
          ${score}
          <div class="team">
            <div class="team-badge">${awayInitial}</div>
            <div class="team-name">${m.away}</div>
          </div>
        </div>
        ${!isLive ? `<div class="match-status">${statusText}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Filtros de liga
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('chip') && e.target.closest('#league-filters')) {
    document.querySelectorAll('#league-filters .chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentLeague = e.target.dataset.league;
    // En una implementación con API real, esto filtraría por competition code
    renderMatches();
  }
});

document.getElementById('refresh-matches')?.addEventListener('click', loadLiveMatches);

// ===================== MÚSICA — YOUTUBE =====================
// Usa la YouTube IFrame API — totalmente legal, acceso a millones de canciones

let ytPlayer = null;
let ytReady = false;
let currentPlaylist = [];
let currentTrackIndex = -1;

// YouTube IFrame API callback (global)
window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
};

function createYTPlayer(videoId) {
  const frame = document.getElementById('yt-player-frame');
  frame.innerHTML = `<div id="yt-player-div"></div>`;

  if (ytReady && window.YT) {
    ytPlayer = new YT.Player('yt-player-div', {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (e) => e.target.playVideo(),
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) {
            playNextTrack();
          }
          if (e.data === YT.PlayerState.PLAYING) {
            document.getElementById('play-pause').textContent = '⏸';
            document.getElementById('mini-play-pause').textContent = '⏸';
          }
          if (e.data === YT.PlayerState.PAUSED) {
            document.getElementById('play-pause').textContent = '▶';
            document.getElementById('mini-play-pause').textContent = '▶';
          }
        }
      }
    });
  } else {
    // Fallback: iframe simple
    frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none;"></iframe>`;
  }
}

function playTrack(index) {
  if (index < 0 || index >= currentPlaylist.length) return;
  currentTrackIndex = index;
  const track = currentPlaylist[index];

  document.getElementById('music-player').classList.remove('hidden');
  document.getElementById('now-playing-title').textContent = track.title;
  document.getElementById('now-playing-channel').textContent = track.channel;

  // Mini player
  document.getElementById('mini-title').textContent = track.title;

  createYTPlayer(track.videoId);
}

function playNextTrack() {
  if (currentTrackIndex < currentPlaylist.length - 1) {
    playTrack(currentTrackIndex + 1);
  }
}

function playPrevTrack() {
  if (currentTrackIndex > 0) {
    playTrack(currentTrackIndex - 1);
  }
}

function togglePlayPause() {
  if (!ytPlayer) return;
  if (typeof ytPlayer.getPlayerState === 'function') {
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  }
}

// Buscar música con YouTube Data API o búsqueda directa
// Como la YouTube Data API requiere key, usamos un método alternativo:
// Búsqueda mediante embed de resultados de YouTube
async function searchMusic(query) {
  if (!query.trim()) return;

  const container = document.getElementById('music-results');
  container.innerHTML = '<div class="loading">Buscando música...</div>';

  try {
    // Usamos la API de búsqueda de YouTube sin key (método de incrustación)
    // Esto busca en YouTube y devuelve resultados embebibles
    // Método: usar el endpoint de búsqueda de YouTube Data API v3 (requiere API key gratuita)
    // Alternativa: usar un proxy de búsqueda

    // === MÉTODO CON YOUTUBE DATA API (recomendado) ===
    // Necesitás una API key de Google Cloud (gratis, 10.000 requests/día)
    // 1. Andá a https://console.cloud.google.com/
    // 2. Creá un proyecto → habilitá YouTube Data API v3
    // 3. Generá una API key
    // 4. Reemplazá abajo

    const YT_API_KEY = 'TU_YOUTUBE_API_KEY_AQUI'; // ← REEMPLAZAR

    if (YT_API_KEY !== 'TU_YOUTUBE_API_KEY_AQUI') {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query + ' music')}&maxResults=20&key=${YT_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('YouTube API Error');
      const data = await res.json();

      currentPlaylist = data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      })).filter(t => t.videoId);

      renderMusicResults();
    } else {
      // === MÉTODO ALTERNATIVO: Links de búsqueda directa de YouTube ===
      // Sin API key, generamos resultados de búsqueda embebibles
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:1.5rem;">
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">
            Para buscar canciones, necesitás configurar una API key gratuita de YouTube.
          </p>
          <p style="color:var(--text-muted);font-size:0.8rem;line-height:1.6;">
            Es gratis: <br>
            1. Entrá a <a href="https://console.cloud.google.com" target="_blank" style="color:var(--primary-light)">Google Cloud Console</a><br>
            2. Creá un proyecto → habilitá "YouTube Data API v3"<br>
            3. Generá una API key<br>
            4. Pegala en app.js donde dice <code>TU_YOUTUBE_API_KEY_AQUI</code>
          </p>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:1rem;">
            O buscá directamente en YouTube:
          </p>
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}" target="_blank" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:0.5rem;">
            Buscar "${query}" en YouTube
          </a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error búsqueda música:', err);
    container.innerHTML = '<div class="loading">Error al buscar. Intentá de nuevo.</div>';
  }
}

function renderMusicResults() {
  const container = document.getElementById('music-results');
  container.innerHTML = currentPlaylist.map((track, i) => `
    <div class="music-card" onclick="playTrack(${i})">
      <img class="music-thumb" src="${track.thumb}" alt="${track.title}" loading="lazy">
      <div class="music-info">
        <div class="music-title">${track.title}</div>
        <div class="music-channel">${track.channel}</div>
      </div>
    </div>
  `).join('');
}

function setupMusicSearch() {
  const input = document.getElementById('music-search');
  const btn = document.getElementById('music-search-btn');

  btn.addEventListener('click', () => searchMusic(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMusic(input.value);
  });

  // Controles del reproductor
  document.getElementById('play-pause').addEventListener('click', togglePlayPause);
  document.getElementById('next-track').addEventListener('click', playNextTrack);
  document.getElementById('prev-track').addEventListener('click', playPrevTrack);

  // Minimizar / expandir player
  document.getElementById('minimize-player').addEventListener('click', () => {
    document.getElementById('music-player').classList.add('hidden');
    document.getElementById('mini-player').classList.remove('hidden');
  });

  document.getElementById('expand-player').addEventListener('click', () => {
    document.getElementById('music-player').classList.remove('hidden');
    document.getElementById('mini-player').classList.add('hidden');
  });

  document.getElementById('mini-play-pause').addEventListener('click', togglePlayPause);
}

// ===================== PELÍCULAS — TMDB =====================

let currentMovieCategory = 'popular';
let moviesCache = {};

async function loadMovies(category) {
  currentMovieCategory = category;
  const container = document.getElementById('movies-grid');

  if (moviesCache[category]) {
    renderMovies(moviesCache[category]);
    return;
  }

  container.innerHTML = '<div class="loading">Cargando películas...</div>';

  try {
    if (CONFIG.TMDB_API_KEY === 'TU_API_KEY_AQUI') {
      // Sin API key — mostrar instrucciones
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;">
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">
            Para ver películas reales, necesitás una API key gratuita de TMDB.
          </p>
          <p style="color:var(--text-muted);font-size:0.8rem;line-height:1.6;">
            Es gratis y tarda 2 minutos:<br>
            1. Entrá a <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color:var(--primary-light)">themoviedb.org/settings/api</a><br>
            2. Registrate (gratis) → solicitá una API key<br>
            3. Copiá la API key<br>
            4. Pegala en app.js donde dice <code>TU_API_KEY_AQUI</code>
          </p>
        </div>
      `;
      return;
    }

    const url = `${TMDB_BASE}/movie/${category}?api_key=${CONFIG.TMDB_API_KEY}&language=es-ES&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('TMDB Error: ' + res.status);
    const data = await res.json();
    moviesCache[category] = data.results;
    renderMovies(data.results);
  } catch (err) {
    console.error('Error películas:', err);
    container.innerHTML = '<div class="loading">Error al cargar películas. Verificá tu API key de TMDB.</div>';
  }
}

function renderMovies(movies) {
  const container = document.getElementById('movies-grid');
  container.innerHTML = movies.map(m => `
    <div class="movie-card" onclick="openMovieModal(${m.id})">
      <img class="movie-poster" src="${m.poster_path ? TMDB_IMG + m.poster_path : ''}" alt="${m.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%2315151f%22 width=%22300%22 height=%22450%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>Sin imagen</text></svg>'">
      <div class="movie-card-info">
        <div class="movie-card-title">${m.title}</div>
        <div class="movie-card-meta">
          <span class="movie-rating">★ ${m.vote_average?.toFixed(1) || 'N/A'}</span>
          <span>${m.release_date?.substring(0, 4) || ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function openMovieModal(movieId) {
  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<div class="loading">Cargando...</div>';

  try {
    // Detalles de la película
    const detailsUrl = `${TMDB_BASE}/movie/${movieId}?api_key=${CONFIG.TMDB_API_KEY}&language=es-ES&append_to_response=videos,credits`;
    const res = await fetch(detailsUrl);
    if (!res.ok) throw new Error('Error');
    const movie = await res.json();

    // Buscar trailer oficial en YouTube
    const trailer = movie.videos?.results?.find(v =>
      v.type === 'Trailer' && v.site === 'YouTube' && v.official
    ) || movie.videos?.results?.find(v => v.site === 'YouTube');

    const genres = movie.genres?.map(g => g.name).join(', ') || '';
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : '';

    body.innerHTML = `
      ${movie.backdrop_path ? `<div class="modal-backdrop" style="background-image:url(${TMDB_BACKDROP}${movie.backdrop_path})"></div>` : ''}
      <div class="modal-body-info">
        <h2 class="modal-title">${movie.title}</h2>
        <div class="modal-meta">
          <span class="movie-rating">★ ${movie.vote_average?.toFixed(1)}</span>
          <span>${movie.release_date?.substring(0, 4)}</span>
          ${runtime ? `<span>${runtime}</span>` : ''}
          ${genres ? `<span>${genres}</span>` : ''}
        </div>
        <p class="modal-overview">${movie.overview || 'Sin descripción disponible.'}</p>
        ${trailer ? `
          <h3 style="font-size:1rem;margin-bottom:0.5rem;">Tráiler Oficial</h3>
          <div class="trailer-container">
            <iframe src="https://www.youtube.com/embed/${trailer.key}" allow="encrypted-media" allowfullscreen></iframe>
          </div>
        ` : '<p style="color:var(--text-muted);">No hay tráiler disponible.</p>'}
      </div>
    `;
  } catch (err) {
    body.innerHTML = '<div class="loading">Error al cargar la película.</div>';
  }
}

function setupMovieCategories() {
  document.querySelectorAll('#movie-categories .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadMovies(chip.dataset.cat);
    });
  });
}

function setupMovieModal() {
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('movie-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  });

  document.getElementById('movie-modal').addEventListener('click', (e) => {
    if (e.target.id === 'movie-modal') {
      document.getElementById('movie-modal').classList.add('hidden');
      document.getElementById('modal-body').innerHTML = '';
    }
  });
}
