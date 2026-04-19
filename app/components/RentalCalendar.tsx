'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  listingId: number
  pricePerDay: number
  rentalPeriod: string
  isOwner: boolean
  currentUserId?: string
  weeklyDiscountPct?: number
  monthlyDiscountPct?: number
  pickupHoursFrom?: string
  pickupHoursTo?: string
}

function getTimeSlots(from: string, to: string): string[] {
  const slots: string[] = []
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  let mins = fh * 60 + fm
  const end = th * 60 + tm
  while (mins <= end) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0')
    const m = (mins % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    mins += 30
  }
  return slots
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function RentalCalendar({ listingId, pricePerDay, rentalPeriod, isOwner, currentUserId, weeklyDiscountPct = 0, monthlyDiscountPct = 0, pickupHoursFrom = '09:00', pickupHoursTo = '20:00' }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [availability, setAvailability] = useState<Record<string, string>>({})
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [pickupTime, setPickupTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showRentalInfo, setShowRentalInfo] = useState(false)
  const supabase = createClient()

  const timeSlots = getTimeSlots(pickupHoursFrom, pickupHoursTo)

  useEffect(() => {
    loadData()
  }, [listingId, month, year])

  const loadData = async () => {
    const { data: avail } = await supabase
      .from('rental_availability')
      .select('*')
      .eq('listing_id', listingId)

    const map: Record<string, string> = {}
    for (const a of avail || []) map[a.date] = a.status
    setAvailability(map)

    const { data: bk } = await supabase
      .from('rental_bookings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'confirmed')

    setBookings(bk || [])
  }

  const isBooked = (date: string) => {
    return bookings.some(b => date >= b.start_date && date <= b.end_date)
  }

  const getStatus = (date: string) => {
    if (isBooked(date)) return 'booked'
    return availability[date] || 'unavailable'
  }

  const handleOwnerClick = async (date: string) => {
    if (!isOwner) return
    const current = getStatus(date)
    if (current === 'booked') return
    const newStatus = current === 'available' ? 'unavailable' : 'available'

    await supabase.from('rental_availability').upsert(
      { listing_id: listingId, date, status: newStatus },
      { onConflict: 'listing_id,date' }
    )
    setAvailability(prev => ({ ...prev, [date]: newStatus }))
  }

  const handleRenterClick = (date: string) => {
    if (isOwner) return
    const status = getStatus(date)
    if (status !== 'available') return

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date)
      setSelectedEnd(null)
    } else {
      if (date < selectedStart) {
        setSelectedStart(date)
        setSelectedEnd(null)
      } else {
        setSelectedEnd(date)
      }
    }
  }

  const isInRange = (date: string) => {
    if (!selectedStart || !selectedEnd) return false
    return date > selectedStart && date < selectedEnd
  }

  const calculatePrice = () => {
    if (!selectedStart || !selectedEnd) return { base: 0, discountPct: 0, total: 0, days: 0 }
    const start = new Date(selectedStart)
    const end = new Date(selectedEnd)
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const base = days * pricePerDay
    let discountPct = 0
    if (days >= 30 && monthlyDiscountPct > 0) discountPct = monthlyDiscountPct
    else if (days >= 7 && weeklyDiscountPct > 0) discountPct = weeklyDiscountPct
    const discounted = base * (1 - discountPct / 100)
    return { base, discountPct, total: discounted, days }
  }

  const handleBooking = async () => {
    if (!selectedStart || !selectedEnd || !currentUserId) return
    if (!pickupTime || !returnTime) return
    setLoading(true)
    const { total } = calculatePrice()

    const { error } = await supabase.from('rental_bookings').insert({
      listing_id: listingId,
      renter_id: currentUserId,
      start_date: selectedStart,
      end_date: selectedEnd,
      pickup_time: pickupTime,
      return_time: returnTime,
      total_price: total,
      status: 'pending'
    })

    if (error) {
      setLoading(false)
      return
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, amount: total }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '12px', padding: '20px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#1a1408', padding: '4px 8px' }}>‹</button>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '16px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', margin: 0 }}>
          {MONTHS[month]} {year}
        </p>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#1a1408', padding: '4px 8px' }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', color: '#9a9080', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = dateStr(year, month, day)
          const status = getStatus(date)
          const isStart = date === selectedStart
          const isEnd = date === selectedEnd
          const inRange = isInRange(date)
          const isPast = date < dateStr(today.getFullYear(), today.getMonth(), today.getDate())

          let bg = '#fff'
          let color = '#1a1408'
          let border = '1px solid rgba(26,20,8,0.1)'
          let cursor = 'default'
          let opacity = 1

          if (isPast) { opacity = 0.35 }
          else if (status === 'booked') { bg = '#f0e0d0'; color = '#9a6050'; border = '1px solid #e8c8b8' }
          else if (status === 'unavailable') { bg = '#ede9e0'; color = '#9a9080'; border = '1px solid rgba(26,20,8,0.08)' }
          else if (status === 'available') {
            bg = '#e8f5e8'; color = '#2a6a2a'; border = '1px solid #c8e8c8'
            if (!isOwner) cursor = 'pointer'
          }

          if (isStart || isEnd) { bg = '#FC7038'; color = '#fff'; border = '1px solid #FC7038' }
          if (inRange) { bg = '#ffe4d4'; color = '#FC7038'; border = '1px solid #ffc8a8' }
          if (isOwner && status !== 'booked' && !isPast) cursor = 'pointer'

          return (
            <button
              key={date}
              onClick={() => isOwner ? handleOwnerClick(date) : handleRenterClick(date)}
              disabled={isPast}
              style={{ background: bg, color, border, borderRadius: '6px', padding: '8px 4px', textAlign: 'center', cursor, fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: isStart || isEnd ? 700 : 400, opacity, transition: 'all 0.1s' }}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        {[
          { color: '#e8f5e8', label: 'Available' },
          { color: '#ede9e0', label: 'Unavailable' },
          { color: '#f0e0d0', label: 'Booked' },
          { color: '#FC7038', label: 'Selected' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: '1px solid rgba(26,20,8,0.15)' }} />
            <span style={{ fontSize: '11px', color: '#7a7060', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {isOwner && (
        <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '12px', fontStyle: 'italic' }}>
          Click days to toggle availability. Green = available for booking.
        </p>
      )}

      {!isOwner && selectedStart && (
        <div style={{ marginTop: '16px', padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid rgba(26,20,8,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '6px' }}>
            <span>From</span><span style={{ fontWeight: 600, color: '#1a1408' }}>{selectedStart}</span>
          </div>
          {!selectedEnd && (
            <p style={{ fontSize: '12px', color: '#9a9080', marginTop: '4px' }}>Select end date</p>
          )}
          {selectedEnd && (() => {
            const { base, discountPct, total, days } = calculatePrice()
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '10px' }}>
                  <span>To</span><span style={{ fontWeight: 600, color: '#1a1408' }}>{selectedEnd}</span>
                </div>

                {/* TIME PICKERS */}
                <div style={{ borderTop: '1px solid rgba(26,20,8,0.08)', paddingTop: '10px', marginBottom: '10px' }}>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '8px' }}>
                    Choose times (available {pickupHoursFrom}–{pickupHoursTo})
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#9a9080', marginBottom: '4px' }}>Pickup</p>
                      <select
                        value={pickupTime}
                        onChange={e => setPickupTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: pickupTime ? '1px solid rgba(26,20,8,0.15)' : '1px solid #FC7038', fontFamily: 'Barlow', fontSize: '13px', background: '#fff', color: pickupTime ? '#1a1408' : '#9a9080' }}
                      >
                        <option value="">Select time</option>
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#9a9080', marginBottom: '4px' }}>Return</p>
                      <select
                        value={returnTime}
                        onChange={e => setReturnTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: returnTime ? '1px solid rgba(26,20,8,0.15)' : '1px solid #FC7038', fontFamily: 'Barlow', fontSize: '13px', background: '#fff', color: returnTime ? '#1a1408' : '#9a9080' }}
                      >
                        <option value="">Select time</option>
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* PRICE BREAKDOWN */}
                <div style={{ borderTop: '1px solid rgba(26,20,8,0.08)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '6px' }}>
                    <span>Duration</span><span style={{ fontWeight: 600, color: '#1a1408' }}>{days} days</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '6px' }}>
                    <span>Rental price</span><span>{base.toFixed(2)} €</span>
                  </div>
                  {discountPct > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2a6a2a', marginBottom: '6px', fontWeight: 600 }}>
                      <span>🎉 {discountPct}% discount ({days >= 30 ? 'monthly' : 'weekly'})</span>
                      <span>−{(base - total).toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }} className="info-tooltip-wrap">
                      🛡️ Rental protection (8%)
                      <button className="info-btn">i</button>
                      <div className="info-tooltip">
                        Rental is protected if item is not as described, not delivered, or significantly damaged on arrival. Does not cover wear and tear or accidents during use. Contact info@slabsend.com within 48h.
                      </div>
                    </span>
                    <span>{(total * 0.08).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#1a1408', borderTop: '1px solid rgba(26,20,8,0.08)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Total</span><span>{(total * 1.08).toFixed(2)} €</span>
                  </div>
                  <button
                    className="form-submit"
                    onClick={handleBooking}
                    disabled={loading || !pickupTime || !returnTime}
                    style={{ marginTop: '12px', width: '100%', opacity: (!pickupTime || !returnTime) ? 0.45 : 1 }}
                  >
                    {loading ? 'Booking...' : (!pickupTime || !returnTime) ? 'Select pickup & return times' : 'Book now'}
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}