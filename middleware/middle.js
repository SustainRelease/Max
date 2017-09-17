var History = require("../models/history.js");
var Project = require("../models/project.js");
var adminCompanyName = require("../data/adminData.json").companyName;
var scoreInfo = require("../data/scoreInfo.js");



//------------------Company stufff------------------
function getCompanies(req, res, next) {
  res.locals.mongoHelper.getDocs("Company", {}, {}).then(function(docs) {
    if (docs) {
      res.locals.companies = docs;
    } else {
      res.locals.companies = null;
    }
    next();
  }, function(reason) {
    next(reason);
  });
}

function getClients(req, res, next) {
  res.locals.mongoHelper.getDocs("Company", {isClient: true}, {}).then(function(docs) {
    if (docs) {
      res.locals.clients = docs;
    } else {
      res.locals.clients = null;
    }
    next();
  }, function(reason) {
    next(reason);
  });
}

//-------------------User stuff------------------

function checkUserData (req, res, next, key, value) {
  if (!res.locals.loggedIn) {
    console.log("Redirecting to login (checkUserData) from url " + req.url);
    res.redirect(res.locals.subRoute + '/login');
  } else {
    if (res.locals[key] == value) {
      next();
    } else {
      console.log("Access denied");
      res.redirect(res.locals.subRoute + '/profile');
    }
  }
}

function getQueryUser (req, res, next) {
  if (!req.query.id) {
    res.locals.qUserId = req.session.userId;
    //Just copy values across from user
    res.locals.qUserIsEngineer = res.locals.isEngineer;
    res.locals.qUserIsAdmin = res.locals.isAdmin;
    next();
  } else {
    //Set query userId and get qUser data
    res.locals.qUserId = req.query.id;
    res.locals.mongoHelper.userQuery(res.locals.qUserId).then(function(userData) {
      res.locals.qUserIsEngineer = userData.isEng;
      res.locals.qUserIsAdmin = userData.isAdmin;
      next();
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  }
}

function checkLoggedIn (req, res, next) {
  console.log("Checking logged in");
  if (res.locals.loggedIn) {
    next();
  } else {
    console.log("Redirecting to login (checkLoggedIn) from url " + req.url);
    res.redirect(res.locals.subRoute + '/login');
  }
}

function checkEngineer(req, res, next) {
  return checkUserData(req, res, next, "isEngineer", true);
}

function checkClient(req, res, next) {
  return checkUserData(req, res, next, "isEngineer", false);
}

function checkAdmin(req, res, next) {
  return checkUserData(req, res, next, "isAdmin", true);;
}

function getUserProjectRole(req, res, next) {
  console.log("Getting user project role");
  var query = {"_id": res.locals.projectId};
  var projection = {responsibleUser: true, qcUser: true, clientUser: true};
  res.locals.mongoHelper.getOneDoc(Project, query, projection).then(function(doc) {
    var projectData = doc;
    var userId = req.session.userId;
    var adminId = res.locals.mongoHelper.getAdminId();

    //Setup project role object
    var projectRoles = {"Admin": adminId};
    var pdKeys = ["responsibleUser", "qcUser", "clientUser"];
    var prKeys = ["Resp", "QC", "Client"];
    for (let i = 0; i < pdKeys.length; i++) {
      if (projectData[pdKeys[i]]) {
        projectRoles[prKeys[i]] = projectData[pdKeys[i]];
      }
    }
    
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

function checkUserIsProjectClient (req, res, next) {
  if (!res.locals.loggedIn) {
    console.log("Redirecting to login (checkUserIsProjectClient) from url " + req.url);
    res.redirect(res.locals.subRoute + '/login');
  } else {
    if (!res.locals.userProjectRole) {
      console.log("WARNING: userProjectRole not set");
      res.redirect(res.locals.subRoute + '/project?id=' + res.locals.projectId);
    } else {
      if (res.locals.userProjectRole == "Client") {
        next();
      } else {
        console.log("Access denied: User is not project client");
        res.redirect(res.locals.subRoute + '/project?id=' + res.locals.projectId);
      }
    }
  }
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
  console.log("Getting project Id");
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
  console.log("Accessing Project");
  if (res.locals.userProjectRole == "None") {
    console.error("Access to project " + projectId + " denied to user " + req.session.userId);
    res.redirect(res.locals.subRoute + '/profile');
  } else {
    next();
  }
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
  var query;
  if (res.locals.isAdmin) {
    query = {};
  } else {
    if (res.locals.isEngineer) {
      query = {"$or": [{"responsibleUser": req.session.userId}, {"qcUser": req.session.userId}]};
    } else {
      query = {"clientUser": req.session.userId};
    }
  }
  res.locals.mongoHelper.getDocs(Project, query).then(function(projects) {
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


//--------------------REVIEWS----------------

function getEngineerReviews(req, res, next) {
  if (res.locals.qUserIsEngineer) {
    console.log("Query user is engineer, getting reviews");
    res.locals.mongoHelper.getDocs("Review", {responsibleUser: res.locals.qUserId}, {}).then(function(docs) {
      if (docs) {
        res.locals.reviews = docs;
        console.log("Getting average scores");
        var collatedData = scoreInfo.collateReviews(docs);
        console.log(collatedData);
        res.locals.collatedReviews = collatedData;
      } else {
        console.log("None found");
        res.locals.reviews = null;
      }
      next();
    }, function(reason) {
      next(reason);
    });
  } else {
    console.log("User is not an engineer");
    next();
  }
}


module.exports.getCompanies = getCompanies;
module.exports.getClients = getClients;

module.exports.checkLoggedIn = checkLoggedIn;
module.exports.checkEngineer = checkEngineer;
module.exports.checkClient = checkClient;
module.exports.checkAdmin = checkAdmin;
module.exports.getQueryUser = getQueryUser;

module.exports.resolveFileCode = resolveFileCode;

module.exports.getUserProjectRole = getUserProjectRole;
module.exports.checkUserIsProjectClient = checkUserIsProjectClient;

module.exports.getProjectId = getProjectId;
module.exports.accessProject = accessProject;
module.exports.getProjectStatus = getProjectStatus;
module.exports.getProjects = getProjects;

module.exports.getProjectHistories = getProjectHistories;
module.exports.getNotifications = getNotifications;
module.exports.getHistoryId = getHistoryId;
module.exports.getHistoryProject = getHistoryProject;

module.exports.getEngineerReviews = getEngineerReviews;
