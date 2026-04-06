// lib/livekit-admin.ts
import { RoomServiceClient } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;
const livekitHost =
  process.env.LIVEKIT_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL!;

if (!apiKey || !apiSecret || !livekitHost) {
  console.warn("LiveKit env variables missing.");
}

export const roomService = new RoomServiceClient(
  livekitHost,
  apiKey,
  apiSecret
);

export async function ensureRoomExists(roomName: string) {
  try {
    const rooms = await roomService.listRooms([roomName]);
    if (!rooms || rooms.length === 0) {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 10, // auto delete after 10 min empty
        maxParticipants: 2,
      });
    }
  } catch (err) {
    console.error("ensureRoomExists error:", err);
    throw err;
  }
}
