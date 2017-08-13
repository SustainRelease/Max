module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');
  var Project = require("../models/project.js");
  var driveHelper = require("../node/driveHelper.js");
  var projectKusetData = require("../data/kusetData.json").project;
  var multiPromise = require("../node/multiPromise.js");
  var priorities = require("../data/priorities.js");
  var kusetManager = require('../node/kusetManager')(projectKusetData);
  var path = require('path');
  var driveFolderId;
  var projectConvoId;
  var legalIds = [];


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


  function resetLegalIds (files) {    //List of allowable files to access in drive explorer widget
    legalIds = [driveFolderId]; //Allow project folder
    if (files) {
      if (files[0].id != driveFolderId) {     //If we aren't at the project folder
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


  router.get('/projects', mid.checkLoggedIn, mid.getUserStatus, mid.getNotifications, function(req, res, next) {
    res.locals.mongoHelper.getProjects(req.session.userId, res.locals.isAdmin).then(function(projects) {
      res.render('projects', {projects: projects});
    });
  });

  router.get('/project', mid.checkLoggedIn, mid.getUserStatus, function(req, res, next) {
    if (!req.query.id) {
      var err = new Error ("No project Id found");
    }
    var projectId = req.query.id;
    res.locals.mongoHelper.docPermission(Project, projectId, req.session.userId).then(function(allowAccess) {
      if(!allowAccess) {
        console.error("Access to project " + projectId + " denied to user " + req.session.userId);
        next(new Error ("Access to project denied"));
      } else {
        res.locals.mongoHelper.getDocData(Project, projectId).then(function(projectData) {
          var pendApprove = (projectData.subStatus == 'Pending approval')
          if (pendApprove) {
            projectData.locked = true;
            projectData.lockReason = "This project is pending approval from the administrator";
          }
          if (req.query.edit) {
            //------------------------------EDIT PROJECT-------------------------
            if ((projectData.locked && !res.locals.isAdmin) || !res.locals.isEngineer) { //If project is locked, only admin is allowed to edit. After approval, all enginers with access are allowed.
              console.error("Editing project " + projectId + " denied to user " + req.session.userId);
              next(new Error ("Access to project denied"));
            } else {
              res.locals.mongoHelper.getEngineers().then(function(engineers) {
                var selectData = {engineers: engineers};
                var formVals = kusetManager.getFormVals("projectEdit", projectData, selectData);
                var projectPath = "/project?id=" + projectData.id;
                var formData = {name: "projectForm", scriptName: "projectEdit", submitText: "Approve", submitPath: projectPath, vals: formVals, cancelPath: projectPath};
                var pugData = {projectData: projectData, formData: formData};
                res.render('projectEdit', pugData);
              }, function(reason) {
                console.error(reason);
                next(reason);
              });
            }
          } else {
            //------------------------------VIEW PROJECT-------------------------
            projectConvoId = projectData.conversation;  //Set up the project convoId for later
            driveHelper.init(secretPath, fields, tidyFunction, null, projectData.driveId).then(function (PFId) {    //Initialize the drive helper to help out the rest project list
              if (projectData.locked && res.locals.isAdmin) {
                res.redirect(res.locals.subRoute + "/project?edit=true&&id=" + projectId); //If the project is locked, send admin to fix it
              } else {
                resetLegalIds();
                res.render('project', {projectData: projectData});
              }
            }, function (reason) {
              console.error(reason);
              next(reason);
            });
          }
        }, function (reason) {
          console.error(reason);
          next(reason);
        });
      }
    });
    /*  driveHelper.addPermission(projectFolderId, "sirrobbiemuir@gmail.com").then(function (response) {
        resetLegalIds(); */
  });

  router.get('/newProject', mid.checkLoggedIn, mid.checkClient, function(req, res, next) {
    res.locals.mongoHelper.getEngineers().then(function(engineers) {
      var selectData = {engineers: engineers, priorities: priorities.pSelectData};
      var formVals = kusetManager.getFormVals("register", null, selectData);
      var formData = {name: "newProjectForm", scriptName: "newProject", submitText: "Submit", submitPath: "/newProject", vals: formVals, cancelPath: "/projects"};
      res.render('projectNew', {formData: formData});
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.post('/newProject', mid.checkLoggedIn, function(req, res, next) {
    let projectData = kusetManager.tidyVals(req.body);
    driveHelper.init(secretPath, fields, tidyFunction).then(function (response) {
      res.locals.mongoHelper.createDoc(Project, projectData, req.session.userId, driveHelper).then(function (projectResponse) {
        driveFolderId = projectResponse.driveFolderId;
        res.redirect(res.locals.subRoute + '/project?id=' + projectResponse.docId);
      }, function (reason) {
        console.error(reason);
        next(reason);
      });
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.get('/REST/projectKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManager.getFormVals());
  });

  router.get('/REST/projectList', function(req, res, next) {
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

  router.get('/REST/conversation', function (req, res, next) {
    res.locals.mongoHelper.getDocData("Conversation", projectConvoId).then(function (conversation) {
      var posts = conversation.ofPosts;
      var noPosts = (posts.length == 0);
      res.render('rest/conversation', {posts: posts, noPosts: noPosts});
    }, function (reason) {
      console.error(reason);
    });
  });

  router.post('/REST/conversation', function (req, res, next) {
    var postText = req.body.postText;
    res.locals.mongoHelper.addPost(projectConvoId, postText, req.session.userId).then(function(doc) {
      if (doc) {
        res.send('null');
        res.status(201).end();
      } else {
        res.send('null');
        res.status(404).end();
      }
    });
  });

  router.get("/reset", function (req, res, next) {
    driveHelper.init(secretPath, fields, tidyFunction).then(function() {
      res.locals.mongoHelper.reset(driveHelper).then(function () {
        res.render('message', {title: "Hello", message: "DB Reset"});
      });
    })
  });

  return router;
}
