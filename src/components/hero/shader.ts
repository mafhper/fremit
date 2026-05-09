export const VERTEX_SHADER = `attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform float uWarp;
uniform float uRipple;
uniform float uChrome;
uniform float uContrast;
uniform float uGrain;
uniform float uPointer;
uniform float uClouds;
uniform vec2  uCenter;
uniform float uCenterSize;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  vec2 q = p;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(q);
    q = rot * q * 2.0;
    amplitude *= 0.52;
  }
  return value;
}

float surface(vec2 p) {
  float t = uTime;
  vec2 q = p;
  q.x += sin(q.y * 2.0 + t * 0.7) * uWarp * 0.3;
  q.y += cos(q.x * 2.0 + t * 0.5) * uWarp * 0.3;
  float ribbons = sin(q.x * 3.0 + t * 0.8) * cos(q.y * 2.5 - t * 0.6);
  ribbons += sin(q.x * 5.0 + q.y * 4.0 + t * 1.2) * 0.5;
  ribbons += cos(q.x * 7.0 - q.y * 6.0 + t * 0.9) * 0.25;
  float f = fbm(q * 1.8 + vec2(t * 0.15, t * 0.12)) * uRipple;
  return ribbons * 0.5 + f * 0.7;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 centerOffset = uCenter - 0.5;
  p -= centerOffset * vec2(aspect, 1.0);

  float dist = length(p);
  float vignette = 1.0 - smoothstep(0.0, 1.8, dist);

  float focusGlow = exp(-dist * dist * 4.0 / max(uCenterSize, 0.01));

  if (uPointer > 0.5) {
    vec2 mouseOffset = (uMouse - 0.5) * vec2(aspect, 1.0);
    vec2 dir = p - mouseOffset;
    float influence = exp(-length(dir) * 3.0) * 0.15;
    p += normalize(dir) * influence;
  }

  float height = surface(p * 1.2);
  vec2 eps = vec2(0.005 / uResolution.x * aspect, 0.005 / uResolution.y);
  float hx = surface(p * 1.2 + eps.xy);
  float hy = surface(p * 1.2 + eps.yx);
  vec3 normal = normalize(vec3(hx - height, hy - height, 0.4));

  vec3 lightA = normalize(vec3(1.0, 2.0, 1.5));
  vec3 lightB = normalize(vec3(-1.5, -1.0, 1.0));
  float diffA = max(dot(normal, lightA), 0.0);
  float diffB = max(dot(normal, lightB), 0.15);

  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  vec3 halfA = normalize(lightA + viewDir);
  float specA = pow(max(dot(normal, halfA), 0.0), 20.0 + uChrome * 70.0);
  float specB = pow(max(dot(normal, halfA), 0.0), 8.0 + uChrome * 30.0);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
  float sheen = sin(p.x * 3.0 + p.y * 2.0 + height * 2.0) * 0.5 + 0.5;

  float bands = smoothstep(-0.6, 0.8, height);
  vec3 colA = uColorA;
  vec3 colB = uColorB;
  vec3 colC = uColorC;
  vec3 baseColor = mix(colA, colB, bands);
  baseColor = mix(baseColor, colC, sheen * 0.3);

  float lighting = diffA * 0.6 + diffB * 0.4;
  baseColor *= lighting;

  vec3 specColor = mix(colB, colC, 0.5) * (specA * 0.8 + specB * 0.3) * uChrome;
  baseColor += specColor;

  float edgeGlow = fresnel * uChrome * 0.3;
  baseColor += vec3(edgeGlow);

  vec3 skyTop = mix(colA, colB, 0.5);
  vec3 skyHorizon = mix(colB, colC, 0.7);
  vec3 skyGrad = mix(skyHorizon, skyTop, uv.y);

  float cloudNoise = fbm(p * 1.2 + vec2(uTime * 0.02, uTime * 0.015));
  float cloudPattern = smoothstep(0.35, 0.8, cloudNoise);
  float cloudHeight = uv.y * 0.6 + 0.2;
  vec3 cloudColor = mix(colB, colC, 0.15);
  skyGrad = mix(skyGrad, cloudColor, cloudPattern * cloudHeight * uClouds);

  float cloudSheen = sin(p.x * 2.0 + p.y * 3.0 + cloudNoise * 4.0) * 0.5 + 0.5;
  skyGrad += colC * cloudSheen * cloudPattern * 0.1 * uClouds;

  float mixFactor = smoothstep(0.3, 0.7, uv.y) * uClouds;
  vec3 sceneColor = mix(baseColor, skyGrad, mixFactor);

  float glow = focusGlow * 0.15;
  sceneColor += vec3(glow);

  sceneColor *= uContrast + 0.5;
  sceneColor *= 1.0 + vignette * 0.15;

  if (uGrain > 0.001) {
    float grainVal = hash(uv * uResolution + fract(uTime * 0.1));
    sceneColor += (grainVal - 0.5) * uGrain * 0.15;
  }

  sceneColor = pow(sceneColor, vec3(0.92));

  gl_FragColor = vec4(sceneColor, 1.0);
}`;
