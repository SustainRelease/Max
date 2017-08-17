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

  router.get('/notifications', mid.checkLoggedIn, mid.getUserStatus, mid.getNotifications, function(req, res, next) {
    console.log("Notifications:");
    console.log(res.notifications);
  });

  return router;
}
