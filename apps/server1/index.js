const http = require("http").createServer();
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// a emit = send message to all clients
io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);
  socket.broadcast.emit("message", `${socket.id.slice(0, 4)} joined the chat`);

  socket.on("message", (message) => {
    const text = message?.toString().trim();
    if (!text) return;
    io.emit("message", `${socket.id.slice(0, 4)} says ${text}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`client disconnected: ${socket.id} (${reason})`);
    socket.broadcast.emit(
      "message",
      `${socket.id.slice(0, 4)} left the chat (${reason})`
    );
  });
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

http.listen(PORT, HOST, () => {
  console.log(`server is running on http://${HOST}:${PORT}`);
});
