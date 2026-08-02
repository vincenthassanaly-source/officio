import { ImageResponse } from 'next/og'
import { AppIconMark } from '@/lib/app-icon'

const size = { width: 512, height: 512 }

export async function GET() {
  return new ImageResponse(<AppIconMark size={size.width} />, { ...size })
}
