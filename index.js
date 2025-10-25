import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import connectDB from "./config/db.js";
import "dotenv/config";
import Operator from "./models/operatormodel.js";
import { dthplansroute } from "./router/dthrouter.js";
import User from "./models/users.js";
import bcrypt from "bcrypt";
import MongoStore from "connect-mongo";
import DthPlans from "./models/dthplans.js";
import { prepaidplansroute } from "./router/prepaidrouter.js";
import PlanModel from "./models/prepaidplan.js";
import Tag from "./models/tagsmodel.js";
import { operatorroute } from "./router/operatorrouter.js";
import { tagsrouter } from "./router/tagsrouter.js";
import { apiroute } from "./router/apirouter.js";
import flash from "connect-flash";
import http from "http";
import { Server } from "socket.io";
import { clients, startClient } from "./utils/WASocket.js";
import WhatsappSession from "./models/WhatsappSession.js";
import { AuthStateModel } from "./config/mongoAuthState.js";
import favicon from "serve-favicon";
import path from "path";
import { fileURLToPath } from 'url';
import { isloggedIn, isNotLoggedIn } from "./utils/authmiddleware.js";
import { userrouter } from "./router/userrouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let io;

app.use(express.static("public"));
app.use(flash());
// Serve the favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

const server = http.createServer(app);

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

io = initSocket(server);

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
// Set EJS as the view engine
app.set("view engine", "ejs");

const store = new MongoStore({
  mongoUrl: process.env.MONGO_URI,
  collection: "sessions",
});

const sessionMiddleware = session({
  store: store,
  secret: process.env.SECRET, // A secret key for signing the session ID cookie
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't save uninitialized sessions
  cookie: {
    maxAge: 60 * 60 * 1000, // Session expires after 1 hour (in milliseconds)
  },
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);
app.use((req, res, next) => {
  res.locals.successMsg = req.flash("success");
  res.locals.errorMsg = req.flash("error");
  next();
});

app.use("/", userrouter);
app.use("/dthplans", dthplansroute);
app.use("/prepaidplans", prepaidplansroute);
app.use("/operator", operatorroute);
app.use("/tags", tagsrouter);
app.use("/api/v1", apiroute);

function generateRandomHexString(length) {
  const hexChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  return result;
}

io.on("connection", async (socket) => {
  const sessionId = socket.request.session.id;
  // the session ID is used as a room
  socket.join(sessionId);

  console.log("Client connected");

  // Send initial table state
  let sessions = await WhatsappSession.find({});
  socket.emit("sessions", sessions);

  socket.on("generate-qr", async () => {
    await startClient(Date.now(), socket, sessionId);
  });

  socket.on("session-action", async ({ id, action }) => {
    if (action === "relogin") {
      if (clients.has(id)) {
        await clients.get(id)?.logout();
        await clients.get(id)?.end();
        clients.delete(id);

        await startClient(id, socket, sessionId);
      } else {
        await startClient(id, socket, sessionId);
      }
    }
    if (action === "stop") {
      await WhatsappSession.findByIdAndUpdate(
        { id: id },
        { status: "disconnected" }
      );
      let s = await WhatsappSession.findOne({ id: id });
      socket.emit("sessions", s);
    }
    if (action === "start") {
      await WhatsappSession.findByIdAndUpdate(
        { id: id },
        { status: "disconnected" }
      );
      let s = await WhatsappSession.findOne({ id: id });
      socket.emit("sessions", s);
    }
    if (action === "delete") {
      if (clients.has(id)) {
        await clients.get(id)?.logout();
        await clients.get(id)?.end();
        await WhatsappSession.deleteOne({ id: id });
        clients.delete(id);
      }
      await AuthStateModel.deleteOne({ sessionKey: id.toString() });
      // Refresh the sessions list from DB and send updated
      await WhatsappSession.deleteOne({ id: id });
      sessions = await WhatsappSession.find({});
      socket.emit("sessions", sessions);
    }
    if (action === "status") {
      sessions = await WhatsappSession.findOne({ id: id });
      socket.emit("sessions", sessions);
    }
  });
});

// Define a route to render the EJS template
app.get("/", isNotLoggedIn, (req, res) => {
  res.render("login", { error: "" }); // Renders views/index.ejs and passes data
});

app.get("/register/:id", async (req, res) => {
  res.render("register");
});

app.post("/register/:id", async (req, res) => {
  const { username, mobile, password, email } = req.body;
  const hashedpassword = await bcrypt.hash(password, 10);
  const apiKey = generateRandomHexString(24);

  await User.create({
    username,
    email,
    mobile,
    password: hashedpassword,
    apikey: apiKey,
  });

  res.json("registration succesfull");
});

app.get("/login", (req, res) => {
  res.render("login", { error: "" }); // Renders views/index.ejs and passes data
});

app.get("/apidocs", async (req, res) => {
  const BASE_URL = "https://plans.pavathi.com/api/v1";

  const opcodes = await Operator.find({}, { code: 1, name: 1, _id: 0 });

  const endpoints = [
    {
      name: "DTH Plans",
      method: "GET",
      url: `${BASE_URL}/dthplans?apikey=@API_KEY&operator=@opcode`,
      example: `${BASE_URL}/dthplans?apikey=@API_KEY&operator=AD`,
      description: "Fetch available DTH recharge plans by operator code.",
    },
    {
      name: "Prepaid Plans",
      method: "GET",
      url: `${BASE_URL}/prepaidplans?apikey=@API_KEY&operator=@opcode`,
      example: `${BASE_URL}/prepaidplans?apikey=@API_KEY&operator=AT`,
      description: "Retrieve prepaid recharge plans by operator code.",
    },
  ];

  res.render("apidoc", { endpoints, opcodes }); // Renders views/apidoc.ejs and passes data
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const exists = await User.findOne({ mobile: username });

  if (!exists) return res.render("login", { error: "user doesnot exists" });

  const isValid = await bcrypt.compare(password, exists.password);

  if (isValid) {
    req.session.user = exists._id;
    req.flash("success", "You are now logged in!");
    return res.redirect("/dashboard"); // Renders views/index.ejs and passes data
  }

  res.render("login", { error: "Invalid Login details" });
});

app.get("/logout", (req, res) => {
  req.session.destroy;
  res.redirect("login"); // Renders views/index.ejs and passes data
});

app.get("/whatsapp", isloggedIn, (req, res) => {
  res.render("whatsapp");
});

app.use((req, res) => {
  res
    .status(404)
    .render("404", { message: "The page you are looking for does not exist." });
});

// Start the server
const startServer = async () => {
  await connectDB();

  // Add app middlewares, routes here

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
