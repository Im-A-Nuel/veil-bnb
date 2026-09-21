'use client'

import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  onDone: () => void
  word?: string
}

type P = {
  hx: number; hy: number   // diamond home
  tx: number; ty: number   // VEIL target
  vx: number; vy: number   // shatter velocity
  nd: number; seed: number
}

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

// timeline (seconds)
const T_ASSEMBLE = 0.55
const T_MORPH    = 1.25
const T_HOLD     = 0.65
const T_SHATTER  = 1.05
const T_END      = T_ASSEMBLE + T_MORPH + T_HOLD + T_SHATTER  // ≈ 3.5s

export default function IntroOverlay({ onDone, word = 'VEIL' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    // honour reduced-motion: skip the whole intro, reveal landing immediately
    if (prefersReducedMotion()) {
      doneRef.current = true
      setLeaving(true)
      const tm = setTimeout(onDone, 120)
      return () => clearTimeout(tm)
    }

    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, cx = 0, cy = 0
    let diamond: { x: number; y: number; nd: number }[] = []
    let text: { x: number; y: number }[] = []
    let particles: P[] = []

    const build = () => {
      w = window.innerWidth
      h = window.innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = w / 2
      cy = h / 2

      const S = Math.min(w, h)             // stage size
      const gap = Math.max(8, Math.round(S / 42))
      const R = S * 0.34

      // diamond home points
      diamond = []
      for (let y = cy - R - gap; y <= cy + R + gap; y += gap) {
        for (let x = cx - R - gap; x <= cx + R + gap; x += gap) {
          const man = Math.abs(x - cx) + Math.abs(y - cy)
          if (man > R) continue
          diamond.push({ x, y, nd: man / R })
        }
      }

      // VEIL target points
      text = []
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const octx = off.getContext('2d')!
      const fs = Math.round(S * 0.26)
      octx.fillStyle = '#fff'
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.font = `700 ${fs}px Inter, system-ui, sans-serif`
      try { (octx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(S * 0.016)}px` } catch {}
      octx.fillText(word, cx, cy)
      const tstep = Math.max(5, Math.round(S / 82))
      const img = octx.getImageData(0, 0, w, h).data
      for (let y = 0; y < h; y += tstep) {
        for (let x = 0; x < w; x += tstep) {
          if (img[(y * w + x) * 4 + 3] > 120) text.push({ x, y })
        }
      }

      // particle pool
      const n = Math.max(diamond.length, text.length || 1)
      particles = []
      for (let i = 0; i < n; i++) {
        const d = diamond[i % diamond.length]
        const tp = text.length ? text[i % text.length] : d
        // shatter velocity: radial from center + jitter
        const ang = Math.atan2(tp.y - cy, tp.x - cx) + (Math.random() - 0.5) * 0.8
        const spd = S * (1.0 + Math.random() * 1.4)
        particles.push({
          hx: d.x, hy: d.y, tx: tp.x, ty: tp.y, nd: d.nd, seed: Math.random(),
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - S * 0.15,
        })
      }
    }

    build()

    const start = performance.now()
    let raf = 0

    const draw = (now: number) => {
      const time = (now - start) / 1000
      ctx.clearRect(0, 0, w, h)

      // phase progress
      const inShatter = time > T_ASSEMBLE + T_MORPH + T_HOLD
      const shatterT = clamp01((time - (T_ASSEMBLE + T_MORPH + T_HOLD)) / T_SHATTER)

      // background: opaque until shatter, then fade to reveal landing
      const bgAlpha = inShatter ? 1 - easeOutCubic(clamp01((shatterT - 0.05) / 0.85)) : 1
      ctx.fillStyle = `rgba(10,10,10,${bgAlpha.toFixed(3)})`
      ctx.fillRect(0, 0, w, h)

      // morph 0→1 (diamond → text)
      const m = clamp01((time - T_ASSEMBLE) / T_MORPH)
      // assemble fade-in
      const appear = clamp01(time / T_ASSEMBLE)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const er = clamp01((m - p.seed * 0.22) / (1 - 0.22))
        const e = easeInOutCubic(er)

        // base interpolated position diamond→text
        let x = p.hx + (p.tx - p.hx) * e
        let y = p.hy + (p.ty - p.hy) * e

        // colour: white near edge, teal toward center / in VEIL
        const tealT = p.seed < 0.5
        const wave = Math.sin(p.nd * 8 - time * 2)
        const tealD = p.nd < 0.36 && wave > 0.4
        const cD = tealD ? [20, 184, 138] : [237, 237, 237]
        const cT = tealT ? [20, 184, 138] : [237, 237, 237]
        const r = Math.round(cD[0] + (cT[0] - cD[0]) * e)
        const g = Math.round(cD[1] + (cT[1] - cD[1]) * e)
        const b = Math.round(cD[2] + (cT[2] - cD[2]) * e)

        let size = 1.4 + e * 1.2
        let alpha = (0.35 + 0.5 * e) * appear

        // shatter: fling outward + fade
        if (inShatter) {
          const st = easeOutCubic(shatterT)
          x += p.vx * st * 0.5
          y += p.vy * st * 0.5
          y += 240 * st * st * p.seed   // slight downward gravity drift
          size *= 1 + st * 1.2
          alpha *= 1 - shatterT
        }

        if (alpha < 0.03) continue
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
      }

      if (time >= T_END) {
        if (!doneRef.current) {
          doneRef.current = true
          setLeaving(true)
          setTimeout(onDone, 380)
        }
        return
      }
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        pointerEvents: leaving ? 'none' : 'auto',
        opacity: leaving ? 0 : 1,
        transition: 'opacity .38s ease',
      }}
    >
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
