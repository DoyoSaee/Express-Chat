const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema({
  userToken: {
    type: String,
    required: true,
    unique: true,
  },
  messages: [
    {
      from: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      time: {
        type: String,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("Message", messagesSchema);
