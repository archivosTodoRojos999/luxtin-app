/* ====================================================================

// ===================== SISTEMA DE AUTENTICACIÓN LUXTIN TV =====================
const AUTH_API = 'https://6a7d58526b15a2d266e69ab4.backend.base44.com/api/functions/luxtinAuth';
let currentUser = null;
let deviceMode = localStorage.getItem('luxtin-device') || 'mobile';

// Inicializar device mode
document.documentElement.setAttribute('data-device', deviceMode);
function setDeviceMode(mode) {
  deviceMode = mode;
  localStorage.setItem('luxtin-device', mode);
  document.documentElement.setAttribute('data-device', mode);
  const btnM = document.getElementById('btn-mobile');
  const btnT = document.getElementById('btn-tv');
  if (btnM && btnT) {
    if (mode === 'mobile') {
      btnM.style.background = 'rgba(201,168,76,0.15)';
      btnM.style.color = '#c9a84c';
      btnT.style.background = 'transparent';
      btnT.style.color = '#666';
    } else {
      btnT.style.background = 'rgba(201,168,76,0.15)';
      btnT.style.color = '#c9a84c';
      btnM.style.background = 'transparent';
      btnM.style.color = '#666';
    }
  }
}

// Verificar sesión al cargar
async function checkSession() {
  const saved = localStorage.getItem('luxtin-user');
  if (!saved) {
    showLoginScreen();
    return false;
  }
  
  try {
    const user = JSON.parse(saved);
    // Verificar que la sesión sigue válida
    const res = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', email: user.email })
    });
    const data = await res.json();
    
    if (data.success && !data.expired) {
      currentUser = data.user;
      showApp(data.user);
      return true;
    } else if (data.expired) {
      showPaymentScreen();
      return false;
    } else {
      localStorage.removeItem('luxtin-user');
      showLoginScreen();
      return false;
    }
  } catch (e) {
    // Si no hay conexión, intentar usar sesión guardada
    const savedUser = JSON.parse(saved);
    currentUser = savedUser;
    showApp(savedUser);
    return true;
  }
}

function showLoginScreen() {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const login = document.getElementById('login-screen');
  const payment = document.getElementById('payment-screen');
  if (splash) splash.style.display = 'none';
  if (app) app.classList.add('hidden');
  if (payment) payment.style.display = 'none';
  if (login) login.style.display = 'flex';
  // Activar música de bienvenida
  startWelcomeMusic();
}

function showPaymentScreen() {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const login = document.getElementById('login-screen');
  const payment = document.getElementById('payment-screen');
  if (splash) splash.style.display = 'none';
  if (app) app.classList.add('hidden');
  if (login) login.style.display = 'none';
  if (payment) payment.style.display = 'flex';
}

function showApp(user) {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const login = document.getElementById('login-screen');
  const payment = document.getElementById('payment-screen');
  if (splash) splash.style.display = 'none';
  if (login) login.style.display = 'none';
  if (payment) payment.style.display = 'none';
  if (app) app.classList.remove('hidden');
  // Detener música de bienvenida
  stopWelcomeMusic();
  
  // Mostrar info de usuario
  const badge = document.getElementById('user-plan-badge');
  const days = document.getElementById('user-days');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (badge && user.plan) {
    const planNames = { trial: 'GRATIS', basic: 'Básico', standard: 'Estándar', premium: 'Premium', admin: 'Admin' };
    badge.textContent = planNames[user.plan] || user.plan;
    badge.style.display = 'block';
  }
  if (days && user.daysLeft !== undefined) {
    days.textContent = user.daysLeft === 999 ? '∞ Ilimitado' : user.daysLeft + ' días';
    days.style.display = 'block';
  }
  if (logoutBtn) logoutBtn.style.display = 'block';
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const okEl = document.getElementById('login-success');
  if (errEl) errEl.textContent = '';
  if (okEl) okEl.textContent = 'Verificando...';
  
  try {
    const res = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem('luxtin-user', JSON.stringify(data.user));
      currentUser = data.user;
      if (okEl) okEl.textContent = '¡Bienvenido!';
      setTimeout(() => showApp(data.user), 500);
    } else {
      if (okEl) okEl.textContent = '';
      if (errEl) errEl.textContent = data.error || 'Error al iniciar sesión';
      if (data.expired) {
        setTimeout(() => showPaymentScreen(), 1500);
      }
    }
  } catch (e) {
    if (okEl) okEl.textContent = '';
    if (errEl) errEl.textContent = 'Error de conexión. Revisá tu internet.';
  }
}

async function createTrial() {
  const email = document.getElementById('login-email').value;
  const errEl = document.getElementById('login-error');
  const okEl = document.getElementById('login-success');
  
  if (!email || !email.includes('@')) {
    if (errEl) errEl.textContent = 'Ingresá tu correo Gmail primero';
    return;
  }
  
  if (errEl) errEl.textContent = '';
  if (okEl) okEl.textContent = 'Creando cuenta...';
  
  try {
    const res = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trial', email })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem('luxtin-user', JSON.stringify(data.user));
      currentUser = data.user;
      if (okEl) okEl.textContent = data.message;
      // Auto-llenar la clave
      document.getElementById('login-password').value = data.password;
      setTimeout(() => showApp(data.user), 2000);
    } else {
      if (okEl) okEl.textContent = '';
      if (errEl) errEl.textContent = data.error || 'Error al crear cuenta';
    }
  } catch (e) {
    if (okEl) okEl.textContent = '';
    if (errEl) errEl.textContent = 'Error de conexión';
  }
}

function logout() {
  localStorage.removeItem('luxtin-user');
  currentUser = null;
  location.reload();
}

// ===================== MÚSICA DE BIENVENIDA =====================
const WELCOME_MUSIC_VIDEO_ID = 'uE-TADy-oN0'; // Upbeat happy background music (royalty-free)
let welcomeMusicPlaying = false;

function startWelcomeMusic() {
  const container = document.getElementById('welcome-music-container');
  const frame = document.getElementById('welcome-music-frame');
  const activateBtn = document.getElementById('music-activate');
  if (!frame || !container) return;
  
  // Cargar el video de música
  frame.src = `https://www.youtube.com/embed/${WELCOME_MUSIC_VIDEO_ID}?autoplay=1&controls=0&showinfo=0&modestbranding=1&loop=1&playlist=${WELCOME_MUSIC_VIDEO_ID}&rel=0`;
  frame.style.display = 'block';
  welcomeMusicPlaying = true;
  
  // Mostrar botón de activación por si el navegador bloquea el autoplay
  if (activateBtn) {
    activateBtn.style.display = 'block';
    // Ocultar después de 5 segundos
    setTimeout(() => {
      if (welcomeMusicPlaying && activateBtn) {
        activateBtn.style.display = 'none';
      }
    }, 8000);
  }
  
  // Click en cualquier parte del login screen también activa la música
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.addEventListener('click', function onceClick() {
      if (frame && welcomeMusicPlaying) {
        // Re-intentar autoplay
        frame.src = frame.src;
      }
      loginScreen.removeEventListener('click', onceClick);
    }, { once: true });
  }
}

function stopWelcomeMusic() {
  const frame = document.getElementById('welcome-music-frame');
  const activateBtn = document.getElementById('music-activate');
  if (frame) {
    frame.src = '';
    frame.style.display = 'none';
  }
  if (activateBtn) {
    activateBtn.style.display = 'none';
  }
  welcomeMusicPlaying = false;
}

// ===================== FIN AUTENTICACIÓN =====================

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
    // NO mostrar la app todavía — primero verificar sesión
    checkSession().then(loggedIn => {
      if (loggedIn) {
        document.getElementById('app').classList.remove('hidden');
        initApp();
      }
      // Si no está logueado, checkSession ya muestra el login screen
      // y la música de bienvenida
    });
  }, 6000);
});

// ===================== INIT =====================
function initApp() {
  setupNav();
  loadAllSports();
  loadMusicByGenre('trending');
  loadMoviesByCategory('todas');
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
    const ytQuery = encodeURIComponent(`${m.home} vs ${m.away} en vivo`);
    const watchBtn = `<a href="https://www.youtube.com/results?search_query=${ytQuery}" target="_blank" style="display:inline-block;margin-top:0.5rem;padding:0.3rem 0.8rem;background:var(--accent);color:#fff;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:700;text-decoration:none;">▶ Ver en YouTube</a>`;
    return `<div class="match-card ${isLive ? 'live' : ''}"><div class="match-header"><span class="match-league">${m.league}</span>${badge}</div><div class="match-teams"><div class="team">${homeLogo}<div class="team-name">${m.home}</div></div>${score}<div class="team">${awayLogo}<div class="team-name">${m.away}</div></div></div>${watchBtn}</div>`;
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

// Buscar canción en YouTube vía backend function y reproducir completa
async function playMusic(i) {
  if (i < 0 || i >= musicPlaylist.length) return;
  currentMusicIndex = i;
  const t = musicPlaylist[i];
  document.getElementById('music-player').classList.remove('hidden');
  document.getElementById('now-playing-title').textContent = t.title;
  document.getElementById('now-playing-channel').textContent = t.artist;
  document.getElementById('player-artwork').src = t.artwork;
  document.getElementById('mini-title').textContent = `${t.title} — ${t.artist}`;

  const ytPlayer = document.getElementById('music-youtube-player');
  if (ytPlayer) {
    // Mostrar estado de carga
    ytPlayer.src = '';
    document.getElementById('now-playing-title').textContent = t.title + ' (buscando...)';

    try {
      const resp = await fetch('https://arlow-66e69ab4.base44.app/functions/searchYoutube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: t.title + ' ' + t.artist })
      });
      const data = await resp.json();
      if (data.videoId) {
        ytPlayer.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&rel=0`;
        document.getElementById('now-playing-title').textContent = t.title;
      } else {
        // Fallback: abrir búsqueda en YouTube
        ytPlayer.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(t.title + ' ' + t.artist)}&autoplay=1`;
        document.getElementById('now-playing-title').textContent = t.title;
      }
    } catch (e) {
      // Si falla el backend, usar búsqueda directa de YouTube
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(t.title + ' ' + t.artist + ' official audio')}`, '_blank');
      document.getElementById('now-playing-title').textContent = t.title;
    }
  }
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
  if (cat === 'todas') {
    moviesList = MOVIES_DB;
  } else {
    moviesList = MOVIES_DB.filter(m => m.c === cat);
  }
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

// ===================== DISNEY JUNIOR — EPISODIOS EN ESPAÑOL (Disney Jr. Latinoamérica) =====================
const DISNEY_EPISODES = [
  { title: 'El cumpleaños de Goofy en el espacio | EPISODIO COMPLETO | Mickey Mouse Funhouse', videoId: 'cRu_UNhn2gc', thumb: 'https://i.ytimg.com/vi/cRu_UNhn2gc/hqdefault.jpg' },
  { title: 'El hechizo de la princesa Ivy (Segunda Parte) | Episodio Completo | Princesita Sofia', videoId: 'A994AvMRZMQ', thumb: 'https://i.ytimg.com/vi/A994AvMRZMQ/hqdefault.jpg' },
  { title: 'La Casa de Mickey Mouse | Episodio Completo | La fiesta del té de Minnie Marciana', videoId: 'Z0hOfzpynsE', thumb: 'https://i.ytimg.com/vi/Z0hOfzpynsE/hqdefault.jpg' },
  { title: 'Aventura en la Antártida | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'rfjIer3FbCU', thumb: 'https://i.ytimg.com/vi/rfjIer3FbCU/hqdefault.jpg' },
  { title: 'Las cuevas de Wakanda | Episodio completo | Iron Man y sus increíbles amigos', videoId: 'vwfVq2z2b7A', thumb: 'https://i.ytimg.com/vi/vwfVq2z2b7A/hqdefault.jpg' },
  { title: 'El hechizo de la princesa Ivy (Primera Parte) | Episodio Completo | Princesita Sofia', videoId: 'hC0LEbqOXOE', thumb: 'https://i.ytimg.com/vi/hC0LEbqOXOE/hqdefault.jpg' },
  { title: 'Presentando a los Iron Friends gigantes | Episodio completo | Iron Man y sus increíbles amigos', videoId: 'D3bmEe1A4kc', thumb: 'https://i.ytimg.com/vi/D3bmEe1A4kc/hqdefault.jpg' },
  { title: 'La escamosa historia de Mickey | Episodio Completo | La Casa de Mickey Mouse', videoId: 'VtRgDyT_TCw', thumb: 'https://i.ytimg.com/vi/VtRgDyT_TCw/hqdefault.jpg' },
  { title: 'El vecindario amistoso | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'iIs1Q0jCOnk', thumb: 'https://i.ytimg.com/vi/iIs1Q0jCOnk/hqdefault.jpg' },
  { title: 'Magideslumbrante / Muestra tu hechizo | Episodio Completo | Princesita Sofía: Magia Real', videoId: 'hy-_ROrNRmI', thumb: 'https://i.ytimg.com/vi/hy-_ROrNRmI/hqdefault.jpg' },
  { title: 'Bienvenidos al Colegium Magicum | Episodio Completo | Princesita Sofía: Magia Real', videoId: 'VSZ_oVxdhpw', thumb: 'https://i.ytimg.com/vi/VSZ_oVxdhpw/hqdefault.jpg' },
  { title: 'La llave esmeralda | Episodio Completo | Princesita Sofia', videoId: 'mwr1uBUEYJI', thumb: 'https://i.ytimg.com/vi/mwr1uBUEYJI/hqdefault.jpg' },
  { title: 'La Casa de Mickey Mouse | Episodio Completo | El deportetón de Mickey', videoId: 'rcqU4Ls13qA', thumb: 'https://i.ytimg.com/vi/rcqU4Ls13qA/hqdefault.jpg' },
  { title: 'El escondite / Ballena de un tiempo | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'ivgjjkpYyto', thumb: 'https://i.ytimg.com/vi/ivgjjkpYyto/hqdefault.jpg' },
  { title: 'Los Supergatitos | Episodio Completo | Los Súper Ayudantes / El cerdito bailarín', videoId: 'QWAwr5fSkjQ', thumb: 'https://i.ytimg.com/vi/QWAwr5fSkjQ/hqdefault.jpg' },
  { title: 'Princesas al rescate | Princesita Sofia | Episodio Completo', videoId: 'TSBH3RVpips', thumb: 'https://i.ytimg.com/vi/TSBH3RVpips/hqdefault.jpg' },
  { title: 'Superscooter / El lanzatelarañas perdido | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'x4xicfdHvg0', thumb: 'https://i.ytimg.com/vi/x4xicfdHvg0/hqdefault.jpg' },
  { title: 'Lo Mejor de Pluto | Episodio Completo | La Casa de Mickey Mouse', videoId: 'k_My-PbOTzI', thumb: 'https://i.ytimg.com/vi/k_My-PbOTzI/hqdefault.jpg' },
  { title: 'La Mega Rata / El Robo a su Nueva Amiga | Supergatitos | Episodio Completo', videoId: 'RPJo9ynkZoE', thumb: 'https://i.ytimg.com/vi/RPJo9ynkZoE/hqdefault.jpg' },
  { title: 'Un Palacio en el Agua (segunda parte) | Princesita Sofia | Episodio Completo', videoId: 'cAHfTuZi66A', thumb: 'https://i.ytimg.com/vi/cAHfTuZi66A/hqdefault.jpg' },
  { title: 'Miedo a los fuegos artificiales / Árboles de queso | Supergatitos | Episodio Completo', videoId: '1Fil9GpMZtA', thumb: 'https://i.ytimg.com/vi/1Fil9GpMZtA/hqdefault.jpg' },
  { title: 'Energía limpia / Doc Ock y los Rockobots | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: '7lhoRnUOgMM', thumb: 'https://i.ytimg.com/vi/7lhoRnUOgMM/hqdefault.jpg' },
  { title: 'Minniecienta | Episodio Completo | La Casa de Mickey Mouse', videoId: 'hKoibVnZ-kA', thumb: 'https://i.ytimg.com/vi/hKoibVnZ-kA/hqdefault.jpg' },
  { title: 'Un palacio en el agua | Princesita Sofia | Episodio Completo', videoId: '3caKAjK5-8s', thumb: 'https://i.ytimg.com/vi/3caKAjK5-8s/hqdefault.jpg' },
  { title: 'Los Supergatitos y el Robo de San Valentín / Los Supergatitos y el Regalo Dorado | Episodio Completo', videoId: 'Usi_d4ngwJ0', thumb: 'https://i.ytimg.com/vi/Usi_d4ngwJ0/hqdefault.jpg' },
  { title: 'Trampa de Arena / Exceso de diversión | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'uykHSo3F03w', thumb: 'https://i.ytimg.com/vi/uykHSo3F03w/hqdefault.jpg' },
  { title: 'Una Sorpresa para Minnie | Episodio Completo | La Casa de Mickey Mouse', videoId: '-PTDGSRjbts', thumb: 'https://i.ytimg.com/vi/-PTDGSRjbts/hqdefault.jpg' },
  { title: 'Supergatitos | Episodio Completo | La gran travesura con hilo / Ve por la bota', videoId: 'bS03dVlGvkQ', thumb: 'https://i.ytimg.com/vi/bS03dVlGvkQ/hqdefault.jpg' },
  { title: 'Es el equipo Spidey / Situación pegajosa | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'VWyXNzdkljQ', thumb: 'https://i.ytimg.com/vi/VWyXNzdkljQ/hqdefault.jpg' },
  { title: 'Tango para Dos | Princesita Sofia | Episodio Completo', videoId: '6r-w_ZNaVfw', thumb: 'https://i.ytimg.com/vi/6r-w_ZNaVfw/hqdefault.jpg' },
  { title: '¡La Fiesta de Pijamas de Minnie! | Episodio Completo | La Casa de Mickey Mouse', videoId: '0tGF5Avn-XA', thumb: 'https://i.ytimg.com/vi/0tGF5Avn-XA/hqdefault.jpg' },
  { title: '¡Los Supergatitos y la Feliz Navidad! | Episodio Completo', videoId: 'WsVO0QROA-w', thumb: 'https://i.ytimg.com/vi/WsVO0QROA-w/hqdefault.jpg' },
  { title: 'La Gran Pijamada | Princesita Sofia | Episodio Completo', videoId: '_UKkNjAFkfE', thumb: 'https://i.ytimg.com/vi/_UKkNjAFkfE/hqdefault.jpg' },
  { title: '¡La Granja de Diversión de Mickey! | La Casa de Mickey Mouse | Episodio Completo', videoId: 'jTRzT7lubYA', thumb: 'https://i.ytimg.com/vi/jTRzT7lubYA/hqdefault.jpg' },
  { title: 'Igual que los Príncipes | Princesita Sofía | Episodio Completo', videoId: 'Cpb5XxBoNdE', thumb: 'https://i.ytimg.com/vi/Cpb5XxBoNdE/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodio Completo: Truco o TRACE-E / ¡Cohete Rhino!', videoId: 'COMgtaS0XKo', thumb: 'https://i.ytimg.com/vi/COMgtaS0XKo/hqdefault.jpg' },
  { title: 'Los Supergatitos y la Gata de Miaulowin | Supergatitos | Episodio Completo', videoId: 'ijdQg_mco6c', thumb: 'https://i.ytimg.com/vi/ijdQg_mco6c/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodio Completo: Día de la Madre / La casa no tan Divertida', videoId: 'U5cWs3lbXvU', thumb: 'https://i.ytimg.com/vi/U5cWs3lbXvU/hqdefault.jpg' },
  { title: '¡El Baile de Disfraces de Minnie! | La Casa de Mickey Mouse | Episodio Completo', videoId: 'L_vBkAyCS4U', thumb: 'https://i.ytimg.com/vi/L_vBkAyCS4U/hqdefault.jpg' },
  { title: '¡Celebra la Primavera con Mickey! | La Casa de Mickey Mouse | Episodio Completo', videoId: 'i-DVaKrbKXA', thumb: 'https://i.ytimg.com/vi/i-DVaKrbKXA/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodio Completo | Lagarto gigante / Salvajes Amigos de Rhino', videoId: 'Y1lm8WS_naM', thumb: 'https://i.ytimg.com/vi/Y1lm8WS_naM/hqdefault.jpg' },
  { title: 'Iron Man y sus Increíbles Amigos | Episodio Completo | Grandes Expo-tativas / Botas Saltarinas', videoId: 'jBEk2IND2Cw', thumb: 'https://i.ytimg.com/vi/jBEk2IND2Cw/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodio Completo | Viaje a Isla Spider / Superhéroe mojado', videoId: 'JgvKAfqR2Go', thumb: 'https://i.ytimg.com/vi/JgvKAfqR2Go/hqdefault.jpg' },
  { title: 'Iron Man y sus Increíbles Amigos | Episodio Completo', videoId: 'CNL3nG-dmWc', thumb: 'https://i.ytimg.com/vi/CNL3nG-dmWc/hqdefault.jpg' },
  { title: 'Episodio Completo de la Nueva Serie La Casa de Mickey Mouse+ | ¡El Nuevo Gallinero de Clarabella!', videoId: '6JXbDp9WT9U', thumb: 'https://i.ytimg.com/vi/6JXbDp9WT9U/hqdefault.jpg' },
  { title: '¡El Nuevo Ayudante de Mickey! | Episodio Completo | La Casa de Mickey Mouse+ | ¡Nueva Serie!', videoId: '1GKrHwFOla4', thumb: 'https://i.ytimg.com/vi/1GKrHwFOla4/hqdefault.jpg' },
  { title: '¡Iron Man y el Equipo Spidey en el Espacio! | Episodio Completo | Spidey y sus Sorprendentes Amigos', videoId: 'mFpqEErX0lk', thumb: 'https://i.ytimg.com/vi/mFpqEErX0lk/hqdefault.jpg' },
  { title: '¡Los Patos de Donald! | La Casa de Mickey Mouse | Episodio Completo', videoId: '0uZes-8rFRk', thumb: 'https://i.ytimg.com/vi/0uZes-8rFRk/hqdefault.jpg' },
  { title: '¡Juega a los Super-héroes con Mickey y sus Amigos! | Compilado 20 minutos | Mickey Mouse Funhouse', videoId: 'x7ylmOa8UNQ', thumb: 'https://i.ytimg.com/vi/x7ylmOa8UNQ/hqdefault.jpg' },
  { title: 'El Super Deseo de Goofy | La Casa de Mickey Mouse | Episodio Completo', videoId: 'ofodxtNDKg4', thumb: 'https://i.ytimg.com/vi/ofodxtNDKg4/hqdefault.jpg' },
  { title: 'La Gran Sorpresa de Mickey | La Casa de Mickey Mouse | Episodio Completo', videoId: 'UBxqzZPA8SA', thumb: 'https://i.ytimg.com/vi/UBxqzZPA8SA/hqdefault.jpg' },
  { title: 'El Equipo de la Amistad | La Casa de Mickey Mouse | Episodio Completo', videoId: 'ZSBoiKFE44M', thumb: 'https://i.ytimg.com/vi/ZSBoiKFE44M/hqdefault.jpg' },
  { title: '¡Mickey Salva a Santa Claus! | La Casa de Mickey Mouse | Episodio Completo', videoId: '3-SjfhNmo30', thumb: 'https://i.ytimg.com/vi/3-SjfhNmo30/hqdefault.jpg' },
  { title: 'Mickey y Pluto Cuidan a Bella | La Casa de Mickey Mouse | Episodio Completo', videoId: 'tVD3OVGkXq4', thumb: 'https://i.ytimg.com/vi/tVD3OVGkXq4/hqdefault.jpg' },
  { title: 'El Feliz Mousekedía de Mickey | La Casa de Mickey Mouse | Episodio Completo', videoId: '6xSNdDsvwC4', thumb: 'https://i.ytimg.com/vi/6xSNdDsvwC4/hqdefault.jpg' },
  { title: 'La Gigantesca Aventura de Goofy | La Casa de Mickey Mouse | Episodio Completo', videoId: 'YCimIxzUHsk', thumb: 'https://i.ytimg.com/vi/YCimIxzUHsk/hqdefault.jpg' },
  { title: '¡Vamos a la Fiesta! | La Casa de Mickey Mouse | Episodio Completo', videoId: 'GATtKNKup4M', thumb: 'https://i.ytimg.com/vi/GATtKNKup4M/hqdefault.jpg' },
  { title: 'Mickey Mouse Funhouse | Episodio Completo | Día de Nieve en el Verano / ¡Sunny el Muñeco de Nieve!', videoId: 'uapH4zJRUuE', thumb: 'https://i.ytimg.com/vi/uapH4zJRUuE/hqdefault.jpg' },
  { title: 'El Safari en la Jungla de Mickey y Minnie | La Casa de Mickey Mouse | Episodio Completo', videoId: 'y0yl3ERU03A', thumb: 'https://i.ytimg.com/vi/y0yl3ERU03A/hqdefault.jpg' },
  { title: 'La Entrega Especial para Donald | La casa de Mickey Mouse | Episodio Completo', videoId: '7vjdfk2xO8I', thumb: 'https://i.ytimg.com/vi/7vjdfk2xO8I/hqdefault.jpg' },
  { title: 'Mickey Mouse Funhouse | Episodio Completo | Agua Cristalina / La Gran Pijamada en Funhouse', videoId: 'npqbyQX93BA', thumb: 'https://i.ytimg.com/vi/npqbyQX93BA/hqdefault.jpg' },
  { title: 'La Boutique de Moños de Minnie | La Casa de Mickey Mouse | Episodio Completo Español Latino', videoId: '8xLYZm2nTe4', thumb: 'https://i.ytimg.com/vi/8xLYZm2nTe4/hqdefault.jpg' },
  { title: 'Mickey Mouse Funhouse | Episodio Completo | Abrazos No / ¿Dónde Está Funny?', videoId: '1GJH0sxWW_U', thumb: 'https://i.ytimg.com/vi/1GJH0sxWW_U/hqdefault.jpg' },
  { title: 'Mickey Mouse Funhouse | Episodio Completo | La Nueva Perrita de Minnie', videoId: 'tiaKCFMy3kc', thumb: 'https://i.ytimg.com/vi/tiaKCFMy3kc/hqdefault.jpg' },
  { title: 'Hipo | Cars Toon', videoId: 'ANRBY_BWmB0', thumb: 'https://i.ytimg.com/vi/ANRBY_BWmB0/hqdefault.jpg' },
  { title: 'Ralph y Vanellope en su Gracioso Encuentro con Ebay', videoId: 'aMPqCx2Y7KI', thumb: 'https://i.ytimg.com/vi/aMPqCx2Y7KI/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Sorpresa de Fiesta Sorpresa!', videoId: 'uHFEGjeNeno', thumb: 'https://i.ytimg.com/vi/uHFEGjeNeno/hqdefault.jpg' },
  { title: 'Jugando con Winnie the Pooh | Corto | Tigger quiere jugar todo el día', videoId: 'ZWzsrgQwubU', thumb: 'https://i.ytimg.com/vi/ZWzsrgQwubU/hqdefault.jpg' },
  { title: '¡Queso! | Supergatitos | Video musical 🎶 | Disney', videoId: '5ETXK1T6svw', thumb: 'https://i.ytimg.com/vi/5ETXK1T6svw/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | El día de la fotografía 🎀', videoId: 'r5QN2H8Aths', thumb: 'https://i.ytimg.com/vi/r5QN2H8Aths/hqdefault.jpg' },
  { title: 'Error en el Sistema | Spidey y sus Sorprendentes Amigos | Clip', videoId: 'lXM0NK1xOFE', thumb: 'https://i.ytimg.com/vi/lXM0NK1xOFE/hqdefault.jpg' },
  { title: '¡Rapunzel y Flynn se Casan!', videoId: 'I-EVQldxFsc', thumb: 'https://i.ytimg.com/vi/I-EVQldxFsc/hqdefault.jpg' },
  { title: 'Conoce a los Supergatitos', videoId: 'wFRlqH42v5Y', thumb: 'https://i.ytimg.com/vi/wFRlqH42v5Y/hqdefault.jpg' },
  { title: 'Las mejores aventuras de Mate | Pixar Cars', videoId: '94zl6Teamg8', thumb: 'https://i.ytimg.com/vi/94zl6Teamg8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Atraparlo | Video Musical', videoId: 'MeOyxoxpoVs', thumb: 'https://i.ytimg.com/vi/MeOyxoxpoVs/hqdefault.jpg' },
  { title: 'El Comienzo de Rapunzel y sus Poderes ✨', videoId: 'fKzXo4HmZG8', thumb: 'https://i.ytimg.com/vi/fKzXo4HmZG8/hqdefault.jpg' },
  { title: 'Un año lleno de nuevos deseos | La casa de Mickey Mouse | Compilado', videoId: 'Sc98_TvWiXY', thumb: 'https://i.ytimg.com/vi/Sc98_TvWiXY/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Twist-E', videoId: 'sBOq8l-eUy8', thumb: 'https://i.ytimg.com/vi/sBOq8l-eUy8/hqdefault.jpg' },
  { title: 'Conoce a Symbie | Corto | Conoce a Spidey y sus sorprendentes amigos', videoId: 'VqaHrf2TRsk', thumb: 'https://i.ytimg.com/vi/VqaHrf2TRsk/hqdefault.jpg' },
  { title: '¡Canta y Celebra la Navidad Junto a Elsa, Anna y Olaf!', videoId: 'nViR-R_43N0', thumb: 'https://i.ytimg.com/vi/nViR-R_43N0/hqdefault.jpg' },
  { title: 'Tiana Aprende a Cocinar con su Padre', videoId: 'WtDkXsko-Iw', thumb: 'https://i.ytimg.com/vi/WtDkXsko-Iw/hqdefault.jpg' },
  { title: 'El Mundo de Aurora | Disney Princesa', videoId: 'eLRNQe0Gjm4', thumb: 'https://i.ytimg.com/vi/eLRNQe0Gjm4/hqdefault.jpg' },
  { title: '¡Las Mejores Aventuras de Spidey y Iron Man! | Compilado', videoId: 'w6q1qIjSg0w', thumb: 'https://i.ytimg.com/vi/w6q1qIjSg0w/hqdefault.jpg' },
  { title: 'Desfile de Mascotas | La Casa de Mickey Mouse', videoId: '8OrzceRIx48', thumb: 'https://i.ytimg.com/vi/8OrzceRIx48/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodios Completos | Crezcan telarañas + Rio en el espacio', videoId: 'eNwvM1Zg1oE', thumb: 'https://i.ytimg.com/vi/eNwvM1Zg1oE/hqdefault.jpg' },
  { title: '¡Es el Día de la Coronación en Arendelle!', videoId: 'cZC4fPN2ENg', thumb: 'https://i.ytimg.com/vi/cZC4fPN2ENg/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Canción de Apertura | Video Musical', videoId: 'R_FQq5WSPto', thumb: 'https://i.ytimg.com/vi/R_FQq5WSPto/hqdefault.jpg' },
  { title: 'Moana bebé conoce el óceano | Disney Princesa', videoId: 'B3Gcc8kcSzc', thumb: 'https://i.ytimg.com/vi/B3Gcc8kcSzc/hqdefault.jpg' },
  { title: 'Los Momentos Motivadores de Rayo McQueen | Pixar Cars', videoId: 'xIP2juml5Z8', thumb: 'https://i.ytimg.com/vi/xIP2juml5Z8/hqdefault.jpg' },
  { title: 'Conoce a Piglet | Corto | Winnie Pooh y Yo', videoId: '0bkmxmEuS7k', thumb: 'https://i.ytimg.com/vi/0bkmxmEuS7k/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Electro Va a Brillar', videoId: 'ksG2umzc9NM', thumb: 'https://i.ytimg.com/vi/ksG2umzc9NM/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | El Día de Salida de Bootsie', videoId: 'mh3BrpimXKk', thumb: 'https://i.ytimg.com/vi/mh3BrpimXKk/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Zim Zan Bazum | Video Musical', videoId: 'k2a7qwrPrt4', thumb: 'https://i.ytimg.com/vi/k2a7qwrPrt4/hqdefault.jpg' },
  { title: 'Star Wars: Aventuras de Jóvenes Jedi | El Entrenamiento de Nubs', videoId: '4N84JiQ--qs', thumb: 'https://i.ytimg.com/vi/4N84JiQ--qs/hqdefault.jpg' },
  { title: 'Presentación de Mushu en Mulán', videoId: '3U715rZXa6s', thumb: 'https://i.ytimg.com/vi/3U715rZXa6s/hqdefault.jpg' },
  { title: 'Un Momento | Canción de La Sirenita 2: Regreso al Mar', videoId: 'VRSifwu24cc', thumb: 'https://i.ytimg.com/vi/VRSifwu24cc/hqdefault.jpg' },
  { title: '¡Vamos telaraña! | Spidey y Sus Sorprendentes Amigos | Clip', videoId: '9zeWIc7kFRI', thumb: 'https://i.ytimg.com/vi/9zeWIc7kFRI/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | laraconejo 🐰', videoId: 'FjRzfM3lXwU', thumb: 'https://i.ytimg.com/vi/FjRzfM3lXwU/hqdefault.jpg' },
  { title: 'Vanellope Enseña a las Princesas a Vestirse Cómodas', videoId: 'zYEbHuihl8I', thumb: 'https://i.ytimg.com/vi/zYEbHuihl8I/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Capitán Flounder | Video Musical', videoId: 't0Mbr-PRKQM', thumb: 'https://i.ytimg.com/vi/t0Mbr-PRKQM/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Un Mar de Colores | Video Musical', videoId: 'xUWj8sx3dZE', thumb: 'https://i.ytimg.com/vi/xUWj8sx3dZE/hqdefault.jpg' },
  { title: 'Princesita Sofía: Magia Real ✨👑', videoId: 'HaKp2uhrFyQ', thumb: 'https://i.ytimg.com/vi/HaKp2uhrFyQ/hqdefault.jpg' },
  { title: 'La Marcha de Mickey | El Maravilloso Mundo de las Canciones de Disney Junior', videoId: 'OWHT72axF18', thumb: 'https://i.ytimg.com/vi/OWHT72axF18/hqdefault.jpg' },
  { title: 'Spidey y sus sorprendentes amigos | Prueba tu súper fuerza | Especial', videoId: 'tzG6KyNV69I', thumb: 'https://i.ytimg.com/vi/tzG6KyNV69I/hqdefault.jpg' },
  { title: '¡Rapunzel Sale de la Torre por Primera Vez! 🤩', videoId: 'ZireQCd_PoY', thumb: 'https://i.ytimg.com/vi/ZireQCd_PoY/hqdefault.jpg' },
  { title: 'Compositores | Mickey y Yo', videoId: 'FkE3jmv0AKg', thumb: 'https://i.ytimg.com/vi/FkE3jmv0AKg/hqdefault.jpg' },
  { title: '¡Yo Soy Moana!', videoId: 'D_GsE4prs14', thumb: 'https://i.ytimg.com/vi/D_GsE4prs14/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | Un plan perfecto', videoId: 'nM9NSr1Txvo', thumb: 'https://i.ytimg.com/vi/nM9NSr1Txvo/hqdefault.jpg' },
  { title: 'Cena para llevar - Minnie Bow Toons, El campamento de Minnie', videoId: 'SK4yqxY1f9c', thumb: 'https://i.ytimg.com/vi/SK4yqxY1f9c/hqdefault.jpg' },
  { title: 'Hechizos con Sofía y Clover | Princesita Sofía: Amigos mágicos', videoId: 'u0-88B0QPJ0', thumb: 'https://i.ytimg.com/vi/u0-88B0QPJ0/hqdefault.jpg' },
  { title: '¡Conoce a Iron Man y sus Increíbles Amigos! | Presentamos a Ultrón', videoId: 'CuC_o0iOpuY', thumb: 'https://i.ytimg.com/vi/CuC_o0iOpuY/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Una Navidad a lo Spidey | Clip', videoId: '64fL7zj6dBs', thumb: 'https://i.ytimg.com/vi/64fL7zj6dBs/hqdefault.jpg' },
  { title: 'Mañanas con Mickey | Video musical 🎶 | Disney', videoId: 'k9-QpgWzXcU', thumb: 'https://i.ytimg.com/vi/k9-QpgWzXcU/hqdefault.jpg' },
  { title: 'La Increíble Transformación de Tiana y Naveen', videoId: 'lqRJ_PkHip0', thumb: 'https://i.ytimg.com/vi/lqRJ_PkHip0/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | Una historia enredada.', videoId: 'jZI4hXNiuUA', thumb: 'https://i.ytimg.com/vi/jZI4hXNiuUA/hqdefault.jpg' },
  { title: '¡Princesita Sofia Conoce a Blanca Nieves!', videoId: 'uZHQpYcLfNI', thumb: 'https://i.ytimg.com/vi/uZHQpYcLfNI/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Temporada de Horror | Video Musical', videoId: '7wpgh1Kaed0', thumb: 'https://i.ytimg.com/vi/7wpgh1Kaed0/hqdefault.jpg' },
  { title: 'Mejores Canciones de La Casa de Mickey Mouse | Compilado', videoId: 'GK_PHS8YbPs', thumb: 'https://i.ytimg.com/vi/GK_PHS8YbPs/hqdefault.jpg' },
  { title: '¡Conoce el Mundo de Bella! | Disney Princesa', videoId: 'vzTcXqsrJzA', thumb: 'https://i.ytimg.com/vi/vzTcXqsrJzA/hqdefault.jpg' },
  { title: 'Moana Descubre a Hei Hei en el Océano', videoId: 'YwzOxzBtHgM', thumb: 'https://i.ytimg.com/vi/YwzOxzBtHgM/hqdefault.jpg' },
  { title: '¡Mérida Defiende su Propia Mano!', videoId: 'u-ypKB9HAS0', thumb: 'https://i.ytimg.com/vi/u-ypKB9HAS0/hqdefault.jpg' },
  { title: 'Las Aventuras Mágicas de Moana en el Océano | Disney Princess', videoId: 'Bn7tWpY4l1U', thumb: 'https://i.ytimg.com/vi/Bn7tWpY4l1U/hqdefault.jpg' },
  { title: 'Buddy el niñero | Supergatitos: Miauvillosamente Recargados | Corto', videoId: 'XgsB312zNWQ', thumb: 'https://i.ytimg.com/vi/XgsB312zNWQ/hqdefault.jpg' },
  { title: 'STAR WARS l AVENTURAS DE JÓVENES JEDI | COMPILADO', videoId: 'J3ikMYQOSEQ', thumb: 'https://i.ytimg.com/vi/J3ikMYQOSEQ/hqdefault.jpg' },
  { title: 'Cars Toon: Mate, Monster Truck', videoId: 'bmE-NcnbYU0', thumb: 'https://i.ytimg.com/vi/bmE-NcnbYU0/hqdefault.jpg' },
  { title: 'Al Aire Libre - Minnie Bow Toons: El Campamento de Minnie', videoId: 'GfHllpH_pCQ', thumb: 'https://i.ytimg.com/vi/GfHllpH_pCQ/hqdefault.jpg' },
  { title: 'La Fantástica Fiesta de Ginny | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '9Ro7K1k52gE', thumb: 'https://i.ytimg.com/vi/9Ro7K1k52gE/hqdefault.jpg' },
  { title: 'Emotivo Momento de Ariel y su hija Melody 😭🧜‍♀️', videoId: 'sEiUzQK0Q9Y', thumb: 'https://i.ytimg.com/vi/sEiUzQK0Q9Y/hqdefault.jpg' },
  { title: 'Poderes | Spidey y sus Sorprendentes Amigos | MARVEL', videoId: 'ScQRW8euCts', thumb: 'https://i.ytimg.com/vi/ScQRW8euCts/hqdefault.jpg' },
  { title: '¡Mickey y sus Nuevas Amistades! | La Casa de Mickey Mouse', videoId: '7xqs37y6oyY', thumb: 'https://i.ytimg.com/vi/7xqs37y6oyY/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Espuma, Dulce Espuma', videoId: 'gZ_S-P4wp-w', thumb: 'https://i.ytimg.com/vi/gZ_S-P4wp-w/hqdefault.jpg' },
  { title: 'Con Amigos Todo es Mejor | Spidey y sus Sorprendentes Amigos | MARVEL', videoId: 'cMAiYWlpeGc', thumb: 'https://i.ytimg.com/vi/cMAiYWlpeGc/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Tantos Sabores | Video Musical', videoId: 'I5gNpHAjba8', thumb: 'https://i.ytimg.com/vi/I5gNpHAjba8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Criaturas Asombrosas | Video Musical', videoId: '7cHMBRFNP1c', thumb: 'https://i.ytimg.com/vi/7cHMBRFNP1c/hqdefault.jpg' },
  { title: 'Energía limpia | Clip | Spidey y sus Sorprendentes Amigos', videoId: 'DsfeMOR6N30', thumb: 'https://i.ytimg.com/vi/DsfeMOR6N30/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡El Intercambio de Súper Héroes!', videoId: 'bTNH0LY79Kw', thumb: 'https://i.ytimg.com/vi/bTNH0LY79Kw/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Trampas de Arena!', videoId: '8V6BlSb8eJY', thumb: 'https://i.ytimg.com/vi/8V6BlSb8eJY/hqdefault.jpg' },
  { title: 'Fiesta de Te de Cumpleaños | Mickey y Yo', videoId: 'Se1sum_aZ9k', thumb: 'https://i.ytimg.com/vi/Se1sum_aZ9k/hqdefault.jpg' },
  { title: 'Jugando con Winnie the Pooh | Corto | Cangu y el Juego de Escondidas', videoId: 'ndCUJDmcz0E', thumb: 'https://i.ytimg.com/vi/ndCUJDmcz0E/hqdefault.jpg' },
  { title: 'Gat-Ástrofe | Spidey y sus Sorprendentes Amigos | Clip', videoId: 'nZnTrvTFGCw', thumb: 'https://i.ytimg.com/vi/nZnTrvTFGCw/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | En el Espejo | Video Musical', videoId: 'madnLG8FWgw', thumb: 'https://i.ytimg.com/vi/madnLG8FWgw/hqdefault.jpg' },
  { title: '¡Es el Desayuno! | Mañanas con Mickey | Video musical 🎶 | Disney', videoId: 'MvjqLstqS08', thumb: 'https://i.ytimg.com/vi/MvjqLstqS08/hqdefault.jpg' },
  { title: '¡Anna y Elsa se dan Cuenta que Olaf es su Tradición Navideña!', videoId: 'R3k1efsGO4Q', thumb: 'https://i.ytimg.com/vi/R3k1efsGO4Q/hqdefault.jpg' },
  { title: '¡Halloween con Mickey y sus Amigos! | La Casa de Mickey Mouse', videoId: 'psfKQJITqUc', thumb: 'https://i.ytimg.com/vi/psfKQJITqUc/hqdefault.jpg' },
  { title: 'El problema del tubo de Bitsy | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '2TStrNvbfPo', thumb: 'https://i.ytimg.com/vi/2TStrNvbfPo/hqdefault.jpg' },
  { title: 'Aladdin y Jazmín Vuelan en la Alfombra Mágica por Primera Vez', videoId: 'pMnLmbM4uD8', thumb: 'https://i.ytimg.com/vi/pMnLmbM4uD8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Conoces la Lección | Video Musical', videoId: 'Z3EiHhPCrPs', thumb: 'https://i.ytimg.com/vi/Z3EiHhPCrPs/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Sueño Que Es Real', videoId: '7viel3AEK2A', thumb: 'https://i.ytimg.com/vi/7viel3AEK2A/hqdefault.jpg' },
  { title: 'El Equipo Spidey Salva el Día | Spidey y sus Sorprendentes Amigos | MARVEL', videoId: '--mJxYXKt28', thumb: 'https://i.ytimg.com/vi/--mJxYXKt28/hqdefault.jpg' },
  { title: '¡Sparks hace surf en cochecito! | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '3rXZSUNzswI', thumb: 'https://i.ytimg.com/vi/3rXZSUNzswI/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Destrucción de la Construcción!', videoId: 'CmzNLaOWMQE', thumb: 'https://i.ytimg.com/vi/CmzNLaOWMQE/hqdefault.jpg' },
  { title: '¿Qué hay en la Mochila de Mickey? | Mickey y Yo', videoId: 'FJojOZCj_Ic', thumb: 'https://i.ytimg.com/vi/FJojOZCj_Ic/hqdefault.jpg' },
  { title: 'El nuevo villano de la ciudad 🏙️ 🦹🏻‍♂️ | Clip | Spidey y sus sorprendentes amigos', videoId: 'T1Or2xWuis0', thumb: 'https://i.ytimg.com/vi/T1Or2xWuis0/hqdefault.jpg' },
  { title: 'Pisadas de Esqueletos | Spidey y sus Sorprendentes Amigos | Clip', videoId: '4Y8sDWT8ftI', thumb: 'https://i.ytimg.com/vi/4Y8sDWT8ftI/hqdefault.jpg' },
  { title: '¡Conoce el Mundo de Moana!', videoId: 'oYji0twrpME', thumb: 'https://i.ytimg.com/vi/oYji0twrpME/hqdefault.jpg' },
  { title: 'Los Momentos de Espionaje de Mate | Cars 2 | Pixar Cars', videoId: 'UavioMHSoMI', thumb: 'https://i.ytimg.com/vi/UavioMHSoMI/hqdefault.jpg' },
  { title: 'Superhéroes VS. Villanos | Spidey y sus Sorprendentes Amigos | MARVEL', videoId: 'X4jNtytquVk', thumb: 'https://i.ytimg.com/vi/X4jNtytquVk/hqdefault.jpg' },
  { title: 'Jugando con Winnie the Pooh | Corto | Tigger y la Armónica', videoId: '9IJnG1EUcPc', thumb: 'https://i.ytimg.com/vi/9IJnG1EUcPc/hqdefault.jpg' },
  { title: 'STAR WARS | AVENTURAS DE JÓVENES JEDI | Episodio Completo | Los hermanos Cazarrecompensas', videoId: 'F3AZkxmMRnY', thumb: 'https://i.ytimg.com/vi/F3AZkxmMRnY/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Dock Ock y Shockbots', videoId: 'cmAiSIHG_xs', thumb: 'https://i.ytimg.com/vi/cmAiSIHG_xs/hqdefault.jpg' },
  { title: 'Descubre el Talento Secreto de Guido | Cars Toon', videoId: 'px-nhxwCal8', thumb: 'https://i.ytimg.com/vi/px-nhxwCal8/hqdefault.jpg' },
  { title: 'La historia favorita de la bebé Moana | Disney Princesa', videoId: '9Hhs6NF3VZ0', thumb: 'https://i.ytimg.com/vi/9Hhs6NF3VZ0/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | La Gran Función', videoId: '2gaZfpKKfiU', thumb: 'https://i.ytimg.com/vi/2gaZfpKKfiU/hqdefault.jpg' },
  { title: 'Pastel de Cumpleaños | Mickey y Yo', videoId: 'AK-sT7XsM9o', thumb: 'https://i.ytimg.com/vi/AK-sT7XsM9o/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Aprende Sobre la Fuerza y el Movimiento | Música', videoId: 'ued5F0IP8WU', thumb: 'https://i.ytimg.com/vi/ued5F0IP8WU/hqdefault.jpg' },
  { title: 'El Increíble Traje de Iron Man | Spidey y sus Sorprendentes Amigos', videoId: 'MnQsu5OJ1M8', thumb: 'https://i.ytimg.com/vi/MnQsu5OJ1M8/hqdefault.jpg' },
  { title: 'Tiana y Lottie de Pequeñas 🐸', videoId: 'pTHulP8u8lc', thumb: 'https://i.ytimg.com/vi/pTHulP8u8lc/hqdefault.jpg' },
  { title: 'Los Mejores Momentos de la Amistad Entre Mate y Rayo McQueen | Pixar Cars', videoId: 'ZOOhOVS0Ukw', thumb: 'https://i.ytimg.com/vi/ZOOhOVS0Ukw/hqdefault.jpg' },
  { title: 'Star Wars: Aventuras de Jóvenes Jedi | Jóvenes Jedi en la Naturaleza', videoId: 'P_rZBZOHaIo', thumb: 'https://i.ytimg.com/vi/P_rZBZOHaIo/hqdefault.jpg' },
  { title: '¡Vestirse como Supergatito! | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '9l72nMJA5yI', thumb: 'https://i.ytimg.com/vi/9l72nMJA5yI/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | Halloween en el hotel', videoId: 'DC0gvTrXJSM', thumb: 'https://i.ytimg.com/vi/DC0gvTrXJSM/hqdefault.jpg' },
  { title: '¡Los Mejores Momentos de Rayo McQueen y Cruz Ramirez! | Cars | Compilado', videoId: 'x1j0lUVDtCo', thumb: 'https://i.ytimg.com/vi/x1j0lUVDtCo/hqdefault.jpg' },
  { title: '¡Ralph el Demoledor Conoce a Vanellope!', videoId: '1f4pNrdmSrs', thumb: 'https://i.ytimg.com/vi/1f4pNrdmSrs/hqdefault.jpg' },
  { title: 'El Materdor | Cars Toon', videoId: 'Gh0jXWjnwx4', thumb: 'https://i.ytimg.com/vi/Gh0jXWjnwx4/hqdefault.jpg' },
  { title: 'Les Presentamos a los Amigos | Iron Man y sus Increíbles Amigos', videoId: 'aMIiLnVlT0A', thumb: 'https://i.ytimg.com/vi/aMIiLnVlT0A/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | ¿Dónde Está Spidey? | Especial', videoId: 'bbTOzqNpr38', thumb: 'https://i.ytimg.com/vi/bbTOzqNpr38/hqdefault.jpg' },
  { title: 'Limpiando con el Oso Pooh | Winnie the Pooh y Yo | Corto', videoId: 'ZwGvgCEUmeU', thumb: 'https://i.ytimg.com/vi/ZwGvgCEUmeU/hqdefault.jpg' },
  { title: 'Mickey y Bluey | Cortos Mickey+', videoId: 'Q9zJKGZ57-U', thumb: 'https://i.ytimg.com/vi/Q9zJKGZ57-U/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Problemas con la Calabaza!', videoId: 'JoSzFBFFBH4', thumb: 'https://i.ytimg.com/vi/JoSzFBFFBH4/hqdefault.jpg' },
  { title: 'El poderoso Thor | Corto | Conoce a Iron Man y sus increíbles amigos', videoId: 'nCCDcyzupHw', thumb: 'https://i.ytimg.com/vi/nCCDcyzupHw/hqdefault.jpg' },
  { title: 'Mickey y Pluto Cuidan a Bella | La Casa de Mickey Mouse', videoId: 'ReYpbpjlvO8', thumb: 'https://i.ytimg.com/vi/ReYpbpjlvO8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Nuestra Ayuda Tendrás | Video Musical', videoId: 'J8Z8kDADaoo', thumb: 'https://i.ytimg.com/vi/J8Z8kDADaoo/hqdefault.jpg' },
  { title: '¡Winnie Pooh Ayuda a su Amigo Igor! ❤️', videoId: 'BGqy00eUpRc', thumb: 'https://i.ytimg.com/vi/BGqy00eUpRc/hqdefault.jpg' },
  { title: 'Los Mejores Momentos de Mate | Pixar Cars', videoId: 'yBHguf6-V78', thumb: 'https://i.ytimg.com/vi/yBHguf6-V78/hqdefault.jpg' },
  { title: 'Cars: Momentos de Amistad, Valor y Trabajo en Equipo | Pixar Cars', videoId: 'rZxkgcCRiMY', thumb: 'https://i.ytimg.com/vi/rZxkgcCRiMY/hqdefault.jpg' },
  { title: 'Supergatitos presenta a BITSY | Compilado', videoId: 'M2k2SQRSui4', thumb: 'https://i.ytimg.com/vi/M2k2SQRSui4/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Empollando una Aventura!', videoId: '_DW5Li70CiA', thumb: 'https://i.ytimg.com/vi/_DW5Li70CiA/hqdefault.jpg' },
  { title: 'El emotivo deseo de TIANA a la estrella🐸👑', videoId: 'vA6SYmtULDE', thumb: 'https://i.ytimg.com/vi/vA6SYmtULDE/hqdefault.jpg' },
  { title: '¡Problemas de Agua! | Clip | Spidey y sus Sorprendentes Amigos', videoId: 'xeq4DQshD8s', thumb: 'https://i.ytimg.com/vi/xeq4DQshD8s/hqdefault.jpg' },
  { title: '¡Princesita Sofia es Rescatada por Rapunzel!', videoId: '6rYuHnGpkeg', thumb: 'https://i.ytimg.com/vi/6rYuHnGpkeg/hqdefault.jpg' },
  { title: 'Ayuda a Minnie a Atrapar y Contar los Globos | La Casa de Mickey Mouse', videoId: 'tM7WSHsi2uo', thumb: 'https://i.ytimg.com/vi/tM7WSHsi2uo/hqdefault.jpg' },
  { title: '¡Ya listos! | Mañanas con Mickey | Video musical 🎶 | Disney', videoId: 'Uh9t-SKno_8', thumb: 'https://i.ytimg.com/vi/Uh9t-SKno_8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Unión, Diversión | Video Musical', videoId: 'nKJ09wCu8IE', thumb: 'https://i.ytimg.com/vi/nKJ09wCu8IE/hqdefault.jpg' },
  { title: 'Supergatitos | Cancion de apertura | Video musical 🎶 | Disney', videoId: 'MwH8WJf56Nk', thumb: 'https://i.ytimg.com/vi/MwH8WJf56Nk/hqdefault.jpg' },
  { title: 'Rapunzel Salva a Eugene', videoId: 'V8mqgtdFttA', thumb: 'https://i.ytimg.com/vi/V8mqgtdFttA/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡No Puedo Dejar de Bailar!', videoId: 'VXsrBYTrMTI', thumb: 'https://i.ytimg.com/vi/VXsrBYTrMTI/hqdefault.jpg' },
  { title: '¡ANNA le da una NUEVA NARIZ a OLAF! 🥕✨ | Frozen', videoId: '9TjHpN_D6sc', thumb: 'https://i.ytimg.com/vi/9TjHpN_D6sc/hqdefault.jpg' },
  { title: 'Sofía y las mascotas mágicas del castillo | Princesita Sofía: Amigos mágicos', videoId: 'pl5GbOKC4Mw', thumb: 'https://i.ytimg.com/vi/pl5GbOKC4Mw/hqdefault.jpg' },
  { title: 'Disney Jr. Ariel | Día de Atlántica / Espíritu ganador | Episodio Completo', videoId: 'eafZxvKB_nk', thumb: 'https://i.ytimg.com/vi/eafZxvKB_nk/hqdefault.jpg' },
  { title: '¡Ayudemos a Mickey a contar! | La casa de Mickey Mouse', videoId: 'I-R540gYUIs', thumb: 'https://i.ytimg.com/vi/I-R540gYUIs/hqdefault.jpg' },
  { title: '¡Disfruta Navidad con Mickey! | Mickey y Yo', videoId: '_XAgMhBh9cU', thumb: 'https://i.ytimg.com/vi/_XAgMhBh9cU/hqdefault.jpg' },
  { title: 'STAR WARS | AVENTURAS DE JÓVENES JEDI | Episodio Completo | Árbol en problemas', videoId: 'gb_XP4uy6z8', thumb: 'https://i.ytimg.com/vi/gb_XP4uy6z8/hqdefault.jpg' },
  { title: '¡Iron Man, Hulk y el Equipo Spidey Detienen a los Villanos! 💪', videoId: 'mFEMn7TWMz4', thumb: 'https://i.ytimg.com/vi/mFEMn7TWMz4/hqdefault.jpg' },
  { title: 'MELODY y el GRAN secreto del collar ✨🧜 - La Sirenita', videoId: 'W_AKn7tj1Ss', thumb: 'https://i.ytimg.com/vi/W_AKn7tj1Ss/hqdefault.jpg' },
  { title: 'Gob-zilla | Spidey y sus Sorprendentes Amigos | Clip', videoId: 'tupKQ52iUDc', thumb: 'https://i.ytimg.com/vi/tupKQ52iUDc/hqdefault.jpg' },
  { title: 'VANELLOPE Conoce al divertido GROOT', videoId: '3CNikLBjjQ4', thumb: 'https://i.ytimg.com/vi/3CNikLBjjQ4/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | El Gran Árbol de Navidad', videoId: 'lpCctafuSR4', thumb: 'https://i.ytimg.com/vi/lpCctafuSR4/hqdefault.jpg' },
  { title: 'La Casa No Tan Divertida | Spidey y sus Sorprendentes Amigos | Clip', videoId: 'df-IhisC0Yo', thumb: 'https://i.ytimg.com/vi/df-IhisC0Yo/hqdefault.jpg' },
  { title: 'Karate Mate | Cars Toon', videoId: 'r47yUmJjotk', thumb: 'https://i.ytimg.com/vi/r47yUmJjotk/hqdefault.jpg' },
  { title: 'Los Momentos Motivadores de Rayo McQueen | Pixar Cars', videoId: 'V6a9_zYriZI', thumb: 'https://i.ytimg.com/vi/V6a9_zYriZI/hqdefault.jpg' },
  { title: 'STAR WARS 💫| AVENTURAS DE JÓVENES JEDI | Episodio Completo | El festín de la cosecha', videoId: 'XPR90EPhWPw', thumb: 'https://i.ytimg.com/vi/XPR90EPhWPw/hqdefault.jpg' },
  { title: 'Mejores Momentos de Goofy | La Casa de Mickey Mouse', videoId: 'hl45RHlncZk', thumb: 'https://i.ytimg.com/vi/hl45RHlncZk/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Descansar | Video Musical', videoId: 'mS7wdXPnEmc', thumb: 'https://i.ytimg.com/vi/mS7wdXPnEmc/hqdefault.jpg' },
  { title: 'Conoce a Spidey y sus sorprendentes amigos | El Capitán América al rescate', videoId: 'HROJHOHUF78', thumb: 'https://i.ytimg.com/vi/HROJHOHUF78/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | ¡Mascota Mimada!', videoId: '_rYaITwDeqs', thumb: 'https://i.ytimg.com/vi/_rYaITwDeqs/hqdefault.jpg' },
  { title: '¡Conoce a Iron Man y sus Increíbles Amigos! | Presentamos a Iron Man', videoId: 'iGVx5eLdZws', thumb: 'https://i.ytimg.com/vi/iGVx5eLdZws/hqdefault.jpg' },
  { title: 'Gobby, Un Buen Chico | Spidey y sus Sorprendentes Amigos | Clip', videoId: '3S7uVys_4q8', thumb: 'https://i.ytimg.com/vi/3S7uVys_4q8/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | El Caos de Black Cat', videoId: 'JHKvtDiDoKw', thumb: 'https://i.ytimg.com/vi/JHKvtDiDoKw/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Palomas Bromistas | Especial', videoId: 'nEbjnZMLMF4', thumb: 'https://i.ytimg.com/vi/nEbjnZMLMF4/hqdefault.jpg' },
  { title: 'Mushu Despierta a Mulán para su Primer Día de Entrenamiento', videoId: '3s8c2U7Tjyc', thumb: 'https://i.ytimg.com/vi/3s8c2U7Tjyc/hqdefault.jpg' },
  { title: 'Supergatitos presenta a SPARKS | Compilado', videoId: 'Yu3DLjEsB0Q', thumb: 'https://i.ytimg.com/vi/Yu3DLjEsB0Q/hqdefault.jpg' },
  { title: 'La Tierna Declaración de Amor de Tiana y Naveen | La Princesa y el Sapo', videoId: 'JdICAKL4S-A', thumb: 'https://i.ytimg.com/vi/JdICAKL4S-A/hqdefault.jpg' },
  { title: '¡La Rutina de Halloween de Mickey! | Mickey y Yo', videoId: 'KFoJHoNQRXQ', thumb: 'https://i.ytimg.com/vi/KFoJHoNQRXQ/hqdefault.jpg' },
  { title: 'Disney Jr. Ariel | El Campamento Mágico de Úrsula / El Cuaderno de Fernie | Episodio Completo', videoId: '7uKBFwXCXtk', thumb: 'https://i.ytimg.com/vi/7uKBFwXCXtk/hqdefault.jpg' },
  { title: 'Fantasma en el Museo | Spidey y sus Sorprendentes Amigos | Clip', videoId: 'mSD_PrsyMCI', thumb: 'https://i.ytimg.com/vi/mSD_PrsyMCI/hqdefault.jpg' },
  { title: '¡Ay, no, tomates! | Clip | Spidey y sus Sorprendentes Amigos', videoId: 'PNAAIUIUnuM', thumb: 'https://i.ytimg.com/vi/PNAAIUIUnuM/hqdefault.jpg' },
  { title: '¡Las Carreras Más Emocionantes del Rayo McQueen! | Cars', videoId: '7jKZepjRFrI', thumb: 'https://i.ytimg.com/vi/7jKZepjRFrI/hqdefault.jpg' },
  { title: 'Botas Saltarinas | Clip | IRON MAN Y SUS INCREÍBLES AMIGOS', videoId: 'EIr7zSX4COU', thumb: 'https://i.ytimg.com/vi/EIr7zSX4COU/hqdefault.jpg' },
  { title: '¡Los Mejores Momentos del Rayo McQueen y Mate! | Cars', videoId: 'konPxbxLkh0', thumb: 'https://i.ytimg.com/vi/konPxbxLkh0/hqdefault.jpg' },
  { title: 'Cuán Lejos Voy 🌊🎶 - Moana', videoId: 'fsLDHoPP-kM', thumb: 'https://i.ytimg.com/vi/fsLDHoPP-kM/hqdefault.jpg' },
  { title: 'Los Mejores Momentos de la Amistad Entre Mate y Rayo McQueen | Pixar Cars', videoId: 'vL4xa5fNCUw', thumb: 'https://i.ytimg.com/vi/vL4xa5fNCUw/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | ¡La Lagartija Perdida!', videoId: 'gs0XU-pHhvM', thumb: 'https://i.ytimg.com/vi/gs0XU-pHhvM/hqdefault.jpg' },
  { title: 'Groot Conoce a Jeff el Tiburón Terrestre | Corto | Conoce a Spidey y sus sorprendentes amigos', videoId: 'MYj8m7eAiLM', thumb: 'https://i.ytimg.com/vi/MYj8m7eAiLM/hqdefault.jpg' },
  { title: 'Igor y el Juego de Pintura | Corto | Jugando con Winnie the Pooh', videoId: 'C_JHvcMcIdM', thumb: 'https://i.ytimg.com/vi/C_JHvcMcIdM/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Las Arañas Pequeñitas', videoId: 'vh9Epcb7q3Q', thumb: 'https://i.ytimg.com/vi/vh9Epcb7q3Q/hqdefault.jpg' },
  { title: 'Piglet y el triciclo | Cita de juegos con Winnie the Pooh', videoId: 'TgWdU16QOJc', thumb: 'https://i.ytimg.com/vi/TgWdU16QOJc/hqdefault.jpg' },
  { title: 'Disney Jr. Ariel | Los Cuentos de la Sirenita | La cola de Ariel', videoId: 'AzZMg43HaIU', thumb: 'https://i.ytimg.com/vi/AzZMg43HaIU/hqdefault.jpg' },
  { title: 'El Bote Rescata-telarañas y la Motocicleta de Spin | Conoce a Spidey y sus sorprendentes amigos', videoId: 'kGYzguI2WYI', thumb: 'https://i.ytimg.com/vi/kGYzguI2WYI/hqdefault.jpg' },
  { title: 'Cepilla con Ritmo | Mañanas con Mickey | Video musical 🎶 | Disney', videoId: '7rWp7LfTEws', thumb: 'https://i.ytimg.com/vi/7rWp7LfTEws/hqdefault.jpg' },
  { title: 'La criatura escapista de Lys | Aventuras de Jóvenes Jedi | Corto 2 | Star Wars', videoId: '9HxcVHFUUeU', thumb: 'https://i.ytimg.com/vi/9HxcVHFUUeU/hqdefault.jpg' },
  { title: 'Sebastián Debe Avisarle a Ariel que Melody Huyó', videoId: 'UfGEVJEbXKE', thumb: 'https://i.ytimg.com/vi/UfGEVJEbXKE/hqdefault.jpg' },
  { title: 'Te presentamos a Ginny | Supergatitos | Compilado', videoId: 'AQZCfnPY7f8', thumb: 'https://i.ytimg.com/vi/AQZCfnPY7f8/hqdefault.jpg' },
  { title: 'Conoce a Eeyore | Winnie the Pooh y Yo | Corto', videoId: 'wcDmjTTfIxA', thumb: 'https://i.ytimg.com/vi/wcDmjTTfIxA/hqdefault.jpg' },
  { title: 'Campamento Fantasmal - Minnie Bow Toons, El campamento de Minnie', videoId: 'xx_Q21bT3kM', thumb: 'https://i.ytimg.com/vi/xx_Q21bT3kM/hqdefault.jpg' },
  { title: 'Celebremos a las mascotas | La casa de Mickey Mouse | Compilado', videoId: '_qNGM3FVQEI', thumb: 'https://i.ytimg.com/vi/_qNGM3FVQEI/hqdefault.jpg' },
  { title: 'La Gran Aventura de Amadeus Cho | Iron Man y sus Increíbles Amigos | Corto', videoId: '_V3CVYBVsAw', thumb: 'https://i.ytimg.com/vi/_V3CVYBVsAw/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡El Caso del Ladrón de Libros!', videoId: '54S7GFUfOJc', thumb: 'https://i.ytimg.com/vi/54S7GFUfOJc/hqdefault.jpg' },
  { title: 'Princesita Sofía se encuentra con Rapunzel 😭', videoId: 'EozPb40i5Uo', thumb: 'https://i.ytimg.com/vi/EozPb40i5Uo/hqdefault.jpg' },
  { title: 'Ralph y Vanellope Viven un Emotivo Momento de Amistad', videoId: '-v6ArQKagj0', thumb: 'https://i.ytimg.com/vi/-v6ArQKagj0/hqdefault.jpg' },
  { title: 'Minnie golf extremo | Minnie Bow Toons, El campamento de Minnie', videoId: 'w8MgPO3HeWQ', thumb: 'https://i.ytimg.com/vi/w8MgPO3HeWQ/hqdefault.jpg' },
  { title: 'Salta en el Purr N’ Go | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '7Fl3auNA2DA', thumb: 'https://i.ytimg.com/vi/7Fl3auNA2DA/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Abre Ya | Video Musical', videoId: 'YFjIghNo-bs', thumb: 'https://i.ytimg.com/vi/YFjIghNo-bs/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | ¡Un Poco de Estiramiento!', videoId: 'Wr9ks7Lfmtc', thumb: 'https://i.ytimg.com/vi/Wr9ks7Lfmtc/hqdefault.jpg' },
  { title: 'Mickey y Spidey | Cortos Mickey+', videoId: 'RGnTd2SKi9c', thumb: 'https://i.ytimg.com/vi/RGnTd2SKi9c/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Nuevo Amigo | Video Musical', videoId: 'ld58VuYtfLw', thumb: 'https://i.ytimg.com/vi/ld58VuYtfLw/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Paciencia de Pantera | Clip', videoId: 'k7CqXqk4TvQ', thumb: 'https://i.ytimg.com/vi/k7CqXqk4TvQ/hqdefault.jpg' },
  { title: 'Dar con el corazón: Princesita Sofía | Video musical | Disney', videoId: 'TpNvXANZfwQ', thumb: 'https://i.ytimg.com/vi/TpNvXANZfwQ/hqdefault.jpg' },
  { title: 'Problema en el túnel | Clip | Spidey y sus sorprendentes amigos', videoId: 'kz2ZkAbLJdA', thumb: 'https://i.ytimg.com/vi/kz2ZkAbLJdA/hqdefault.jpg' },
  { title: 'El Mejor Día de Playa | Iron Man y sus Increíbles Amigos | Corto', videoId: 'pKYXobM9BSc', thumb: 'https://i.ytimg.com/vi/pKYXobM9BSc/hqdefault.jpg' },
  { title: '¡Recorre el Mundo junto a Mickey! | Mickey y Yo', videoId: 'Jyd_kRIerwM', thumb: 'https://i.ytimg.com/vi/Jyd_kRIerwM/hqdefault.jpg' },
  { title: '¡Rapunzel se da cuenta que es la princesa perdida!', videoId: 'DJd3unB6tws', thumb: 'https://i.ytimg.com/vi/DJd3unB6tws/hqdefault.jpg' },
  { title: 'Sofía y las alas mágicas de Layla | Princesita Sofía: Amigos mágicos', videoId: 'Xps9Vxm7Yo4', thumb: 'https://i.ytimg.com/vi/Xps9Vxm7Yo4/hqdefault.jpg' },
  { title: 'Spidey y sus sorprendentes amigos! 🕷️✨ | NUEVO equipamiento y vehículos', videoId: 'CG4qYGKB_uQ', thumb: 'https://i.ytimg.com/vi/CG4qYGKB_uQ/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Episodios Completos | Vamos dinotelarañas + Fantasma en el museo', videoId: 'qI1ptWsZdgc', thumb: 'https://i.ytimg.com/vi/qI1ptWsZdgc/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Spin Entra Corriendo', videoId: '_i1RVMoPIEY', thumb: 'https://i.ytimg.com/vi/_i1RVMoPIEY/hqdefault.jpg' },
  { title: 'Búsqueda del Tesoro de Cumpleaños | Mickey y Yo', videoId: 'NOhpLlt5B_w', thumb: 'https://i.ytimg.com/vi/NOhpLlt5B_w/hqdefault.jpg' },
  { title: 'Moana bebé ayuda a una pequeña tortuga | Disney Princesa', videoId: '-Wz4OfZ6MGs', thumb: 'https://i.ytimg.com/vi/-Wz4OfZ6MGs/hqdefault.jpg' },
  { title: '¡Anna, Kristoff y Olaf Escapan del Monstruo de Nieve!', videoId: 'Gq-CZuBqrtQ', thumb: 'https://i.ytimg.com/vi/Gq-CZuBqrtQ/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | La Música Que Hay En Ti | Video Musical', videoId: 'ERCAywZhitQ', thumb: 'https://i.ytimg.com/vi/ERCAywZhitQ/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Transformación', videoId: 'HymRBRF79uM', thumb: 'https://i.ytimg.com/vi/HymRBRF79uM/hqdefault.jpg' },
  { title: 'Una Situación Pegajosa - Minnie Bow Toons: El Campamento de Minnie', videoId: 'ObQsUkREmjQ', thumb: 'https://i.ytimg.com/vi/ObQsUkREmjQ/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | El Hombre de Arena No Quiere Compartir', videoId: 'XmHBvXnQ5BQ', thumb: 'https://i.ytimg.com/vi/XmHBvXnQ5BQ/hqdefault.jpg' },
  { title: '¡Vamos Rescata-telarañas! | Corto | Conoce a Spidey y sus sorprendentes amigos', videoId: 'v2g4QSLUo00', thumb: 'https://i.ytimg.com/vi/v2g4QSLUo00/hqdefault.jpg' },
  { title: 'La rutina matutina de Pooh | Winnie the Pooh y Yo | Corto', videoId: 'e9TJgKImaak', thumb: 'https://i.ytimg.com/vi/e9TJgKImaak/hqdefault.jpg' },
  { title: 'Correcto actuar: Princesita Sofía | Video musical | Disney', videoId: 'YwSE0VftXwQ', thumb: 'https://i.ytimg.com/vi/YwSE0VftXwQ/hqdefault.jpg' },
  { title: 'Rocket y Groot Están Aquí para Ayudar | Corto | Conoce a Spidey y sus sorprendentes amigos', videoId: 'IeUUVfhU9JQ', thumb: 'https://i.ytimg.com/vi/IeUUVfhU9JQ/hqdefault.jpg' },
  { title: '¡Princesita Sofia Recibe Ayuda de Mulán! ❤️🤩', videoId: '1jknuyiMW90', thumb: 'https://i.ytimg.com/vi/1jknuyiMW90/hqdefault.jpg' },
  { title: 'Heavy Metal Mate | Cars Toon', videoId: 'weKn0fqvKSU', thumb: 'https://i.ytimg.com/vi/weKn0fqvKSU/hqdefault.jpg' },
  { title: '¡Canta \"Muéstrate\" de Frozen 2 Junto a Elsa!', videoId: 'ZGUctxom6_w', thumb: 'https://i.ytimg.com/vi/ZGUctxom6_w/hqdefault.jpg' },
  { title: '¡Fiesta de Cumpleaños con Mickey y Minnie! | Mickey y Yo', videoId: 'dJNqi_OG8rY', thumb: 'https://i.ytimg.com/vi/dJNqi_OG8rY/hqdefault.jpg' },
  { title: 'Conociendo el Árbol | Corto | Winnie Pooh y Yo', videoId: 'hB1jCssNL6I', thumb: 'https://i.ytimg.com/vi/hB1jCssNL6I/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | ¡Muévete a un lado!', videoId: 'mpkfKxvlR34', thumb: 'https://i.ytimg.com/vi/mpkfKxvlR34/hqdefault.jpg' },
  { title: '¡Conoce el Mundo de Ariel!', videoId: 'DU8j9pQUz-c', thumb: 'https://i.ytimg.com/vi/DU8j9pQUz-c/hqdefault.jpg' },
  { title: 'Fiesta del Castillo de Bloques | Mickey y Yo', videoId: '6R1Hl0okZ4A', thumb: 'https://i.ytimg.com/vi/6R1Hl0okZ4A/hqdefault.jpg' },
  { title: 'Minnie y la Estrella de Mar Navidad | Mickey y Yo', videoId: 'sz2DSsE64fs', thumb: 'https://i.ytimg.com/vi/sz2DSsE64fs/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Mundo de Cristal', videoId: '8r0lu9beAH4', thumb: 'https://i.ytimg.com/vi/8r0lu9beAH4/hqdefault.jpg' },
  { title: 'Cars Toon: Aero Mate', videoId: '7BpwDUkti40', thumb: 'https://i.ytimg.com/vi/7BpwDUkti40/hqdefault.jpg' },
  { title: 'Supergatitos | El Traje Nuevo de Buddy', videoId: 'O9-6rvjrL0I', thumb: 'https://i.ytimg.com/vi/O9-6rvjrL0I/hqdefault.jpg' },
  { title: 'Lottie Consuela a su Amiga Tiana ❤️', videoId: '3inIgjZMitI', thumb: 'https://i.ytimg.com/vi/3inIgjZMitI/hqdefault.jpg' },
  { title: 'Spidey y sus sorprendentes amigos | Clip | La aventura de Zola', videoId: 'Gcp7PLVQ-G4', thumb: 'https://i.ytimg.com/vi/Gcp7PLVQ-G4/hqdefault.jpg' },
  { title: 'Momentos más tiernos de las princesas bebés | Disney Princesa', videoId: '_c-QuuO2D2Y', thumb: 'https://i.ytimg.com/vi/_c-QuuO2D2Y/hqdefault.jpg' },
  { title: '\"Llegaré\", la canción de Tiana en La Princesa y el Sapo 👸🐸', videoId: '-HhKfqw1KNw', thumb: 'https://i.ytimg.com/vi/-HhKfqw1KNw/hqdefault.jpg' },
  { title: 'Star Wars: Aventuras de Jóvenes Jedi I Un Nuevo Descubrimiento | Episodio Completo', videoId: '5GFdkkFgG0Q', thumb: 'https://i.ytimg.com/vi/5GFdkkFgG0Q/hqdefault.jpg' },
  { title: 'Gato araña 🐈 🕸️| Clip | Spidey y sus sorprendentes amigos', videoId: 'QXLbfcqPjU0', thumb: 'https://i.ytimg.com/vi/QXLbfcqPjU0/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Cositas | Video Musical', videoId: '3U05Z6MGj98', thumb: 'https://i.ytimg.com/vi/3U05Z6MGj98/hqdefault.jpg' },
  { title: '🎉 Minnie’s Bow Toons: Hotel Para Mascotas | Corto | Fiesta sorpresa', videoId: 'PWm34CmEOZI', thumb: 'https://i.ytimg.com/vi/PWm34CmEOZI/hqdefault.jpg' },
  { title: 'Anna y Olaf se Vuelven a Encontrar', videoId: 'TP2_aD-BxKA', thumb: 'https://i.ytimg.com/vi/TP2_aD-BxKA/hqdefault.jpg' },
  { title: 'Cars Toons: Mate Volador No Identificado', videoId: 'nNCYYPShmqQ', thumb: 'https://i.ytimg.com/vi/nNCYYPShmqQ/hqdefault.jpg' },
  { title: 'Conoce a Tigger | Corto | Winnie Pooh y Yo', videoId: 'Ng3SiFyE-L0', thumb: 'https://i.ytimg.com/vi/Ng3SiFyE-L0/hqdefault.jpg' },
  { title: 'STAR WARS 💫| AVENTURAS DE JÓVENES JEDI | Episodio Completo | Navegando con las hojas', videoId: 'H59CDhoai34', thumb: 'https://i.ytimg.com/vi/H59CDhoai34/hqdefault.jpg' },
  { title: 'Todo arriesgarás: Princesita Sofía | Video musical | Disney', videoId: 'YkXEANX4RVM', thumb: 'https://i.ytimg.com/vi/YkXEANX4RVM/hqdefault.jpg' },
  { title: 'Star Wars: Aventuras de Jóvenes Jedi | Justa de Chatarrería', videoId: 'UYERlFmW6gg', thumb: 'https://i.ytimg.com/vi/UYERlFmW6gg/hqdefault.jpg' },
  { title: '¡Conoce el Mundo de la Princesa Aurora!', videoId: 'AIuzcS-WDgw', thumb: 'https://i.ytimg.com/vi/AIuzcS-WDgw/hqdefault.jpg' },
  { title: 'Un viaje especial: Princesita Sofía | Video musical | Disney', videoId: '8bP3ufR07bI', thumb: 'https://i.ytimg.com/vi/8bP3ufR07bI/hqdefault.jpg' },
  { title: 'Globo de Cumpleaños para Minnie | Mickey y Yo', videoId: 'voq6HZd4xko', thumb: 'https://i.ytimg.com/vi/voq6HZd4xko/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Solo Mi Estilo | Video Musical', videoId: '5ao4POU0Hwo', thumb: 'https://i.ytimg.com/vi/5ao4POU0Hwo/hqdefault.jpg' },
  { title: 'La Gran Expo | Iron Man y sus Increíbles Amigos | Corto', videoId: 'wDMUBp3V-LA', thumb: 'https://i.ytimg.com/vi/wDMUBp3V-LA/hqdefault.jpg' },
  { title: 'Minnie’s Bow Toons: Hotel Para Mascotas | Corto | Conejos Traviesos', videoId: 'Ka-0LWXm-Gk', thumb: 'https://i.ytimg.com/vi/Ka-0LWXm-Gk/hqdefault.jpg' },
  { title: 'Ayudemos a Mickey a contar! | La casa de Mickey Mouse | Compilado', videoId: 'ubksJ-aXCQg', thumb: 'https://i.ytimg.com/vi/ubksJ-aXCQg/hqdefault.jpg' },
  { title: 'Rapunzel Sale de la Torre y Canta 🎶 Mi Vida Empieza Así 🎶', videoId: 'JigD45gk680', thumb: 'https://i.ytimg.com/vi/JigD45gk680/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | El Duende Verde Quiere Arruinar el Verano | Especial', videoId: 'S2XBdItL-jQ', thumb: 'https://i.ytimg.com/vi/S2XBdItL-jQ/hqdefault.jpg' },
  { title: 'Ultrón se vuelve gigante | Corto | Conoce a Iron Man y sus increíbles amigos', videoId: 'By3OF9fAqqM', thumb: 'https://i.ytimg.com/vi/By3OF9fAqqM/hqdefault.jpg' },
  { title: 'Búsqueda del Tesoro Navideña | Mickey y Yo', videoId: 'kOBdgO6qNJ0', thumb: 'https://i.ytimg.com/vi/kOBdgO6qNJ0/hqdefault.jpg' },
  { title: 'Presión en el muelle - Minnie Bow Toons, El campamento de Minnie', videoId: 'TONvwG4Dqpk', thumb: 'https://i.ytimg.com/vi/TONvwG4Dqpk/hqdefault.jpg' },
  { title: 'Conoce al Conde Mickula de La Casa de Mickey Mouse 🏡', videoId: 'WD8Qo_ILBTE', thumb: 'https://i.ytimg.com/vi/WD8Qo_ILBTE/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Alto! Es el Equipo Spidey', videoId: 'vPHuYEsO_oI', thumb: 'https://i.ytimg.com/vi/vPHuYEsO_oI/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Mi Preciado Tesoro | Video Musical', videoId: '-ws3rH8AIYc', thumb: 'https://i.ytimg.com/vi/-ws3rH8AIYc/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Goblin Island', videoId: 'fQdmBNyQQNY', thumb: 'https://i.ytimg.com/vi/fQdmBNyQQNY/hqdefault.jpg' },
  { title: '\"Tú, mi princesa hermosa\" | Canción de La Sirenita 2', videoId: 'p71m6dtKUp8', thumb: 'https://i.ytimg.com/vi/p71m6dtKUp8/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Algo Muy Personal', videoId: 'hGJEahoy8CY', thumb: 'https://i.ytimg.com/vi/hGJEahoy8CY/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | La Sirenosca | Video Musical', videoId: 'iiIjWUkiT3U', thumb: 'https://i.ytimg.com/vi/iiIjWUkiT3U/hqdefault.jpg' },
  { title: '¡Feliz Cumpleaños, Mickey Mouse | Compilado', videoId: '0j0mInn9W14', thumb: 'https://i.ytimg.com/vi/0j0mInn9W14/hqdefault.jpg' },
  { title: 'La Exhibición de Moños de Invierno de Minnie | La Casa de Mickey Mouse', videoId: '7o0fe7Y36qc', thumb: 'https://i.ytimg.com/vi/7o0fe7Y36qc/hqdefault.jpg' },
  { title: '¡El rayo de obediencia de Ock! | Clip | Spidey y sus Sorprendentes Amigos', videoId: '552-uj_88FE', thumb: 'https://i.ytimg.com/vi/552-uj_88FE/hqdefault.jpg' },
  { title: 'Las mejores escenas de los rivales de Rayo McQueen | Pixar Cars', videoId: 'HgTBvXrVcxw', thumb: 'https://i.ytimg.com/vi/HgTBvXrVcxw/hqdefault.jpg' },
  { title: 'Mickey y Stitch | Cortos Mickey+', videoId: '-FUFN1X-KLE', thumb: 'https://i.ytimg.com/vi/-FUFN1X-KLE/hqdefault.jpg' },
  { title: 'A bailar CON MICKEY MOUSE y sus amigos |  La casa de Mickey Mouse+: La granja de Mickey', videoId: 'cNrft98XRpU', thumb: 'https://i.ytimg.com/vi/cNrft98XRpU/hqdefault.jpg' },
  { title: '¡Atrapen esa Cometa! | Supergatitos: Miauvillosamente Recargados | Corto', videoId: '_eyQnfMqDXI', thumb: 'https://i.ytimg.com/vi/_eyQnfMqDXI/hqdefault.jpg' },
  { title: 'Los Supergatitos y Labo Rata en la Canción del Queso 🧀🎶', videoId: 'o-5h7LAASrs', thumb: 'https://i.ytimg.com/vi/o-5h7LAASrs/hqdefault.jpg' },
  { title: 'BOLA DE NIEVE, BOLA DE NIEVE, BOLA DE NIEVE | CLIP | SPIDEY Y SUS SORPRENDENTES AMIGOS', videoId: 'rQOFEx3pmzI', thumb: 'https://i.ytimg.com/vi/rQOFEx3pmzI/hqdefault.jpg' },
  { title: 'Canción de Cumpleaños | Mickey y Yo', videoId: 't5Sjxk2VaD4', thumb: 'https://i.ytimg.com/vi/t5Sjxk2VaD4/hqdefault.jpg' },
  { title: '¡La Doctora Juguetes y el Primer Baño del Bebé! ❤️', videoId: 'PZfUXJVojFw', thumb: 'https://i.ytimg.com/vi/PZfUXJVojFw/hqdefault.jpg' },
  { title: 'Títeres en un día lluvioso | Corto | Jugando con Winnie the Pooh', videoId: 'wodthz-75lg', thumb: 'https://i.ytimg.com/vi/wodthz-75lg/hqdefault.jpg' },
  { title: 'Rapunzel conoce a Pascal  | Disney Princesa', videoId: '8vG6vuarQ1Y', thumb: 'https://i.ytimg.com/vi/8vG6vuarQ1Y/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Situación Pegajosa!', videoId: 'CZkclrW1RXY', thumb: 'https://i.ytimg.com/vi/CZkclrW1RXY/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Búsqueda del Tesoro', videoId: 'TCYul_jV3gM', thumb: 'https://i.ytimg.com/vi/TCYul_jV3gM/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | A mi Compás | Video Musical', videoId: '8HrzQDpQFTA', thumb: 'https://i.ytimg.com/vi/8HrzQDpQFTA/hqdefault.jpg' },
  { title: '¡Disfruta Halloween con Mickey! | Mickey y Yo', videoId: 'hCkQY4RtooU', thumb: 'https://i.ytimg.com/vi/hCkQY4RtooU/hqdefault.jpg' },
  { title: 'Spidey y sus sorprendentes amigos | Clip | El Gatito maltés', videoId: 'yehGAMyikjE', thumb: 'https://i.ytimg.com/vi/yehGAMyikjE/hqdefault.jpg' },
  { title: 'Spin Se Salva a Sí Mismo | Clip | Spidey y sus Sorprendentes Amigos', videoId: '6Xk_ZcoHJ68', thumb: 'https://i.ytimg.com/vi/6Xk_ZcoHJ68/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Trabajo con Equipo Araña | Música', videoId: 'ILAaf_GLRWM', thumb: 'https://i.ytimg.com/vi/ILAaf_GLRWM/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡El Ladrón Hormiga!', videoId: 'bn7sK1j97yY', thumb: 'https://i.ytimg.com/vi/bn7sK1j97yY/hqdefault.jpg' },
  { title: 'Momento Mágico de Moana Bebé con el Océano', videoId: 'hwC1czh0lcI', thumb: 'https://i.ytimg.com/vi/hwC1czh0lcI/hqdefault.jpg' },
  { title: '¡Compone una Increíble Canción con Mickey! | Mickey y Yo', videoId: 's7qW3_Bh_GA', thumb: 'https://i.ytimg.com/vi/s7qW3_Bh_GA/hqdefault.jpg' },
  { title: 'Supergatitos | Compilado Mejores Canciones', videoId: 'oHI3yK1F5_E', thumb: 'https://i.ytimg.com/vi/oHI3yK1F5_E/hqdefault.jpg' },
  { title: '¡La Decoración de Halloween de Mickey! | Mickey y Yo', videoId: 'mJNQ3tkP1mM', thumb: 'https://i.ytimg.com/vi/mJNQ3tkP1mM/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | Problemas en Casa de Tony', videoId: 'ekYjfJ_QUlM', thumb: 'https://i.ytimg.com/vi/ekYjfJ_QUlM/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Boom Boom Sónico!', videoId: 'Lb_pIfak9l4', thumb: 'https://i.ytimg.com/vi/Lb_pIfak9l4/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Brillo | Video Musical', videoId: '6kv3kzPHrYQ', thumb: 'https://i.ytimg.com/vi/6kv3kzPHrYQ/hqdefault.jpg' },
  { title: 'Iron friends gigantezcos | Corto | Conoce a Iron Man y sus increíbles amigos', videoId: 'cjwlzfXvEKg', thumb: 'https://i.ytimg.com/vi/cjwlzfXvEKg/hqdefault.jpg' },
  { title: '¡Celebra Año Nuevo con Mickey y Minnie! | Mickey y Yo', videoId: 'VrnomMekCIU', thumb: 'https://i.ytimg.com/vi/VrnomMekCIU/hqdefault.jpg' },
  { title: 'Madre de Mérida se Transforma en Humana', videoId: 'qqlpqbUbRJM', thumb: 'https://i.ytimg.com/vi/qqlpqbUbRJM/hqdefault.jpg' },
  { title: 'Te presentamos a Buddy | Supergatitos | Compilado', videoId: 'QIa62QQ4Xpc', thumb: 'https://i.ytimg.com/vi/QIa62QQ4Xpc/hqdefault.jpg' },
  { title: 'Princesita Sofía | Video musical | Disney 👑🎶', videoId: 'yc99u_BESb4', thumb: 'https://i.ytimg.com/vi/yc99u_BESb4/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡Sigan a ese Monstruo!', videoId: '8DV0PrfOJQA', thumb: 'https://i.ytimg.com/vi/8DV0PrfOJQA/hqdefault.jpg' },
  { title: 'Mérida Aprende Tiro con Arco y Flecha Junto a su Padre', videoId: '2myM7I1ySdk', thumb: 'https://i.ytimg.com/vi/2myM7I1ySdk/hqdefault.jpg' },
  { title: 'Jugando con Winnie the Pooh | Corto | Piglet, Tigger y la Caja de Cartón', videoId: 'f6Shc1WqN7g', thumb: 'https://i.ytimg.com/vi/f6Shc1WqN7g/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Dos es mejor que uno | Video Musical', videoId: 'K2rE9Ll0ZLg', thumb: 'https://i.ytimg.com/vi/K2rE9Ll0ZLg/hqdefault.jpg' },
  { title: '¡Celebra el Cumpleaños de Minnie y Toodles! | La Casa de Mickey Mouse', videoId: '-x2BMkTR5Rc', thumb: 'https://i.ytimg.com/vi/-x2BMkTR5Rc/hqdefault.jpg' },
  { title: 'Rapunzel y Flynn Bailan en el Reino', videoId: 'hYKI8hAY9MI', thumb: 'https://i.ytimg.com/vi/hYKI8hAY9MI/hqdefault.jpg' },
  { title: 'Spidey y sus Sorprendentes Amigos | Clip | ¡El Bebé Hulk!', videoId: 'r8soa08S9Pw', thumb: 'https://i.ytimg.com/vi/r8soa08S9Pw/hqdefault.jpg' },
  { title: 'Minnie y Daisy van a dar un paseo con dos ponis! 🐴🎀 | Minnie’s Bow Toons: Hotel Para Mascotas', videoId: 'OrBdf3qxJ20', thumb: 'https://i.ytimg.com/vi/OrBdf3qxJ20/hqdefault.jpg' },
  { title: 'La Casa de Mickey Mouse | Goofy se Multiplica', videoId: 'Gug9d3LQ_Dk', thumb: 'https://i.ytimg.com/vi/Gug9d3LQ_Dk/hqdefault.jpg' },
  { title: '¡Princesita Sofia Conoce a Rapunzel, Blancanieves y Ariel! | Compilado', videoId: 'i0LAJKFp46A', thumb: 'https://i.ytimg.com/vi/i0LAJKFp46A/hqdefault.jpg' },
  { title: '¡Conoce a Iron Man y sus Increíbles Amigos! | Presentamos Iron Quarters', videoId: '-oKt3sXGeT0', thumb: 'https://i.ytimg.com/vi/-oKt3sXGeT0/hqdefault.jpg' },
  { title: 'Anna busca a Elsa❄️', videoId: 'jQfkhXqJkOQ', thumb: 'https://i.ytimg.com/vi/jQfkhXqJkOQ/hqdefault.jpg' },
  { title: 'Problema en el Campamento | Spidey Y Sus Sorprendentes Amigos | Clip', videoId: '2QRGpPtXQ1M', thumb: 'https://i.ytimg.com/vi/2QRGpPtXQ1M/hqdefault.jpg' },
  { title: 'Cars Toon: Mate, El Grande', videoId: 'kmhsQ1Peczo', thumb: 'https://i.ytimg.com/vi/kmhsQ1Peczo/hqdefault.jpg' },
  { title: 'El día de la Navidad - La casa de Mickey Mouse', videoId: 'zCLNQ-QFiyU', thumb: 'https://i.ytimg.com/vi/zCLNQ-QFiyU/hqdefault.jpg' },
  { title: 'Conoce a Winnie the Pooh | Corto', videoId: '6Heu2y-_fS4', thumb: 'https://i.ytimg.com/vi/6Heu2y-_fS4/hqdefault.jpg' },
  { title: 'Disney Jr Ariel | Brilla | Video Musical', videoId: 'y8mktuVZNqE', thumb: 'https://i.ytimg.com/vi/y8mktuVZNqE/hqdefault.jpg' },
  { title: 'STAR WARS | AVENTURAS DE JÓVENES JEDI | El problema con los Picos | Episodio Completo', videoId: 'o-Xonxk_osE', thumb: 'https://i.ytimg.com/vi/o-Xonxk_osE/hqdefault.jpg' },
  { title: 'Mariposa en peligro - Minnie Bow Toons, El campamento de Minnie', videoId: '1x2KgTjGZHo', thumb: 'https://i.ytimg.com/vi/1x2KgTjGZHo/hqdefault.jpg' },
  { title: 'Nuestro amor liberará: Princesita Sofía | Video musical | Disney', videoId: '7nFGjzjDOVA', thumb: 'https://i.ytimg.com/vi/7nFGjzjDOVA/hqdefault.jpg' },
  { title: '¡Mulán Salva a China!', videoId: 'Ato-9YUmfBY', thumb: 'https://i.ytimg.com/vi/Ato-9YUmfBY/hqdefault.jpg' },
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
  const iframe = document.getElementById('disney-player');
  if (!iframe) return;
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  const np = document.getElementById('disney-now-playing');
  if (np) np.textContent = `▶ Reproduciendo: ${title}`;
  iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Inicializar Disney al cargar

// ===================== NOTICIAS 24/7 — YOUTUBE LIVE =====================
// Canales de noticias argentinos que transmiten 24/7 en YouTube (nunca se cortan)
const NEWS_CHANNELS = {
  'tn':  { name: 'TN (Todo Noticias) — 24 horas', channelId: 'UCj6PcyLvpnIRT_2W_mwa9Aw' },
  'c13': { name: 'El Trece (Canal 13) — En vivo', channelId: 'UC0DM_mHV2u6dj8ig51GkQwg' },
  'c13sj': { name: 'Canal 13 San Juan (Cuyo) — Regional', channelId: 'UCnfpjpEMfxPXAI3Nc23MTWA' },
  'a24': { name: 'A24 — 24 horas', channelId: 'UCR9120YBAqMfntqgRTKmkjQ' },
  'ln':  { name: 'LN+ (La Nación+) — 24 horas', channelId: 'UCba3hpU7EFBSk817y9qZkiA' },
};

function switchNewsChannel(channelKey) {
  const ch = NEWS_CHANNELS[channelKey];
  if (!ch) return;
  const iframe = document.getElementById('news-player');
  if (!iframe) return;
  iframe.src = `https://www.youtube.com/embed/live_stream?channel=${ch.channelId}&autoplay=0`;
  const nameEl = document.getElementById('news-channel-name');
  if (nameEl) nameEl.textContent = `EN VIVO · ${ch.name}`;
}

// Cambiar de canal de noticias
document.querySelectorAll('#news-channels .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#news-channels .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    switchNewsChannel(chip.dataset.newsChannel);
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
