'use client'

import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  /** word the dots morph into */
  word?: string
}

type Particle = {
  hx: number; hy: number   // diamond "home" position
  tx: number; ty: number   // text target position
  nd: number               // normalized manhattan dist (0 center → 1 edge)
  seed: number             // per-particle randomness
}

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export default function CanvasDiamond({ width = 540, height = 540, className, style, word = 'VEIL' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth || width
    const h = cv.clientHeight || height
    cv.width = w * dpr
    cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = w / 2
    const cy = h / 2

    // ── 1. diamond home points ──────────────────────────────
    const gap = Math.max(7, Math.round(w / 45))
    const R = w * 0.46
    const diamond: { x: number; y: number; nd: number }[] = []
    for (let y = 0; y <= h; y += gap) {
      for (let x = 0; x <= w; x += gap) {
        const man = Math.abs(x - cx) + Math.abs(y - cy)
        if (man > R) continue
        diamond.push({ x, y, nd: man / R })
      }
    }

    // ── 2. text target points (sample VEIL pixels) ──────────
    const text: { x: number; y: number }[] = []
    {
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d')!
      const fs = Math.round(w * 0.24)
      octx.fillStyle = '#fff'
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.font = `700 ${fs}px Inter, system-ui, sans-serif`
      // letter spacing (supported in modern browsers; harmless if not)
      try { (octx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(w * 0.015)}px` } catch {}
      octx.fillText(word, cx, cy)

      const tstep = Math.max(4, Math.round(w / 90))
      const img = octx.getImageData(0, 0, w, h).data
      for (let y = 0; y < h; y += tstep) {
        for (let x = 0; x < w; x += tstep) {
          const a = img[(y * w + x) * 4 + 3]
          if (a > 120) text.push({ x, y })
        }
      }
    }

    // ── 3. build particle pool ──────────────────────────────
    const n = Math.max(diamond.length, text.length || 1)
    const particles: Particle[] = []
    for (let i = 0; i < n; i++) {
      const d = diamond[i % diamond.length]
      const tp = text.length ? text[i % text.length] : d
      particles.push({ hx: d.x, hy: d.y, tx: tp.x, ty: tp.y, nd: d.nd, seed: Math.random() })
    }

    // ── 4. timeline (seconds) ───────────────────────────────
    // diamond hold → morph in → text hold → morph out → loop
    const HOLD_D = 2.6, MORPH = 1.7, HOLD_T = 2.8
    const CYCLE = HOLD_D + MORPH + HOLD_T + MORPH
    const stagger = 0.24

    const linearMorph = (tt: number) => {
      if (tt < HOLD_D) return 0
      if (tt < HOLD_D + MORPH) return (tt - HOLD_D) / MORPH
      if (tt < HOLD_D + MORPH + HOLD_T) return 1
      return 1 - (tt - HOLD_D - MORPH - HOLD_T) / MORPH
    }

    const start = performance.now()
    const still = prefersReducedMotion()
    let raf = 0

    const draw = (now: number) => {
      const time = still ? 0 : (now - start) / 1000
      const m = linearMorph(time % CYCLE)
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // staggered eased morph per particle
        const er = clamp01((m - p.seed * stagger) / (1 - stagger))
        const e = easeInOutCubic(er)

        // diamond-state look (brightness wave)
        const wave = Math.sin(p.nd * 9 - time * 1.5)
        const intenD = clamp01((1 - p.nd) * 0.62 + wave * 0.24 + 0.12)
        const tealD = p.nd < 0.34 && wave > 0.5
        const sizeD = 1.1 + intenD * 3.4
        const alphaD = tealD ? 0.5 * intenD + 0.25 : 0.5 * intenD

        // text-state look (shimmer)
        const sh = 0.72 + 0.28 * Math.sin(time * 2.6 + p.seed * 7)
        const tealT = p.seed < 0.5
        const sizeT = 2.5
        const alphaT = tealT ? 0.55 * sh + 0.3 : 0.5 * sh + 0.22

        if (e < 0.001 && intenD < 0.07) continue

        // interpolate position / size / alpha
        const x = p.hx + (p.tx - p.hx) * e
        const y = p.hy + (p.ty - p.hy) * e
        const size = sizeD + (sizeT - sizeD) * e
        const alpha = alphaD + (alphaT - alphaD) * e
        if (alpha < 0.04) continue

        // interpolate colour (white ↔ teal per state)
        const cD = tealD ? [20, 184, 138] : [237, 237, 237]
        const cT = tealT ? [20, 184, 138] : [237, 237, 237]
        const r = Math.round(cD[0] + (cT[0] - cD[0]) * e)
        const g = Math.round(cD[1] + (cT[1] - cD[1]) * e)
        const b = Math.round(cD[2] + (cT[2] - cD[2]) * e)

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
      }

      if (!still) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [width, height, word])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width, height, ...style }}
    />
  )
}
