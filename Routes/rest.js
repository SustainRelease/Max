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
    res.locals.mongoHelper.getDocData(User, profileId, {"_id": true}, ["img"], true).then(function (doesExist) {
      if (doesExist) {
        res.locals.mongoHelper.getDocData(User, profileId, {"img": true}, ["img"]).then(function (userDoc) {
          res.contentType(userDoc.img.contentType);
          res.send(userDoc.img.data);
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
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
