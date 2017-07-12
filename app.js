module.exports = function () {

  var express = require('express');
  var path = require('path');
  var favicon = require('serve-favicon');
  //var logger = require('morgan');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var mongoose = require('mongoose');
  var session = require('express-session');
  var MongoStore = require('connect-mongo')(session);

  var main = require('./Routes/main');
  var project = require('./Routes/project');
  var profile = require('./Routes/profile');

  var sites = require('../bin/siteManager.json');
  port = sites.Max.port;
  subRoute = sites.Max.subRoute;

  var app = express();

  /*// mongodb connection
  /mongoose.connect("mongodb://localhost:27017/max");
  var db = mongoose.connection;
  // mongo error
  db.on('error', console.error.bind(console, 'connection error:')); */

  // use sessions for tracking logins
  /*app.use(session({
    secret: 'pitaya',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
  }));*/

  // make user ID available in templates
  /*app.use(function (req, res, next) {
    res.locals.currentUser = req.session.userId;
    res.locals.subRoute = subRoute;
    next();
  });*/

  // view engine setup
  app.set('views', path.join(__dirname, 'Views'));
  app.set('view engine', 'pug');

  //app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use('/staticMax', express.static(__dirname + '/Public'));

  app.use(subRoute, main(subRoute));
  app.use(subRoute, project(subRoute));
  app.use(subRoute, profile(subRoute));
//  app.use(subRoute, authenticate());

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
