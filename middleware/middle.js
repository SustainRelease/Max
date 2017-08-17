var History = require("../models/history.js");
var Project = require("../models/project.js");

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

function accessProject(req, res, next) {
  if (!req.query.id) {
    var err = new Error ("No project Id found");
    console.error(err);
    next(err);
  } else {
    var projectId = req.query.id;
    res.locals.projectId = projectId;
    res.locals.mongoHelper.docPermission(Project, projectId, req.session.userId).then(function(allowAccess) {
      if(!allowAccess) {
        console.error("Access to project " + projectId + " denied to user " + req.session.userId);
        next(new Error ("Access to project denied"));
      } else {
        next();
      }
    });
  }
}

function getNotifications(req, res, next) {
  return History.getNotifications(req.session.userId).then(function (histories) {
    res.notifications = histories;
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

module.exports.getNotifications = getNotifications;
module.exports.getUserStatus = getUserStatus;
module.exports.accessProject = accessProject;
