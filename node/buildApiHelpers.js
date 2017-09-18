var path = require('path');
var driveHelper = require("./driveHelper.js");
var calendarHelper = require("./calendarHelper.js");

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

module.exports = function make(auth) {
  console.log("Making api helpers");
  if (!auth) {
    console.error("No auth included");
  } else {
    driveHelper.init(auth, masterFolderId, fields, tidyFunction);
    calendarHelper.init(auth);
    var apiHelpers = {drive: driveHelper, calendar: calendarHelper};
    return apiHelpers;
  }
};
