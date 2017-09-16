var mongoose = require('mongoose');

var ReviewSchema = new mongoose.Schema({
  clientUser: {
    type: String,
    required: true,
    permanent: true
  },
  responsibleUser: {
    type: String,
    required: true,
    permanent: true
  },
  project: {
    type: String,
    required: true,
    permanent: true
  },
  qualityScore: {
    type: Number,
    required: false,
    permanent: true
  },
  coopScore: {
    type: Number,
    required: false,
    permanent: true
  },
  recommendScore: {
    type: Number,
    required: false,
    permanent: true
  },
  comment: {
    type: String,
    required: false,
    permanent: true
  }
});

var Review = mongoose.model('Review', ReviewSchema);
module.exports = Review;
