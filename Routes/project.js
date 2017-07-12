module.exports = function (subRoute) {
  var express = require('express');
  var router = express.Router();
  var driveHelper = require("../node/driveHelper.js");
  var projectFolderId;
  var legalIds = [];
  //var mid = require('../middleware/middle.js');


  //Setting up variables for drive helper request
  var secretPath = "./data/client_secret.json";
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


  function resetLegalIds (files) {    //List of allowable files to access in drive explorer widget
    legalIds = [projectFolderId]; //Allow project folder
    if (files) {
      if (files[0].id != projectFolderId) {     //If we aren't at the project folder
        legalIds.push(files[0].parents[0]);  //Add next folder up
      }
      for (var i = 0; i < files.length; i++) {
        legalIds.push(files[i].id)  //Allow all files in file array
      }
    }
  }

  function checkFileId(id) {
    return (legalIds.indexOf(id) > -1);
  }


  router.get('/projects', function(req, res, next) {
    res.render('projects', {subR: subRoute});
  });

  router.get('/project', function(req, res, next) {
    driveHelper.init(secretPath, fields, tidyFunction, projectFolderName).then(function (response) {
      projectFolderId = response;
      resetLegalIds ();
      res.render('project', {subR: subRoute});
    });
  });

  router.get('/rest/projectList', function(req, res, next) {
    if (req.query.fid) {
      if (checkFileId(req.query.fid))
        driveHelper.getProjectFiles(req.query.fid).then(function (files) {
          resetLegalIds(files);
          res.render('rest/projectList', {files: files, badId: false});
        });
      else {
        res.render('rest/projectList', {files: null, badId: true});
      }
    } else {
      driveHelper.getProjectFiles().then(function (files) {
        resetLegalIds(files);
        res.render('rest/projectList', {files: files, badId: false});
      });
    }
  });
  return router;
}
