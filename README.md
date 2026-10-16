# Orunei

Orunei es una plataforma social para descubrir anime, organizar un AnimeList y compartir una identidad visual propia. La experiencia principal combina recomendaciones personalizadas, catálogo de AniList, noticias reales y perfiles con privacidad configurable.

## Qué incluye

- Recomendaciones personalizadas basadas en gustos, biblioteca, favoritos y noticias marcadas.
- Catálogo de anime conectado a AniList con búsqueda, filtros por géneros, tags, formato, año, estado y orden.
- Ranking de tendencias live usando los contadores `trending` de AniList.
- Hero y recomendaciones que se renuevan con contenido actual del catálogo.
- AnimeList privado con estados, favoritos, listas personalizadas y actividad.
- Sección **Donde lo dejaste** organizada cronológicamente por última reproducción real con reanudación al segundo exacto y aviso flotante.
- Reproductor web avanzado con streaming multi-servidor y subtítulos en español.
- **Anime Enhance (Anime4K + AMD FidelityFX CAS)** exclusivo para la web (opcional, apagado por defecto):
  - **Reconstrucción espacial de trazos (Anime4K)**: combina Difference of Gaussians (DoG 3x3) y gradiente Sobel para aislar contornos y aplicar line darkening moderado y line thinning direccional, devolviendo nitidez a animes 720p/1080p con compresión web sin tocar fondos planos.
  - **AMD FidelityFX CAS Anti-Ringing**: nitidez adaptativa local calculada independientemente por canal RGB con clamp estricto para evitar halos y ringing.
  - **Protección de texto y sombras**: filtros de luminancia que protegen subtítulos en pantalla de la erosión y previenen el aplastamiento de negros en escenas oscuras.
  - **Comparación A/B interactiva**: modo de pantalla dividida (Split-Screen) en tiempo real para contrastar visualmente el fotograma original contra el procesado.
  - **Tres perfiles claros**: `Normal` (video original sin procesamiento), `Equilibrado` (mejora moderada de contornos y nitidez) y `Alta Definición` (procesamiento más definido para GPUs potentes).
  - **Rendimiento adaptativo y seguridad**: resolución acotada a la ventana real con límite de `devicePixelRatio` (1.5x), watchdog de desconexión automática si la GPU cae por debajo de 45 FPS y canvas con `pointer-events: none`.
- **Modo Cine / Teatro** inmersivo para desktop y control profesional por teclado (`Espacio`/`K`, `F`, `T`, `M`, flechas, `J`/`L`, `N`, `P`, `S`, `B`).
- Salto inteligente de intros y endings con integración AniSkip, fallback automático y opción de Auto-Skip.
- Perfil privado editable con avatar, banner, biografía, identidad visual y privacidad por sección.
- Vista pública de perfil con permisos para contenido público y amigos.
- Sistema social con búsqueda de perfiles, solicitudes de amistad, bloqueo y comentarios moderables.
- Noticias de Anime News Network, Crunchyroll News y MyAnimeList News mediante RSS.
- Modo claro/oscuro, diseño responsive y soporte para `prefers-reduced-motion`.
- Descripciones en español por defecto, con opción de ver el texto original/inglés cuando AniList lo permite.

## Stack

- React 18
- Vite
- Tailwind CSS
- WebGL2 (Shaders de aceleración gráfica para Anime Enhance en la web)
- Supabase Auth, Database y Storage
- AniList GraphQL API
- RSS2JSON para noticias públicas
- Node.js y pruebas nativas con `node:test`

## Ejecutar localmente

Requisitos: Node.js 18 o superior y npm.

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

La aplicación se abre normalmente en `http://localhost:5173`.

### Variables de entorno

Completa `.env` con las variables necesarias:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON_PUBLICA
VITE_OMDB_KEY=
```

`VITE_OMDB_KEY` es opcional. IMDb se muestra como no disponible mientras esa integración no esté configurada. Nunca pongas una clave `service_role` en el frontend.

Para preparar Auth, perfiles, AnimeList, listas, privacidad y funciones sociales, sigue [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm test          # suite completa de pruebas
npm run build     # compilación de producción en dist/
npm run preview   # previsualización de la compilación
```

