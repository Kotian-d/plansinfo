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
import { clients, reconnectClient, startClient } from "./utils/WASocket.js";
import WhatsappSession from "./models/WhatsappSession.js";
import path from "path";

const app = express();
let io;

app.use(express.static("public"));
app.use(flash());

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
app.use("/dthplans", dthplansroute);
app.use("/prepaidplans", prepaidplansroute);
app.use("/operator", operatorroute);
app.use("/tags", tagsrouter);
app.use("/api/v1", apiroute);

export function isloggedIn(req, res, next) {
  if (req.session && req.session.user) {
    // Session exists, proceed to next middleware/route
    next();
  } else {
    // No valid session, redirect to login page or send error
    res.redirect("/login");
    // Or: res.status(401).send('Unauthorized');
  }
}

export function isNotLoggedIn(req, res, next) {
  if (!req.session && !req.session.user) {
    // Session exists, proceed to next middleware/route
    next();
  } else {
    // No valid session, redirect to login page or send error
    res.redirect("/dashboard");
    // Or: res.status(401).send('Unauthorized');
  }
}

function generateRandomHexString(length) {
  const hexChars = "0123456789abcdef";
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
    const clientId = `client-${id}`;
    const s = sessions.find((sess) => sess.id === clientId);
    if (s) {
      if (action === "relogin") {
        if (clients.has(s.clientId)) {
          await clients.get(s.clientId)?.logout();
          await clients.get(s.clientId)?.end();
          clients.delete(s.clientId);

          await startClient(id, socket, sessionId);
          // Refresh the sessions list from DB and send updated
          sessions = await WhatsappSession.find({});
          socket.emit("sessions", sessions);
        }
      }
      if (action === "stop") s.status = "disconnected";
      if (action === "start") {
        s.status = "reconnecting";
        await startClient(s.clientId, socket, sessionId);
      }
      if (action === "delete") {
        await clients.get(s.clientId)?.logout();
        await clients.get(s.clientId)?.end();
        await WhatsappSession.deleteOne({ id: id });
        clients.delete(s.clientId);

        // Delete auth folder for the client
        const authPath = path.join("./auth", s.clientId);
        try {
          await fs.rm(authPath, { recursive: true, force: true });
          console.log(`Deleted auth session folder at ${authPath}`);
        } catch (error) {
          console.error(`Failed to delete auth folder ${authPath}:`, error);
        }

        // Refresh the sessions list from DB and send updated
        sessions = await WhatsappSession.find({});
        socket.emit("sessions", sessions);
      }
      if (action === "status") socket.emit("sessions", sessions);
      socket.emit("sessions", sessions);
    }
  });
});

// Define a route to render the EJS template
app.get("/", isNotLoggedIn, (req, res) => {
  res.render("login", { error: "" }); // Renders views/index.ejs and passes data
});

app.get("/dashboard", isloggedIn, async (req, res) => {
  // Dummy data
  const dthPlans = await DthPlans.countDocuments();
  const prepaidPlans = await PlanModel.countDocuments();
  const operators = await Operator.countDocuments({});
  const tags = await Tag.countDocuments({});
  const activeSessions = await WhatsappSession.countDocuments({
    status: "connected",
  });

  res.render("dashboard", {
    totalDthPlans: dthPlans,
    totalPrepaidPlans: prepaidPlans,
    totalOperators: operators,
    totalTags: tags,
    totalActiveSessions: activeSessions,
    totalLapuCount: dthPlans + prepaidPlans,
  }); // Renders views/index.ejs and passes data
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

app.get("/profile", isloggedIn, async (req, res) => {
  const user = await User.findOne({ _id: req.session.user });
  res.render("profile", {
    error: "",
    message: "",
    title: "Profile",
    user: user,
    avatar: "/images/avatar.png",
  }); // Renders views/index.ejs and passes data
});

app.post("/profile/change-password", isloggedIn, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.find(req.session.user);

  const isvalid = await bcrypt.compare(currentPassword, user.password);

  if (!isvalid)
    return res.render("profile", {
      error: "",
      message: "Invalid Password",
      title: "Profile",
      user,
      avatar: "/images/avatar.png",
    });

  const hashedpassword = await bcrypt.hash(newPassword, 10);

  await User.findByIdAndUpdate(
    { _id: user._id },
    {
      password: hashedpassword,
    }
  );

  res.render("profile", {
    error: "",
    message: "",
    title: "Profile",
    user,
    avatar: "/images/avatar.png",
  }); // Renders views/index.ejs and passes data
});

app.get("/logout", (req, res) => {
  req.session.destroy;
  res.redirect("login"); // Renders views/index.ejs and passes data
});

app.get("/whatsapp", (req, res) => {
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
