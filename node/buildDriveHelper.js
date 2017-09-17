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
var masterFolderId = "0B_vUIo8iD_BvVHRweTRsX2Nmcnc";
var myDriveHelper = driveHelper;

module.exports = function make(auth) {
  console.log("Making drive helper");
  if (!auth) {
    console.error("No auth included");
  } else {
    myDriveHelper.init(auth, masterFolderId, fields, tidyFunction);
    return myDriveHelper;
  }
};
