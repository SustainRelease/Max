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

function getNotifications(req, res, next) {
  function getAdminNot () {
    return new Promise (function(fulfill, reject) {
      if (res.locals.isAdmin) {
        var query = {"subStatus": "Pending approval"};
        var projection = {"title": true, "setupDate": true};
        res.locals.mongoHelper.getDocs("Project", query, projection).then(function(docs) {
          if (!docs) {
            fulfill(null);
          } else {
            var adminNots = [];
            for (var i = 0; i < docs.length; i++) {
              adminNots[i] = {title: docs[i].title, date: docs[i].setupDate, path: "/project?id=" + docs[i].id}
            }
            fulfill(adminNots);
          }
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
      } else {
        fulfill(null);
      }
    });
  }
  getAdminNot().then(function(adminNots) {
    console.log("Admin notifications:");
    console.log(adminNots);
  });
}

module.exports.checkLoggedIn = checkLoggedIn;
module.exports.checkEngineer = checkEngineer;
module.exports.checkClient = checkClient;
module.exports.checkAdmin = checkAdmin;

module.exports.getNotifications = getNotifications;
module.exports.getUserStatus = getUserStatus;
