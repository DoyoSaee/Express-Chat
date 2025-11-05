const socket = io({ autoConnect: false });
socket.onAny((event, ...args) => {
  console.log(event, args);
});

const USERS_EMPTY_HTML =
  '<div class="empty-state">지금 접속 중인 유저가 없어요.</div>';

const loginSection = document.querySelector(".login-container");
const chatBody = document.querySelector(".chat-body");
const userTitle = document.querySelector("#user-title");
const userTable = document.querySelector(".users");
const userTagline = document.querySelector("#users-tagline");
const title = document.querySelector("#active-user");
const messages = document.querySelector(".messages");
const msgContainer = document.querySelector(".msg-form");
const messageForm = document.querySelector(".msgForm");
const messageInput = document.getElementById("message");
const loginForm = document.querySelector(".user-login");
const usernameInput = document.getElementById("username");
const logoutBtn = document.getElementById("logout-btn");

let sessionUsername = (localStorage.getItem("session-username") || "").trim();
let sessionUserID = (localStorage.getItem("session-userID") || "").trim();

const resetConversation = () => {
  title.textContent = "\u00A0";
  title.removeAttribute("userID");
  messages.innerHTML = "";
  msgContainer.classList.add("d-none");
  if (messageForm) {
    messageForm.reset();
  }
};

const clearChatState = () => {
  resetConversation();
  userTable.innerHTML = USERS_EMPTY_HTML;
  userTagline.innerHTML = "접속중인 유저 없음";
  userTagline.classList.remove("test-success");
  userTagline.classList.add("test-danger");
};

const showChatUI = () => {
  loginSection.classList.add("d-none");
  chatBody.classList.remove("d-none");
  if (logoutBtn) {
    logoutBtn.classList.remove("d-none");
  }
  resetConversation();
  userTitle.textContent = sessionUsername;
};

const showLoginUI = () => {
  clearChatState();
  chatBody.classList.add("d-none");
  loginSection.classList.remove("d-none");
  if (logoutBtn) {
    logoutBtn.classList.add("d-none");
  }
  loginForm.classList.remove("d-none");
  loginForm.reset();
  userTitle.textContent = "";
  if (usernameInput) {
    usernameInput.focus();
  }
};

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (socket.connected) {
      socket.disconnect();
    }
    socket.auth = {};
    localStorage.removeItem("session-username");
    localStorage.removeItem("session-userID");
    sessionUsername = "";
    sessionUserID = "";
    showLoginUI();
  });
}

//login form handler
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = usernameInput.value.trim();
  if (!value) {
    usernameInput.focus();
    return;
  }
  createSession(value);
  loginForm.reset();
});

const createSession = async (username) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  };

  try {
    const res = await fetch("/session", options);
    if (!res.ok) {
      throw new Error("세션 생성 실패");
    }
    const data = await res.json();
    sessionUsername = data.username.trim();
    sessionUserID = data.userID;
    localStorage.setItem("session-username", sessionUsername);
    localStorage.setItem("session-userID", sessionUserID);
    await socketConnect(sessionUsername, sessionUserID);
    showChatUI();
  } catch (err) {
    console.error(err);
    if (socket.connected) {
      socket.disconnect();
    }
    socket.auth = {};
    localStorage.removeItem("session-username");
    localStorage.removeItem("session-userID");
    sessionUsername = "";
    sessionUserID = "";
    showLoginUI();
  }
};

const socketConnect = (username, userID) =>
  new Promise((resolve, reject) => {
    socket.auth = {
      username,
      userID,
    };

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };

    const handleError = (err) => {
      cleanup();
      socket.disconnect();
      reject(err);
    };

    socket.once("connect", handleConnect);
    socket.once("connect_error", handleError);
    socket.connect();
  });

const setActiveUser = (element, username, userID) => {
  title.textContent = username;
  title.setAttribute("userID", userID);
  const list = document.getElementsByClassName("socket-users");
  for (let i = 0; i < list.length; i++) {
    list[i].classList.remove("table-active");
  }
  element.classList.add("table-active");
  //사용자 선책 후 메세지 영역 표시
  msgContainer.classList.remove("d-none");
  messages.classList.remove("d-none");
  messages.innerHTML = "";
  messageInput.value = "";
  messageInput.focus();
  socket.emit("fetch-messages", { receiver: userID });
  const notify = document.getElementById(userID);
  if (notify) {
    notify.classList.add("d-none");
  }
};

