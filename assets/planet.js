// Arakees planet: a sphere rendered in WebGL2 from a pre-generated 4K texture.
// Sharp at any size (screen resolution), drifting clouds, atmosphere glow.
// Spins left. Without WebGL2, `ready` rejects and the page keeps the PNG logo.
const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D surf, cloud; uniform float rot, px;
const float PI = 3.14159265;
// seamless sampling across the 180° meridian (Tarini's method)
vec4 seamless(sampler2D t, vec2 c) {
  vec2 c2 = vec2(fract(c.x + .5) - .5, c.y);
  vec2 dx = dFdx(c), dy = dFdy(c), dx2 = dFdx(c2), dy2 = dFdy(c2);
  bool alt = abs(dx2.x) + abs(dy2.x) < abs(dx.x) + abs(dy.x);
  return textureGrad(t, c, alt ? dx2 : dx, alt ? dy2 : dy);
}
void main() {
  vec2 q = uv * vec2(1., -1.);
  float d = dot(q, q);
  if (d > 1.) discard;
  float z = sqrt(1. - d);
  float tilt = .32, yy = q.y * cos(tilt) + z * sin(tilt), zz = -q.y * sin(tilt) + z * cos(tilt);
  float lon = atan(q.x, zz) / (2. * PI), lat = asin(clamp(yy, -1., 1.)) / PI + .5;
  vec3 col = seamless(surf, vec2(lon + rot, 1. - lat)).rgb;
  float cl = seamless(cloud, vec2(lon + rot * 1.35, 1. - lat)).r;
  vec3 n = vec3(q, z), L = normalize(vec3(-.55, -.45, .7));
  float diff = max(dot(n, L), 0.);
  // sun glint on water
  float water = smoothstep(.05, .2, col.b - col.r);
  vec3 h = normalize(L + vec3(0., 0., 1.));
  float spec = pow(max(dot(n, h), 0.), 60.) * water * .55;
  col = mix(col, vec3(1.), cl * .92);
  col = col * (diff * 1.08 + .07) + spec;
  float rim = pow(1. - z, 2.5) * (diff + .25);
  col += vec3(.45, .75, 1.) * rim * .6;
  float edge = clamp((1. - sqrt(d)) / px, 0., 1.); // anti-aliased edge
  o = vec4(col * edge, edge);
}`;

const load = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

export function createPlanet(canvas, cssSize = 400) {
  const N = Math.round(cssSize * Math.min(2, devicePixelRatio || 1));
  canvas.width = canvas.height = N;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  let rot = 0, last = 0, raf = 0, running = false, uRot, uPx, size = N;

  function draw(dt) {
    rot = (rot + dt * 0.00003) % 1; // spins left
    gl.uniform1f(uRot, rot);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    draw(Math.min(64, t - last)); last = t;
  }

  // the canvas is always rendered at its display size: shrinking a large image
  // in the browser looks pixelated, while the GPU downsamples the texture cleanly
  function setSize(n) {
    size = n; canvas.width = canvas.height = n;
    gl.viewport(0, 0, n, n);
    gl.uniform1f(uPx, Math.min(2.5, n / 40) / n);
    draw(0);
  }

  const ready = (async () => {
    if (!gl) throw new Error('WebGL2 indisponible');
    const base = new URL('.', import.meta.url);
    // light 2K textures first (fast first paint), full 4K swapped in once downloaded
    const [surf, cloud] = await Promise.all([load(new URL('planet-2k.webp', base)), load(new URL('planet-clouds-1k.webp', base))]);
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const texs = [surf, cloud].map((im, i) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      return t;
    });
    Promise.all([load(new URL('planet-4k.webp', base)), load(new URL('planet-clouds.webp', base))]).then(full => full.forEach((im, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texs[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      draw(0);
    }), () => {});
    gl.uniform1i(gl.getUniformLocation(prog, 'surf'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'cloud'), 1);
    uPx = gl.getUniformLocation(prog, 'px');
    uRot = gl.getUniformLocation(prog, 'rot');
    setSize(size);
  })();

  return {
    ready,
    start() { ready.then(() => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }, () => {}); },
    stop() { running = false; cancelAnimationFrame(raf); },
    frame() { return ready.then(() => draw(0)); },
    resize(cssPx) { ready.then(() => setSize(Math.round(cssPx * Math.min(3, devicePixelRatio || 1))), () => {}); },
  };
}
