const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");
// const http = require("http");
// const socketIo = require("socket.io");

//Create Server for socket
// const ioServer = http.createServer();
// const io = socketIo(ioServer, {
//   cors: {
//     origin: "*",
//     credentials: true,
//   },
// });

//op

//Connect to DB
connectDB();

//Middlewares
//Init middleware to parse json data
app.use(express.json({ extended: false }));
//For cross-origin access
app.use(
  cors({
    origin: "https://super-app-frontend-eight.vercel.app",
    credentials: true,
  })
); //Enables the inclusion of cookies for CORS

//For cookies
app.use(cookieParser());
//For Google OAUTH
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

//Create a map to store userData
// global.onlineUsers = new Map();

// //For sockets
// io.on("connection", (socket) => {
//   console.log("connect to socket", socket.id);
//   global.chatSocket = socket;

//   socket.on("add-user", (userID) => {
//     onlineUsers.set(userID, socket.id);
//   });

//   socket.on("send-msg", (data) => {
//     const sendUnderSocket = onlineUsers.get(data.to);
//     if (sendUnderSocket) {
//       socket.to(sendUnderSocket).emit("msg-recieve", data.message);
//     }
//   });

//   socket.on("send-notification", (data) => {
//     const sendUnderSocket = onlineUsers.get(data.to);
//     if (sendUnderSocket) {
//       socket.to(sendUnderSocket).emit("notification-recieve", data.message);
//     }
//   });
// });

//Test route
app.get("/", (req, res) => {
  res.send("Hi there server api running...");
});

//Define routes
app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/verify-phone", require("./routes/phone"));
app.use("/api/oauth", require("./routes/oauth"));
app.use("/api/emailVerify", require("./routes/emailVerify"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishList"));
app.use("/api/becomeseller", require("./routes/becomeseller"));
app.use("/api/payment-gateway", require("./routes/paymentGateway"));

//Assign a port
const PORT = process.env.PORT || 5000;

//Server listening on a port
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// //IO sever on another port
// const IO_PORT = process.env.PORT || 4000;

// ioServer.listen(IO_PORT, () => {
//   console.log(`Socket.IO server is running on port ${IO_PORT}`);
// });
