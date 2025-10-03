const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3100 });

wss.on("connection", (ws) => {
  ws.send("connected");

  ws.on("message", (messageFromClient) => {
    const message = JSON.parse(messageFromClient);
    console.log("message", message);
  });
});
