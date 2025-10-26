const { default: mongoose } = require("mongoose");

const messagesSchema = mongoose.Schema({
  userToken: {
    type: String,
    required: true,
  },
  message: [
    {
      from: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      times: {
        type: String,
        required: true,
      },
    },
  ],
});

const messageModel = mongoose.model("Message", messageSchema);
module.exports = messageModel;
