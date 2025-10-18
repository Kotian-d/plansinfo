const socket = io();
const qrContainer = document.getElementById("qrContainer");
const generateContainer = document.getElementById("generateContainer");
const qrCanvas = document.getElementById("qrCanvas");
const generateBtn = document.getElementById("generateBtn");
const sessionTableBody = document.getElementById("sessionTableBody");

// Request a new QR when button clicked
generateBtn.addEventListener("click", () => {
  socket.emit("generate-qr");
  // Hide the generate button container and show the QR canvas container
  generateContainer.style.display = "none";
  qrContainer.style.display = "block";
});

// Render received QR code
socket.on("qr", (qrData) => {
  QRCode.toCanvas(qrCanvas, qrData, { width: 250 }, (err) => {
    if (err) console.error(err);
  });
});

// Update session table dynamically
socket.on("sessions", (sessions) => {
  // Clear the QR code canvas to remove any displayed QR
  const ctx = qrCanvas.getContext("2d");
  ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);

  // Hide QR canvas container and show generate button container
  qrContainer.style.display = "none";
  generateContainer.style.display = "block";

  sessionTableBody.innerHTML = "";
  sessions.forEach((s, i) => {
    const row = `
          <tr>
            <td>${i + 1}</td>
            <td>${s.id}</td>
            <td><span class="badge ${
              s.status === "connected" ? "bg-success" : "bg-secondary"
            }">${s.status}</span></td>
            <td>${s.lastUpdated || "-"}</td>
            <td>
              <button class="btn btn-sm btn-success" onclick="startSession('${
                s.id
              }')">Start</button>
              <button class="btn btn-sm btn-warning" onclick="stopSession('${
                s.id
              }')">Stop</button>
              <button class="btn btn-sm btn-info" onclick="checkStatus('${
                s.id
              }')">Status</button>
              <button class="btn btn-sm btn-danger" onclick="deleteSession('${
                s.id
              }')">Delete</button>
            </td>
          </tr>`;
    sessionTableBody.insertAdjacentHTML("beforeend", row);
  });
});

// Functions to emit actions
function startSession(id) {
  socket.emit("session-action", { id, action: "start" });
}
function stopSession(id) {
  socket.emit("session-action", { id, action: "stop" });
}
function checkStatus(id) {
  socket.emit("session-action", { id, action: "status" });
}
function deleteSession(id) {
  socket.emit("session-action", { id, action: "delete" });
}
