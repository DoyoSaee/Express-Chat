const express = require("express");
const path = require("path");
const app = express();

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const { addUser, removeUser, getUserInRoom, getUser } = require("./utils/users");
const { generateMessage } = require("./utils/messages");

const io = new Server(server);

io.on("connection", (socket) => {
  console.log("connected", socket.id);
  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });
    if (error) return callback(error);

    socket.join(user.room);

    socket.emit(
      "message",
      generateMessage("Admin", `${user.room} 방에 오신것을 환영합니다.`)
    );
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(
          "Admin",
          `${user.username}가 ${user.room} 방에 입장했습니다.`
        )
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    socket.emit("roomData", {
      room: options.room,
      users: getUserInRoom(user.room),
    });
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, coords)
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log("disconnected", socket.id);

    if (!user) {
      return;
    }

    io.to(user.room).emit(
      "message",
      generateMessage(
        "Admin",
        `${user.username}가 ${user.room} 방에서 퇴장했습니다.`
      )
    );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });
  });
});

const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

const port = 8081;
server.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
