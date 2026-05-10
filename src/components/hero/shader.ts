export const VERTEX_SHADER = `
  precision highp float;

  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const DEBUG_FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vec3 color = vec3(
      vUv.x,
      vUv.y,
      0.5 + 0.5 * sin(uTime * 4.0)
    );
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uWarp;
  uniform float uRipple;
  uniform float uChrome;
  uniform float uContrast;
  uniform float uGrain;
  uniform float uPointer;
  uniform float uClouds;
  uniform vec2 uCenter;
  uniform float uCenterSize;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotate = mat2(0.78, -0.62, 0.62, 0.78);

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rotate * p * 2.02 + 0.17;
      amplitude *= 0.52;
    }

    return value;
  }

  float surface(vec2 p) {
    vec2 q = p;
    q.x += sin((p.y + uTime * 0.22) * 2.7) * 0.18 * uWarp;
    q.y += cos((p.x - uTime * 0.18) * 3.2) * 0.15 * uWarp;

    float ribbons =
      sin(q.x * 2.7 + uTime * 0.9) +
      cos(q.y * 3.1 - uTime * 0.64) +
      sin((q.x + q.y) * 4.2 + uTime * 0.36);

    float liquid = fbm(q * (1.9 + uRipple * 1.3) + uTime * 0.17);
    return ribbons * 0.22 + liquid * 0.78;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    // uMouse vem em coordenadas de tela (origem no topo).
    // gl_FragCoord/uv usa origem embaixo — inversão feita aqui.
    vec2 pointer = vec2(uMouse.x, 1.0 - uMouse.y);

    float aspect = uResolution.x / uResolution.y;
    vec2 center = vec2((uCenter.x - 0.5) * aspect, 0.5 - uCenter.y);
    float centerSize = max(uCenterSize, 0.1);

    float pointerField = smoothstep(0.56, 0.0, distance(uv, pointer)) * uPointer;
    p += normalize(p - center + 0.001) * pointerField * 0.13;

    vec2 focusP = (p - center) / centerSize;
    float h = surface(focusP);
    float e = 1.5 / min(uResolution.x, uResolution.y);
    float hx = surface(focusP + vec2(e, 0.0) / centerSize);
    float hy = surface(focusP + vec2(0.0, e) / centerSize);
    vec3 normal = normalize(vec3((h - hx) * 28.0, (h - hy) * 28.0, 1.0));

    vec3 lightA = normalize(vec3(-0.4, 0.28, 0.86));
    vec3 lightB = normalize(vec3(0.62, -0.35, 0.7));
    vec3 view = vec3(0.0, 0.0, 1.0);
    vec3 reflected = reflect(-view, normal);

    float bands = smoothstep(0.15, 0.92, h);
    float edge = pow(1.0 - max(dot(normal, view), 0.0), 2.2);
    float specA = pow(max(dot(reflected, lightA), 0.0), 18.0 + uChrome * 72.0);
    float specB = pow(max(dot(reflected, lightB), 0.0), 10.0 + uChrome * 42.0);
    float sheen = smoothstep(0.22, 0.96, sin((focusP.x - focusP.y) * 7.0 + h * 5.4));
    float focusGlow = smoothstep(0.82 * centerSize, 0.0, length(p - center));

    vec3 base = mix(uColorA, uColorB, bands);
    base = mix(base, uColorC, sheen * 0.36);
    base += (specA * uColorB + specB * uColorC) * (0.2 + uChrome * 0.86);
    base += edge * uChrome * 0.24;
    base += focusGlow * uColorB * (0.1 + uChrome * 0.2);
    base += pointerField * uColorB * 0.12;

    vec3 color = base;
    color = (color - 0.5) * (1.1 + uContrast * 0.9) + 0.5;

    float grain = (hash(gl_FragCoord.xy + uTime * 60.0) - 0.5) * uGrain;
    color += grain;
    color = max(color, 0.0);

    vec2 cloudP = focusP * vec2(1.28, 0.82) + vec2(uTime * 0.055, -uTime * 0.018);
    float cloudNoise = fbm(cloudP * (2.0 + uRipple * 0.8));
    cloudNoise += fbm(cloudP * 0.72 + vec2(4.0, 1.7)) * 0.52;

    float cloudMask = smoothstep(0.52, 0.96, cloudNoise + h * 0.16);
    float cloudBody = smoothstep(0.36, 0.74, cloudNoise);
    vec3 skyTop = mix(uColorA, vec3(0.05, 0.26, 0.58), 0.16);
    vec3 skyHorizon = mix(uColorC, vec3(0.86, 0.95, 1.0), 0.28);
    vec3 sky = mix(skyHorizon, skyTop, smoothstep(0.0, 1.0, uv.y));
    sky += vec3(0.06, 0.1, 0.14) * (1.0 - uv.y) * (1.0 - cloudMask);
    vec3 cloud = mix(vec3(0.72, 0.82, 0.92), uColorB, 0.76);
    cloud += vec3(0.2, 0.19, 0.16) * pow(cloudMask, 2.4);
    vec3 cloudColor = mix(sky, cloud, cloudMask * (0.58 + cloudBody * 0.38));
    cloudColor = mix(cloudColor, uColorC, sheen * 0.08);
    color = mix(color, cloudColor, uClouds);

    gl_FragColor = vec4(color, 1.0);
  }
`;
