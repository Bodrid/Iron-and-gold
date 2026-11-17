export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uTerrain;
uniform sampler2D uOwner;
uniform sampler2D uStates;
uniform sampler2D uPalette;
uniform vec2 uCenter;      // map tile at the view centre
uniform vec2 uView;        // view size in device pixels
uniform float uZoom;       // device pixels per tile
uniform ivec2 uMap;        // map size in tiles
uniform int uSelected;     // selected state id or -1
out vec4 outColor;

ivec2 toTexel(vec2 t) { return ivec2(floor(t)); }
bool inside(ivec2 p) { return p.x >= 0 && p.y >= 0 && p.x < uMap.x && p.y < uMap.y; }
int ownerAt(ivec2 p) { vec4 o = texelFetch(uOwner, p, 0); return int(o.r * 255.0 + 0.5) + int(o.g * 255.0 + 0.5) * 256; }
int ctrlAt(ivec2 p) { vec4 o = texelFetch(uOwner, p, 0); return int(o.b * 255.0 + 0.5) + int(o.a * 255.0 + 0.5) * 256; }
int stateAt(ivec2 p) { vec4 s = texelFetch(uStates, p, 0); return int(s.r * 255.0 + 0.5) + int(s.g * 255.0 + 0.5) * 256; }
vec4 pal(int id) { return texelFetch(uPalette, ivec2(id, 0), 0); }

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  vec2 tile = uCenter + (frag - uView * 0.5) / uZoom;
  ivec2 p = toTexel(tile);
  if (!inside(p)) { outColor = vec4(0.07, 0.13, 0.19, 1.0); return; }
  vec3 col = texelFetch(uTerrain, p, 0).rgb;
  int owner = ownerAt(p);
  int ctrl = ctrlAt(p);
  int st = stateAt(p);
  if (st > 0 && owner > 0) {
    vec3 oc = pal(owner).rgb;
    col = mix(col, oc, 0.62);
    if (ctrl != owner && ctrl > 0) {
      float s = mod(gl_FragCoord.x + gl_FragCoord.y, 10.0);
      if (s < 4.0) col = mix(col, pal(ctrl).rgb, 0.85);
    }
  } else if (st > 0 && ctrl > 0) {
    col = mix(col, pal(ctrl).rgb, 0.5);
  }
  vec2 f = fract(tile);
  float w = clamp(1.2 / uZoom, 0.04, 0.5);
  bool countryEdge = false, stateEdge = false;
  ivec2 nb[4] = ivec2[4](ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1));
  bool near[4] = bool[4](f.x < w, f.x > 1.0 - w, f.y < w, f.y > 1.0 - w);
  for (int i = 0; i < 4; i++) {
    if (!near[i]) continue;
    ivec2 q = p + nb[i];
    if (!inside(q)) continue;
    if (stateAt(q) == 0) continue;
    if (ownerAt(q) != owner && st > 0) countryEdge = true;
    else if (stateAt(q) != st && st > 0) stateEdge = true;
  }
  if (countryEdge && owner > 0) col *= 0.45;
  else if (stateEdge && uZoom >= 4.0) col *= 0.82;
  if (uSelected > 0 && st == uSelected) {
    col = mix(col, vec3(1.0), 0.18);
    if (stateEdge || countryEdge) col = vec3(1.0, 0.86, 0.35);
  }
  outColor = vec4(col, 1.0);
}`;
