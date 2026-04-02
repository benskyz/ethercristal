const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3001 });

let waitingClient = null;
const peers = new Map();

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  ws.id = Math.random().toString(36).slice(2);

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join-random") {
      if (waitingClient && waitingClient !== ws) {
        const partner = waitingClient;
        waitingClient = null;

        peers.set(ws.id, partner);
        peers.set(partner.id, ws);

        send(ws, { type: "matched", polite: true });
        send(partner, { type: "matched", polite: false });
      } else {
        waitingClient = ws;
        send(ws, { type: "waiting" });
      }
      return;
    }

    if (
      message.type === "offer" ||
      message.type === "answer" ||
      message.type === "ice-candidate"
    ) {
      const partner = peers.get(ws.id);
      send(partner, message);
      return;
    }

    if (message.type === "leave") {
      const partner = peers.get(ws.id);
      if (partner) {
        send(partner, { type: "peer-left" });
        peers.delete(partner.id);
      }
      peers.delete(ws.id);

      if (waitingClient === ws) {
        waitingClient = null;
      }
    }
  });

  ws.on("close", () => {
    const partner = peers.get(ws.id);

    if (partner) {
      send(partner, { type: "peer-left" });
      peers.delete(partner.id);
    }

    peers.delete(ws.id);

    if (waitingClient === ws) {
      waitingClient = null;
    }
  });
});

console.log("Signaling server running on ws://localhost:3001");
