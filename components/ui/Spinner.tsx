export default function Spinner() {
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        border: "3px solid rgba(255,255,255,0.15)",
        borderTop: "3px solid #8b5cf6",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  )
}
