module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var path = require('path');
  var mid = require('../middleware/middle.js');

  //var mid = require('../middleware/middle.js');

  // ROUTES


  router.get('/', function (req, res, next) {
    res.redirect(res.locals.subRoute + '/login');
  });

  router.get('/todo', function (req, res, next) {
    var messages = [
      "sessionize kusetManager",
      "Drive sharing only to be added on project approval",
      "Reviews",
      "Calendar sharing",
      "Extra profile stuff",
      "Admin screen (Create companies)"
    ];
    var title = "To do";
    var pugData = {title: title, messages: messages};
    res.render('message', pugData);
  });


  router.get("/reset", function (req, res, next) {
    res.locals.mongoHelper.reset().then(function () {
      res.render('message', {title: "Hello", messages: ["DB Reset"]});
    });
  });

  return router;
}
