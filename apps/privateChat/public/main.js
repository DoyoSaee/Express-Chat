const socket = io({ autoConnect: false });
socket.onAny((event, ...args) => {
  console.log(event, args);
});

const USERS_EMPTY_HTML =
  '<div class="empty-state">최근 대화한 유저가 없어요.</div>';

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
let connectedUsers = [];
let conversationList = [];
const unreadUserIDs = new Set();

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const legacyMatch = value.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2})시\s*(\d{1,2})분/
  );
  if (legacyMatch) {
    const [, year, month, day, hour, minute] = legacyMatch;
    const normalized = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    );
    if (!Number.isNaN(normalized.getTime())) {
      return normalized;
    }
  }
  return null;
};

const formatDisplayTime = (value) => {
  const date = parseDateValue(value);
  if (!date) {
    return value || "";
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  let dayPeriod = "";
  let hour = "";
  let minute = "";
  parts.forEach((part) => {
    if (part.type === "dayPeriod") {
      dayPeriod = part.value;
    }
    if (part.type === "hour") {
      hour = part.value;
    }
    if (part.type === "minute") {
      minute = part.value;
    }
  });

  if (!hour && !minute) {
    return value || "";
  }

  const trimmedMinute = minute.padStart(2, "0");
  return `${dayPeriod ? `${dayPeriod} ` : ""}${hour}시 ${trimmedMinute}분`.trim();
};

const isSelf = (userID) =>
  typeof userID === "string" &&
  !!sessionUserID &&
  sessionUserID.length > 0 &&
  sessionUserID === userID;

const mapConversationItem = (item = {}) => ({
  userID: item.userID,
  username: item.username || "",
  updatedAt: item.updatedAt || null,
  hasHistory: true,
});

const applyConversationSnapshot = (items = []) => {
  conversationList = (items || [])
    .map(mapConversationItem)
    .filter((item) => !!item.userID && !isSelf(item.userID));
  renderUserList();
};

const getDisplayName = (username, userID) => {
  if (username && username.trim()) {
    return username.trim();
  }
  if (userID) {
    return userID;
  }
  return "알 수 없음";
};

const resetUserState = () => {
  connectedUsers = [];
  conversationList = [];
  unreadUserIDs.clear();
};

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
  if (userTable) {
    userTable.innerHTML = USERS_EMPTY_HTML;
  }
  if (userTagline) {
    userTagline.textContent = "최근 대화한 유저 없음";
    userTagline.classList.remove("test-success");
    userTagline.classList.add("test-danger");
  }
};

const showChatUI = () => {
  if (loginSection) {
    loginSection.classList.add("d-none");
  }
  if (chatBody) {
    chatBody.classList.remove("d-none");
  }
  if (logoutBtn) {
    logoutBtn.classList.remove("d-none");
  }
  resetConversation();
  userTitle.textContent = sessionUsername;
  renderUserList();
};

const showLoginUI = () => {
  resetUserState();
  clearChatState();
  if (chatBody) {
    chatBody.classList.add("d-none");
  }
  if (loginSection) {
    loginSection.classList.remove("d-none");
  }
  if (logoutBtn) {
    logoutBtn.classList.add("d-none");
  }
  if (loginForm) {
    loginForm.classList.remove("d-none");
    loginForm.reset();
  }
  userTitle.textContent = "";
  if (usernameInput) {
    usernameInput.focus();
  }
};

const upsertConversation = ({
  userID,
  username,
  updatedAt,
  hasHistory,
}) => {
  if (!userID || isSelf(userID)) {
    return;
  }

  const index = conversationList.findIndex((item) => item.userID === userID);
  const base = index > -1 ? conversationList[index] : {};

  const next = {
    ...base,
    userID,
  };

  if (typeof username === "string" && username.trim()) {
    next.username = username.trim();
  }

  if (typeof updatedAt === "string" && updatedAt.trim()) {
    next.updatedAt = updatedAt.trim();
  } else if (!next.updatedAt) {
    next.updatedAt = new Date().toISOString();
  }

  if (typeof hasHistory === "boolean") {
    next.hasHistory = hasHistory;
  } else if (typeof next.hasHistory !== "boolean") {
    next.hasHistory = false;
  }

  if (index > -1) {
    conversationList[index] = next;
  } else {
    conversationList.push(next);
  }
};

