var mongoose = require('mongoose');

var ConversationSchema = new mongoose.Schema({
  ofPosts: [{
    text: {
      type: String,
      trim: true,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    postDate: {
      type: Date,
      required: true,
      default: Date.now()
    }
  }]
});

var Conversation = mongoose.model('Conversation', ConversationSchema);
module.exports = Conversation;
