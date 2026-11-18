// Inner pages: the header logo becomes the live planet (no intro). Falls back to the PNG.
import { createPlanet } from '/assets/planet.js';
const logo = document.querySelector('.hdr .brand img');
const c = document.createElement('canvas');
c.width = c.height = 1;
const planet = createPlanet(c, 34);
planet.ready.then(() => {
  c.style.width = c.style.height = '34px';
  logo.replaceWith(c);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) planet.start();
}, () => {});
