var History = require("../models/history.js");
var Project = require("../models/project.js");


//-------------------User stuff------------------

function checkLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return res.locals.mongoHelper.doesDocExist("User", req.session.userId).then(function (doesExist) {
      if (doesExist) {
        next();
      } else {
        console.log("Access denied");
        res.redirect(res.locals.subRoute + '/login');
      }
      return;
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  } else {
    console.log("Access denied");
    res.redirect(res.locals.subRoute + '/login');
    return;
  }
}

function checkUserData (req, res, next, key, value) {
  res.locals.mongoHelper.userQuery(req.session.userId).then(function(userData) {
    if(userData[key] == value) {
      next();
    } else {
      console.log("Access denied");
      res.redirect(res.locals.subRoute + '/profile');
    }
  }, function (reason) {
    console.error(reason);
    next(reason);
  });
}

function checkEngineer(req, res, next) {
  return checkUserData(req, res, next, "isEng", true);
}

function checkClient(req, res, next) {
  return checkUserData(req, res, next, "isEng", false);
}

function checkAdmin(req, res, next) {
  return checkUserData(req, res, next, "isAdmin", true);
}

function getUserStatus(req, res, next) {
  res.locals.mongoHelper.userQuery(req.session.userId).then(function(userData) {
    res.locals.isEngineer = userData.isEng;
    res.locals.isAdmin = userData.isAdmin;
    res.locals.companyId = userData.companyId;
    next();
  }, function (reason) {
    console.error(reason);
    next(reason);
  });
}

function getUserProjectRole(req, res, next) {
  var query = {"_id": res.locals.projectId};
  var projection = {responsibleUser: true, qcUser: true, clientUser: true};
  res.locals.mongoHelper.getOneDoc(Project, query, projection).then(function(doc) {
    var projectData = doc;
    var userId = req.session.userId;
    var adminId = res.locals.mongoHelper.getAdminId();

    //Setup project role object
    var projectRoles = {
      "Resp": projectData.responsibleUser,
      "QC": projectData.qcUser,
      "Client": projectData.clientUser,
      "Admin": adminId
    };
    res.locals.projectRoles = projectRoles;

    //Determine what role the user has in the project
    var userProjectRole = "None";
    var prk = Object.keys(projectRoles);
    for (let i = 0; i < prk.length; i++) {
      if (projectRoles[prk[i]].equals(userId)) {
        userProjectRole = prk[i];
        break;
      }
    }
    res.locals.userProjectRole = userProjectRole;
    next();
  }, function(reason) {
    console.error(reason);
    next(reason);
  });
}

//--------------------History stuff----------------

function getHistoryId(req, res, next) {
  if (!req.query.hId) {
    var err = new Error ("No history Id found");
    console.error(err);
    next(err);
  } else {
    res.locals.historyId = req.query.hId;
    next();
  }
}

function getHistoryProject(req, res, next) {
  var query = {"_id": res.locals.historyId};
  var projection = {"project": true};
  res.locals.mongoHelper.getOneDoc(History, query, projection).then(function(hData) {
    res.locals.projectId = hData.project;
    next();
  }, function(reason) {
    console.error(reason);
    next(reason);
  });
}

function getNotifications(req, res, next) {
  return History.getNotifications(req.session.userId).then(function (histories) {
    if (!histories || histories.length == 0) {
      res.locals.areHistories = false;
    } else {
      res.locals.areHistories = true;
      res.locals.histories = histories;
    }
    next();
  }, function(reason) {
    console.error(reason);
    next(reason);
  });
}

function getProjectHistories(req, res, next) {
  History.getProjectHistories(res.locals.projectId).then(function (histories) {
    if (!histories || histories.length == 0) {
      res.locals.areHistories = false;
    } else {
      res.locals.areHistories = true;
      res.locals.histories = histories;
      res.locals.actionHistoryId = null;
      for (let i = 0; i < histories.length; i++) {
        if (histories[i].notifiable) {
          res.locals.openAction = true;
          res.locals.isUserActioner = req.session.userId == histories[i].actionUser;
          res.locals.actionHistoryId = histories[i]["_id"];
        }
      }
    }
    next();
  }, function(reason) {
    console.error(reason);
    next(reason);
  });
}


//------------------DRIVE STUFF-------------------
function resolveFileCode (req, res, next) {
  res.locals.folderId = res.locals.sHelper.uncode(req.query.fCode);
  res.locals.projectFolderId = req.session.projectFolderId;
  next();
}


//--------------------Project stuff----------------

function getProjectId(req, res, next) {
  if (!req.query.id) {
    var err = new Error ("No project Id found");
    console.error(err);
    next(err);
  } else {
    res.locals.projectId = req.query.id;
    req.session.projectId = req.query.id;
    next();
  }
}

function accessProject(req, res, next) {
  var projectId = res.locals.projectId
  res.locals.mongoHelper.docPermission(Project, projectId, req.session.userId).then(function(allowAccess) {
    console.log("AllowAccess: " + allowAccess);
    if(!allowAccess) {
      console.error("Access to project " + projectId + " denied to user " + req.session.userId);
      next(new Error ("Access to project denied"));
    } else {
      next();
    }
  });
}

function getProjectStatus(req, res, next) {
  var projectId = res.locals.projectId;
  var projection = {"status": true, "subStatus": true};
  res.locals.mongoHelper.getDocData(Project, projectId, projection).then(function (doc) {
    res.locals.projectStatus = doc.status;
    res.locals.projectSubStatus = doc.subStatus;
    next();
  }, function (reason) {
    console.error(reason);
    next(reason);
  });
}

function getProjects (req, res, next) {
  res.locals.mongoHelper.getProjects(req.session.userId, res.locals.isAdmin).then(function(projects) {
    var sProjects = [];
    var oProjects = [];
    var fProjects = [];
    if (projects) {
      for (let i = 0; i < projects.length; i++) {
        if (projects[i].status == "Scheduled") {
          sProjects.push(projects[i]);
        }
        if (projects[i].status == "Ongoing") {
          oProjects.push(projects[i]);
        }
        if (projects[i].status == "Finished") {
          fProjects.push(projects[i]);
        }
      }
    }
    res.locals.sProjects = sProjects;
    res.locals.oProjects = oProjects;
    res.locals.fProjects = fProjects;
    res.locals.projects = projects;
    next();
  }, function(reason) {
    console.error(reason);
    next(reason);
  });
}

module.exports.checkLoggedIn = checkLoggedIn;
module.exports.checkEngineer = checkEngineer;
module.exports.checkClient = checkClient;
module.exports.checkAdmin = checkAdmin;

module.exports.resolveFileCode = resolveFileCode;

module.exports.getUserStatus = getUserStatus;
module.exports.getUserProjectRole = getUserProjectRole;

module.exports.getProjectId = getProjectId;
module.exports.accessProject = accessProject;
module.exports.getProjectStatus = getProjectStatus;
module.exports.getProjects = getProjects;

module.exports.getProjectHistories = getProjectHistories;
module.exports.getNotifications = getNotifications;
module.exports.getHistoryId = getHistoryId;
module.exports.getHistoryProject = getHistoryProject;