const renderUserList = () => {
  if (!userTable) {
    return;
  }

  const combinedMap = new Map();

  conversationList.forEach((item) => {
    if (!item?.userID || isSelf(item.userID)) {
      return;
    }
    combinedMap.set(item.userID, {
      userID: item.userID,
      username: item.username || "",
      updatedAt: item.updatedAt || null,
      isOnline: false,
      hasHistory: item.hasHistory !== false,
    });
  });

  connectedUsers.forEach((user) => {
    if (!user?.userID || isSelf(user.userID)) {
      return;
    }
    const existing = combinedMap.get(user.userID);
    if (existing) {
      existing.isOnline = true;
      if (!existing.username && user.username) {
        existing.username = user.username;
      }
    } else {
      combinedMap.set(user.userID, {
        userID: user.userID,
        username: user.username || "",
        updatedAt: null,
        isOnline: true,
        hasHistory: false,
      });
    }
  });

  const combined = Array.from(combinedMap.values());

  if (combined.length === 0) {
    userTable.innerHTML = USERS_EMPTY_HTML;
    if (userTagline) {
      userTagline.textContent = "최근 대화한 유저 없음";
      userTagline.classList.remove("test-success");
      userTagline.classList.add("test-danger");
    }
    return;
  }

  combined.sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }
    if (a.updatedAt && b.updatedAt) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    if (a.updatedAt) {
      return -1;
    }
    if (b.updatedAt) {
      return 1;
    }
    return getDisplayName(a.username, a.userID).localeCompare(
      getDisplayName(b.username, b.userID),
      "ko"
    );
  });

  userTable.innerHTML = "";
  const table = document.createElement("table");
  table.classList.add("users-table");

  combined.forEach((item) => {
    const row = document.createElement("tr");
    row.classList.add("socket-users");
    row.dataset.userId = item.userID;
    if (item.username) {
      row.dataset.username = item.username;
    }
    if (item.isOnline) {
      row.classList.add("is-online");
    }

    const infoCell = document.createElement("td");
    infoCell.classList.add("user-cell");

    const primary = document.createElement("div");
    primary.classList.add("user-primary");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("user-name");
    nameSpan.textContent = getDisplayName(item.username, item.userID);
    primary.appendChild(nameSpan);

    const statusSpan = document.createElement("span");
    statusSpan.classList.add(
      "user-status",
      item.isOnline ? "status-online" : "status-offline"
    );
    statusSpan.textContent = item.isOnline ? "온라인" : "오프라인";
    primary.appendChild(statusSpan);

    const badge = document.createElement("span");
    badge.classList.add("notify-badge");
    badge.id = item.userID;
    if (!unreadUserIDs.has(item.userID)) {
      badge.classList.add("d-none");
    }
    badge.textContent = "!";
    primary.appendChild(badge);

    infoCell.appendChild(primary);

    row.appendChild(infoCell);

    const actionsCell = document.createElement("td");
    actionsCell.classList.add("actions-cell");
    if (item.hasHistory) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.classList.add("btn-inline", "btn-remove");
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const displayName = getDisplayName(item.username, item.userID);
        const confirmed = window.confirm(
          `${displayName}님과의 대화를 삭제할까요?`
        );
        if (!confirmed) {
          return;
        }
        await removeConversation(item.userID);
      });
      actionsCell.appendChild(deleteBtn);
    }
    row.appendChild(actionsCell);

    row.addEventListener("click", () =>
      setActiveUser(row, getDisplayName(item.username, item.userID), item.userID)
    );

    table.appendChild(row);
  });

  userTable.appendChild(table);

  const onlineCount = combined.filter((item) => item.isOnline).length;
  if (userTagline) {
    if (onlineCount > 0) {
      userTagline.textContent = `온라인 ${onlineCount}명 · 총 ${combined.length}명`;
      userTagline.classList.remove("test-danger");
      userTagline.classList.add("test-success");
    } else {
      userTagline.textContent = `최근 대화한 유저 ${combined.length}명`;
      userTagline.classList.remove("test-success");
      userTagline.classList.add("test-danger");
    }
  }

  const activeUserID = title.getAttribute("userID");
  if (activeUserID) {
    const activeRow = userTable.querySelector(
      `.socket-users[data-user-id="${activeUserID}"]`
    );
    if (activeRow) {
      activeRow.classList.add("table-active");
    }
  }
};

const refreshConversations = async () => {
  if (!sessionUserID) {
    return;
  }

  try {
    const res = await fetch(`/conversations/${sessionUserID}`);
    if (!res.ok) {
      throw new Error("대화 목록을 가져오지 못했습니다.");
    }
    const data = await res.json();
    applyConversationSnapshot(data.conversations || []);
  } catch (err) {
    console.error(err);
  }
};

