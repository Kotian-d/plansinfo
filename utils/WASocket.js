import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import WhatsappSession from "../models/WhatsappSession.js";
import { getIO } from "../index.js";

export const clients = new Map();

// Assume you have a function to send QR to client
function sendQrToClient(clientId, qr, socket) {
  // Example: send via WebSocket or HTTP to front-end app for rendering
  console.log(`Sending QR for ${clientId} to client side`);
  // Implement your socket.emit or HTTP push here...
  socket.emit("qr", qr);
}

export async function startClient(clientId, socket, sessionId) {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${clientId}`);
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

      // Verify if sessionId is valid, else broadcast
      if (sessionId && io.sockets.adapter.rooms.has(sessionId)) {
        io.to(sessionId).emit("sessions", sessions);
      } else {
        io.emit("sessions", sessions);
      }

      console.log(`Client ${clientId} connected`);
    }

    if (connection === "close") {
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

  sock.ev.on("messaging-history.set", ({ chats, contacts, messages, syncType }) => {
    // handle messages if needed
  });
}

export async function reconnectClient(clientId) {

  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${clientId}`);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false
  })

  sock.ev.on('creds.update', saveCreds)

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = reason !== DisconnectReason.loggedOut

      console.log('Connection closed due to:', reason, ', reconnecting:', shouldReconnect)

      if (shouldReconnect) {
        await reconnectClient(clientId); // Recursive reconnect
      } else {
        await WhatsappSession.findOneAndUpdate({ id: clientId }, { status: 'disconnected' });
        clients.delete(clientId);
        console.log('Session logged out; please delete auth_info_baileys and re-login.');
        throw new Error("Re-Login required");
        
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp connection opened successfully!');
      clients.set(clientId, sock);
      await WhatsappSession.findOneAndUpdate({ id: clientId }, { status: 'connected' });
    }
  })

  sock.ev.on('messages.upsert', (m) => {
    console.log('New message from:', m.messages[0]?.key?.remoteJid)
  })

  return sock;
}