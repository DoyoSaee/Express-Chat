const messageModel = require("../models/messages.model");

const getToken = ({ sender, receiver }) => {
  return [sender, receiver].sort().join("_");
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildParticipants = ({ from, to, fromUsername, toUsername }) => {
  const participants = [
    {
      userID: from,
    },
    {
      userID: to,
    },
  ];

  if (fromUsername) {
    participants[0].username = fromUsername.trim();
  }
  if (toUsername) {
    participants[1].username = toUsername.trim();
  }

  return participants;
};

const saveMessage = async ({
  from,
  to,
  message,
  time,
  fromUsername,
  toUsername,
}) => {
  const token = getToken({ sender: from, receiver: to });
  const payload = { from, message, time };

  try {
    await messageModel.updateOne(
      { userToken: token },
      {
        $setOnInsert: { userToken: token },
        $set: {
          participants: buildParticipants({
            from,
            to,
            fromUsername,
            toUsername,
          }),
        },
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

const getCounterpartFromToken = (token, userID) => {
  const [first, second] = token.split("_");
  if (first === userID) {
    return second;
  }
  if (second === userID) {
    return first;
  }
  return null;
};

const getConversations = async (userID) => {
  if (!userID) {
    return [];
  }

  try {
    const escaped = escapeRegex(userID);
    const tokenRegex = new RegExp(`(^${escaped}_)|(_${escaped}$)`);
    const filter = {
      $or: [
        { "participants.userID": userID },
        { userToken: tokenRegex },
      ],
    };

    const conversations = await messageModel
      .find(filter)
      .select("userToken participants updatedAt")
      .lean();

    return conversations
      .map((conversation) => {
        const participants = conversation.participants || [];
        const counterpart =
          participants.find((participant) => participant.userID !== userID) ||
          participants.find((participant) => participant.userID === userID);

        const counterpartID =
          counterpart?.userID ||
          getCounterpartFromToken(conversation.userToken, userID);

        if (!counterpartID) {
          return null;
        }

        return {
          userID: counterpartID,
          username: counterpart?.username || "",
          updatedAt: conversation.updatedAt
            ? conversation.updatedAt.toISOString()
            : null,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error("대화 목록 조회 실패:", err);
    return [];
  }
};

const deleteConversation = async ({ userID, partnerID }) => {
  if (!userID || !partnerID) {
    return false;
  }

  const token = getToken({ sender: userID, receiver: partnerID });

  try {
    const result = await messageModel.deleteOne({ userToken: token });
    return result.deletedCount > 0;
  } catch (err) {
    console.error("대화 삭제 실패:", err);
    return false;
  }
};

module.exports = {
  saveMessage,
  fetchMessages,
  getConversations,
  deleteConversation,
};
