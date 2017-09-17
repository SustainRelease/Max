module.exports = function () {
  var path = require('path');
  //var logger = require('morgan');
  var mongoHelper = require('./node/mongoHelper');
  var driveHelper = {};
  var calendarHelper = {};

  setupHelpers();
  return makeApp();

  function setupHelpers() {
    setupGoogleApis().then(function (result) {
      mongoHelper.init(driveHelper);
      console.log("Helpers all setup");
    }, function (reason) {
      console.error("Error setting up google apis");
      console.error(reason);
    });

    function setupGoogleApis() {
      return new Promise (function (fulfill, reject) {
        var authHelper = require("./node/authHelper.js");
        var path = require('path');
        var secretPath = path.join(__dirname,"data","client_secret.json");
        authHelper.getAuth(secretPath).then(function(auth) {
          console.log("Google authorization found");
          driveHelper = require("./node/buildDriveHelper.js")(auth);
          console.log("driveHelper setup");
          calendarHelper = {"Hi": true};
          console.log("calendarHelper setup");
          fulfill();
        }, function(reason) {
          console.error(reason);
          reject(reason);
        });
      })
    }
  }

  function makeApp() {
    var express = require('express');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var favicon = require('serve-favicon');

    var mid = require('./middleware/middle.js');
    var main = require('./Routes/main');
    var project = require('./Routes/project');
    var profile = require('./Routes/profile');
    var company = require('./Routes/company');
    var rest = require("./Routes/rest");

    var makeSessionHelper = require('./node/sessionHelper');

    var sites = require('../bin/siteManager.json');
    port = sites.Max.port;
    subRoute = sites.Max.subRoute;

    var app = express();

    // Settup sessions
    app.use(mongoHelper.makeSession());

    function printReq(req) {
      console.log("--------------" + req.method + ": '" + req.url + "'");
    }

    var sesBlackList = [
      "/staticMax"
    ]


    // Add stuff to locals
    app.use(function (req, res, next) {
      var sesPass = true;
      var url = req.url;
      for (let i = 0; i < sesBlackList.length; i++) {
        var blString = sesBlackList[i];
        var len = blString.length;
        if (req.url.substring(0,len) == blString) {
          sesPass = false;
        }
      }
      res.locals.subRoute = subRoute;
      res.locals.subR = subRoute;
      if (!sesPass) {
        next();
      } else {
        printReq(req)
        res.locals.driveHelper = driveHelper;
        res.locals.calendarHelper = calendarHelper;
        res.locals.mongoHelper = mongoHelper;
        res.locals.sHelper = makeSessionHelper(req.session);
        res.locals.sHelper.getUserStatus(res).then(function () {
          next();
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
      }
    });

    // view engine setup
    app.set('views', path.join(__dirname, 'Views'));
    app.set('view engine', 'pug');

    //app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    app.use('/staticMax', express.static(__dirname + '/Public'));

    app.use(subRoute, main());
    app.use(subRoute, project());
    app.use(subRoute, profile());
    app.use(subRoute, company());
    app.use(subRoute, rest());

    app.use(favicon(path.join(__dirname, 'Public', 'images', 'Favicon.png')));

    app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });

    // error handler
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });


    app.set('port', port);

    console.log("Serving page at :" + port + subRoute);

    return app;
  }
}
