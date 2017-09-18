var google = require('googleapis');
const calendar = google.calendar('v3');
var Promise = require('promise');

var auth;

function init(authIn) {
  if (authIn) {
    auth = authIn;
  } else {
    console.error("No auth included");
  }
}

function createCalendar(projectId, clientName, projectName, description) {
  return new Promise (function(fulfill, reject) {
    var loud = false;
    console.log("Creating calendar");
    if (loud) {
      console.log("projectId: " + projectId);
      console.log("clientName: " + clientName);
      console.log("projectName: " + projectName);
      console.log("description: " + description);
    }
    var calName = clientName + " - " + projectName;
    if (loud) console.log("Calendar name: " + calName);
    var calendarResource = {
      'summary': calName
    };
    if (loud) console.log(calendar.calendars);
    calendar.calendars.insert({
       resource: calendarResource,
       fields: 'id',
       auth: auth
    }, {}, function(err, file) {
      if (loud) console.log("Running callback");
      if(err) {
        // Handle error
        console.error(err);
        reject(err);
      } else {
        if (loud) console.log("File:");
        if (loud) console.log(file);
        fulfill(file.id);
      }
    });
  });
}

function addPermission (calendarId, gmail) {
  return new Promise (function (fulfill, reject) {
    var aclResource = {
      "role": "writer",
      "scope": {
        "type": "user",
        "value": gmail
      }
    }
    calendar.acl.insert({
      calendarId: calendarId,
      auth: auth,
      resource: aclResource
    }, {}, function (err, response) {
      if (err) reject(err);
      else fulfill(response);
    });
  });
}

module.exports.init = init;
module.exports.createCalendar = createCalendar;
module.exports.addPermission = addPermission;
