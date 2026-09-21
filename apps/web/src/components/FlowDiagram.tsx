'use client'

import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

const MONO = "var(--font-mono,'JetBrains Mono',monospace)"
const SANS = "var(--font-sans,'Inter',sans-serif)"

const TEAL = '#14B88A'
const TEAL_HI = '#3DE0AE'
const EDGE = '#2A2A2A'
const FILL = '#0E0E0E'

/** smooth horizontal-tangent cubic between two ports */
function curve(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, Math.min(140, Math.abs(x2 - x1) * 0.5))
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

function Plus({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={20} height={20} rx={4} fill="rgba(20,184,138,.14)" stroke="rgba(20,184,138,.5)" />
      <text x={x + 10} y={y + 14} fill={TEAL} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 14 }}>+</text>
    </g>
  )
}

function Leaf({ x, y, w, h, label, value, accent }: {
  x: number; y: number; w: number; h: number; label: string; value: string; accent?: boolean
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={FILL}
        stroke={accent ? 'rgba(20,184,138,.5)' : EDGE} strokeWidth={1.2} />
      <text x={x + 16} y={y + h / 2 - 7} fill={accent ? TEAL : '#8A8A8A'}
        style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em' }}>{label}</text>
      <text x={x + 16} y={y + h / 2 + 12} fill="#EDEDED" style={{ fontFamily: MONO, fontSize: 13 }}>{value}</text>
    </g>
  )
}

function Chip({ x, y, w, h, label, value, hi }: {
  x: number; y: number; w: number; h: number; label: string; value: string; hi?: boolean
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#141414"
        stroke={hi ? 'rgba(61,224,174,.5)' : 'rgba(20,184,138,.3)'} strokeWidth={1.2} />
      <text x={x + 16} y={y + 24} fill={hi ? TEAL_HI : TEAL} style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.14em' }}>{label}</text>
      <text x={x + 16} y={y + 44} fill="#EDEDED" style={{ fontFamily: MONO, fontSize: 13 }}>{value}</text>
      <Plus x={x - 10} y={y - 10} />
    </g>
  )
}

function Container({ x, y, w, h, title, children }: {
  x: number; y: number; w: number; h: number; title: string; children: React.ReactNode
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={11} fill="#0B0B0B" stroke={EDGE} strokeWidth={1.2} />
      <line x1={x} y1={y + h - 38} x2={x + w} y2={y + h - 38} stroke={EDGE} strokeWidth={1} />
      <rect x={x + 1} y={y + h - 37} width={w - 2} height={36} rx={0} fill="rgba(20,184,138,.05)" />
      <text x={x + w / 2} y={y + h - 14} fill="#D6D6D6" textAnchor="middle" style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13 }}>{title}</text>
      {children}
    </g>
  )
}

type E = { id: string; from: [number, number]; to: [number, number]; label?: string; private?: boolean; faint?: boolean; dur: number }

// viewBox 0 75 1320 455
const EDGES: E[] = [
  { id: 'e1', from: [260, 333], to: [430, 312], label: 'secret a,b', private: true, dur: 1.8 },
  { id: 'e2', from: [260, 453], to: [430, 388], label: 'guest run', dur: 2.1 },
  { id: 'e3', from: [670, 312], to: [820, 312], label: 'journal', dur: 1.9 },
  { id: 'e4', from: [670, 388], to: [820, 388], label: 'seal', dur: 2.0 },
  { id: 'e5', from: [1060, 312], to: [1170, 350], dur: 1.7 },
  { id: 'e6', from: [1060, 388], to: [1170, 350], label: 'proof valid', dur: 1.9 },
  { id: 'e7', from: [260, 183], to: [940, 252], label: 'victim binding', faint: true, dur: 3.6 },
]

const PORTS: [number, number][] = [
  [260, 333], [260, 453], [260, 183], [430, 312], [430, 388],
  [670, 312], [670, 388], [820, 312], [820, 388],
  [1060, 312], [1060, 388], [1170, 350], [940, 252],
]

