# LUXTIN — App de Fútbol, Música y Películas

## Qué es
Una web app (PWA) con:
- **Animación de entrada** con el nombre LUXTIN (desaparece a los 6 segundos)
- **Sección Deportes**: Partidos en vivo de fútbol mundial (API real de football-data.org)
- **Sección Música**: Buscador y reproductor de canciones vía YouTube (millones de canciones)
- **Sección Películas**: Catálogo real con trailers oficiales (API de TMDB)
- Diseño responsive: se adapta a celular (Android/iOS) y PC
- Mini-reproductor flotante para escuchar música en segundo plano

---

## Cómo usarla (rápido)

### Opción 1: Abrir en el navegador (lo más fácil)
1. Abrí `index.html` en cualquier navegador
2. Listo, funciona. Las secciones de deportes y películas mostrarán instrucciones para activar las APIs

### Opción 2: Servidor local (recomendado)
```bash
# Con Python instalado:
cd luxtin-app
python -m http.server 8000

# Abrí http://localhost:8000 en el navegador
```

### Opción 3: Convertir en APK para Android
Usá [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) (Google oficial) o [PWABuilder](https://www.pwabuilder.com/):

1. Subí la carpeta `luxtin-app/` a cualquier hosting (Netlify, Vercel, GitHub Pages — todos gratis)
2. Entrá a https://www.pwabuilder.com/
3. Poné la URL de tu sitio
4. Descargá el APK generado

---

## Configurar APIs (para que todo sea 100% real)

Todo funciona con APIs gratuitas. Tardás 2 minutos en configurar cada una:

### 1. Películas — TMDB (GRATIS)
1. Entrá a https://www.themoviedb.org/settings/api
2. Registrate (gratis)
3. Solicitá una API key (te la dan al instante)
4. Abrí `app.js` y reemplazá `'TU_API_KEY_AQUI'` por tu key

### 2. Deportes — Football-Data.org (GRATIS, 100 requests/día)
1. Entrá a https://www.football-data.org/client/register
2. Registrate (gratis)
3. Te llega un email con tu API key
4. Abrí `app.js` y reemplazá `'TU_FOOTBALL_KEY_AQUI'` por tu key

### 3. Música — YouTube Data API (GRATIS, 10.000 requests/día)
1. Entrá a https://console.cloud.google.com/
2. Creá un proyecto nuevo
3. Habilitá "YouTube Data API v3"
4. Generá una API key (Credenciales → Crear credenciales → API key)
5. Abrí `app.js` y reemplazá `'TU_YOUTUBE_API_KEY_AQUI'` por tu key

---

## Estructura de archivos

```
luxtin-app/
├── index.html      → Estructura de la app + splash animation
├── style.css        → Todo el diseño (responsive, profesional)
├── app.js           → Lógica: deportes, música, películas
├── manifest.json    → Config PWA (instalable en móvil)
└── README.md        → Este archivo
```

---

## Características técnicas

- **Responsive**: Diseño adaptativo con CSS `clamp()`, `media queries` y grid flexible
- **PWA**: Instalable como app nativa en Android, iOS y desktop
- **Splash animation**: Letras LUXTIN con animación 3D, brillo y gradiente animado
- **Mini-player**: La música sigue sonando cuando minimizás el reproductor
- **Auto-refresh**: Los partidos se actualizan cada 60 segundos automáticamente
- **Lazy loading**: Imágenes cargan bajo demanda para mayor velocidad

---

## Nota legal
- La música se reproduce mediante YouTube IFrame API (uso legal y oficial de Google)
- Las películas muestran trailers oficiales vía TMDB + YouTube
- Los datos deportivos provienen de APIs oficiales (football-data.org)
- El streaming de películas completas requiere licencias de distribución — esta app muestra trailers e información oficial
