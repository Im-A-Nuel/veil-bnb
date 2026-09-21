'use client'

import { Bounty, Filter } from '@/lib/data'

const MONO  = "var(--font-mono,'JetBrains Mono',monospace)"
const SERIF = "var(--font-serif,'Instrument Serif',serif)"
const SANS  = "var(--font-sans,'Inter',sans-serif)"

interface Props {
  bounties: (Bounty & { isOpen: boolean; isClaimed: boolean })[]
  openCount: number
  totalPool: string
  filter: Filter
  search: string
  onFilter: (f: Filter) => void
  onSearch: (q: string) => void
  onSubmit: (id: string) => void
  onDetail: (id: string) => void
}

export default function Hunt({ bounties, openCount, totalPool, filter, search, onFilter, onSearch, onSubmit, onDetail }: Props) {
  const filterBg  = (f: Filter) => filter === f ? 'rgba(20,184,138,.1)' : 'transparent'
  const filterClr = (f: Filter) => filter === f ? '#14B88A' : '#8A8A8A'

  return (
    <div className="max-w-[1240px] mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-16 md:pb-20">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-0 pb-6 md:pb-7 mb-6 md:mb-7"
        style={{ borderBottom: '1px solid #242424' }}
      >
        <div>
          <h1 className="text-[40px] md:text-[52px] mb-2"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1, color: '#EDEDED', margin: 0 }}
          >Open bounties</h1>
          <p style={{ fontFamily: MONO, fontSize: 13, color: '#8A8A8A', margin: 0, letterSpacing: '.01em' }}>
            Find a contract, break it privately, claim the reward.
          </p>
        </div>
        <div className="text-right" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          {openCount} open · {totalPool} XLM pooled
        </div>
      </div>

      {/* filters + search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'open', 'claimed'] as Filter[]).map(f => (
            <span key={f} onClick={() => onFilter(f)}
              className="vlink text-[11px] md:text-[12px] px-3 md:px-4 py-2"
              style={{ fontFamily: MONO, letterSpacing: '.02em', border: '1px solid #242424', borderRadius: 2, cursor: 'pointer', background: filterBg(f), color: filterClr(f), textTransform: 'capitalize' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </span>
          ))}
        </div>
        <div className="vinput flex items-center gap-2 w-full sm:w-[280px] md:w-[300px]"
          style={{ border: '1px solid #242424', borderRadius: 2, padding: '9px 14px' }}
        >
          <span style={{ color: '#5A5A5A', fontFamily: MONO, fontSize: 13 }}>⌕</span>
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="search by contract…"
            className="w-full"
            style={{ background: 'transparent', border: 'none', color: '#EDEDED', fontFamily: MONO, fontSize: 13 }}
          />
        </div>
      </div>

      {/* cards: desktop 3-col, mobile 1-col */}
      {bounties.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center"
          style={{ border: '1px dashed #242424', borderRadius: 4, padding: '64px 20px' }}
        >
          <div style={{ fontSize: 26, color: '#333', marginBottom: 14 }}>⌕</div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: '#EDEDED', marginBottom: 6 }}>No bounties found</div>
          <p style={{ fontFamily: MONO, fontSize: 12, color: '#5A5A5A', margin: 0 }}>
            {search.trim() ? <>Nothing matches “{search.trim()}”. Try another contract or filter.</> : 'No bounties in this filter yet.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: 1, background: '#242424', border: '1px solid #242424' }}
      >
        {bounties.map(b => (
          <div key={b.id} className="vcard p-4 md:p-6 flex flex-col" style={{ background: '#111111', minHeight: 200 }}>
            <div className="flex items-start justify-between mb-4 md:mb-5">
              {b.isOpen
                ? <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', padding: '4px 9px', borderRadius: 2, background: 'rgba(20,184,138,.08)', border: '1px solid rgba(20,184,138,.35)', color: '#14B88A' }}>OPEN</span>
                : <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', padding: '4px 9px', borderRadius: 2, background: 'transparent', border: '1px solid #242424', color: '#5A8A75' }}>CLAIMED</span>
              }
              <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 20, color: '#EDEDED' }}>{b.reward}</span>
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: '#EDEDED', marginBottom: 6 }}>{b.title}</div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#8A8A8A', margin: '0 0 14px', fontFamily: SANS }}>{b.desc}</p>
            <div className="mt-auto pt-3 mb-3" style={{ fontFamily: MONO, fontSize: 11, color: '#5A5A5A', letterSpacing: '.02em', borderTop: '1px solid #1c1c1c' }}>
              victim: {b.victim}
            </div>
            {b.isOpen
              ? <button onClick={() => onSubmit(b.id)} className="vbtn vbtn-ghost" style={{ width: '100%', background: 'transparent', color: '#EDEDED', border: '1px solid #333', padding: '10px', fontFamily: SANS, fontWeight: 500, fontSize: 13, borderRadius: 2, cursor: 'pointer' }}>Submit proof →</button>
              : <button onClick={() => onDetail(b.id)} className="vbtn vbtn-ghost" style={{ width: '100%', background: 'transparent', color: '#5A8A75', border: '1px solid #242424', padding: '10px', fontFamily: SANS, fontWeight: 500, fontSize: 13, borderRadius: 2, cursor: 'pointer' }}>View details →</button>
            }
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
