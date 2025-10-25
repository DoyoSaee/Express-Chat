const users = [];

const addUser = ({ id, username, room }) => {
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();

  if (!username || !room) return { error: "이름과 방이 필요합니다." };
  const existingUser = users.find(
    (user) => user.room === room && user.username === username
  );

  if (existingUser) return { error: "이미 있는 이름입니다." };

  const user = { id, username, room };
  users.push(user);

  return { user };
};
const getUser = (id) => {
  return users.find((user) => user.id === id);
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const getUserInRoom = (room) => {
  return users.filter((user) => user.room === room);
};

module.exports = { addUser, removeUser, getUserInRoom, getUser };