const appendMessage = ({ message, time, position }) => {
  let div = document.createElement("div");
  div.classList.add("message", position);
  div.innerHTML = `<span class="msg-test">${message}</span><span class="msg-time">${time}</span>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
};

socket.on("users-Data", ({ users }) => {
  //자신은 제거하기
  const index = users.findIndex((user) => user.userID === sessionUserID);
  if (index > -1) {
    users.splice(index, 1);
  }
  //user Table List 생성하기
  userTable.innerHTML = "";
  if (users.length > 0) {
    const table = document.createElement("table");
    table.classList.add("users-table");

    users.forEach((user) => {
      const row = document.createElement("tr");
      row.classList.add("socket-users");
      row.dataset.userId = user.userID;
      row.dataset.username = user.username;
      const cell = document.createElement("td");
      cell.textContent = user.username;

      const badge = document.createElement("span");
      badge.classList.add("notify-badge", "d-none");
      badge.id = user.userID;
      badge.textContent = "!";

      cell.appendChild(badge);
      row.appendChild(cell);
      row.addEventListener("click", () =>
        setActiveUser(row, user.username, user.userID)
      );
      table.appendChild(row);
    });

    userTable.appendChild(table);
  }
  if (users.length > 0) {
    userTagline.innerHTML = "접속중인 유저";
    userTagline.classList.remove("test-danger");
    userTagline.classList.add("test-success");
  } else {
    userTagline.innerHTML = "접속중인 유저 없음";
    userTagline.classList.remove("test-success");
    userTagline.classList.add("test-danger");
    userTable.innerHTML = USERS_EMPTY_HTML;
  }

  const activeUserID = title.getAttribute("userID");
  if (activeUserID) {
    const hasActiveUser = users.some((user) => user.userID === activeUserID);
    if (!hasActiveUser) {
      resetConversation();
    } else {
      const activeRow = userTable.querySelector(
        `.socket-users[data-user-id="${activeUserID}"]`
      );
      if (activeRow) {
        activeRow.classList.add("table-active");
      }
    }
  }
});
if (sessionUsername && sessionUserID) {
  socketConnect(sessionUsername, sessionUserID)
    .then(showChatUI)
    .catch(() => {
      if (socket.connected) {
        socket.disconnect();
      }
      socket.auth = {};
      localStorage.removeItem("session-username");
      localStorage.removeItem("session-userID");
      sessionUsername = "";
      sessionUserID = "";
      showLoginUI();
    });
} else {
  showLoginUI();
}

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const to = title.getAttribute("userID");
  const messageValue = messageInput.value.trim();
  if (!to || !sessionUserID || !messageValue || !socket.connected) {
    return;
  }
  const time = new Date().toLocaleString("ko-KR", { hour12: false });
  // 메세지 payload만들기
  const payload = {
    from: sessionUserID,
    to,
    message: messageValue,
    time,
  };
  socket.emit("message-to-server", payload);
  appendMessage({
    message: payload.message,
    time: payload.time,
    position: "right",
  });
  messageInput.value = "";
  messageInput.focus();
});

socket.on("message-to-client", ({ from, message, time }) => {
  const receiver = title.getAttribute("userID");
  const notify = document.getElementById(from);

  if (!receiver || receiver !== from) {
    if (notify) {
      notify.classList.remove("d-none");
    }
    return;
  }

  appendMessage({
    message,
    time,
    position: "left",
  });
  if (notify) {
    notify.classList.add("d-none");
  }
});

socket.on("fetch-messages", (history = []) => {
  messages.innerHTML = "";
  history.forEach((item) => {
    const isMine = item.from === sessionUserID;
    appendMessage({
      message: item.message,
      time: item.time,
      position: isMine ? "right" : "left",
    });
  });
});