export default function FlowDiagram() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => { setReduce(prefersReducedMotion()) }, [])

  return (
    <div style={{ border: '1px solid #242424', borderRadius: 14, background: '#0A0A0A', overflow: 'hidden' }}>
      {/* app chrome */}
      <div className="flex items-center justify-between px-4 md:px-5 py-3" style={{ borderBottom: '1px solid #1c1c1c' }}>
        <div className="flex items-center gap-2.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, display: 'inline-block', boxShadow: `0 0 8px ${TEAL}` }} />
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#EDEDED', letterSpacing: '.04em' }}>proof_pipeline</span>
          <span className="hidden sm:inline" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A' }}>· victim → proof → verify → payout</span>
        </div>
        <div className="flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A' }}>
          <span className="inline-flex items-center gap-1.5" style={{ color: TEAL }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: TEAL, display: 'inline-block' }} /> live
          </span>
          <span className="hidden sm:inline">· testnet</span>
        </div>
      </div>

      {/* canvas */}
      <div style={{ width: '100%', overflowX: 'auto', background: '#080808' }}>
        <div style={{ minWidth: 920 }}>
          <svg viewBox="0 75 1320 455" width="100%" role="img"
            aria-label="Veil proof pipeline node graph"
            style={{ display: 'block' }}
          >
            <defs>
              <pattern id="flowgrid" width="26" height="26" patternUnits="userSpaceOnUse">
                <circle cx="1.2" cy="1.2" r="1.2" fill="#161616" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="1320" height="600" fill="url(#flowgrid)" />

            {/* edges */}
            {EDGES.map((e) => {
              const d = e.id === 'e7'
                ? 'M260,183 C470,96 760,96 940,252'
                : curve(e.from[0], e.from[1], e.to[0], e.to[1])
              const mx = e.id === 'e7' ? 600 : (e.from[0] + e.to[0]) / 2
              const my = e.id === 'e7' ? 108 : (e.from[1] + e.to[1]) / 2 - 12
              const col = e.private ? TEAL_HI : TEAL
              const lw = (e.label?.length ?? 0) * 6.2 + 18
              return (
                <g key={e.id}>
                  <path id={e.id} d={d} fill="none" stroke={EDGE} strokeWidth={1.5} />
                  <path d={d} fill="none" stroke={col}
                    strokeWidth={e.private ? 2 : 1.5}
                    strokeDasharray={e.private ? '5 7' : '6 9'} strokeLinecap="round"
                    className={reduce ? undefined : 'flow-edge'}
                    opacity={e.faint ? 0.4 : 0.95} />
                  {!reduce && (
                    <circle r={e.private ? 3.6 : 3} fill={col} opacity={e.faint ? 0.5 : 1}>
                      <animateMotion dur={`${e.dur}s`} repeatCount="indefinite">
                        <mpath href={`#${e.id}`} />
                      </animateMotion>
                    </circle>
                  )}
                  {e.label && (
                    <g>
                      <rect x={mx - lw / 2} y={my - 13} width={lw} height={20} rx={4}
                        fill="#0A0A0A" stroke={e.private ? 'rgba(61,224,174,.3)' : '#222'} strokeWidth={1} />
                      <text x={mx} y={my + 1} textAnchor="middle"
                        fill={e.private ? TEAL_HI : '#9A9A9A'} style={{ fontFamily: MONO, fontSize: 10.5 }}>{e.label}</text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* ports */}
            {PORTS.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r={3} fill={TEAL} />
            ))}

            {/* left source nodes */}
            <Leaf x={64} y={150} w={196} h={66} label="VICTIM CONTRACT" value="CA4F…9XQ2" accent />
            <Leaf x={64} y={300} w={196} h={66} label="HUNTER · SECRET" value="a •••  b •••" />
            <Leaf x={64} y={420} w={196} h={66} label="GUEST PROGRAM" value="is_broken()" />

            {/* zkVM */}
            <Container x={430} y={252} w={240} h={216} title="RISC Zero zkVM">
              <Chip x={454} y={282} w={192} h={60} label="RECEIPT" value="journal" hi />
              <Chip x={454} y={358} w={192} h={60} label="RECEIPT" value="seal" hi />
            </Container>

            {/* verifier */}
            <Container x={820} y={252} w={240} h={216} title="Verifier contract">
              <Chip x={844} y={282} w={192} h={60} label="CHECK" value="image_id ✓" />
              <Chip x={844} y={358} w={192} h={60} label="CHECK" value="victim_id ✓" />
            </Container>

            {/* payout */}
            <Leaf x={1170} y={317} w={124} h={66} label="PAYOUT" value="2,500 XLM" accent />
          </svg>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 md:px-5 py-3.5" style={{ borderTop: '1px solid #1c1c1c' }}>
        <span className="inline-flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 11, color: '#8A8A8A' }}>
          <span style={{ width: 16, borderTop: `2px dashed ${TEAL}`, display: 'inline-block' }} /> data flow
        </span>
        <span className="inline-flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 11, color: TEAL_HI }}>
          <span style={{ width: 16, borderTop: `2px dashed ${TEAL_HI}`, display: 'inline-block' }} /> private · never leaves the machine
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A' }}>
          secret <span style={{ color: '#EDEDED' }}>a,b</span> enter the proof, never the chain
        </span>
      </div>
    </div>
  )
}
