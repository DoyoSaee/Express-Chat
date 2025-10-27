const { title } = require("process");

const socket = io("http://localhost:8085", { autoConnect: false });
socket.onAny((event, ...args) => {
  console.log(event, args);
});

socket.connect();

// 전역변수들 2025-10-27  8개
// todo:
const chatBody = document.querySelector(".chat-body");
const userTitle = document.querySelector(".user-title");
const loginContainer = document.querySelector(".login-container");
const userTable = document.querySelector(".users");
const userTagLine = document.querySelector("#user-tagline");
const title = document.querySelector("#active-user");
const messages = document.querySelector(".messages");
const msdDiv = document.querySelector(".msd-form");

//login form handler
const loginForm = document.querySelector(".user-login");
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username");
  createSession(username.value.toLowerCase());
  username.value = "";
});

const createSession = async (username) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  };

  await fetch("/session", options)
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      socketConnect(data.username, data.userID);
      //로컬스토리지에 세션을 저장
      localStorage.setItem("session-username", data.username);
      localStorage.setItem("session-userID", data.userID);
      loginContainer.classList.add("d-none");
      chatBody.classList.remove("d-none");
      userTitle.classList.remove("d-none");
    })
    .catch((err) => console.log(err));
};

const socketConnect = async (username, userID) => {
  socket.auth = {
    username,
    userID,
  };
  await socket.connect();
};
