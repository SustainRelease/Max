
var google = require('googleapis');
const drive = google.drive('v3');
var Promise = require('promise');

var auth;
var masterFolderId;
var fields = "id, name, mimeType, parents, modifiedTime";
var tidyFunction = function (file) {return file;};


function init(authIn, masterFolderIdIn, fieldsIn, tidyFunctionIn) {
  if (authIn) {
    auth = authIn;
  } else {
    console.error("No auth included");
  }
  if (masterFolderIdIn) {
    masterFolderId = masterFolderIdIn;
  } else {
    console.error("No masterFolderId included");
  }
  if (fieldsIn) {fields = fieldsIn};
  if (tidyFunctionIn) {tidyFunction = tidyFunctionIn};
}

function makeFolderName (clientName, name) {
  return clientName + " - " + name;
}

function createProjectFolder(projectId, clientName, name, description) {
  return new Promise (function(fulfill, reject) {
    console.log("Creating project folder");
    var fileMetadata = {
      'name' : makeFolderName(clientName, name),
      'description': description,
      'mimeType' : 'application/vnd.google-apps.folder',
      'parents': [masterFolderId],
      'properties': {
        'mongoId': projectId
      }
    };
    drive.files.create({
       resource: fileMetadata,
       fields: 'id',
       auth: auth
    }, {}, function(err, file) {
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

function addPermission (folderId, gmail) {
  return new Promise (function (fulfill, reject) {
    var permResource = {
      //"kind": "drive#permission",
      "type": "user",
      "emailAddress": gmail,
      "role": "writer"
    }
    drive.permissions.create({
      fileId: folderId,
      auth: auth,
      resource: permResource
    }, {}, function (err, response) {
      if (err) reject(err);
      else fulfill(response);
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
  return getFiles({parent: folderId}, "id, name, mimeType, parents, modifiedTime");
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
    drive.files.list({
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

function getFileById(id) {
  return new Promise(function (fulfill, reject) {
    drive.files.get({
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

module.exports.createProjectFolder = createProjectFolder;
module.exports.getProjectFiles = getProjectFiles;
module.exports.init = init;
module.exports.addPermission = addPermission;
