module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');
  var Project = require("../models/project.js");
  var History = require("../models/history.js");
  var multiPromiseLib = require("../node/multiPromise.js");

  var kusetData = require("../data/kusetData.json")
  var priorities = require("../data/priorities.js");
  var scoreInfo = require("../data/scoreInfo.js");

  var buildKusetManager = require('../node/kusetManager');
  var kusetManagerP = buildKusetManager(kusetData.project);
  var kusetManagerH = buildKusetManager(kusetData.history);
  var kusetManagerR = buildKusetManager(kusetData.review);

  router.get('/projects', mid.checkLoggedIn, mid.getProjects, function(req, res, next) {
    res.render('projects', {pageTitle: "Projects"});
  });

  router.get('/project', mid.checkLoggedIn, mid.getProjectId, mid.getUserProjectRole, mid.accessProject, mid.getUserGmail, function(req, res, next) {
    var projectId = res.locals.projectId;
    res.locals.mongoHelper.getDocData(Project, projectId).then(function(projectData) {
      req.session.projectFolderId = projectData.driveId;
      var pendApprove = (projectData.subStatus == 'Pending approval')
      if (pendApprove) {
        projectData.locked = true;
        projectData.lockReason = "This project is pending approval from the administrator";
      } else {
        projectData.locked = false;
      }
      if (req.query.edit) {
        //------------------------------EDIT PROJECT-------------------------
        var access = false;
        if (res.locals.isAdmin) { // Admin is always allowed access
          access = true;
        }
        if (!projectData.locked) {  // If the project isn't locked, the project responsible also has access;
          if (res.locals.userProjectRole == "Resp") {
            access = true;
          }
        }
        if (!access) {
          console.error("Editing project " + projectId + " denied to user " + req.session.userId);
          next(new Error ("Access to project denied"));
        } else {
          res.locals.mongoHelper.getEngineers().then(function(engineers) {
            var selectData = {engineers: engineers};
            var projectPath = "/project?id=" + projectData.id;
            if (projectData.locked) {
              var cancelPath = "/projects";
            } else {
              var cancelPath = projectPath;
            }
            var formData = {
              name: "projectForm",
              scriptName: "projectEdit",
              submitText: "Approve",
              submitPath: projectPath,
              vals: kusetManagerP.getFormVals("projectEdit", projectData, selectData),
              cancelPath: cancelPath
            };
            var pugData = {
              projectData: projectData,
              formData: formData,
              pageTitle: "Edit project"
            };
            res.render('projectEdit', pugData);
          }, function(reason) {
            console.error(reason);
            next(reason);
          });
        }
      } else {
        //------------------------------VIEW PROJECT-------------------------
        req.session.projectConvoId = projectData.conversation;  //Set up the project convoId for later
        if (projectData.locked && res.locals.isAdmin) {
          res.redirect(res.locals.subRoute + "/project?edit=true&&id=" + projectId); //If the project is locked, send admin to fix it
        } else {
          var pugData = {
            projectData: projectData,
            pageTitle: "Project"
          };
          res.render('project', pugData);
        }
      }
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.post('/project', mid.checkLoggedIn, mid.getProjectId, mid.getUserProjectRole, mid.accessProject, mid.getProjectStatus, function(req, res, next) {
    //When making changes to project, many things should run through history events and propogate to project changes
    //The first edit by the admin to approve the project should run through this process too in order to ensure that
    //the history state gets updated to reflect the approval. This is normally done through button press.
    var projectId = res.locals.projectId;
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
      var formData = {
        name: "newProjectForm",
        scriptName: "newProject",
        submitText: "Submit",
        submitPath: "/newProject",
        vals: kusetManagerP.getFormVals("register", null, selectData),
        cancelPath: "/projects",
      };
      var pugData = {
        formData: formData,
        mainId: "newProject",
        heading: "New Project",
        pageTitle: "New project"
      }
      res.render('standardNewForm', pugData);
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  });

  router.post('/newProject', mid.checkLoggedIn, function(req, res, next) {
    let projectData = kusetManagerP.tidyVals(req.body);
    var extra = {userId: req.session.userId, driveHelper: res.locals.driveHelper};
    res.locals.mongoHelper.createDoc(Project, projectData, extra).then(function (projectResponse) {
      var projectId = projectResponse.docId;
      console.log("projectId: " + projectId);
      var hData = {
        text: "Project created by client",
        project: projectId,
        specialType: 1,
        spentHours: 0,
        totalProgress: 0
      };
      console.log("hData");
      console.log(hData);
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

  router.get('/REST/projectId', mid.checkLoggedIn, function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send({projectId: req.session.projectId});
  });

  router.get('/REST/projectList', mid.checkLoggedIn, mid.resolveFileCode, mid.getUserGmail, function(req, res, next) {
    console.log("Get projectList");
    if (!res.locals.projectFolderId) {
      console.log("No project folder id found");
      res.send('null');
      res.status(404).end();
    } else {
      console.log("Getting project files for folderId: " + res.locals.folderId + " and projectFolderId: " + res.locals.projectFolderId);
      res.locals.driveHelper.getProjectFiles(res.locals.folderId, res.locals.projectFolderId).then(function (files) {
        console.log("Processing files");
        res.locals.sHelper.processDriveFiles(files);
        console.log("Processing complete");
        res.render('rest/projectList', {files: files});
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    }
  });

  router.get('/REST/projectSummary', mid.checkLoggedIn, mid.getProjectId, function (req, res, next) {
    var projectId = res.locals.projectId;
    res.locals.mongoHelper.getDocData(Project, projectId).then(function(projectData) {
      res.render('rest/projectSummary', {projectData: projectData});
    }, function(reason) {
      console.error(reason);
    });
  });


  //-----------------------REVIEWS------------------------
  router.get('/review', mid.getProjectId, mid.getUserProjectRole, mid.checkUserIsProjectClient, function(req, res, next) {
    //Check that project needs review and that user is the client
    var selectData = scoreInfo.getSelectData();
    var formData = {
      name: "reviewForm",
      scriptName: "review",
      submitText: "Submit",
      submitPath: "/review?id=" + res.locals.projectId,
      vals: kusetManagerR.getFormVals("register", null, selectData),
      cancelPath: "/project?id=" + res.locals.projectId,
    };
    var pugData = {
      formData: formData,
      mainId: "review",
      heading: "Project Review",
      wide: true,
      pageTitle: "Review"
    }
    res.render('standardNewForm', pugData);
  });

  router.get('/REST/reviewKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManagerR.getFormVals());
  });

  router.post('/review', mid.getProjectId, mid.getUserProjectRole, mid.checkUserIsProjectClient, function(req, res, next) {
    console.log("Posting to review with data:");
    console.log(req.body);
    console.log("Tidying values");
    let reviewData = kusetManagerR.tidyVals(req.body);
    console.log("Tidy values:");
    console.log(reviewData);
    reviewData.clientUser = res.locals.projectRoles.Client;
    reviewData.responsibleUser = res.locals.projectRoles.Resp;
    reviewData.project = res.locals.projectId;
    res.locals.mongoHelper.createDoc("Review", reviewData).then(function (response) {
      res.redirect(res.locals.subRoute + '/project?id=' + res.locals.projectId);
    }, function (reason) {
      console.error(reason);
      next(reason);
    });
  });

  //----------------------HISTORY-------------------------------

  router.get('/REST/historyKusets', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(kusetManagerH.getFormVals());
  });

  router.get('/REST/actionHistoryId', mid.checkLoggedIn, mid.getProjectId, mid.getProjectHistories, function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send({actionHistoryId: res.locals.actionHistoryId});
  });

  router.get('/REST/histories', mid.checkLoggedIn, mid.getProjectId, mid.getProjectStatus, mid.getProjectHistories, mid.getUserProjectRole, function (req, res, next) {
    if (res.locals.areHistories) {
      console.log("There are histories");
    } else {
      console.log("No histories");
    }
    if (res.locals.openAction) console.log("Open action: " + res.locals.openAction);
    var formVals = kusetManagerH.getFormVals("register");
    var submitPath = null;
    var cancelPath = null;
    var formData = {
      name: "historyForm",
      noScripts: true,
      submitText: "Submit",
      submitPath: null,
      vals: formVals
    };
    var pugData = {
      closeable: (res.locals.projectStatus == "Ongoing" && res.locals.projectSubStatus == "In Progress" && res.locals.isAdmin),
      reviewable: (res.locals.reviewable && res.locals.userProjectRole == "Client"),
      projectClosed: (res.locals.projectStatus == "Finished"),
      formData: formData
    }
    res.render('rest/histories', pugData);
  });

  router.post('/REST/historyAction', mid.checkLoggedIn, mid.getHistoryId, mid.getHistoryProject, function (req, res, next) {
    console.log("Running post history action");
    var actionType = req.body.aType;
    var historyId = res.locals.historyId;
    switch(actionType) {
      case "approve":
        approveHistory(false);
        break;
      case "modify":
        approveHistory(true);
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

    function approveHistory (withMods) {
      res.locals.mongoHelper.approveHistory(historyId, req.session.userId, withMods).then(function(result) {
        updateProjectAnd201(res);
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    }
  });

  router.post('/REST/history', mid.checkLoggedIn, mid.getProjectId, mid.getUserProjectRole, function (req, res, next) {
    var hData = req.body;
    var userProjectRole = res.locals.userProjectRole;
    var projectRoles = res.locals.projectRoles;
    makeHistory(hData, userProjectRole, projectRoles, res).then(function(docData) {
      updateProjectAnd201(res);
    }, function(reason) {
      next(reason);
    });
  });

  router.post('/REST/closeProject', mid.checkLoggedIn, mid.checkAdmin, mid.getProjectId, function (req, res, next) {
    res.locals.mongoHelper.projectCloseoff(res.locals.projectId).then(function(success) {
      res.send("null");
      res.status(201).end();
    }, function(reason) {
      next(reason);
    });
  })


  function updateProjectAnd201(res) {
    //When histories are created or updated via a post request, the percentage progress
    //on their master project may need to be changed as a result.
    //This function is used as the last step of such a post request.
    //It updates the projects progress and returns a 201 response.
    res.locals.mongoHelper.resolveProjectHistories(res.locals.projectId).then(function(response) {
      res.send("null");
      res.status(201).end();
    }, function(reason) {
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
        project: hData.project || res.locals.projectId,
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

  router.get('/REST/conversation', mid.checkLoggedIn, function (req, res, next) {
    res.locals.mongoHelper.getDocData("Conversation", req.session.projectConvoId).then(function (conversation) {
      var posts = conversation.ofPosts;
      var noPosts = (posts.length == 0);
      res.render('rest/conversation', {posts: posts, noPosts: noPosts});
    }, function (reason) {
      console.error(reason);
    });
  });

  router.post('/REST/conversation', mid.checkLoggedIn, function (req, res, next) {
    var postText = req.body.postText;
    res.locals.mongoHelper.addPost(req.session.projectConvoId, postText, req.session.userId).then(function(doc) {
      if (doc) {
        res.send('null');
        res.status(201).end();
      } else {
        res.send('null');
        res.status(404).end();
      }
    });
  });

  return router;
}
