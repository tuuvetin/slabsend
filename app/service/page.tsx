'use client'
import { useEffect, useState } from 'react'

export default function ServicePage() {
  const [typed, setTyped] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const fullText = 'Coming Soon'

  useEffect(() => {
    let i = 0
    const type = () => {
      if (i <= fullText.length) {
        setTyped(fullText.slice(0, i))
        i++
        setTimeout(type, i === 1 ? 400 : 80)
      }
    }
    setTimeout(type, 500)
  }, [])

  useEffect(() => {
    const blink = setInterval(() => setShowCursor(c => !c), 530)
    return () => clearInterval(blink)
  }, [])

  return (
    <div style={{ background: '#F5F3E6', minHeight: 'calc(100vh - 64px)' }}>

      {/* HERO */}
      <div style={{
        background: '#1a1408',
        padding: '88px 32px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* subtle topo lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#c8a84a" strokeWidth="1">
            <path d="M-10,340 Q200,310 400,325 Q600,340 800,310 Q1000,280 1210,295"/>
            <path d="M-10,290 Q200,260 400,275 Q600,290 800,260 Q1000,230 1210,245"/>
            <path d="M-10,240 Q200,212 400,226 Q600,240 800,212 Q1000,184 1210,197"/>
            <path d="M-10,192 Q200,165 400,178 Q600,192 800,165 Q1000,138 1210,150"/>
            <path d="M-10,145 Q200,119 400,132 Q600,145 800,119 Q1000,93 1210,105"/>
          </g>
        </svg>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#FC7038',
            border: '1px solid rgba(252,112,56,0.4)',
            padding: '6px 20px',
            borderRadius: '20px',
            marginBottom: '28px',
            minWidth: '160px',
            justifyContent: 'center',
          }}>
            {typed}
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '13px',
              background: '#FC7038',
              marginLeft: '2px',
              opacity: showCursor ? 1 : 0,
              verticalAlign: 'middle',
            }} />
          </span>

          <h1 style={{
            fontFamily: 'inherit',
            fontSize: 'clamp(42px, 7vw, 66px)',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#F5F3E6',
            lineHeight: 1.05,
            margin: '0 0 22px',
          }}>
            Find the best<br />climbing cobblers
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'rgba(245,243,230,0.6)',
            lineHeight: 1.7,
            margin: '0 auto',
            maxWidth: '480px',
          }}>
            We're building a directory of Europe's finest climbing shoe resolers and repair specialists — so your shoes get a second life and you get more sends.
          </p>
        </div>
      </div>

      {/* WHAT'S COMING */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 32px 80px' }}>

        <p style={{
          fontFamily: 'inherit',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#9a9080',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          What you'll find here
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '64px',
        }}>
          {[
            {
              title: 'Shoe resoling',
              desc: 'Professional rubber replacement for worn climbing shoes. Full resole, half resole, rand repair.',
            },
            {
              title: 'Stitching & repairs',
              desc: 'Rand repair, toe patches, stitching fixes — extend the life of your favourite shoes.',
            },
            {
              title: 'Find near you',
              desc: 'Filter by country and city. Ship your shoes or drop them off locally.',
            },
          ].map(item => (
            <div key={item.title} style={{
              background: '#fff',
              border: '1px solid rgba(26,20,8,0.08)',
              borderRadius: '12px',
              padding: '28px 24px',
            }}>
              <h3 style={{
                fontFamily: 'inherit',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#1a1408',
                marginBottom: '8px',
              }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#7a7060', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: '#1a1408',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'inherit',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(245,243,230,0.4)',
            marginBottom: '12px',
          }}>
            Are you a cobbler or resoler?
          </p>
          <h2 style={{
            fontFamily: 'inherit',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#F5F3E6',
            marginBottom: '10px',
          }}>
            Get listed when we launch
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(245,243,230,0.55)', marginBottom: '24px', lineHeight: 1.6 }}>
            We're onboarding the first service providers now.<br />Reach climbers across Europe who need your skills.
          </p>
          <a
            href="mailto:info@slabsend.com?subject=Service listing - I want to get listed"
            style={{
              display: 'inline-block',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: '#FC7038',
              color: '#F5F3E6',
              padding: '12px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Contact us to get listed →
          </a>
        </div>
      </div>
    </div>
  )
}