## Cómo llegan los datos

### AniList

El catálogo y el motor de recomendaciones consultan AniList GraphQL desde el navegador. El pool reúne anime popular, en tendencia, mejor valorado y recientemente actualizado. Se guarda temporalmente en `sessionStorage` y se renueva cada 10 minutos.

El panel **Tendencias hoy** no usa nombres ni números inventados: ordena el campo `trending` recibido de AniList y muestra la portada, el año y el contador de cada anime.

### Recomendaciones

El motor de `src/rec/` funciona en el navegador:

- extrae géneros, tags, estudio, formato y década;
- construye un perfil de gustos con señales de biblioteca, favoritos, clics y noticias;
- combina similitud, calidad, tendencia, popularidad y frescura;
- aplica diversidad para no mostrar siempre el mismo tipo de anime;
- conserva la privacidad del perfil porque no necesita enviar el historial de gustos a un servidor.

### Noticias

`src/news.jsx` consulta fuentes RSS públicas a través de RSS2JSON, combina los resultados y los guarda durante 10 minutos. Si una fuente falla, la interfaz lo comunica y no inventa artículos.

## Estructura principal

```text
src/
├── App.jsx                    # shell, navegación, búsqueda y páginas
├── data.js                    # fallbacks visuales y contenido inicial
├── api/anime.js               # detalles, ratings y fuentes externas
├── components/
│   ├── Hero.jsx               # recomendación principal live
│   ├── RightPanel.jsx         # perfil, gustos, tendencias y noticias
│   ├── AnimePage.jsx          # catálogo y filtros
│   ├── AnimeDetail.jsx        # ficha, episodios y comunidad
│   ├── AnimePlayer.jsx        # reproductor avanzado y controles
│   ├── ProfilePage.jsx        # perfil privado y AnimeList
│   ├── PublicProfileRoute.jsx # perfil público compartible
│   └── Poster.jsx             # imagen, caché y fallback visual
├── playback/                  # motor Anime Enhance (Anime4K + CAS), velocidad, atajos, gestos y skips
├── profile/                   # identidad, privacidad, listas y actividad
├── rec/                       # pool AniList y motor de recomendaciones
├── social/                    # amistades y comentarios
└── ui/                        # navegación, textos y layout responsive
```

## Pruebas y calidad

Antes de publicar un cambio importante:

```bash
npm test
npm run build
```

La suite cubre contratos de interacción, perfiles, privacidad, AnimeList, catálogo, recomendaciones, textos del hero y el ranking live.

## Despliegue en Vercel

1. Importa el repositorio de GitHub en Vercel.
2. Selecciona **Vite** como framework si Vercel no lo detecta automáticamente.
3. Usa `npm run build` como comando de build y `dist` como directorio de salida.
4. Agrega en Vercel las mismas variables de entorno de `.env` para los entornos que vayas a usar.
5. Despliega y revisa el registro, inicio de sesión, AnimeList, catálogo, tendencias y noticias.

Orunei usa navegación interna del shell y hashes para perfiles públicos, por lo que no necesita una configuración adicional de rutas para el despliegue base.

## Dominio de Hostinger

El dominio se agrega desde **Vercel → Project Settings → Domains**. Después, en el DNS de Hostinger se crean exactamente los registros que Vercel indique para ese dominio. Para el dominio raíz suele solicitarse un registro `A` y para `www` un `CNAME`; los valores pueden variar, así que se debe priorizar la instrucción que muestre Vercel en la pantalla de configuración.

Cuando Vercel valide los registros, activa HTTPS automáticamente. La propagación DNS puede tardar algunos minutos y, en ciertos casos, hasta 24 horas.

## Estado del proyecto

Orunei está en desarrollo activo. Anime y Noticias son las secciones operativas; Películas, Series y Juegos muestran una notificación de desarrollo hasta que sus fuentes y modelos estén listas.
