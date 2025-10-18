import { io } from "socket.io-client";

const messages = document.querySelector("ul");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8081";
const socket = io(serverUrl);

socket.on("connect", () => {
  appendMessage(`Connected as ${socket.id.slice(0, 4)}…`);
});

socket.on("message", appendMessage);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  socket.emit("message", text);
  input.value = "";
  input.focus();
}

function appendMessage(text) {
  const element = document.createElement("li");
  element.innerText = text;
  messages.appendChild(element);
}
