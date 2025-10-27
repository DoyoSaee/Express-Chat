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
