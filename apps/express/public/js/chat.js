const socket = io();
const query = new URLSearchParams(location.search);
const username = query.get("username");
const room = query.get("room");
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;
const messageTemplate = document.getElementById("message-template").innerHTML;
const messages = document.querySelector("#messages");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("input[name=message]");
const messageButton = document.querySelector("button[name=send-message]");

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

// 채팅방에 입장
socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});

// 채팅방 정보
socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, { room, users });
  document.querySelector("#sidebar").innerHTML = html;
});

// 메시지 전송
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  messageButton.disabled = true;
  messageInput.disabled = true;
  const message = event.target.elements.message.value;

  socket.emit("sendMessage", message, (error) => {
    messageButton.disabled = false;
    messageInput.disabled = false;

    if (error) {
      alert(error);
      return;
    }

    messageInput.value = "";
    messageInput.focus();
    scrollToBottom();
  });
});

// 메시지 수신
socket.on("message", (message) => {
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("MM-DD HH:mm"),
  });
  messages.innerHTML += html;
  scrollToBottom();
});
