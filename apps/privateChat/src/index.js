const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const crypto = require("crypto");
const http = require("http");
const server = http.createServer(app);
const { saveMessage, fetchMessages } = require("./utils/messages");

const { Server } = require("socket.io");
const io = new Server(server);

const publicDirectory = path.join(__dirname, "../public");
const sharedPublicDirectory = path.resolve(__dirname, "../../../public");
app.use(express.static(publicDirectory));
app.use("/assets", express.static(sharedPublicDirectory));
app.use(express.json());

//몽고DB 연결
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error("필요한 환경 변수(MONGODB_URI)가 설정되지 않았습니다.");
}
mongoose.set("strictQuery", true);
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("연결성공");
  })
  .catch((err) => {
    console.log(err);
  });
const createUserID = (username) =>
  crypto.createHash("sha256").update(username).digest("hex").slice(0, 16);

app.post("/session", (req, res) => {
  const rawUsername = (req.body.username || "").trim();
  if (!rawUsername) {
    return res.status(400).json({ message: "유저명을 입력해주세요." });
  }
  const normalized = rawUsername.toLowerCase();
  const userID = createUserID(normalized);
  res.send({ username: rawUsername, userID });
});

io.use((socket, next) => {
  const username = (socket.handshake.auth.username || "").trim();
  const userID = socket.handshake.auth.userID;

  if (!username || !userID) {
    return next(new Error("Authentication error"));
  }
  const expectedID = createUserID(username.toLowerCase());

  if (expectedID !== userID) {
    return next(new Error("Authentication error"));
  }
  socket.username = username;
  socket.userID = userID;

  next();
});

let users = [];

io.on("connection", async (socket) => {
  socket.join(socket.userID);

  let userData = {
    username: socket.username,
    userID: socket.userID,
  };
  users = users.filter((user) => user.userID !== socket.userID);
  users.push(userData);
  io.emit("users-Data", { users });
  //클라이언트에서 보내온 메세지
  socket.on("message-to-server", (payload) => {
    io.to(payload.to).emit("message-to-client", payload);
    saveMessage(payload);
  });

  //데이터베이스에서 메세지 가져오기
  socket.on("fetch-messages", async ({ receiver }) => {
    const messages = await fetchMessages({
      sender: socket.userID,
      receiver,
    });
    socket.emit("fetch-messages", messages);
  });

  //유저가 방에서 나갔을때
  socket.on("disconnect", () => {
    users = users.filter((user) => user.userID !== socket.userID);
    io.emit("users-Data", { users });
  });
});

const port = process.env.PORT || 8085;
server.listen(port, () => {
  console.log(`서버 실행 ${port}`);
});
