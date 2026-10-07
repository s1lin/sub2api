<template>
  <div ref="root" class="ascii-artwork" aria-hidden="true">
    <pre>{{ frame }}</pre>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Live port of output/ascii-source/generate.py hero(): a ringed core with two moons on inclined orbits.
const COLS = 140
const ROWS = 45
const W = 1600
const H = 1040
const CW = W / COLS
const CH = H / ROWS
const SX = 2
const SY = 4
const RAMP = '@%#*+=-:. '
const CX = 800
const CY = 520
const CORE_R = 280
const RING_TILT = -0.22
const RING_RX = 600
const RING_RY = 250
// Depth of a point in the ring plane per unit of screen-space v.
const RING_Z = (RING_RX / RING_RY) * Math.sqrt(1 - (RING_RY / RING_RX) ** 2)
const LIGHT = (() => {
  const l = [-0.55, -0.6, 0.58]
  const n = Math.hypot(l[0], l[1], l[2])
  return l.map(c => c / n)
})()

interface Moon { radius: number; orbit: number; incline: number; tilt: number; period: number; phase: number }
const MOONS: Moon[] = [
  { radius: 72, orbit: 650, incline: 1.33, tilt: 0.28, period: 26, phase: -2.3 },
  { radius: 46, orbit: 430, incline: 1.08, tilt: -0.5, period: 14, phase: -0.75 },
]

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const mod1 = (v: number) => v - Math.floor(v)
const glyph = (ink: number) => RAMP[Math.round((1 - clamp(ink)) * (RAMP.length - 1))]

function shade(dx: number, dy: number, dz: number, floor: number, grid: boolean) {
  const lam = clamp(dx * LIGHT[0] + dy * LIGHT[1] + dz * LIGHT[2])
  let s = floor + (1 - floor) * lam ** 0.75 + 0.25 * (1 - dz) ** 3
  if (grid) {
    const t = 0.35
    const ty = dy * Math.cos(t) - dz * Math.sin(t)
    const tz = dy * Math.sin(t) + dz * Math.cos(t)
    const lat = Math.asin(clamp(-ty, -1, 1))
    const lon = Math.atan2(dx, tz)
    const step = Math.PI / 3
    const onLat = Math.abs(mod1(lat / step + 0.5) - 0.5) < 0.1
    const onLon = Math.abs(mod1(lon / step + 0.5) - 0.5) < 0.09 / (0.35 + Math.cos(lat))
    if ((onLat || onLon) && dz > 0.25) s *= 0.35
  }
  return clamp(s) ** 0.85
}

