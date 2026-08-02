export function AppIconMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1F4D3D 0%, #142F26 100%)',
      }}
    >
      <span
        style={{
          fontSize: Math.round(size * 0.55),
          fontWeight: 700,
          color: '#EFF3EC',
        }}
      >
        O
      </span>
    </div>
  )
}
