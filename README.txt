# Add-on: SVG + Fondo Gris Oscuro

## Cómo usar (sin romper tu index.html)
1) Subí la carpeta completa a la raíz de tu PWA.
2) En tu `<head>`, agregá:
   `<link rel="stylesheet" href="./overrides.css">`
   (esto pone TODO el fondo en gris oscuro).
3) Para usar SVGs, importá el helper (si usás módulos):
   `<script type="module">
      import { setWxIcon } from './svg-icons.js';
      setWxIcon(document.querySelector('#icon-now'), 'cloud'); // ejemplos: sun, rain, storm, snow, fog
    </script>`

Si tu app ya genera iconos dinámicamente, llamá `setWxIcon()` donde asignabas el emoji.