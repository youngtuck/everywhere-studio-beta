// ═══ MAIA ORB v4 — Optimized Fluid Glass ═══
// Performance: ~15 noise evals/pixel (was ~50+)

function initOrb(canvasId, size) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return;

  // High-res rendering — fixes pixelation
  var dpr = Math.min(window.devicePixelRatio, 2);
  var renderSize = Math.max(size * dpr, size * 1.5);
  canvas.width = renderSize;
  canvas.height = renderSize;
  gl.viewport(0, 0, renderSize, renderSize);

  var vs = 'attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }';

  var fs = [
'precision highp float;',
'uniform float u_time;',
'uniform vec2  u_res;',
'uniform float u_light;',
'',
'vec3 mod289(vec3 x){ return x - floor(x/289.0)*289.0; }',
'vec4 mod289v(vec4 x){ return x - floor(x/289.0)*289.0; }',
'vec4 perm(vec4 x){ return mod289v((x*34.0+1.0)*x); }',
'',
'float noise3(vec3 v){',
'  vec3 i = floor(v + dot(v, vec3(1.0/3.0)));',
'  vec3 x0 = v - i + dot(i, vec3(1.0/6.0));',
'  vec3 g = step(x0.yzx, x0.xyz);',
'  vec3 l = 1.0 - g;',
'  vec3 i1 = min(g, l.zxy);',
'  vec3 i2 = max(g, l.zxy);',
'  vec3 x1 = x0 - i1 + 1.0/6.0;',
'  vec3 x2 = x0 - i2 + 1.0/3.0;',
'  vec3 x3 = x0 - 0.5;',
'  i = mod289(i);',
'  vec4 p = perm(perm(perm(',
'    i.z + vec4(0.0,i1.z,i2.z,1.0))',
'    + i.y + vec4(0.0,i1.y,i2.y,1.0))',
'    + i.x + vec4(0.0,i1.x,i2.x,1.0));',
'  vec4 j = p - 49.0*floor(p/49.0);',
'  vec4 gx = floor(j/7.0);',
'  vec4 gy = j - 7.0*gx;',
'  vec4 ox = (gx*2.0+0.5)/7.0-1.0;',
'  vec4 oy = (gy*2.0+0.5)/7.0-1.0;',
'  vec4 h = 1.0-abs(ox)-abs(oy);',
'  vec4 b0 = vec4(ox.xy,oy.xy);',
'  vec4 b1 = vec4(ox.zw,oy.zw);',
'  vec4 s0 = floor(b0)*2.0+1.0;',
'  vec4 s1 = floor(b1)*2.0+1.0;',
'  vec4 sh = -step(h, vec4(0.0));',
'  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;',
'  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;',
'  vec3 g0 = vec3(a0.xy,h.x);',
'  vec3 g1 = vec3(a0.zw,h.y);',
'  vec3 g2 = vec3(a1.xy,h.z);',
'  vec3 g3 = vec3(a1.zw,h.w);',
'  vec4 nr = 1.79284291400159-0.85373472095314*vec4(dot(g0,g0),dot(g1,g1),dot(g2,g2),dot(g3,g3));',
'  g0*=nr.x; g1*=nr.y; g2*=nr.z; g3*=nr.w;',
'  vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);',
'  m = m*m*m*m;',
'  return 42.0*dot(m, vec4(dot(g0,x0),dot(g1,x1),dot(g2,x2),dot(g3,x3)));',
'}',
'',
'// Light FBM — 3 octaves only',
'float fbm3(vec3 p){',
'  return noise3(p)*0.55 + noise3(p*2.0+100.0)*0.30 + noise3(p*4.0+200.0)*0.15;',
'}',
'',
'// Single-pass fluid warp (was double-pass)',
'float fluid(vec3 p, float t){',
'  vec3 q = vec3(fbm3(p + vec3(0.0,0.0,t*0.12)), fbm3(p + vec3(5.2,1.3,t*0.10)), 0.0);',
'  return fbm3(p + 3.0*q);',
'}',
'',
'vec3 pal(float t){',
'  return vec3(',
'    0.5+0.5*cos(6.283*(t+0.00)),',
'    0.5+0.5*cos(6.283*(t+0.10)),',
'    0.5+0.5*cos(6.283*(t+0.20)));',
'}',
'vec3 pal2(float t){',
'  return vec3(',
'    0.5+0.45*cos(6.283*(0.8*t+0.10)),',
'    0.5+0.40*cos(6.283*(0.7*t+0.25)),',
'    0.5+0.50*cos(6.283*(0.9*t+0.35)));',
'}',
'',
'void main(){',
'  vec2 uv = gl_FragCoord.xy/u_res;',
'  vec2 c = (uv-0.5)*2.0;',
'  float dist = length(c);',
'',
'  // Sphere mask',
'  float mask = 1.0 - smoothstep(0.79, 0.85, dist);',
'  if(mask < 0.001){ gl_FragColor = vec4(0.0); return; }',
'',
'  float t = u_time;',
'  float z = sqrt(max(0.0, 1.0-dist*dist*1.35));',
'  vec3 N = normalize(vec3(c, z));',
'  vec3 sph = vec3(c, z);',
'',
'  // Breathing',
'  vec3 wp = sph * 1.6 * (1.0 + sin(t*0.3)*0.006);',
'',
'  // Fluid layers',
'  float f1 = fluid(wp, t);',
'  float f2 = noise3(sph*2.8 + vec3(t*0.14, t*0.10, t*0.12));',
'  float flow = f1*0.7 + f2*0.3;',
'',
'  // Aurora color',
'  vec3 c1 = pal(flow*0.8 + t*0.018 + dist*0.3);',
'  vec3 c2 = pal2(f2*0.7 - t*0.014 + atan(c.y,c.x)*0.12);',
'  float dm = smoothstep(-0.2, 0.6, flow);',
'  vec3 base = mix(c1, c2, dm*0.6);',
'  base = mix(base, pal(f2*0.5+t*0.022+z*0.4), (1.0-z)*0.25);',
'',
'  // Luminance',
'  float lum = 0.38 + smoothstep(0.15,0.5,flow)*0.5 - smoothstep(0.0,-0.4,f1)*0.5;',
'  vec3 col = base * lum;',
'',
'  // Interior shadows',
'  col = mix(col, vec3(0.008,0.004,0.018), smoothstep(0.4,-0.3,f1)*0.4);',
'',
'  // Scatter + core glow',
'  col += base * exp(-dist*dist*2.5)*0.10;',
'  col += vec3(0.55,0.28,0.65) * exp(-dist*dist*4.0)*0.07;',
'',
'  // Glass rim',
'  float fresnel = pow(1.0-z, 4.0);',
'  vec3 rimCol = mix(pal(atan(c.y,c.x)*0.5+t*0.05+flow*0.4), vec3(0.85,0.88,1.0), 0.25);',
'  col += rimCol * smoothstep(0.68,0.81,dist)*smoothstep(0.85,0.79,dist) * 0.5;',
'  col += rimCol * fresnel * 0.28;',
'',
'  // Specular',
'  col += vec3(1.0,0.97,0.94)*pow(max(dot(N,normalize(vec3(-0.4,0.55,0.75))),0.0),48.0)*0.5;',
'  col += vec3(0.9,0.85,1.0)*pow(max(dot(N,normalize(vec3(0.5,0.3,0.85))),0.0),96.0)*0.25;',
'',
'  // Polish',
'  col *= 0.93+sin(t*0.25)*0.07;',
'  col *= mix(1.0, 0.72, pow(dist,3.0));',
'',
'  // Light theme',
'  vec3 lc = col*1.35+vec3(0.12,0.10,0.15);',
'  col = mix(col, mix(lc,vec3(1.0),0.08)*1.1, u_light);',
'',
'  // Tonemap',
'  col = col/(col+0.85)*1.3;',
'',
'  gl_FragColor = vec4(col*mask, mask);',
'}'
  ].join('\n');

  function mk(type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.error('Orb shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
  if(!v || !f) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f);
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    console.error('Orb link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  var pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(prog, 'u_time');
  var uR = gl.getUniformLocation(prog, 'u_res');
  var uL = gl.getUniformLocation(prog, 'u_light');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function draw(time){
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, time*0.001);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uL, document.documentElement.getAttribute('data-theme')==='light'?1.0:0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
