var mongoose = require('mongoose');
var Promise = require('promise');

var HistorySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now()
  },
  actionUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
});

var History = mongoose.model('History', HistorySchema);
module.exports = History;
