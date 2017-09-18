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
    console.log("Get register");
    res.locals.mongoHelper.getClientCompanies().then(function(clients) {
      console.log("Got client companies");
      if (clients) {
        console.log("Clients found");
        var selectData = {clients: clients};
      } else {
        console.log("No clients found");
        var selectData = {clients: null};
      }
      var formData = {
        name: "userForm",
        scriptName: "userNew",
        submitText: "Submit",
        submitPath: "/register",
        vals: kusetManager.getFormVals("register", null, selectData),
      };
      var pugData = {
        formData: formData,
        mainId: "register",
        heading: "Registration",
        runCode: "noClients();",
        pg: "Complete the forms below and accept terms and conditions, to register into our platform:",
        pageTitle: "Register"
      }
      res.render('standardNewForm', pugData);
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  })

  router.post('/register', function(req, res, next) {
    console.log("Posting to register with data:");
    console.log(req.body);
    console.log("Tidying values");
    let userData = kusetManager.tidyVals(req.body);
    console.log("Tidy values:");
    console.log(userData);
    res.locals.mongoHelper.createDoc(User, userData).then(function (response) {
      res.redirect(res.locals.subRoute + '/login');
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.get('/notifications', mid.checkLoggedIn, mid.getNotifications, function(req, res, next) {
    res.render('notifications', {pageTitle: "Notifications"});
  });

  router.get('/users', mid.checkLoggedIn, function(req, res, next) {
    res.locals.mongoHelper.getDocs(User, {"isClient": false}).then(function(engineers) {
      if (res.locals.isEngineer) {
         var cQuery = {"isClient": true};
      } else {
         var cQuery = {"isClient": true, company: res.locals.companyId};  //Clients can only see there own company
      }
      res.locals.mongoHelper.getDocs(User, cQuery).then(function(clients) {
        var pugData = {
          engineers: engineers,
          clients: clients,
          pageTitle: "Users"
        };
        res.render('users', pugData);
      });
    });
  });

  router.get('/profile', mid.checkLoggedIn, mid.getQueryUser, mid.getEngineerReviews, function(req, res, next) {  //The users own profile
    res.locals.mongoHelper.getDocData(User, req.session.userId).then(function (profile) {
      if (req.query.edit) {
        //console.log("Ex profile data:");
        //console.log(profile);
        var formVals = kusetManager.getFormVals("profileEdit", profile);
        var formData = {name: "userForm", scriptName: "userEdit", submitText: "Submit", submitPath: "/profile", vals: formVals, cancelPath: "/profile"};
        var pugData = {
          user: profile,
          formData: formData,
          pateTitle: "Edit profile"
        };
        res.render('userEdit', pugData);
      } else {
        var pugData = {
          user: profile,
          ownProfile: true,
          pageTitle: "Profile"
        }
        res.render('user', pugData);
      }
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });


  router.get('/user', mid.checkLoggedIn, mid.getQueryUser, mid.getEngineerReviews, function(req, res, next) {
    var userId = req.session.userId;
    var qUserId = res.locals.qUserId;
    if (qUserId == userId) {
       //If they are looking at themselves, redirect to profile
      res.redirect(res.locals.subRoute + '/profile');
    } else {
      //Otherwise, go to profile as visitor
      res.locals.mongoHelper.userPermission(userId, qUserId).then(function(allowAccess) {
        if (!allowAccess) {
          console.error("Access to user " + qUserId + " denied to user " + req.session.userId);
          next(new Error ("Access to user denied"));
        } else {
          res.locals.mongoHelper.getDocData(User, qUserId).then(function (profile) {
            var pugData = {
              user: profile,
              pageTitle: profile.firstName + " " + profile.lastName
            }
            res.render('user', pugData);
          }, function(reason) {
            console.error(reason);
            next(reason);
          });
        }
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    }
  });

  //SUBMITTING PROFILE EDIT
  router.post('/profile', mid.checkLoggedIn, function (req, res, next) {
    //console.log("Posting data: ");
    //console.log(req.body);
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
    var formData = {name: "loginForm", scriptName: "login", submitText: "Submit", submitPath: "/login", vals: formVals};
    var pugData = {
      formData: formData,
      badAuth: req.query.badAuth,
      pageTitle: "Login"
    };
    res.render('login', pugData);

    /*
    var formVals = kusetManager.getFormVals("login");
    var pugData = {loggedOut: true, badAuth: req.query.badAuth, logVals: formVals};
    res.render('login', pugData);
    */
  });

  router.post('/login', function(req, res, next) {
    let userData = kusetManager.tidyVals(req.body);
    res.locals.mongoHelper.authenticate(userData.gmail, userData.password).then(function (user) {
      console.log("Authentication complete");
      if (user) {
        console.log("Authentication success");
        req.session.userId = user._id;
        console.log("Reseting user status");
        res.locals.sHelper.resetUserStatus(res).then(function(response) { //Resets user status variables
          console.log("Reset user status, redirecting to profile");
          res.redirect(res.locals.subRoute + '/profile');
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
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
      req.session.userId = null;
      return res.redirect(res.locals.subRoute + '/login');

      // delete session object
      /*
      req.session.destroy(function(err) {
        if(err) {
          return next(err);
        } else {
          return res.redirect(res.locals.subRoute + '/login');
        }
      });
      */
    }
  });

  router.get('/REST/userKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManager.getFormVals());
  });

  return router;
}
