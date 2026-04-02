export function playSound(name: string) {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`)
    audio.volume = 0.7
    audio.play()
  } catch (e) {
    console.log("Sound error", e)
  }
}
