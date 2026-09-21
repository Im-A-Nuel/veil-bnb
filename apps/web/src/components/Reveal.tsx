'use client'

import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  /** ms delay for stagger */
  delay?: number
  /** px rise distance */
  y?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Reveals its children on scroll-into-view and hides them again on scroll-out,
 * so the effect re-triggers each pass. No-ops (always shown) under reduced motion.
 */
export default function Reveal({ children, delay = 0, y = 26, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) { setReduce(true); setShown(true); return }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setShown(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: reduce
          ? 'none'
          : `opacity 1s ease ${delay}ms, transform 1s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
