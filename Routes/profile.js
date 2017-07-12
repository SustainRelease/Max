module.exports = function (subRoute, profileManager) {
  var express = require('express');
  var router = express.Router();
  var path = require('path');
  var kusetData = require("../data/kusetData.json");
  var kusetManager = require('../kusetManager')(kusetData.defaultKuset, kusetData.kusets);

  router.get('/register', function(req, res, next) {
    res.render('register', {subR: subRoute, regVals: kusetManager.getFormVals("register")});
  });

  router.post('/register', function(req, res) {
    console.log("Register post");
    kusetManager.saveVals(req.body);
    res.redirect(subRoute + '/profile');
  });

  router.get('/profile', function(req, res, next) {
    if (req.query.edit) {
      res.render('profileEdit', {subR: subRoute, proVals: kusetManager.getFormVals()});
    } else {
      res.render('profile', {subR: subRoute});
    }
  });

  router.get('/REST/kusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManager.getFormVals("Current"));
  });

  return router;
}
