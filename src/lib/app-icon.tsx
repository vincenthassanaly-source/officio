export function AppIconMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
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
