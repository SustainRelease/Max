var driveHelper = require("../node/driveHelper.js");
var path = require('path');

//Setting up variables for drive helper request
var secretPath = path.join(__dirname,"..","data","client_secret.json");
var fields = "id, name, mimeType, parents, modifiedTime";
function tidyFunction (file) {
  var moment = require("moment");
  file.modifiedTime = moment(file.modifiedTime).fromNow();
  if (file.mimeType == "application/vnd.google-apps.folder") {
    file.img = "icoFolder.jpg";
  }
  if(file.mimeType.substring(0,5) == "image") {
    file.img = "icoImg.jpg"
  }
  return file;
}
var projectFolderName = "502331";

var myDriveHelper = driveHelper;
myDriveHelper.init(secretPath, fields, tidyFunction);
module.exports = myDriveHelper;
