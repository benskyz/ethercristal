import { RoomServiceClient } from "livekit-server-sdk";

function getLivekitHost() {
  const host =
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "";

  if (!host) {
    throw new Error("LIVEKIT_URL / NEXT_PUBLIC_LIVEKIT_URL manquant");
  }

  return host;
}

function getLivekitApiKey() {
  const key = process.env.LIVEKIT_API_KEY || "";
  if (!key) {
    throw new Error("LIVEKIT_API_KEY manquant");
  }
  return key;
}

function getLivekitApiSecret() {
  const secret = process.env.LIVEKIT_API_SECRET || "";
  if (!secret) {
    throw new Error("LIVEKIT_API_SECRET manquant");
  }
  return secret;
}

export function getRoomService() {
  return new RoomServiceClient(
    getLivekitHost(),
    getLivekitApiKey(),
    getLivekitApiSecret()
  );
}

export async function ensureRoomExists(roomName: string) {
  if (!roomName) {
    throw new Error("roomName manquant");
  }

  const roomService = getRoomService();
  const rooms = await roomService.listRooms([roomName]);

  if (!rooms || rooms.length === 0) {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 10,
      maxParticipants: 2,
    });
  }
}
