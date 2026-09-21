'use client'

import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  style?: React.CSSProperties
  className?: string
}

export default function CanvasDiagGrid({ style, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = cv.clientWidth || 900
      const h = cv.clientHeight || 420
      cv.width  = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cx = w / 2
      const cy = h / 2
      const gap = 19          // dot grid spacing
      const freq = 0.048      // band frequency (lower = wider beams)
      const ang = Math.PI * 0.28  // diagonal angle (~50°)
      const cosA = Math.cos(ang)
      const sinA = Math.sin(ang)
      const start = performance.now()
      const still = prefersReducedMotion()
      let raf = 0

      const draw = (t: number) => {
        const time = still ? 0 : (t - start) / 1000

        // Global breath: ±14% amplitude over ~3.8s
        const breath = 0.86 + 0.14 * Math.sin(time * 1.65)

        ctx.fillStyle = '#191919'
        ctx.fillRect(0, 0, w, h)

        for (let xi = -1; xi * gap < w + gap * 2; xi++) {
          for (let yi = -1; yi * gap < h + gap * 2; yi++) {
            const x = xi * gap
            const y = yi * gap

            // Diagonal bands — faster travel in opposite directions
            const p1 = x * cosA + y * sinA
            const p2 = x * cosA - y * sinA

            const b1 = Math.max(0, Math.sin(p1 * freq + time * 1.35))
            const b2 = Math.max(0, Math.sin(p2 * freq - time * 1.05))

            // Per-dot twinkle via grid-position hash
            const hash = Math.sin(xi * 127.1 + yi * 311.7) * 43758.5453
            const twinkle = 0.58 + 0.42 * ((Math.sin(time * 3.8 + hash) + 1) / 2)

            // Combine beams; softer gamma so more dots stay bright
            let inten = (b1 * b1 + b2 * b2) * 0.9
            inten = Math.pow(inten, 0.40)
            inten *= twinkle * breath

            // Inverted vignette: edges brighter, center darker
            const dx = (x - cx) / (w * 0.52)
            const dy = (y - cy) / (h * 0.62)
            const edge = Math.min(1.1, Math.hypot(dx, dy))
            inten *= Math.max(0, 0.14 + 0.90 * edge)

            if (inten < 0.04) continue

            const sq    = 1.5 + inten * 2.8
            const alpha = Math.min(0.84, inten * 0.84)
            ctx.fillStyle = `rgba(210,210,210,${alpha.toFixed(2)})`
            ctx.fillRect(x - sq / 2, y - sq / 2, sq, sq)
          }
        }

        if (!still) raf = requestAnimationFrame(draw)
      }

      raf = requestAnimationFrame(draw)
      return () => cancelAnimationFrame(raf)
    }

    let cleanup = setup()
    const ro = new ResizeObserver(() => { cleanup?.(); cleanup = setup() })
    ro.observe(cv)
    return () => { cleanup?.(); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
    />
  )
}
