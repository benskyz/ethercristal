export default function Alert({
  children,
  variant = "error",
}: {
  children: React.ReactNode
  variant?: "error" | "success"
}) {
  return (
    <div
      className={`ec-alert ${
        variant === "error"
          ? "ec-alert-error"
          : "ec-alert-success"
      }`}
    >
      {children}
    </div>
  )
}
