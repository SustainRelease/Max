
var authHelper = require("../node/authHelper.js");
var path = require('path');
var secretPath = path.join(__dirname,"data","client_secret.json");
authHelper.getNewAuth(secretPath).then(function(auth) {
  console.log("Google authorization setup");
}, function(reason) {
  console.error(reason);
});
