'use client'
import { useState } from 'react'

export default function PriceTooltipIcon() {
  const [open, setOpen] = useState(false)
  return (
    <span
      tabIndex={0}
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', flexShrink: 0, cursor: 'help' }}
      onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={() => setOpen(false)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
    >
      🛡️
      {open && (
        <span className="info-tooltip price-tooltip" style={{ display: 'block' }}>
          Your purchase is covered by Slabsend Buyer Protection. The seller receives payment only after you confirm the item arrived as described.
        </span>
      )}
    </span>
  )
}
