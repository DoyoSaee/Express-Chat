const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const crypto = require("crypto");
const http = require("http");
const server = http.createServer(app);
const {
  saveMessage,
  fetchMessages,
  getConversations,
  deleteConversation,
} = require("./utils/messages");

const { Server } = require("socket.io");
const io = new Server(server);

const publicDirectory = path.join(__dirname, "../public");
const sharedPublicDirectory = path.resolve(__dirname, "../../../public");
app.use(express.static(publicDirectory));
app.use("/assets", express.static(sharedPublicDirectory));
app.use(express.json());

const emitConversationSnapshot = async (targetUserID) => {
  if (!targetUserID) {
    return;
  }
  try {
    const conversations = await getConversations(targetUserID);
    io.to(targetUserID).emit("conversation-list", { conversations });
  } catch (error) {
    console.error("대화 목록 브로드캐스트 실패:", error);
  }
};

app.get("/conversations/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const conversations = await getConversations(userID);
    res.json({ conversations });
  } catch (error) {
    console.error("대화 목록 조회 실패:", error);
    res.status(500).json({ message: "대화 목록을 불러오지 못했습니다." });
  }
});

app.delete("/conversations/:userID/:partnerID", async (req, res) => {
  const { userID, partnerID } = req.params;

  try {
    const deleted = await deleteConversation({ userID, partnerID });
    if (!deleted) {
      return res.status(404).json({ message: "삭제할 대화가 없습니다." });
    }
    emitConversationSnapshot(userID);
    emitConversationSnapshot(partnerID);
    io.to(userID).emit("conversation-deleted", { userID: partnerID });
    io.to(partnerID).emit("conversation-deleted", { userID });
    res.status(204).end();
  } catch (error) {
    console.error("대화 삭제 실패:", error);
    res.status(500).json({ message: "대화를 삭제하지 못했습니다." });
  }
});

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
  await emitConversationSnapshot(socket.userID);
  //클라이언트에서 보내온 메세지
  socket.on("message-to-server", async (payload = {}) => {
    try {
      const messageText = (payload.message || "").trim();
      const receiverID = payload.to;

      if (!messageText || !receiverID) {
        return;
      }

      const timestamp =
        payload.time ||
        new Date().toLocaleString("ko-KR", {
          hour12: false,
        });

      const receiver = users.find((user) => user.userID === receiverID);

      const enrichedPayload = {
        from: socket.userID,
        fromUsername: socket.username,
        to: receiverID,
        toUsername: payload.toUsername || receiver?.username || "",
        message: messageText,
        time: timestamp,
      };

      io.to(receiverID).emit("message-to-client", {
        from: enrichedPayload.from,
        fromUsername: enrichedPayload.fromUsername,
        message: enrichedPayload.message,
        time: enrichedPayload.time,
      });

      await saveMessage(enrichedPayload);
      emitConversationSnapshot(socket.userID);
      emitConversationSnapshot(receiverID);
    } catch (error) {
      console.error("메시지 처리 실패:", error);
    }
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
