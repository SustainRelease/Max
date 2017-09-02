module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');
  var Project = require("../models/project.js");
  var History = require("../models/history.js");
  var myDriveHelper = require("../node/myDriveHelper.js");
  var kusetData = require("../data/kusetData.json")
  var multiPromiseLib = require("../node/multiPromise.js");
  var priorities = require("../data/priorities.js");
  var kusetManagerP = require('../node/kusetManager')(kusetData.project);
  var kusetManagerH = require('../node/kusetManager')(kusetData.history);
  var driveFolderId;
  var projectConvoId;
  var projectId;
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


  router.get('/projects', mid.checkLoggedIn, mid.getUserStatus, mid.getProjects, function(req, res, next) {
    res.render('projects');
  });

  router.get('/project', mid.checkLoggedIn, mid.getUserStatus, mid.getProjectId, mid.accessProject, function(req, res, next) {
    projectId = res.locals.projectId;
    res.locals.mongoHelper.getDocData(Project, projectId).then(function(projectData) {
      //myDriveHelper.listPermissions(projectData.driveId);
      var pendApprove = (projectData.subStatus == 'Pending approval')
      if (pendApprove) {
        projectData.locked = true;
        projectData.lockReason = "This project is pending approval from the administrator";
      } else {
        projectData.locked = false;
      }
      if (req.query.edit) {
        //------------------------------EDIT PROJECT-------------------------
        if ((projectData.locked && !res.locals.isAdmin) || !res.locals.isEngineer) { //If project is locked, only admin is allowed to edit. After approval, all enginers with access are allowed.
          console.error("Editing project " + projectId + " denied to user " + req.session.userId);
          next(new Error ("Access to project denied"));
        } else {
          res.locals.mongoHelper.getEngineers().then(function(engineers) {
            var selectData = {engineers: engineers};
            var formVals = kusetManagerP.getFormVals("projectEdit", projectData, selectData);
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

  router.post('/project', mid.checkLoggedIn, mid.getProjectId, mid.accessProject, mid.getProjectStatus, function(req, res, next) {
    //When making changes to project, many things should run through history events and propogate to project changes
    //The first edit by the admin to approve the project should run through this process too in order to ensure that
    //the history state gets updated to reflect the approval. This is normally done through button press.
    projectId = res.locals.projectId;
    let projectData = kusetManagerP.tidyVals(req.body);
    var pendApprove = (res.locals.projectSubStatus == 'Pending approval');
    if (pendApprove) {
      res.locals.mongoHelper.projectKickoff (projectId, projectData, req.session.userId).then(function () {
        res.redirect(res.locals.subRoute + "/project?id=" + projectId);
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    } else {
      res.locals.mongoHelper.updateDoc(Project, projectId, projectData).then(function () {
        res.redirect(res.locals.subRoute + "/project?id=" + projectId);
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    }
  });


  router.get('/newProject', mid.checkLoggedIn, mid.checkClient, function(req, res, next) {
    res.locals.mongoHelper.getEngineers().then(function(engineers) {
      var selectData = {engineers: engineers, priorities: priorities.pSelectData};
      var formVals = kusetManagerP.getFormVals("register", null, selectData);
      var formData = {name: "newProjectForm", scriptName: "newProject", submitText: "Submit", submitPath: "/newProject", vals: formVals, cancelPath: "/projects"};
      res.render('projectNew', {formData: formData});
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.post('/newProject', mid.checkLoggedIn, function(req, res, next) {
    let projectData = kusetManagerP.tidyVals(req.body);
    var extra = {userId: req.session.userId, driveHelper: myDriveHelper};
    res.locals.mongoHelper.createDoc(Project, projectData, extra).then(function (projectResponse) {
      driveFolderId = projectResponse.driveFolderId;
      projectId = projectResponse.docId;
      var hData = {
        text: "Project created by client",
        project: projectId,
        specialType: 1,
        spentHours: 0,
        totalProgress: 0
      };
      var projectRoles = {
        "Client": projectData.clientUser,
        "Admin": res.locals.mongoHelper.getAdminId()
      };
      if (projectData.qcUser) {
        projectRoles.QC = projectRoles.qcUser;
      }
      if (projectData.responsibleUser) {
        projectRoles.Resp = projectData.responsibleUser;
      }
      makeHistory(hData, null, projectRoles, res, "Admin").then(function(historyData) {
        res.redirect(res.locals.subRoute + '/project?id=' + projectId);
      }, function(reason) {
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
    res.send(kusetManagerP.getFormVals());
  });

  router.get('/REST/projectId', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send({projectId: projectId});
  });

  router.get('/REST/projectList', function(req, res, next) {
    if (req.query.fid) {
      if (checkFileId(req.query.fid))
        myDriveHelper.getProjectFiles(req.query.fid).then(function (files) {
          resetLegalIds(files);
          res.render('rest/projectList', {files: files, badId: false});
        }, function(reason) {
          console.error(reason);
        });
      else {
        res.render('rest/projectList', {files: null, badId: true});
      }
    } else {
      myDriveHelper.getProjectFiles().then(function (files) {
        resetLegalIds(files);
        res.render('rest/projectList', {files: files, badId: false});
      }, function(reason) {
        console.error(reason);
      });
    }
  });

  router.get('/REST/projectSummary', mid.getProjectId, function (req, res, next) {
    var projectId = res.locals.projectId;
    res.locals.mongoHelper.getDocData(Project, projectId).then(function(projectData) {
      res.render('rest/projectSummary', {projectData: projectData});
    }, function(reason) {
      console.error(reason);
    });
  });


  //----------------------HISTORY-------------------------------

  router.get('/REST/historyKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManagerH.getFormVals());
  });

  router.get('/REST/actionHistoryId', mid.getProjectId, mid.getProjectHistories, function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send({actionHistoryId: res.locals.actionHistoryId});
  });

  router.get('/REST/histories', mid.getUserStatus, mid.getProjectId, mid.getProjectStatus, mid.getProjectHistories, function (req, res, next) {
    var formVals = kusetManagerH.getFormVals("register");
    var submitPath = null;
    var cancelPath = null;
    var formData = {name: "historyForm", noScripts: true, submitText: "Submit", submitPath: null, vals: formVals};
    res.render('rest/histories', {formData: formData});
  });

  router.post('/REST/historyAction', mid.getHistoryId, mid.getHistoryProject, function (req, res, next) {
    var actionType = req.body.aType;
    var historyId = res.locals.historyId;
    switch(actionType) {
      case "approve":
        res.locals.mongoHelper.approveHistory(historyId, req.session.userId).then(function(result) {
          updateProjectAnd201();
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
        break;
      case "modify":
        break;
      case "reject":
        break;
      case "delete":
        res.locals.mongoHelper.deleteDoc(History, historyId).then(function(result) {
          updateProjectAnd201(res);
        }, function(reason) {
          console.error(reason);
          next(reason);
        });
        break;
      default:
        var err = new Error ("Invalid actionType: " + actionType);
        console.error(err);
        next(err);
    }
  });

  router.post('/REST/history', mid.getProjectId, mid.getUserProjectRole, function (req, res, next) {
    var hData = req.body;
    var userProjectRole = res.locals.userProjectRole;
    var projectRoles = res.locals.projectRoles;
    makeHistory(hData, userProjectRole, projectRoles, res).then(function(docData) {
      updateProjectAnd201(res);
    }, function(reason) {
      console.error(reason);
      res.send('null');
      res.status(500).end();
    });
  });


  function updateProjectAnd201(res) {
    //When histories are created or updated via a post request, the percentage progress
    //on their master project may need to be changed as a result.
    //This function is used as the last step of such a post request.
    //It updates the projects progress and returns a 201 response.
    res.locals.mongoHelper.resolveProjectHistories(res.locals.projectId).then(function(response) {
      res.send("null");
      res.status(201).end();
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  }

  function getActionUserType (actionType, userProjectRole) {
    var internalEscalation = {
      "Admin": "Resp",
      "Resp": "QC",
      "QC": "Admin"
    }
    //Based on the approval required request from the form input (actionUserReq), determine who should be the actionUser.
    switch(actionType) {
      case "None":
        return "None";
        break;
      case "Client":
        return "Client";
        break;
      case "Internal":
        return internalEscalation[userProjectRole];
        break;
      default:
        return null;
        break;
    }
  }

  function makeHistory(hData, userProjectRole, projectRoles, res, aut) {
    //Usually the actionUserType will be determined using some rules, however it can be explicitly specified as the fifth argument
    return new Promise (function (fulfill, reject) {
      if (aut) {
        var actionUserType = aut;
        if (aut == "Admin" || aut == "QC" || aut == "Resp") {
          var actionType = "Internal";
        } else {
          if (aut == "Client") {
            var actionType = "Client";
          } else {
            if (aut == "None") {
              var actionType = "None";
            } else {
              var err = new Error("Invalid action user type");
              console.error(err);
              reject(err);
            }
          }
        }
      } else {
        //If not explicitlly stated, the actionUserType must be determined by the actionType
        var actionType = hData.actionReq;
        var actionUserType = getActionUserType(actionType, userProjectRole);
        if (!actionUserType) {
          var err = new Error("Action user type not found");
          console.error(err);
          reject(err);
        }
      }

      //Put together the data for the createDoc request
      var historyData = {
        text: hData.text,
        project: projectId,
        spentHours: hData.spentHours,
        totalProgress: hData.totalProgress,
        actionType: actionType,
        specialType: hData.specialType || 0
      };
      if (actionUserType != "None") {
        historyData.actionUser = projectRoles[actionUserType];
      }
      res.locals.mongoHelper.createDoc(History, historyData).then(function(docData) {
        fulfill(docData);
      }, function (reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

//----------------------CONVERSATION-------------------------------

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

//----------------------OTHER-------------------------------

  router.get("/reset", function (req, res, next) {
    res.locals.mongoHelper.reset().then(function () {
      res.render('message', {title: "Hello", message: "DB Reset", loggedOut: true});
    });
  });

  return router;
}
