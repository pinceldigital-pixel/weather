
/**
 * Reemplaza contenido de elementos con iconos SVG.
 * Uso:
 *   setWxIcon(el, 'cloud'); // usa ./icons/cloud.svg
 */
export function setWxIcon(el, key){
  const img = document.createElement('img');
  img.alt = key;
  img.width = 32; img.height = 32;
  img.src = `./icons/${key}.svg`;
  el.innerHTML = '';
  el.appendChild(img);
}
