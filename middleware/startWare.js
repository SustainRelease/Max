var authHelper = require("../node/authHelper.js");
var path = require('path');

function getAuth(req, res, next) {
  if (!req.session.gAuth) {
    var secretPath = path.join(__dirname,"..","data","client_secret.json");
    authHelper.getAuth(secretPath).then(function(auth) {
      req.session.gAuth = auth;
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  } else {
    next();
  }
}
