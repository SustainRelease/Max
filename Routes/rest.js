module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var User = require("../models/user.js");
  var mid = require('../middleware/middle.js');
  var path = require('path');

  //REST API
  router.get('/REST/profilePic', function (req, res, next) {
    var profileId = req.query.id || req.session.userId;
    var defaultPicPath = path.join(__dirname, '..', 'Public', 'images', 'Profile.PNG');
    res.locals.mongoHelper.getDocData(User, profileId, {"img": true}, ["img"], true).then(function (response) {
      if (response.found) {
        var doc = response.doc;
        res.contentType(doc.img.contentType);
        res.send(doc.img.data);
      } else {
        res.sendFile(defaultPicPath);
      }
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  return router;
}
