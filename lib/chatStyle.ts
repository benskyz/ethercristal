export function getChatStyle(code?: string | null) {
  if (!code) return { color: "white" }

  if (code === "chat_red") return { color: "#ef4444" }
  if (code === "chat_gold") return { color: "#facc15" }

  if (code === "chat_rainbow") {
    return {
      background: "linear-gradient(90deg,#ef4444,#facc15,#22c55e,#3b82f6,#a855f7)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }
  }

  return { color: "white" }
}
