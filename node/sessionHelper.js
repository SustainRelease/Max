var count = 0;
var Promise = require('promise');
var loud = false;

module.exports = function makeSesssionHelper(session) {
  if (!session.index) {
    session.index = count;
    count++;
    //console.log("Creating session: " + session.index);
    session.codeTranslator = [];
  } else {
    //console.log("Loading existing session: " + session.index);
  }


  function retrieveUserStatus(res) {
    //Gets the user status from the session
    if (loud) console.log("session > locals")
    res.locals.isEngineer = session.isEngineer;
    res.locals.isAdmin = session.isAdmin;
    res.locals.companyId = session.companyId;
  }


  var my = {};

  my.resetUserStatus = function resetUserStatus(res) {
    return new Promise (function (fulfill, reject) {
      if (loud) console.log("Retrieving userData from mongo");
      res.locals.mongoHelper.userQuery(session.userId).then(function(userData) {
        if (loud) console.log("mongo > session");
        session.isEngineer = userData.isEng;
        session.isAdmin = userData.isAdmin;
        session.companyId = userData.companyId;
        session.userStatusSet = true;
        retrieveUserStatus(res);
        fulfill();
      }, function (reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

  my.getUserStatus = function getUserStatus(res) {
    return new Promise (function (fulfill, reject) {
      if (!session.userId) {
        fulfill();
      } else {
        res.locals.loggedIn = true;
        if (session.userStatusSet) {
          if (loud) console.log("Loading existing userdata");
          retrieveUserStatus(res);
          fulfill();
        } else {
          my.resetUserStatus(res).then(function(res) {
            fulfill();
          }, function(reason) {
            reject(reason);
          });
        }
      }
    });
  }

  my.display = function display() {
    var sesCondense = {};
    var keys = Object.keys(session);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (key != "cookie") {
        sesCondense[key] = session[key];
      }
    }
    console.log(sesCondense);
  }

  my.uncode = function uncode(fCode) {
    if (fCode) {
      return session.codeTranslator[fCode];
    } else {
      return session.projectFolderId;
    }
  }

  my.processDriveFiles = function processDriveFiles(files) {
    var count = 0;
    session.codeTranslator = [];
    for (let i = 0; i < files.length; i++) {
      files[i].code = count;
      session.codeTranslator[count] = files[i].id;
      count++;
      if (i == 0) { //The first item is always the containing folder
        if (files[i].id == session.projectFolderId) {
          files[i].isProject = true;
        } else { // If this isn't the project folder, add it's parent folder's id
          files[i].parentCode = count;
          session.codeTranslator[count] = files[i].parents[0]
          count++;
        }
      }
    }
  }

  return my;
}
