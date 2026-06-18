import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Sipo — Fidelización para cafeterías'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#43352C',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 100px',
          gap: 80,
          position: 'relative',
        }}
      >
        {/* Logo mark — 2×2 circles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'white' }} />
            <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'white' }} />
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'white' }} />
            <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'rgba(252,251,248,0.22)' }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 300, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: 'white',
              fontSize: 108,
              fontWeight: 700,
              letterSpacing: '-4px',
              lineHeight: 1,
              marginBottom: 20,
              fontFamily: 'serif',
            }}
          >
            Sipo
          </div>
          <div
            style={{
              color: '#B56A4C',
              fontSize: 34,
              marginBottom: 36,
              fontFamily: 'serif',
              fontStyle: 'italic',
            }}
          >
            Cada café cuenta.
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 24,
              fontFamily: 'sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            Programa de fidelidad para cafeterías
          </div>
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            right: 80,
            color: 'rgba(255,255,255,0.2)',
            fontSize: 22,
            fontFamily: 'sans-serif',
          }}
        >
          sipo.ar
        </div>
      </div>
    ),
    { ...size },
  )
}