function sampleXY(cell: number, sub: number) {
  const col = cell % COLS
  const row = (cell - col) / COLS
  return [(col + ((sub % SX) + 0.5) / SX) * CW, (row + (Math.floor(sub / SX) + 0.5) / SY) * CH]
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function moonPosition(m: Moon, time: number) {
  const phi = m.phase + (2 * Math.PI * time) / m.period
  const u = m.orbit * Math.cos(phi)
  const depth = m.orbit * Math.sin(phi)
  const v = depth * Math.cos(m.incline)
  const ct = Math.cos(m.tilt)
  const st = Math.sin(m.tilt)
  return { x: CX + u * ct - v * st, y: CY + u * st + v * ct, z: depth * Math.sin(m.incline) }
}

const SUBS = SX * SY
const CELLS = COLS * ROWS
let staticInk: Float32Array
let staticZ: Float32Array
let staticChars: string[]

function buildStatic() {
  staticInk = new Float32Array(CELLS * SUBS)
  staticZ = new Float32Array(CELLS * SUBS).fill(-Infinity)
  const ca = Math.cos(RING_TILT)
  const sa = Math.sin(RING_TILT)
  for (let cell = 0; cell < CELLS; cell++) {
    for (let sub = 0; sub < SUBS; sub++) {
      const [x, y] = sampleXY(cell, sub)
      const i = cell * SUBS + sub
      const px = x - CX
      const py = y - CY
      const u = px * ca + py * sa
      const v = -px * sa + py * ca
      const s = Math.hypot(u / RING_RX, v / RING_RY)
      const theta = Math.atan2(v / RING_RY, u / RING_RX)
      const inner = s > 0.76 && s < 0.93
      const outer = s > 1.01 && s < 1.24
      const divider = mod1((theta * 28) / (2 * Math.PI)) < 0.16
      const depth = 0.5 + 0.5 * Math.sin(theta)
      const onRing = inner || (outer && !divider)
      const ringInk = (outer ? 0.35 + 0.6 * depth : 0.2 + 0.35 * depth) ** 0.85
      const inCore = px * px + py * py <= CORE_R * CORE_R
      if (onRing && v < 0 && !inCore) {
        staticInk[i] = ringInk
        staticZ[i] = v * RING_Z
      }
      if (inCore) {
        const dx = px / CORE_R
        const dy = py / CORE_R
        const dz = Math.sqrt(clamp(1 - dx * dx - dy * dy))
        staticInk[i] = shade(dx, dy, dz, 0.2, true)
        staticZ[i] = dz * CORE_R
      }
      if (onRing && v >= 0) {
        staticInk[i] = ringInk
        staticZ[i] = v * RING_Z
      }
    }
  }
  const rand = mulberry32(11)
  for (let n = 0; n < 28; n++) {
    const col = Math.floor(rand() * COLS)
    const row = Math.floor(rand() * ROWS)
    const value = (0.4 * (0.7 + rand() * 0.9)) ** 0.85
    if (Math.abs(row * CH - CY) < 400 && Math.abs(col * CW - CX) < 760) continue
    for (let sub = 0; sub < SUBS; sub++) {
      const i = (row * COLS + col) * SUBS + sub
      staticInk[i] = Math.max(staticInk[i], value)
    }
  }
  staticChars = new Array(CELLS)
  for (let cell = 0; cell < CELLS; cell++) {
    let sum = 0
    for (let sub = 0; sub < SUBS; sub++) sum += staticInk[cell * SUBS + sub]
    staticChars[cell] = glyph(sum / SUBS)
  }
  // Dotted orbit paths, only through empty space.
  for (const m of MOONS) {
    for (let k = 0; k < 96; k++) {
      const p = moonPosition(m, (k / 96) * m.period)
      const col = Math.floor(p.x / CW)
      const row = Math.floor(p.y / CH)
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue
      const cell = row * COLS + col
      if (staticChars[cell] === ' ') staticChars[cell] = k % 2 ? ' ' : '.'
    }
  }
}

function render(time: number) {
  if (!staticChars) buildStatic()
  const chars = staticChars.slice()
  const moons = MOONS.map(m => ({ ...moonPosition(m, time), r: m.radius }))
  const done = new Set<number>()
  for (const moon of moons) {
    const c0 = Math.max(0, Math.floor((moon.x - moon.r) / CW))
    const c1 = Math.min(COLS - 1, Math.floor((moon.x + moon.r) / CW))
    const r0 = Math.max(0, Math.floor((moon.y - moon.r) / CH))
    const r1 = Math.min(ROWS - 1, Math.floor((moon.y + moon.r) / CH))
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cell = row * COLS + col
        if (done.has(cell)) continue
        done.add(cell)
        let sum = 0
        let hit = false
        for (let sub = 0; sub < SUBS; sub++) {
          const [x, y] = sampleXY(cell, sub)
          let ink = staticInk[cell * SUBS + sub]
          let z = staticZ[cell * SUBS + sub]
          for (const other of moons) {
            const dx = (x - other.x) / other.r
            const dy = (y - other.y) / other.r
            const d2 = dx * dx + dy * dy
            if (d2 > 1) continue
            const dz = Math.sqrt(1 - d2)
            const surface = other.z + dz * other.r
            if (surface <= z) continue
            ink = shade(dx, dy, dz, 0.2, false)
            z = surface
            hit = true
          }
          sum += ink
        }
        if (hit) chars[cell] = glyph(sum / SUBS)
      }
    }
  }
  const lines: string[] = []
  for (let row = 0; row < ROWS; row++) lines.push(chars.slice(row * COLS, (row + 1) * COLS).join(''))
  return lines.join('\n')
}

const root = ref<HTMLElement | null>(null)
const frame = ref(render(0))
let raf = 0
let start = 0
let last = 0
let observer: IntersectionObserver | null = null

function tick(now: number) {
  raf = requestAnimationFrame(tick)
  if (!start) start = now
  // ~20fps keeps glyph motion smooth without re-rendering every display frame.
  if (now - last < 50) return
  last = now
  frame.value = render((now - start) / 1000)
}

function play() {
  if (!raf) raf = requestAnimationFrame(tick)
}

function pause() {
  cancelAnimationFrame(raf)
  raf = 0
}

onMounted(() => {
  if (typeof requestAnimationFrame !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  if (typeof IntersectionObserver === 'function' && root.value) {
    observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()))
    observer.observe(root.value)
  } else {
    play()
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  pause()
})
</script>

<style scoped>
.ascii-artwork { width: 100%; min-width: 0; container-type: inline-size; color: var(--brand-accent); user-select: none; }
/* font-size = 98cqw / (columns * 0.6em glyph advance) */
.ascii-artwork pre { margin: 0; overflow: hidden; font-family: var(--brand-mono); font-size: 1.167cqw; font-weight: 500; line-height: 1.2; letter-spacing: 0; font-variant-ligatures: none; white-space: pre; text-align: left; }
</style>
