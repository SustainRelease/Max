var mongoose = require('mongoose');

var CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  isClient: {
    type: Boolean,
    required: true,
    default: true
  },
  setupDate: {
    type: Date,
    required: true,
    default: Date.now()
  }
});

//Check if company already exists
CompanySchema.pre('save', function(next) {
  var company = this;
  if (!company.isModified('title')) return next();
  Project.findOne({"name": company.name}, {"_id": true}, function (error, doc) {
    if (error) next(error);
    if (doc) next(new Error ("Company '" + company.name + "' already exists"));
    next();
  });
});

var Company = mongoose.model('Company', CompanySchema);
module.exports = Company;
