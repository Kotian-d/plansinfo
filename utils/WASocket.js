import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import WhatsappSession from "../models/WhatsappSession.js";
import { getIO } from "../index.js";
import { useMongooseAuthState } from "../config/mongoAuthState.js";

export const clients = new Map();
let heartbeatTimer;
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const MAX_MISSED_BEATS = 3;
let missedBeats = 0;

// Assume you have a function to send QR to client
function sendQrToClient(clientId, qr, socket) {
  // Example: send via WebSocket or HTTP to front-end app for rendering
  console.log(`Sending QR for ${clientId} to client side`);
  // Implement your socket.emit or HTTP push here...
  socket.emit("qr", qr);
}

export async function startClient(clientId, socket, sessionId) {
  const { state, saveCreds } = await useMongooseAuthState(
    process.env.MONGO_URI,
    clientId
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
  });

  // Set client socket once created
  clients.set(clientId, sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sendQrToClient(clientId, qr, socket);
    }

    if (connection === "open") {
      const io = getIO();

      await WhatsappSession.create({
        id: clientId,
        status: "connected",
      });

      let sessions = await WhatsappSession.find({});
      startHeartbeat(clientId);

      // Verify if sessionId is valid, else broadcast
      if (sessionId && io.sockets.adapter.rooms.has(sessionId)) {
        io.to(sessionId).emit("sessions", sessions);
      } else {
        io.emit("sessions", sessions);
      }

      console.log(`Client ${clientId} connected`);
    }

    if (connection === "close") {
      stopHeartbeat();
      let shouldReconnect = true;
      if (lastDisconnect?.error) {
        const err = lastDisconnect.error;
        const statusCode = err.output?.statusCode;
        shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      }

      if (shouldReconnect) {
        // Make sure to pass all required parameters when reconnecting
        startClient(clientId, socket, sessionId);
      } else {
        clients.delete(clientId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on(
    "messaging-history.set",
    ({ chats, contacts, messages, syncType }) => {
      // handle messages if needed
      const msg = messages[0];
      console.log("New message from:", msg.key.remoteJid);
    }
  );
}

export async function reconnectClient(clientId) {
  const { state, saveCreds } = await useMongooseAuthState(
    process.env.MONGO_URI,
    clientId
  );

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Connection update handler
  return new Promise((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        sock.end();
        reject(new Error("Re-Login required"));
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode || 0;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        console.log(
          "Connection closed due to:",
          reason,
          ", reconnecting:",
          shouldReconnect
        );

        if (!shouldReconnect) {
          WhatsappSession.findOneAndUpdate(
            { id: clientId },
            { status: "disconnected" }
          ).catch(console.error);
          clients.delete(clientId);
          console.log(
            "Session logged out; please delete auth info and re-login."
          );
          sock.end();
          reject(new Error("Re-Login required"));
        }
      }

      if (connection === "open") {
        console.log("WhatsApp connection opened successfully!");
        clients.set(clientId, sock);
        WhatsappSession.findOneAndUpdate(
          { id: clientId },
          { status: "connected" }
        ).catch(console.error);
        resolve(sock);
      }
    });

    sock.ev.on("messages.upsert", (m) => {
      console.log("New message from:", m.messages[0]?.key?.remoteJid);
    });
  });
}

/**
 * Restarts socket cleanly, preserving the same state directory
 */
async function restartSocket(clientId) {
  try {
    const sock = clients.get(clientId);
    await sock?.ws?.close();
  } catch {}
  missedBeats = 0;
  clearInterval(heartbeatTimer);
  await startSock();
}

/**
 * Sends a WA ping every interval and checks for activity
 */
function startHeartbeat(clientId) {
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    try {
      const sock = clients.get(clientId);
      await sock?.presenceSubscribe(sock?.user?.id || "status@broadcast");
      missedBeats = 0; // if success, reset
      console.log("💓 Heartbeat OK");
    } catch (err) {
      missedBeats++;
      console.warn("💔 Heartbeat missed", missedBeats, err?.message);
      if (missedBeats >= MAX_MISSED_BEATS) {
        console.error("🚨 Too many missed heartbeats, reconnecting...");
        await restartSocket(clientId);
      }
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  clearInterval(heartbeatTimer);
}
