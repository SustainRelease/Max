var mongoose = require('mongoose');
var Project = require("../models/project.js");
var moment = require('moment');

var HistorySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  specialType: {
    type: Number,
    required: true,
    default: 0 //0: None, 1: ProjectSchedule, 2: Job complete
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
  projectTitle: {
    type: String,
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
  actionDate: {
    type: Date,
    required: false
  },
  actionResult: {
    type: Number,
    required: false,
    default: 0    //0: No action, 1: Accepted with Mods, 2: Accepted
  },
  notifiable: {
    type: Boolean,
    required: false,
    default: false
  }
});

HistorySchema.pre('validate', function(next) {
  var history = this;

  //For uncompleted actions, set status to waiting
  if (history.actionType == "None") {
    history.status = "Done";
  } else {
    if (!history.actionResult) {
      history.status = "Waiting " + history.actionType + " Approval";
      history.notifiable = true;
    }
  }

  //Ensure project path is valid and that progress is equal to or greater than existing progress
  var query = {"_id": history.project};
  var projection = {"progress": true, "title": true};
  Project.findOne(query, projection, function (err, doc) { //Find current project progress
    if (err) {
      console.error(err);
      next(err);
    } else {
      if (!doc) {
        console.log("History project id: " + this.project);
        var error = new Error("Project not found");
        console.error(error);
        next(error);
      } else {
        var currentProgress = doc.progress;
        if (history.totalProgress) {
          var newProgress = history.totalProgress;
        } else {
          var newProgress = currentProgress;
        }
        if (newProgress < currentProgress) {
          console.log("Invalid progress variation " + currentProgress + " -> " + newProgress);
          newProgress = currentProgress;
        }
        history.totalProgress = newProgress;
        history.projectTitle = doc.title;
        next();
      }
    }
  });
});

HistorySchema.pre('save', function(next) {
  var history = this;
  var actionResultText = ["none", "required modifications", "accepted"];
  if (history.isModified('actionResult')) {
    console.log("Action result modified");
  //Trying to perform an action
    console.log("Attempting action");
    if (history.actionType == "None" || history.actionDate || !history.actionResult) {
      console.error("Cannot complete action");
    } else {
      history.status = history.actionType + " " + actionResultText[history.actionResult];
      history.notifiable = false;
      history.actionDate = Date.now();
    }
  } else {
    console.log("Action result unmodified");
  }
  next();
});

HistorySchema.post('save', function() {
  //Update project progress after saving history
  //Maybe move this stuff to mongoHelper.resolveProjectHistories?
  console.log("Running post save hook");
  var history = this;
  if (history.actionResult && history.specialType == 1) {
    var projectData = {
      status: "Ongoing",
      subStatus: "In Progress"
    }
    let query = {"_id": history.project};
    let options = {"multi": false, "upsert": false};
    Project.findOneAndUpdate(query, projectData, options, function (err, doc) {
      if (err) {
        console.error(err);
      } else {
        console.log("Post save hook complete");
      }
    });
  } else {
    console.log("Post save hook complete");
  }
});

HistorySchema.methods.approve = function approve (userId, withMod) {
  var history = this;
  if (withMod) {
    console.log("ApproveModing history with userId: " + userId);
    return action (history, userId, 1);
  } else {
    console.log("Approving history with userId: " + userId);
    return action (history, userId, 2);
  }
}


function action (history, userId, actionResult) {
  return new Promise (function (fulfill, reject) {
    checkUserAction(history, userId).then(function() { //Ensure the action is still pending
      history.actionResult = actionResult;
      history.save(function(err) {
        if (err) {
          reject(err);
        } else {
          fulfill();
        }
      });
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function checkUserAction (history, userId) {
  return new Promise (function (fulfill, reject) {
    if (history.actionResult) {
      reject(new Error("History already actioned"));
    } else {
      if (history.actionType == "None") {
        reject(new Error("History has no action"));
      } else {
        if (userId != history.actionUser) {
          reject(new Error("User does not have permission to action history event"));
        } else {
          fulfill();
        }
      }
    }
  });
}

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
            histories[i].tidyDate = tidyDate(histories[i].date)
          }
          if (loud) console.log("Found histories");
          fulfill(histories);
        }
      }
    });
  });
}

HistorySchema.statics.getNotifications = function getNotifications(userId) {
  var History = this;
  var query = {actionUser: userId, notifiable: true};
  return History.findHistories(query);
}

HistorySchema.statics.getProjectHistories = function getProjectHistories(projectId) {
  var History = this;
  var query = {project: projectId};
  return History.findHistories(query);
}

function getStatusText (history) {
  if (!history.actionResult) {
    //No action, return basic status
    return history.status;
  } else {
    //Action completed, include date with status
    var dateString = tidyDate(history.actionDate);
    return history.status + " " + dateString;
  }
}

function tidyDate (date) {
  return moment(date, "DD/MM/YYYY").format("DD/MM/YYYY");
}

var History = mongoose.model('History', HistorySchema);
module.exports = History;
