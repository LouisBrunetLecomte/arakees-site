// Home intro: the planet appears, spins left, makes room for the name, then both dock into the header.
import { createPlanet } from '/assets/planet.js';
const intro = document.getElementById('intro'), holder = document.getElementById('planet'), iname = document.getElementById('iname');
const logo = document.querySelector('.hdr .brand img'), word = document.querySelector('.hdr .brand span');
const planet = createPlanet(holder.querySelector('canvas'), 400);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let seen = false; try { seen = sessionStorage.getItem('arakees.intro') === '1'; } catch {}
const BIG = 400, tr = (x, y, size) => `translate(${x}px, ${y}px) scale(${size / BIG})`;
function dock() {
  const c = holder.querySelector('canvas');
  c.style.width = c.style.height = '34px';
  logo.replaceWith(c);
  planet.resize(34); // rendered at logo size: sharp, no pixel shimmer
  holder.remove(); iname.remove();
  document.documentElement.classList.remove('intro-on');
  intro.classList.add('gone');
  setTimeout(() => intro.remove(), 700);
  try { sessionStorage.setItem('arakees.intro', '1'); } catch {}
}
// without WebGL2, or if the texture takes over 2.5 s, keep the PNG logo and skip the intro
function fallback() { holder.remove(); iname.remove(); intro.remove(); document.documentElement.classList.remove('intro-on'); }
const ready = Promise.race([planet.ready, new Promise((_, ko) => setTimeout(() => ko(new Error('slow')), 3500))]);
if (reduce || seen) { intro.remove(); iname.remove(); } // no white screen for visitors who already saw the intro
if (reduce || seen) ready.then(() => { if (!reduce) planet.start(); dock(); }, fallback);
else { document.documentElement.classList.add('intro-on'); ready.then(runIntro, fallback); }
function runIntro() {
  scrollTo(0, 0);
  planet.start();
  let skipped = false;
  const D = ms => (skipped ? 1 : ms), wait = ms => new Promise(r => setTimeout(r, skipped ? 0 : ms));
  intro.addEventListener('click', () => { skipped = true; [holder, iname].forEach(el => el.getAnimations().forEach(a => a.finish())); });
  const opt = ms => ({ duration: D(ms), easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
  (async () => {
    const s = Math.min(BIG, innerWidth * 0.6, innerHeight * 0.45), cx = innerWidth / 2 - s / 2, cy = innerHeight / 2 - s / 2;
    const a = tr(cx, cy, s);
    await holder.animate([{ transform: tr(cx, cy + 30, s * .7), opacity: 0 }, { transform: a, opacity: 1 }], opt(800)).finished;
    await wait(150);
    // the planet moves left (above the name on mobile) and makes room for the name
    const k = s * .3, narrow = innerWidth < 760;
    const b = narrow ? tr(innerWidth / 2 - k / 2, innerHeight / 2 - k - 70, k) : tr(innerWidth / 2 - iname.offsetWidth / 2 - k - 28, innerHeight / 2 - k / 2, k);
    iname.classList.add('on');
    await holder.animate([{ transform: a, opacity: 1 }, { transform: b, opacity: 1 }], opt(700)).finished;
    await wait(550);
    // then planet and name dock together top-left while the backdrop fades
    const r = logo.getBoundingClientRect(), n0 = iname.getBoundingClientRect(), n1 = word.getBoundingClientRect();
    const sc = parseFloat(getComputedStyle(word).fontSize) / parseFloat(getComputedStyle(iname).fontSize);
    const from = `translate(${n0.left}px, ${n0.top}px) scale(1)`;
    const to = `translate(${n1.left}px, ${n1.top + n1.height / 2 - n0.height * sc / 2}px) scale(${sc})`;
    Object.assign(iname.style, { left: 0, top: 0, transform: from });
    intro.classList.add('gone');
    await Promise.all([
      holder.animate([{ transform: b }, { transform: tr(r.left, r.top, r.width) }], opt(750)).finished,
      iname.animate([{ transform: from }, { transform: to }], opt(750)).finished,
    ]);
    dock();
  })();
}
