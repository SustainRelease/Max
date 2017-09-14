module.exports = function () {

  var express = require('express');
  var path = require('path');
  var favicon = require('serve-favicon');
  //var logger = require('morgan');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');

  var mongoHelper = require('./node/mongoHelper');
  var makeSessionHelper = require('./node/sessionHelper');

  var mid = require('./middleware/middle.js');

  var main = require('./Routes/main');
  var project = require('./Routes/project');
  var profile = require('./Routes/profile');
  var company = require('./Routes/company');
  var rest = require("./Routes/rest");

  var sites = require('../bin/siteManager.json');
  port = sites.Max.port;
  subRoute = sites.Max.subRoute;

  var app = express();

  var sesBlackList = [
    "/staticMax"
  ]

  // use sessions for tracking logins
  app.use(mongoHelper.makeSession());
  mongoHelper.initAdmin();

  // make user ID available in templates
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
    if (sesPass) {
      res.locals.sHelper = makeSessionHelper(req.session);
      //res.locals.sHelper.display();
      res.locals.mongoHelper = mongoHelper;
    }
    res.locals.subRoute = subRoute;
    res.locals.subR = subRoute;
    next();
  });

  // view engine setup
  app.set('views', path.join(__dirname, 'Views'));
  app.set('view engine', 'pug');

  //app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use('/staticMax', express.static(__dirname + '/Public'));


  app.use(mid.getUserStatus);

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