const removeConversation = async (partnerID) => {
  if (!sessionUserID || !partnerID) {
    return;
  }

  try {
    const res = await fetch(
      `/conversations/${sessionUserID}/${partnerID}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok && res.status !== 404) {
      throw new Error("대화를 삭제하지 못했습니다.");
    }

    conversationList = conversationList.filter(
      (item) => item.userID !== partnerID
    );
    unreadUserIDs.delete(partnerID);

    if (title.getAttribute("userID") === partnerID) {
      resetConversation();
    }

    renderUserList();
    refreshConversations();
  } catch (err) {
    console.error(err);
    window.alert("대화를 삭제하지 못했습니다. 다시 시도해주세요.");
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

if (loginForm) {
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
}

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
    refreshConversations();
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
  msgContainer.classList.remove("d-none");
  messages.classList.remove("d-none");
  messages.innerHTML = "";
  messageInput.value = "";
  messageInput.focus();
  socket.emit("fetch-messages", { receiver: userID });
  unreadUserIDs.delete(userID);
  const notify = document.getElementById(userID);
  if (notify) {
    notify.classList.add("d-none");
  }
};

const appendMessage = ({ message, time, position }) => {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-row", position);

  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble", position);
  bubble.textContent = message;

  const timeStamp = document.createElement("span");
  timeStamp.classList.add("message-time");
  timeStamp.textContent = formatDisplayTime(time);

  if (position === "right") {
    wrapper.appendChild(timeStamp);
    wrapper.appendChild(bubble);
  } else {
    wrapper.appendChild(bubble);
    wrapper.appendChild(timeStamp);
  }

  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
};

socket.on("users-Data", ({ users = [] }) => {
  connectedUsers = Array.isArray(users) ? users : [];
  renderUserList();

  const activeUserID = title.getAttribute("userID");
  if (activeUserID) {
    const stillVisible = connectedUsers.some(
      (user) => user.userID === activeUserID
    );
    if (!stillVisible) {
      // Keep conversation if saved; reset only when no history
      const hasHistory = conversationList.some(
        (item) => item.userID === activeUserID
      );
      if (!hasHistory) {
        resetConversation();
      }
    }
  }
});

socket.on("conversation-list", ({ conversations = [] } = {}) => {
  applyConversationSnapshot(conversations);
});

socket.on("conversation-deleted", ({ userID }) => {
  if (!userID) {
    return;
  }
  conversationList = conversationList.filter((item) => item.userID !== userID);
  unreadUserIDs.delete(userID);
  if (title.getAttribute("userID") === userID) {
    resetConversation();
  }
  renderUserList();
});

if (sessionUsername && sessionUserID) {
  socketConnect(sessionUsername, sessionUserID)
    .then(() => {
      showChatUI();
      refreshConversations();
    })
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

if (messageForm) {
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const to = title.getAttribute("userID");
    const messageValue = messageInput.value.trim();
    if (!to || !sessionUserID || !messageValue || !socket.connected) {
      return;
    }

    const activeUsername = (title.textContent || "").trim();
    const time = new Date().toISOString();
    const payload = {
      to,
      toUsername: activeUsername,
      message: messageValue,
      time,
    };
    socket.emit("message-to-server", payload);
    appendMessage({
      message: payload.message,
      time: payload.time,
      position: "right",
    });
    unreadUserIDs.delete(to);
    upsertConversation({
      userID: to,
      username: activeUsername,
      updatedAt: time,
      hasHistory: true,
    });
    renderUserList();
    messageInput.value = "";
    messageInput.focus();
  });
}

socket.on("message-to-client", ({ from, fromUsername, message, time }) => {
  const activeUserID = title.getAttribute("userID");
  const isActive = activeUserID && activeUserID === from;

  if (isActive) {
    appendMessage({
      message,
      time,
      position: "left",
    });
    unreadUserIDs.delete(from);
  } else {
    unreadUserIDs.add(from);
  }

  upsertConversation({
    userID: from,
    username: fromUsername,
    updatedAt: time || new Date().toISOString(),
    hasHistory: true,
  });
  renderUserList();
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

  const partnerID = title.getAttribute("userID");
  if (partnerID && history.length > 0) {
    const last = history[history.length - 1];
    const parsedTime = parseDateValue(last.time);
    upsertConversation({
      userID: partnerID,
      updatedAt: parsedTime ? parsedTime.toISOString() : undefined,
      hasHistory: true,
    });
    renderUserList();
  }
});
