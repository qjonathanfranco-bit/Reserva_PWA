/* ============================================================
   GALERÍA DEL CARRUSEL — 10 imágenes por deporte
   Para usar un link de Google (o cualquier web), pega la URL
   directa de la imagen en el campo "url" (clic derecho sobre la
   imagen > "Copiar dirección de la imagen"). Si "url" está vacío
   o el link falla, se muestra la imagen local de respaldo.
   ============================================================ */
window.CAROUSEL_IMAGES = {
  "wally": [
    {
      "local": "img/galeria/wally-01.svg",
      "alt": "Balón de wally",
      "url": ""
    },
    {
      "local": "img/galeria/wally-02.svg",
      "alt": "Rebote en la pared",
      "url": ""
    },
    {
      "local": "img/galeria/wally-03.svg",
      "alt": "Torneo de wally",
      "url": ""
    },
    {
      "local": "img/galeria/wally-04.svg",
      "alt": "Campeones",
      "url": ""
    },
    {
      "local": "img/galeria/wally-05.svg",
      "alt": "Marcador y tiempo",
      "url": ""
    },
    {
      "local": "img/galeria/wally-06.svg",
      "alt": "Zapatillas de juego",
      "url": ""
    },
    {
      "local": "img/galeria/wally-07.svg",
      "alt": "Defensa y rescate",
      "url": ""
    },
    {
      "local": "img/galeria/wally-08.svg",
      "alt": "Hinchada",
      "url": ""
    },
    {
      "local": "img/galeria/wally-09.svg",
      "alt": "Remate potente",
      "url": ""
    },
    {
      "local": "img/galeria/wally-10.svg",
      "alt": "Juego en equipo",
      "url": ""
    }
  ],
  "futsal": [
    {
      "local": "img/galeria/futsal-01.svg",
      "alt": "Balón de futsal",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-02.svg",
      "alt": "Gol",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-03.svg",
      "alt": "Chimpunes",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-04.svg",
      "alt": "Arquero",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-05.svg",
      "alt": "Copa de campeón",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-06.svg",
      "alt": "Camiseta del equipo",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-07.svg",
      "alt": "Silbato y árbitro",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-08.svg",
      "alt": "Medalla de oro",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-09.svg",
      "alt": "Disparo a puerta",
      "url": ""
    },
    {
      "local": "img/galeria/futsal-10.svg",
      "alt": "Fair play",
      "url": ""
    }
  ],
  "voley": [
    {
      "local": "img/galeria/voley-01.svg",
      "alt": "Balón de vóley",
      "url": ""
    },
    {
      "local": "img/galeria/voley-02.svg",
      "alt": "Copa de vóley",
      "url": ""
    },
    {
      "local": "img/galeria/voley-03.svg",
      "alt": "Medalla de oro",
      "url": ""
    },
    {
      "local": "img/galeria/voley-04.svg",
      "alt": "Remate",
      "url": ""
    },
    {
      "local": "img/galeria/voley-05.svg",
      "alt": "Bloqueo",
      "url": ""
    },
    {
      "local": "img/galeria/voley-06.svg",
      "alt": "Calzado deportivo",
      "url": ""
    },
    {
      "local": "img/galeria/voley-07.svg",
      "alt": "Uniforme del equipo",
      "url": ""
    },
    {
      "local": "img/galeria/voley-08.svg",
      "alt": "Aficionados",
      "url": ""
    },
    {
      "local": "img/galeria/voley-09.svg",
      "alt": "Tiempo de partido",
      "url": ""
    },
    {
      "local": "img/galeria/voley-10.svg",
      "alt": "Saludo final",
      "url": ""
    }
  ]
};

/* ============================================================
   BUSCADOR — fuente de fotos reales
   Por defecto las fotos se buscan en vivo en Wikimedia Commons
   (gratis, sin clave). Si quieres que vengan de Google Imágenes:
   1) crea un buscador en https://programmablesearchengine.google.com
      (activa "Búsqueda de imágenes") y copia su ID  -> googleCx
   2) crea una clave de API de "Custom Search JSON API" -> googleKey
   (Google da ~100 búsquedas gratis por día.)
   ============================================================ */
window.BUSCADOR_CONFIG = {
  googleKey: "",
  googleCx: "",
  porDeporte: 20
};
