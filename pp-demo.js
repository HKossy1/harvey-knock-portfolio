// Parallel Perceptions, live: pink ripples spread across the Anthurium's leaves as you
// approach. The pointer stands in for the visitor; its distance from the plant plays the
// part of the nose depth MediaPipe tracked. Like the installation, nearness raises the
// ripples' red and blue together (colourless -> pink-purple) and speeds them up.
(function () {
  const stage = document.getElementById('pp-demo');
  if (!stage) return;
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) { stage.classList.add('no-webgl'); return; }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ripple centres, placed by hand on each leaf (as the leaves were mapped in Kantan Mapper)
  const CENTRES = [[0.2, 0.5193], [0.2692, 0.3807], [0.3846, 0.3466], [0.4462, 0.2273], [0.5462, 0.2386],
                   [0.5154, 0.4375], [0.7846, 0.4716], [0.7231, 0.3636], [0.3615, 0.5]];
  const PLANT = [0.48, 0.42];          // where "the plant" is, for measuring nearness

  const vert = `attribute vec2 p; varying vec2 uv;
    void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
  const frag = `precision mediump float;
    varying vec2 uv;
    uniform sampler2D plant, leaves;
    uniform float phase, level, aspect;
    uniform vec2 centres[9];
    void main(){
      vec3 base = texture2D(plant, uv).rgb;
      float leaf = texture2D(leaves, uv).r;
      float ripple = 0.;
      for (int i = 0; i < 9; i++) {
        vec2 d = (uv - centres[i]) * vec2(aspect, 1.);
        float r = length(d);
        // A few soft, feathered rings travelling outwards, fading towards the leaf's edge
        float rings = pow(.5 + .5 * sin(r * 96. - phase), 1.2);
        ripple = max(ripple, rings * smoothstep(.12, .012, r));
      }
      // The plant sits in low light, as in the installation's darkened room
      vec3 room = base * .58;
      // Red and blue rise together with nearness: none -> pink-purple
      float k = ripple * leaf * level;
      vec3 col = mix(room, vec3(1., .2, .82), k * .75) + vec3(1., .2, .82) * k * .15;
      gl_FragColor = vec4(col, 1.);
    }`;
  function shader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform2fv(U('centres'), new Float32Array(CENTRES.flat()));

  function texture(unit, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        resolve(img);
      };
      img.src = src;
    });
  }

  function size() {
    const r = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(stage.clientWidth * r); canvas.height = Math.round(stage.clientHeight * r);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U('aspect'), stage.clientWidth / stage.clientHeight);
  }

  // Nearness: 0 when the pointer is away, rising to 1 right at the plant
  let target = 0, level = 0, phase = 0, last = 0, running = false;
  function nearness(x, y) {
    const b = stage.getBoundingClientRect();
    const u = (x - b.left) / b.width, v = (y - b.top) / b.height;
    const d = Math.hypot((u - PLANT[0]) * b.width / b.height, v - PLANT[1]);
    return Math.max(0, Math.min(1, 1 - d / 0.55));
  }
  stage.addEventListener('pointermove', (e) => { target = nearness(e.clientX, e.clientY); });
  stage.addEventListener('pointerdown', (e) => { target = nearness(e.clientX, e.clientY); });
  stage.addEventListener('pointerleave', () => { target = 0; });
  stage.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') target = 0; });

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
    level += (target - level) * Math.min(dt * 2.2, 1);          // eases in and out
    phase += dt * (1.2 + 6 * level);                              // ripples always move, faster when near
    gl.uniform1f(U('phase'), phase);
    gl.uniform1f(U('level'), Math.pow(level, 1.3));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (running) requestAnimationFrame(frame);
  }

  Promise.all([texture(0, stage.dataset.plant), texture(1, stage.dataset.leaves)]).then(() => {
    gl.uniform1i(U('plant'), 0); gl.uniform1i(U('leaves'), 1);
    size();
    addEventListener('resize', size);
    if (still) { level = target = 0.7; frame(performance.now()); return; }
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { last = 0; requestAnimationFrame(frame); }
    }).observe(stage);
    frame(performance.now());
  });
})();
