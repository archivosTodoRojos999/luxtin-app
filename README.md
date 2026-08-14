# LUXTIN — App de Fútbol, Música y Películas

## ✅ TODO FUNCIONA SIN CONFIGURACIÓN

No necesitas ninguna API key. Todo funciona de una.

## Qué incluye
- **Animación de entrada** con el nombre LUXTIN (desaparece a los 6 segundos)
- **Sección Deportes**: Partidos reales en vivo de fútbol mundial (API de ESPN, sin key)
  - Premier League, La Liga, Serie A, Bundesliga, Argentina, Holanda, Portugal
  - Logo de cada equipo, marcador en vivo, estado del partido
  - Auto-actualización cada 60 segundos
- **Sección Música**: Canciones reales con búsqueda (API de iTunes + Apple RSS, sin key)
  - Tendencias musicales al abrir
  - Buscador de cualquier canción o artista
  - Reproductor con preview de audio
  - Botón para escuchar la canción completa en YouTube
  - Mini-reproductor flotante para segundo plano
- **Sección Películas**: Catálogo real con trailers (API de iTunes + Apple Movies, sin key)
  - Películas populares al abrir
  - Buscador de películas
  - Modal con sinopsis, géneros, año
  - Tráiler reproducible dentro de la app
  - Link a YouTube para más contenido
- Diseño responsive: se adapta a Android, iOS y PC
- PWA instalable como app nativa

## Cómo usarla

### Abrir online (ya publicada):
👉 https://archivostodorojos999.github.io/luxtin-app/

### Servidor local:
```bash
cd luxtin-app
python -m http.server 8000
# Abrí http://localhost:8000
```

### Convertir en APK:
1. Usá https://www.pwabuilder.com/ con la URL de GitHub Pages
2. Descargá el APK

## APIs usadas (todas gratuitas, sin registro)
- **ESPN**: `site.api.espn.com` — datos de fútbol en vivo
- **iTunes Search**: `itunes.apple.com/search` — música y películas
- **Apple Marketing Tools RSS**: `rss.applemarketingtools.com` — tendencias

## Estructura
```
luxtin-app/
├── index.html      → Estructura + splash animation
├── style.css        → Diseño responsive profesional
├── app.js           → Lógica: deportes, música, películas
├── manifest.json    → Config PWA
└── README.md        → Este archivo
```