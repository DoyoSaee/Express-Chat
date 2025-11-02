const messageModel = require("../models/messages.model");

const getToken = ({ sender, receiver }) => {
  return [sender, receiver].sort().join("_");
};

const saveMessage = async ({ from, to, message, time }) => {
  const token = getToken({ sender: from, receiver: to });
  const payload = { from, message, time };

  try {
    await messageModel.updateOne(
      { userToken: token },
      {
        $setOnInsert: { userToken: token },
        $push: { messages: payload },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("메시지 저장 실패:", err);
  }
};

const fetchMessages = async ({ sender, receiver }) => {
  const token = getToken({ sender, receiver });
  try {
    const result = await messageModel.findOne({ userToken: token }).lean();
    return result?.messages ?? [];
  } catch (err) {
    console.error("메시지 조회 실패:", err);
    return [];
  }
};

module.exports = {
  saveMessage,
  fetchMessages,
};
