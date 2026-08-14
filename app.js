/* ====================================================================
   LUXTIN APP — Todo funciona SIN API KEYS
   
   APIs (todas gratuitas, sin registro):
   - ESPN:        site.api.espn.com → fútbol en vivo (15 ligas)
   - iTunes:      itunes.apple.com → música (tienda España = español)
   - Apple RSS:   rss.applemarketingtools.com → tendencias musicales
   - DevsAPIHub:  devsapihub.com/api-movies → 30 películas (datos)
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

// ===================== PELÍCULAS — DevsAPIHub + VidSrc (video real) =====================
// API datos:  https://devsapihub.com/api-movies
// API video:  https://vsembed.ru/embed/movie/{imdb_id}

const MOVIES_API = 'https://devsapihub.com/api-movies';
// Reproductor: multiembed.mov tiene 16 servidores (algunos con audio en español)
  const VIDSRC_BASE = 'https://multiembed.mov/?video_id=';

// Mapeo de títulos → IMDb IDs (para el reproductor VidSrc)
const IMDB_IDS = {
  'The Shawshank Redemption': 'tt0111161',
  'Jumanji': 'tt7975244',
  'The Godfather': 'tt0068646',
  'The Godfather: Part II': 'tt0071562',
  'The Dark Knight': 'tt0468569',
  '12 Angry Men': 'tt0050083',
  'No Hard Feelings': 'tt16673852',
  'The Lord of the Rings: The Return of the King': 'tt0167260',
  'Pulp Fiction': 'tt0110912',
  'The Good, the Bad and the Ugly': 'tt0060196',
  'The Lord of the Rings: The Fellowship of the Ring': 'tt0120737',
  'Fight Club': 'tt0137523',
  'Dune: Part Two': 'tt15239678',
  'Oppenheimer': 'tt15398776',
  'Barbie': 'tt1517268',
  'Spider-Man: No Way Home': 'tt10872600',
  'Avatar: The Way of Water': 'tt1630029',
  'The Batman': 'tt1877830',
  'Everything Everywhere All at Once': 'tt6710474',
  'The Matrix': 'tt0133093',
  'Mi Villano Favorito 4': 'tt7510282',
  'Hotel Transylvania 2': 'tt2510894',
  'Merlina - Temporada 2': 'tt13443470',
  'Super Mario Bros. La Película': 'tt6718170',
  'Moana 2': 'tt13622970',
  'Toy Story 4': 'tt1979376',
  'El Botín': 'tt32642706',
  'Apex': 'tt16431404',
  'Máquina de Guerra': 'tt15940132',
  'Una batalla tras otra': 'tt30144839',
};

// Títulos y descripciones traducidos al español
const SPANISH_MOVIES = {
  'The Shawshank Redemption': { titulo: 'Cadena Perpetua', descripcion: 'Dos hombres encarcelados forjan un vínculo a lo largo de los años, encontrando consuelo y eventual redención a través de actos de decencia común.' },
  'Jumanji': { titulo: 'Jumanji: Siguiente Nivel', descripcion: 'En Jumanji: Siguiente Nivel, el grupo está de vuelta pero el juego ha cambiado.' },
  'The Godfather': { titulo: 'El Padrino', descripcion: 'La saga de la familia Corleone, una de las dinastías del crimen más poderosas de la mafia italiana en Estados Unidos.' },
  'The Godfather: Part II': { titulo: 'El Padrino: Parte II', descripcion: 'La continuación de la saga Corleone, mostrando el ascenso de Michael como jefe de la familia y los orígenes de su padre Vito.' },
  'The Dark Knight': { titulo: 'Batman: El Caballero de la Noche', descripcion: 'Batman se enfrenta al Joker, un criminal caótico que siembra el terror en Gotham y pone a prueba los límites de la justicia.' },
  '12 Angry Men': { titulo: '12 Hombres sin Piedad', descripcion: 'Doce jurados deben decidir el destino de un joven acusado de asesinato. Uno de ellos cuestiona las evidencias y desafía al resto.' },
  'No Hard Feelings': { titulo: 'Sin Filtros', descripcion: 'Una joven acepta un trabajo inusual: salir con el hijo tímido de unos padres antes de que vaya a la universidad.' },
  'The Lord of the Rings: The Return of the King': { titulo: 'El Señor de los Anillos: El Retorno del Rey', descripcion: 'Frodo y Sam continúan su viaje hacia el Monte del Destino para destruir el Anillo mientras la última batalla por la Tierra Media se libra.' },
  'Pulp Fiction': { titulo: 'Tiempos Violentos', descripcion: 'Las vidas de dos sicarios, un boxeador, la esposa de un gánster y dos asaltantes se entrelazan en cuatro historias de violencia y redención.' },
  'The Good, the Bad and the Ugly': { titulo: 'El Bueno, el Feo y el Malo', descripcion: 'Tres pistoleros rivales buscan un tesoro enterrado durante la Guerra Civil estadounidense, formando alianzas y traiciones.' },
  'The Lord of the Rings: The Fellowship of the Ring': { titulo: 'El Señor de los Anillos: La Comunidad del Anillo', descripcion: 'Un joven hobbit hereda un anillo mágico y emprende un viaje épico para destruirlo antes de que caiga en manos del Señor Oscuro.' },
  'Fight Club': { titulo: 'El Club de la Pelea', descripcion: 'Un oficinista insomne conoce a un vendedor carismático y juntos fundan un club de lucha underground que se convierte en algo mucho más grande.' },
  'Dune: Part Two': { titulo: 'Dune: Parte Dos', descripcion: 'Paul Atreides se une a los Fremen para vengar a su familia y detener la destrucción del planeta desértico Arrakis.' },
  'Oppenheimer': { titulo: 'Oppenheimer', descripcion: 'La historia del físico J. Robert Oppenheimer y su rol en el desarrollo de la bomba atómica durante la Segunda Guerra Mundial.' },
  'Barbie': { titulo: 'Barbie', descripcion: 'Barbie y Ken viven en un mundo perfecto, pero cuando tienen la oportunidad de ir al mundo real, descubren que la vida no es tan perfecta como imaginaban.' },
  'Spider-Man: No Way Home': { titulo: 'Spider-Man: Sin Camino a Casa', descripcion: 'Tras ser revelada su identidad, Peter Parker pide ayuda al Doctor Strange, pero un hechizo sale mal y abre el multiverso.' },
  'Avatar: The Way of Water': { titulo: 'Avatar: El Camino del Agua', descripcion: 'Jake Sully y Neytiri forman una familia en Pandora, pero deben proteger su hogar de una nueva amenaza humana.' },
  'The Batman': { titulo: 'Batman', descripcion: 'En su segundo año luchando contra el crimen, Batman investiga una serie de asesinatos cometidos por el Acertijo que revelan secretos de Gotham.' },
  'Everything Everywhere All at Once': { titulo: 'Todo a la Vez en Todas Partes', descripcion: 'Una inmigrante china descubre que debe conectar con versiones de sí misma en universos paralelos para salvar la existencia.' },
  'The Matrix': { titulo: 'Matrix', descripcion: 'Un hacker descubre que la realidad es una simulación creada por máquinas y se une a la resistencia para liberar a la humanidad.' },
  'Mi Villano Favorito 4': { titulo: 'Mi Villano Favorito 4', descripcion: 'Gru y su familia enfrentan nuevos desafíos cuando un nuevo villano amenaza la ciudad y sus hijos crecen.' },
  'Hotel Transylvania 2': { titulo: 'Hotel Transylvania 2', descripcion: 'Drácula intenta enseñar a su nieto mitad humano, mitad vampiro a ser un monstruo mientras su hija y yerno regentan el hotel.' },
  'Merlina - Temporada 2': { titulo: 'Merlina - Temporada 2', descripcion: 'Merlina Addams regresa a la Academia Nevermore para un nuevo año lleno de misterios, criaturas y secretos oscuros.' },
  'Super Mario Bros. La Película': { titulo: 'Super Mario Bros. La Película', descripcion: 'Mario y Luigi son transportados a un mundo mágico donde deben unirse a la Princesa Peach para detener a Bowser.' },
  'Moana 2': { titulo: 'Moana 2', descripcion: 'Moana emprende un nuevo viaje por los mares del Pacífico para salvar a su isla y descubrir sus raíces como navegante.' },
  'Toy Story 4': { titulo: 'Toy Story 4', descripcion: 'Woody y el resto de los juguetes enfrentan una nueva aventura cuando un nuevo juguete llamado Forky amenaza con escapar.' },
  'El Botín': { titulo: 'El Botín', descripcion: 'Un grupo de policías de Miami descubre un botín de millones en efectivo, lo que genera desconfianza cuando otros se enteran del decomiso.' },
  'Apex': { titulo: 'Apex', descripcion: 'Una escaladora experta se enfrenta a la naturaleza y a una amenaza mortal en un río traicionero de montaña.' },
  'Máquina de Guerra': { titulo: 'Máquina de Guerra', descripcion: 'Un grupo de soldados de élite descubre una fuerza mortal de otro mundo durante su última prueba de entrenamiento de operaciones especiales.' },
  'Una batalla tras otra': { titulo: 'Una Batalla Tras Otra', descripcion: 'Un grupo de ex-revolucionarios se reúne para rescatar a la hija de uno de ellos cuando su enemigo reaparece después de 16 años.' },
};


// Géneros traducidos al español
const GENRE_ES = {
  'Drama': 'Drama', 'Crime': 'Crimen', 'Action': 'Acción', 'Adventure': 'Aventura',
  'Fantasy': 'Fantasía', 'Comedy': 'Comedia', 'Sci-Fi': 'Ciencia Ficción',
  'Western': 'Western', 'Biography': 'Biografía', 'History': 'Historia',
  'Romance': 'Romance', 'Thriller': 'Suspenso', 'Suspense': 'Suspenso',
  'Animation': 'Animación', 'Family': 'Familiar', 'Mystery': 'Misterio',
  'Dark Comedy': 'Comedia Negra', 'Science Fiction': 'Ciencia Ficción',
  'Survival': 'Supervivencia',
};

function traducirGeneros(genres) {
  if (!Array.isArray(genres)) return '';
  return genres.map(g => GENRE_ES[g] || g).join(', ');
}

let moviesList = [];
let loadedMovieCategories = {};

const MOVIE_CATEGORY_GENRES = {
  destacadas: null,
  ninos: 'Animation,Family,Comedy,Adventure,Fantasy',
  adolescentes: 'Action,Adventure,Sci-Fi,Fantasy,Thriller,Suspense',
  adultos: 'Drama,Crime,Biography,Western,History,Romance,Dark Comedy,Science Fiction',
};

async function loadMoviesByCategory(cat) {
  const container = document.getElementById('movies-grid');
  if (loadedMovieCategories[cat]) { moviesList = loadedMovieCategories[cat]; renderMovies(container, moviesList); return; }
  container.innerHTML = '<div class="loading">🎬 Cargando películas...</div>';
  try {
    let url;
    if (cat === 'destacadas') { url = MOVIES_API; }
    else { url = `${MOVIES_API}/genre/${MOVIE_CATEGORY_GENRES[cat] || cat}`; }
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const esp = SPANISH_MOVIES[m.title] || {};
    moviesList = data.map(m => {
      const esp = SPANISH_MOVIES[m.title] || {};
      return {
        id: m.id,
        title: esp.titulo || m.title,
        originalTitle: m.title,
        description: esp.descripcion || m.description,
        year: m.year, image_url: m.image_url, genre: m.genre, stars: m.stars,
        imdbId: IMDB_IDS[m.title] || null,
      };
    });
    loadedMovieCategories[cat] = moviesList;
    renderMovies(container, moviesList);
  } catch (err) {
    console.error('Error:', err);
    try {
      const res = await fetch(MOVIES_API);
      const data = await res.json();
      moviesList = data.map(m => {
        const esp = SPANISH_MOVIES[m.title] || {};
        return { id: m.id, title: esp.titulo || m.title, originalTitle: m.title, description: esp.descripcion || m.description, year: m.year, image_url: m.image_url, genre: m.genre, stars: m.stars, imdbId: IMDB_IDS[m.title] || null };
      });
      loadedMovieCategories[cat] = moviesList;
      renderMovies(container, moviesList);
    } catch (e) { container.innerHTML = '<div class="loading">Error al cargar. Reintentá.</div>'; }
  }
}

function renderMovies(container, movies) {
  if (!movies?.length) { container.innerHTML = '<div class="loading">No se encontraron películas.</div>'; return; }
  container.innerHTML = movies.map((m, i) => {
    const year = String(m.year || '');
    const genres = traducirGeneros(m.genre);
    const stars = m.stars || 0;
    const hasVideo = m.imdbId ? '<span style="color:var(--accent);">▶ Ver online</span>' : '';
    return `<div class="movie-card" onclick="openMovieModal(${i})"><img class="movie-poster" src="${m.image_url}" alt="${m.title}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect fill=%22%2315151f%22 width=%22300%22 height=%22450%22/><text fill=%22%238888a0%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 font-size=%2240%22>🎬</text></svg>'"><div class="movie-card-info"><div class="movie-card-title">${m.title}</div><div class="movie-card-meta"><span>${year}</span>${genres?`<span>· ${genres}</span>`:''}<span style="color:#fdcb6e;font-weight:700;">★ ${stars}</span>${hasVideo}</div></div></div>`;
  }).join('');
}

function openMovieModal(i) {
  const m = moviesList[i];
  if (!m) return;
  const modal = document.getElementById('movie-modal');
  const body = document.getElementById('modal-body');
  modal.classList.remove('hidden');

  const year = String(m.year || '');
  const genres = traducirGeneros(m.genre);
  const stars = m.stars || 0;
  const desc = m.description || 'Sin descripción disponible.';

  // Sistema de estrellas visual
  const fullStars = Math.floor(stars);
  const hasHalf = (stars % 1) >= 0.5;
  let starsHtml = '';
  for (let s = 0; s < 5; s++) {
    if (s < fullStars) starsHtml += '<span style="color:#fdcb6e;">★</span>';
    else if (s === fullStars && hasHalf) starsHtml += '<span style="color:#fdcb6e;">☆</span>';
    else starsHtml += '<span style="color:#555;">★</span>';
  }

  // Reproductor VidSrc (video real, sin YouTube)
  let videoHtml = '';
  if (m.imdbId) {
    const isTV = m.originalTitle?.includes('Merlina') || m.title.includes('Merlina');
    const embedUrl = isTV
      ? `https://multiembed.mov/?video_id=${m.imdbId}&s=2&e=1`
      : `${VIDSRC_BASE}${m.imdbId}`;

    videoHtml = `
      <div id="player-wrapper" style="position:relative;width:100%;padding-top:56.25%;border-radius:var(--radius-sm);overflow:hidden;background:#000;margin-top:1rem;">
        <iframe id="movie-iframe" src="${embedUrl}" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          style="position:absolute;inset:0;width:100%;height:100%;border:none;"
          scrolling="no" frameborder="0"></iframe>
        <button id="fs-btn" onclick="toggleFullscreen()"
          style="position:absolute;bottom:10px;right:10px;z-index:10;background:rgba(0,0,0,0.7);color:white;border:none;width:40px;height:40px;border-radius:8px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
          ⛶
        </button>
      </div>
    `;
  } else {
    videoHtml = '<p style="color:var(--text-muted);margin-top:1rem;">No hay reproductor disponible para esta película.</p>';
  }

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
      ${videoHtml}
    </div>
  `;
}

function toggleFullscreen() {
  const iframe = document.getElementById('movie-iframe');
  const wrapper = document.getElementById('player-wrapper');
  if (!iframe && !wrapper) return;
  
  const elem = wrapper || iframe;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (iframe && iframe.requestFullscreen) {
    iframe.requestFullscreen();
  } else if (iframe && iframe.webkitRequestFullscreen) {
    iframe.webkitRequestFullscreen();
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
  document.getElementById('movie-search-btn').addEventListener('click', () => { const q = document.getElementById('movie-search').value; if (q.trim()) searchMovies(q); });
  document.getElementById('movie-search').addEventListener('keypress', e => { if (e.key === 'Enter') searchMovies(e.target.value); });
  document.getElementById('close-modal').addEventListener('click', () => { document.getElementById('movie-modal').classList.add('hidden'); document.getElementById('modal-body').innerHTML = ''; });
  document.getElementById('movie-modal').addEventListener('click', e => { if (e.target.id === 'movie-modal') { document.getElementById('movie-modal').classList.add('hidden'); document.getElementById('modal-body').innerHTML = ''; } });
}

async function searchMovies(query) {
  const container = document.getElementById('movies-grid');
  container.innerHTML = '<div class="loading">🔍 Buscando...</div>';
  try {
    const res = await fetch(MOVIES_API);
    const data = await res.json();
    const q = query.toLowerCase();
    moviesList = data.filter(m => {
        const esp = SPANISH_MOVIES[m.title] || {};
        const tituloEsp = (esp.titulo || m.title).toLowerCase();
        return tituloEsp.includes(q) || m.title.toLowerCase().includes(q) || (Array.isArray(m.genre) && m.genre.some(g => g.toLowerCase().includes(q)));
      }).map(m => {
        const esp = SPANISH_MOVIES[m.title] || {};
        return { id: m.id, title: esp.titulo || m.title, originalTitle: m.title, description: esp.descripcion || m.description, year: m.year, image_url: m.image_url, genre: m.genre, stars: m.stars, imdbId: IMDB_IDS[m.title] || null };
      });
    document.querySelectorAll('#movie-categories .chip').forEach(c => c.classList.remove('active'));
    if (moviesList.length === 0) { container.innerHTML = '<div class="loading">No se encontraron películas para "' + query + '".</div>'; }
    else { renderMovies(container, moviesList); }
  } catch (e) { container.innerHTML = '<div class="loading">Error en la búsqueda.</div>'; }
}