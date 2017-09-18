var mongoose = require('mongoose');

var ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    required: true
  },
  driveId: {
    type: String,
    required: false
  },
  calendarId: {
    type: String,
    required: false
  },
  clientUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  responsibleUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  qcUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  ofAccessUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: []
  }],
  ofUserDriveAccess: [{
    type: Boolean,
    required: true,
    default: []
  }],
  ofUserCalAccess: [{
    type: Boolean,
    required: true,
    default: []
  }],
  shipType: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
  },
  spentHours: {
    type: Number,
    required: false,
    default: 0
  },
  expectedHours: {
    type: Number,
    required: false
  },
  budgetHours: {
    type: Number,
    required: false
  },
  progress: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    required: true,
    default: "Scheduled"
  },
  subStatus: {
    type: String,
    required: false,
    default: "Pending approval"
  },
  setupDate: {
    type: Date,
    required: true,
    default: Date.now()
  },
  deadline: {
    type: Date,
    requied: false
  },
  priority: {
    type: Number,
    required: true,
    default: 1
  },
  reviewable: {
    type: Boolean,
    required: true,
    default: false
  }
});

//Check if a project of this description already exists for client
ProjectSchema.pre('save', function(next) {
  var project = this;
  if (!project.isModified('title')) return next();
  Project.findOne({"title": project.title, "client": project.client}, {"_id": true}, function (error, doc) {
    if (error) next(error);
    if (doc) next(new Error ("Project '" + project.title + "' already exists for this client"));
    next();
  });
});

ProjectSchema.statics.getStatus = function getStatus (projectId) {
  var Project = this;
  return new Promise (function (fulfill, reject) {
    var query = {"_id": projectId};
    var projection = {"status": true, "subStatus": true};
    Project.findOne(query, projection, function (err, doc) {
      if (err) {
        reject(err);
      } else {
        fulfill({"status": doc.status, "subStatus": doc.subStatus});
      }
    });
  });
}

var Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;
