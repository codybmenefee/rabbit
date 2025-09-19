import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#111827',
          color: '#FACC15',
          display: 'flex',
          fontSize: 18,
          fontWeight: 600,
          height: '100%',
          justifyContent: 'center',
          letterSpacing: -0.5,
          width: '100%',
        }}
      >
        Rb
      </div>
    ),
    {
      ...size,
    }
  )
}
