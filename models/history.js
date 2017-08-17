var mongoose = require('mongoose');
var Project = require("../models/project.js");

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
  project: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  spentHours: {
    type: Number,
    required: true,
    default: 0
  },
  totalProgress: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    required: true,
    default: "In progress"
  },
  actionUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  actionType: {
    type: String,
    default: "None",  //"Client" or "Internal"
    required: true
  },
  actionComplete: {
    type: Boolean,
    required: true,
    default: false
  },
  actionDate: {
    type: Date,
    required: false
  },
  actionApproved: {
    type: Boolean,
    required: false
  },
  notifiable: {
    type: Boolean,
    required: false,
    default: false
  }
});



HistorySchema.pre('validate', function(next) {
  var history = this;

  //Status is set automatically for if there are actions involved
  if (this.actionUser) {
    if (this.actionComplete) {
      if (this.actionApproved) {
        this.status = this.actionType + " approved";
      } else {
        this.status = "Modifications required";
      }
    } else {
      this.status = "Waiting " + this.actionType + " Approval";
    }
  }

  //Ensure project path is valid and that progress is equal to or greater than existing progress
  var query = {"_id": this.project};
  var projection = {"progress": true};
  console.log("Let's find the project");
  Project.findOne(query, projection, function (err, doc) { //Find current project progress
    if (err) {
      console.error(err);
      next(err);
    } else {
      if (!doc) {
        var errror = new Error("Project not found");
        console.error(err);
        next(err);
      } else {
        console.log("Found the project");
        var currentProgress = doc.progresss
        console.log("Please tell me it's not this line");
        var newProgress = this.totalProgress || currentProgress;
        console.log("It's not this line");
        if (newProgress < currentProgress) {
          console.log("Invalid progress variation " + currentProgress + " -> " + newProgress);
          newProgress = currentProgress;
        }
        this.totalProgress = newProgress;
        next();
      }
    }
  });
});

HistorySchema.pre('save', function(next) {
  var history = this;
  if (history.actionUser) {
    history.notifiable = true;
  } else {
    history.notifiable = false;
  }
  next();
});

HistorySchema.post('save', function() {
  //Update project progress after saving history
  if (this.totalProgress) {
    var history = this;
    let query = {"_id": this.project};
    let data = {"progress": this.totalProgress};
    let options = {"multi": false, "upsert": false};
    Project.findOneAndUpdate(query, data, options, function (err, doc) {
      if (err) {
        console.error(err);
      }
    });
  }
});

HistorySchema.statics.findHistories = function findHistories (query, loud) {
  var History = this;
  return new Promise (function (fulfill, reject) {
    if (loud) console.log("Getting notifications");
    History.find(query, null, function (err, histories) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
          if (loud) console.log("No error");
         if (!histories || !histories.length) {
           if (loud) console.log("No histories found");
          fulfill(null);
        } else {
          for (let i = 0; i < histories.length; i++) {
            histories[i].statusText = getStatusText(histories[i]);
          }
          if (loud) console.log("Found histories");
          if (loud) console.log(histories);
          fulfill(histories);
        }
      }
    });
  });
}

HistorySchema.statics.getNotifications = function getNotifications(userId) {
  var History = this;
  var query = {actionUser: userId, notifiable: true};
  return this.findHistories(query);
}

HistorySchema.statics.getProjectHistories = function getProjectHistories(projectId, role) {
  var History = this;
  var query = {};
  //Get the histories for a given project, with buttons supplied as per the given role.
  return this.findHistories(query);
}

function getStatusText (history) {
  if (history.actionType == "None") {
    //No action, return basic status
    return history.status;
  } else {
    if (!history.actionDate) {
      //Still waiting for action
      return history.status;
    } else {
      //Action completed, include date with status
      var dateString = moment(history.actionDate, "DD/MM/YYYY").format("DD/MM/YYYY");
      return history.status + " " + dateString;
    }
  }
}

var History = mongoose.model('History', HistorySchema);
module.exports = History;
