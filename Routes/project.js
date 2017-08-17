module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');
  var Project = require("../models/project.js");
  var myDriveHelper = require("../node/myDriveHelper.js");
  var projectKusetData = require("../data/kusetData.json").project;
  var multiPromiseLib = require("../node/multiPromise.js");
  var priorities = require("../data/priorities.js");
  var kusetManager = require('../node/kusetManager')(projectKusetData);
  var driveFolderId;
  var projectConvoId;
  var legalIds = [];


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


  router.get('/projects', mid.checkLoggedIn, mid.getUserStatus, function(req, res, next) {
    console.log("postTest");
    res.locals.mongoHelper.getProjects(req.session.userId, res.locals.isAdmin).then(function(projects) {
      res.render('projects', {projects: projects});
    });
  });

  router.get('/project', mid.checkLoggedIn, mid.getUserStatus,  mid.accessProject, function(req, res, next) {
    var projectId = res.locals.projectId;
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
            if (projectData.locked) {
              var cancelPath = "/projects";
            } else {
              var cancelPath = projectPath;
            }
            var formData = {name: "projectForm", scriptName: "projectEdit", submitText: "Approve", submitPath: projectPath, vals: formVals, cancelPath: cancelPath};
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
        myDriveHelper.setProjectFolder(projectData.driveId);
        if (projectData.locked && res.locals.isAdmin) {
          res.redirect(res.locals.subRoute + "/project?edit=true&&id=" + projectId); //If the project is locked, send admin to fix it
        } else {
          resetLegalIds();
          res.render('project', {projectData: projectData});
        }
      }
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
/*  myDriveHelper.addPermission(projectFolderId, "sirrobbiemuir@gmail.com").then(function (response) {
    resetLegalIds(); */
  });

  router.post('/project', mid.checkLoggedIn, function(req, res, next) {

    //MAKE THIS
    let projectData = kusetManager.tidyVals(req.body);
    var extra = {userId: req.session.userId, driveHelper: myDriveHelper};
    res.locals.mongoHelper.createDoc(Project, projectData, extra).then(function (projectResponse) {
      driveFolderId = projectResponse.driveFolderId;
      res.redirect(res.locals.subRoute + '/project?id=' + projectResponse.docId);
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
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
    var extra = {userId: req.session.userId, driveHelper: myDriveHelper};
    res.locals.mongoHelper.createDoc(Project, projectData, extra).then(function (projectResponse) {
      driveFolderId = projectResponse.driveFolderId;
      res.redirect(res.locals.subRoute + '/project?id=' + projectResponse.docId);
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
        myDriveHelper.getProjectFiles(req.query.fid).then(function (files) {
          resetLegalIds(files);
          res.render('rest/projectList', {files: files, badId: false});
        });
      else {
        res.render('rest/projectList', {files: null, badId: true});
      }
    } else {
      myDriveHelper.getProjectFiles().then(function (files) {
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
    res.locals.mongoHelper.reset().then(function () {
      res.render('message', {title: "Hello", message: "DB Reset", loggedOut: true});
    });
  });

  return router;
}
