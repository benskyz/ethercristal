export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "gold"
  disabled?: boolean
}) {
  const classMap = {
    primary: "ec-btn-primary",
    secondary: "ec-btn-secondary",
    gold: "ec-btn-gold",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classMap[variant]}
    >
      {children}
    </button>
  )
}
