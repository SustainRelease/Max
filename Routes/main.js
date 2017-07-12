module.exports = function (subRoute) {
  var express = require('express');
  var router = express.Router();
  //var routerData = require("../data/routerData.json");
  var path = require('path');
  //routerData.subR = subRoute;
  //var mid = require('../middleware/middle.js');

  // ROUTES
  router.get('/login', function(req, res, next) {
    res.render('login', {subR: subRoute});
  });

  return router;
}
