'use client'

import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  style?: React.CSSProperties
  className?: string
}

export default function CanvasBurst({ style, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = cv.clientWidth || 800
      const h = cv.clientHeight || 380
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const gap = 11
      const cx = w / 2
      const cy = h * 0.5
      const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))
      const hash = (i: number, j: number) => {
        const n = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453
        return n - Math.floor(n)
      }
      const start = performance.now()
      const still = prefersReducedMotion()
      let raf = 0

      const draw = (t: number) => {
        const time = still ? 0 : (t - start) / 1000
        ctx.clearRect(0, 0, w, h)
        for (let y = 0; y <= h; y += gap) {
          for (let x = 0; x <= w; x += gap) {
            const dx = x - cx
            const dy = y - cy
            const dist = Math.hypot(dx, dy)
            const ang = Math.atan2(dy, dx)
            const nd = dist / maxR
            const ring = Math.sin(dist * 0.045 - time * 2.0)
            const ray = 0.5 + 0.5 * Math.sin(ang * 16 + Math.sin(time * 0.4) * 1.5)
            const fall = Math.max(0, 1 - nd * 1.05)
            let inten = fall * (0.4 + 0.45 * ring) * (0.32 + 0.68 * ray)
            inten *= 0.55 + 0.45 * hash(Math.round(x / gap), Math.round(y / gap))
            inten = Math.max(0, Math.min(1, inten))
            if (inten < 0.06) continue
            const sq = 1.0 + inten * 3.0
            const teal = nd < 0.2 && ring > 0.55
            ctx.fillStyle = teal
              ? `rgba(20,184,138,${(0.45 * inten + 0.2).toFixed(2)})`
              : `rgba(237,237,237,${(0.58 * inten).toFixed(2)})`
            ctx.fillRect(x - sq / 2, y - sq / 2, sq, sq)
          }
        }
        if (!still) raf = requestAnimationFrame(draw)
      }

      raf = requestAnimationFrame(draw)
      return () => cancelAnimationFrame(raf)
    }

    let cleanup = setup()

    const ro = new ResizeObserver(() => {
      cleanup?.()
      cleanup = setup()
    })
    ro.observe(cv)

    return () => {
      cleanup?.()
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
    />
  )
}
