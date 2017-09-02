module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');
  var path = require('path');
  var formidable = require('formidable');
  var fs = require('fs');
  var User = require("../models/user.js");
  var userKusetData = require("../data/kusetData.json").user;
  var kusetManager = require('../node/kusetManager')(userKusetData);

  router.get('/register', function(req, res, next) {
    res.locals.mongoHelper.getClientCompanies().then(function(clients) {
      var selectData = {clients: clients};
      var formVals = kusetManager.getFormVals("register", null, selectData);
      var formData = {name: "userForm", scriptName: "userNew", submitText: "Submit", submitPath: "/register", vals: formVals};
      var pugData = {formData: formData, loggedOut: true}
      res.render('userNew', pugData);
    });
  })

  router.get('/REST/userKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManager.getFormVals());
  });

  router.post('/register', function(req, res, next) {
    let userData = kusetManager.saveVals(req.body);
    res.locals.mongoHelper.createDoc(User, userData).then(function (response) {
      req.session.userId = response.docId;
      res.redirect(res.locals.subRoute + '/profile');
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.get('/notifications', mid.checkLoggedIn, mid.getNotifications, function(req, res, next) {
    res.render('notifications');
  });

  router.get('/users', mid.checkLoggedIn, mid.getUserStatus, function(req, res, next) {
    res.locals.mongoHelper.getDocs(User, {"isClient": false}).then(function(engineers) {
      if (res.locals.isEngineer) {
         var cQuery = {"isClient": true};
      } else {
         var cQuery = {"isClient": true, company: res.locals.companyId};  //Clients can only see there own company
      }
      res.locals.mongoHelper.getDocs(User, cQuery).then(function(clients) {
        var pugData = {engineers: engineers, clients: clients};
        res.render('users', pugData);
      });
    });
  });

  router.get('/profile', mid.checkLoggedIn, function(req, res, next) {  //The users own profile
    res.locals.mongoHelper.getDocData(User, req.session.userId).then(function (profile) {
      if (req.query.edit) {
        var formVals = kusetManager.getFormVals("profileEdit", profile);
        var formData = {name: "userForm", scriptName: "userEdit", submitText: "Submit", submitPath: "/profile", vals: formVals, cancelPath: "/profile"};
        var pugData = {user: profile, formData: formData};
        res.render('userEdit', pugData);
      } else {
        res.render('user', {user: profile, ownProfile: true});
      }
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });


  router.get('/user', mid.checkLoggedIn, mid.getUserStatus, function(req, res, next) {
    var userId = req.session.userId;
    if (req.query.id) {
      var qUserId = req.query.id;
    } else {
      console.error("qUserId not found, setting to userId");
      var qUserId = userId;
    }
    if (qUserId == userId) {
      res.redirect(res.locals.subRoute + '/profile'); //If they are looking at themselves, redirect to profile
    }
    res.locals.mongoHelper.docPermission (User, userId, qUserId, res.locals.isAdmin).then(function(allowAccess) {
      if (!allowAccess) {
        console.error("Access to user " + qUserId + " denied to user " + req.session.userId);
        next(new Error ("Access to user denied"));
      } else {
        res.locals.mongoHelper.getDocData(User, qUserId).then(function (profile) {
          res.render('user', {user: profile});
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
      }
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  });

  //SUBMITTING PROFILE EDIT
  router.post('/profile', function (req, res, next) {
    let userData = kusetManager.tidyVals(req.body);
    res.locals.mongoHelper.updateDoc(User, req.session.userId, userData).then(function () {
      res.redirect(res.locals.subRoute + '/profile');
    });
  });

  //SUBMITTING PROFILE PIC
  router.post ("/profPicUpload", function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var imgPath = files.filetoupload.path;
      var userData = {
        img: {
          data: fs.readFileSync(imgPath),
          contentType: "image/png"
        }
      };
      res.locals.mongoHelper.updateDoc(User, req.session.userId, userData).then(function () {
        res.redirect(res.locals.subRoute + '/profile');
      });
    });
  });

  router.get('/login', function(req, res, next) {
    var formVals = kusetManager.getFormVals("login");
    var pugData = {loggedOut: true, badAuth: req.query.badAuth, logVals: formVals};
    res.render('login', pugData);
  });

  router.post('/login', function(req, res, next) {
    let userData = kusetManager.tidyVals(req.body);
    res.locals.mongoHelper.authenticate(userData.gmail, userData.password).then(function (user) {
      console.log("Authentication complete");
      if (user) {
        console.log("Authentication success");
        req.session.userId = user._id;
        res.redirect(res.locals.subRoute + '/profile');
      } else {
        console.log("Authentication failure");
        res.redirect(res.locals.subRoute + '/login?badAuth=true');
      }
    }, function (reason) {
      console.error("Authentication error");
      console.error(reason);
      next(reason);
    });
  });

  router.get('/logout', function (req, res, next) {
    if (req.session) {
      // delete session object
      req.session.destroy(function(err) {
        if(err) {
          return next(err);
        } else {
          return res.redirect(res.locals.subRoute + '/login');
        }
      });
    }
  })

  return router;
}
