const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const mongoose = require("mongoose");
const app = express();

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

const publicDirectory = path.join(__dirname, "../public");
app.use(express.static(publicDirectory));
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

let users = [];

io.on("connection", async (socket) => {
  let userData = {};
  users.push(userData);
  io.emit("users-Data", { users });
  //클라이언트에서 보내온 메세지
  socket.on("message-to-server", (err, message) => {});

  //데이터베이스에서 메세지 가져오기
  socket.emit("fetch-messages", (err, messages) => {});

  //유저가 방에서 나갔을때
  socket.on("disconnect", (err, socketId) => {});
});

const port = 8085;
app.listen(port, () => {
  console.log(`서버 실행 ${port}`);
});
