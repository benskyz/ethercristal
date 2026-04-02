export default function Card({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={`ec-card ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
