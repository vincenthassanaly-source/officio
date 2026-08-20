import { ImageResponse } from 'next/og'

const size = { width: 96, height: 96 }

// Icône dédiée au badge de notification Android : fond transparent + croix
// blanche pleine. Android ignore la couleur du badge et ne garde que le
// canal alpha pour dessiner une silhouette — /icon-192 (image couleur
// pleine, via AppIconMark) donne donc un carré blanc, pas une silhouette.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 64, height: 64, display: 'flex' }}>
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 0,
              width: 16,
              height: 64,
              background: '#FFFFFF',
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 24,
              width: 64,
              height: 16,
              background: '#FFFFFF',
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
