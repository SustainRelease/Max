/*TO DO:
 *  Modularize!!!
 *  getAuth() uses "Navalis" project specific token name
 *
 *
 */


var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
const calendar = google.calendar('v3');
var googleAuth = require('google-auth-library');
var Promise = require('promise');

var auth;
var fields = "id, name, mimeType, parents, modifiedTime";

function makeCalendarName (clientName, name) {
  return clientName + " - " + name;
}


function createCalendar(projectId, clientName, name, description) {
  return new Promise (function(fulfill, reject) {
    var fileMetadata = {
      'summary' : makeFolderName(client, name)
    };
    service.files.create({
       resource: fileMetadata,
       fields: 'id',
       auth: auth
    }, function(err, file) {
      if(err) {
        // Handle error
        console.error(err);
        reject(err);
      } else {
        fulfill(file.id);
      }
    });
  });
}


function listPermissions (folderId) {
//WHY DOESN'T THIS WORK
  return new Promise (function (fulfill, reject) {
    service.permissions.list({
      fileId: folderId,
      auth: auth
    }, function (err, response) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log("Permissions");
        console.log(response);
        fulfill(response);
      }
    });
  });
}

function addPermission (folderId, gmail) {
  return new Promise (function (fulfill, reject) {
    var permResource = {
      //"kind": "drive#permission",
      "type": "user",
      "emailAddress": gmail,
      "role": "writer"
    }
    service.permissions.create({
      fileId: folderId,
      auth: auth,
      resource: permResource
    }, function (err, response) {
      if (err) reject(err);
      else fulfill(response);
    });
  });
}

function init(secretPath, fieldsIn, tidyFunctionIn) {
  return new Promise (function (fulfill, reject) {
    if(fieldsIn) {fields = fieldsIn;}
    if(tidyFunctionIn) {tidyFunction = tidyFunctionIn;}
    getAuth(secretPath).then(function (res) {
      fulfill();
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}


function getProjectFiles(folderId, projectFolderId) {
  //Returns an array of the files in a given folder and the folder itself (with the folder being the first item)
  //The files within the folder and the folder itself are modified by the tidy function
  //The folder is asigned an isProject variable to designate whether or not it is the project folder
  return new Promise (function (fulfill, reject) {
    getFolderConts(folderId).then(function(files) {
      getFileById(folderId).then(function (folder) {
        if (!folder) {
          console.error("Folder not found");
          reject();
        }
        folder.isProject = (folderId == projectFolderId);
        files.unshift(folder);
        files = files.map(tidyFunction);
        fulfill(files);
      });
    });
  });
}

function getFolderConts(folderId) {
  if (!checkAuth()) return false;
  else return getFiles({parent: folderId}, "id, name, mimeType, parents, modifiedTime");
}

function getFiles (queryObj, fields) {
  return new Promise(function (fulfill, reject) {
    var qStrings = [];
    if ("parent" in queryObj) qStrings.unshift("'" + queryObj.parent + "' in parents");
    if ("isFolder" in queryObj) {
      if (queryObj.isFolder) qStrings.unshift("mimeType = 'application/vnd.google-apps.folder'");
    }
    if ("name" in queryObj) qStrings.unshift("name = '" + queryObj.name + "'");
    if (!qStrings.length) reject(new error ("Invalid query object"));
    service.files.list({
      q: qStrings.join(" and "),
      auth: auth,
      pageSize: 10,
      fields: "nextPageToken, files(" + fields + ")"
    }, function (err, response) {
      if (err) reject(err);
      else fulfill(response.files);
    });
  });
}

function getFile (queryObj, fields) {
  return getFiles(queryObj, fields).then(function (files) {
    return getSingleItem(files);
  });
}



function getFileById(id) {
  return new Promise(function (fulfill, reject) {
    service.files.get({
      fileId: id,
      auth: auth,
      fields: "id, name, mimeType, parents, modifiedTime"
    }, function (err, response) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        fulfill(response);
      }
    });
  });
}

function getSingleItem(obj) {
  if (obj) {
    if (obj.length == 1) {
      return obj[0];
    } else {
      console.log("More than one item found");
      return false;
    }
  } else {
    console.log("No items found");
    return false;
  }
}

function getAuth(secretPath, scopes) {
  // If modifying these scopes, delete your previously saved credentials
  // at ~/.credentials/drive-nodejs-quickstart.json
  if (!scopes) scopes = ['https://www.googleapis.com/auth/drive'];
  if (secretPath.substr(secretPath.length - 5) != ".json") {
    console.error("SecretPath must point to .json");
    return;
  }
  var SCOPES = scopes;
  var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
      process.env.USERPROFILE) + '/.credentials/';
  var TOKEN_PATH = TOKEN_DIR + "navalis.json";

  function readFile (fileName) {
    return new Promise(function (fulfill, reject){
      fs.readFile(fileName, function (err, res){
        if (err) {
          console.log("File not found:");
          console.log(fileName);
          reject(err);
        } else {
          fulfill(res);
        }
      });
    });
  }

  function readJSON(fileName) {
    return readFile(fileName).then(JSON.parse);
  }

  function authorize(credentials) {
    return new Promise(function (fulfill, reject) {
      var clientSecret = credentials.installed.client_secret;
      var clientId = credentials.installed.client_id;
      var redirectUrl = credentials.installed.redirect_uris[0];
      var newAuth = new googleAuth();
      var oauth2Client = new newAuth.OAuth2(clientId, clientSecret, redirectUrl);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
          console.error("No token found");
          reject(err);
        } else {
          console.log("Current token found at " + TOKEN_PATH);
          oauth2Client.credentials = JSON.parse(token);
          auth = oauth2Client;
          fulfill(auth);
        }
      });
    });
  }

  return new Promise(function (fulfill, reject) {
    return readJSON(secretPath).then(function(json) {
      fulfill(authorize(json));
    });
  });
}

function checkAuth() {
  if (auth) {
    return true;
  } else {
    console.error("Authorization not setup");
    return false;
  }
}

module.exports.createProjectFolder = createProjectFolder;
module.exports.getProjectFiles = getProjectFiles;
module.exports.init = init;
module.exports.addPermission = addPermission;
module.exports.listPermissions = listPermissions;
