//TO DO: Move processData into pre-save and pre-load hooks
//REFACTOR TO GET RID OF REPETITION FOR USER AND PROJECT ETC
//REFACTOR OH PLEASE REFACTOR

var Promise = require('promise');
var moment = require('moment');
var switchHelper = require("./switchHelper");

var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var User = require("../models/user.js");
var Company = require("../models/company.js");
var Project = require("../models/project.js");
var Conversation = require("../models/conversation.js");
var History = require("../models/history.js");
var Review = require("../models/review.js");

var priorities = require("../data/priorities.js");
var multiPromiseLib = require("../node/multiPromise.js");
var db = setUpMongo("navalis", false);

var driveHelper;
var calendarHelper;

var adminMail = require("../data/adminData.json").gmail;
var adminId;

function getAdminId() {
  return adminId;
}

function isAdmin(id) {
  return adminId.equals(id);
}

function init (apiHelpers) {
  driveHelper = apiHelpers.drive;
  calendarHelper = apiHelpers.calendar;
  getOneDoc(User, {"gmail": adminMail}, {"_id": true}, true).then(function (response) {
    if (response.found) {
      console.log("AdminId found");
      adminId = response.doc._id;
    } else {
      console.log("AdminId not found");
    }
  }, function(reason) {
    console.error(reason);
    reject(reason);
  });
}

function shallowCopy (k1) {
  let keys = Object.keys(k1);
  let k2 = {};
  for (let i = 0; i < keys.length; i++) {
    k2[keys[i]] = k1[keys[i]];
  }
  return k2;
}

function cleanDoc (doc) {
  if (doc["_doc"]) {
    return doc["_doc"];
  } else {
    return doc;
  }
}


function endOfKeyIs(key, end) {
  var len = end.length;
  return (key.substr(key.length - len).toUpperCase() == end.toUpperCase());
}

function processData (mongoDoc, type, loud, bypass) {
  if (bypass) {
    return new Promise (function (fulfill, reject) {
      fulfill(mongoDoc);
    });
  }
  return new Promise (function (fulfill, reject) {
    if (!Object.keys(mongoDoc).length) {
      fulfill(null);
    }
    if (Array.isArray(mongoDoc)) {

      if (loud) console.log("isArray");
      if (loud) console.log(mongoDoc);
      var newArray = [];
      var nItems = mongoDoc.length;
      var itemsDone = 0;
      if (!nItems) {
        fulfill(mongoDoc);
        return;
      }

      function arrayItemDone(index) {
        itemsDone++;
        if (loud) {
          console.log("Item complete: " + index);
          console.log(itemsDone + "/" + nItems);
        }
        if (itemsDone == nItems) {
          fulfill(newArray);
        }
      }
      for (let i = 0; i < nItems; i++) {
        processDataEach(mongoDoc[i], type, loud).then(function(tidyDoc) {
          newArray[i] = tidyDoc;
          arrayItemDone(i);
        });
      }
    } else {
      processDataEach(mongoDoc, type, loud).then(function(tidyDoc) {
        if (loud) console.log("Finished processing mongoDoc");
        fulfill(tidyDoc);
      });
    }
  });
}

function processDataEach (mongoDoc, type, loud) {
  return new Promise (function (fulfill, reject) {

    if (loud) {
      console.log("Processsing mongo data")
      console.log("Original Keys: ");
      console.log(Object.keys(mongoDoc));
    }
    var doc = cleanDoc(mongoDoc);
    if (loud) {
      console.log("New keys:")
      console.log(Object.keys(doc));
      console.log("Data:")
      console.log(doc);
    }

    var keys = Object.keys(doc);
    if (type == "save") {
      for (var i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (loud) console.log(key + ": " + doc[key]);
        if (key == "dob" || key == "startDate" || key == "endDate" || key == "deadline") {
          if (loud) console.log("Is date key");
          doc[key] = moment(doc[key], "DD/MM/YYYY");
        }
      }
      lastBit();
    }
    if (type == "clean") {
      lastBit();
    }
    if (type == "load") {
      //This contains asynchronous processes so we need to get each task to call a taskComplete callback to keep track of them all
      var tasksDone = 0;
      var nTasks = keys.length;
      for (var i = 0; i < nTasks; i++) {
        let key = keys[i];
        if (loud) console.log("Starting task: " + key + " (" + i + "/" + nTasks + ")");
        if (Array.isArray(doc[key])) {
          if (key == "ofPosts" || key == "ofAccessUsers") {
            if (doc[key].length) {
              if (loud) console.log("Processing array");
              processData(doc[key], "load", loud).then(function (newDoc) {
                doc[key] = newDoc;
                taskComplete(key);
              });
            } else {
              taskComplete(key + " (NC)");
            }
          } else {
            taskComplete(key + " (NC)");
          }
        } else {
          if (key == "author" || endOfKeyIs(key, "user")) {
            if (loud) console.log("User-based key found: " + key);
            if (loud) console.log(doc[key]);
            getUserName(doc[key]).then(function(userName) {
              if (loud) console.log("Found userName: " + userName);
              doc[key + "Name"] = userName;
              taskComplete(key);
            });
          } else {
            if (key == "client" || key == "company") {
              getDocData(Company, doc[key]).then(function(companyData) {
                doc[key + "Name"] = companyData.name;
                taskComplete(key);
              });
            } else {
              if (key == "dob" || key == "deadline" || endOfKeyIs(key, "date")) {
                if (loud) {
                  console.log("------" + key.toUpperCase() + "------");
                  console.log("Original date");
                  console.log(doc[key]);
                }
                let mDate = moment(doc[key], "DD/MM/YYYY");
                doc[key] = moment(mDate).format("DD/MM/YYYY");
                if (loud) console.log("Processed date: " + doc[key]);
                doc[key + "Monthy"] = moment(mDate).format("MMMM YYYY");
                if (loud) console.log("Monthy date: " + doc[key + "Monthy"]);
                if (key == "dob") {
                  doc.age = moment().diff(mDate, "years");
                  if (loud) console.log("Age: " + doc.age);
                }

                if (key == "postDate") {
                  doc.postTime = moment(mDate).fromNow();
                  if (loud) console.log("PostTime: " + doc.postTime);
                }

                taskComplete(key);
              } else {
                if (key == "_id") {
                  doc.id = doc[key];
                  taskComplete(key);
                } else {
                  if (key == "priority") {
                    doc.priorityName = priorities.pArray[doc[key]]; //Get the corressponding string for the priority level
                    taskComplete(key);
                  } else {
                    taskComplete(key + " (NC)");
                  }
                }
              }
            }
          }
        }
      }
    }

    function taskComplete(taskName) {
      tasksDone++;
      if (loud) {
        console.log("Task complete: " + taskName);
        console.log(tasksDone + "/" + nTasks);
      }
      if (tasksDone == nTasks) {
        lastBit();
      }
    }

    function lastBit() {
      if (loud) {
        console.log("Finished process")
        console.log("Data:")
        console.log(doc);
      }
      fulfill(doc);
    }
  });
}

function makeSession () {
  return session({
    secret: 'pitaya',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    }),
    cookie: {
      //rolling: true,
      maxAge: 10*60000  //ten minutes
    }
  });
}

function setUpMongo (dbName, reset) {
  var mongoose = require('mongoose');
  var session = require('express-session');
  var MongoStore = require('connect-mongo')(session);
  // mongodb connection
  mongoose.connect("mongodb://localhost:27017/" + dbName);
  var db = mongoose.connection;
  // mongo error
  db.on('error', console.error.bind(console, 'connection error:'));
  if (reset) {
    User.collection.drop();
  }
  return db;
}


//------------------CONVERSATIONS----------------

function addPost (convoId, text, userId) {
  return new Promise(function (fulfill, reject) {
    var post = {
      text: text,
      author: userId
    }
    Conversation.findOneAndUpdate({"_id": convoId}, {$push: {ofPosts: post}}, function (err, doc) {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if (!doc) {
          var err = new Error ("Conversation not found");
          console.error(err);
          reject(err);
        } else {
          fulfill(doc);
        }
      }
    });
  });
}

//-------------------PROJECTS----------------------
function resolveProjectHistories (projectId) {
  console.log("Resolving project histories");
  return new Promise(function (fulfill, reject) {
    var query = {"project": projectId};
    getDocs(History, query).then(function(histories) {
      if (histories) {
        //Get the maximum progress, highest specialType, index of any notifiable history and total spentHours
        console.log("There are histories");
        console.log("Iterating through histories");
        var maxP = 0;
        var specialType = 0;
        var notifiableFound = false;
        var notifiableIndex;
        var spentHours = 0;
        for (let i = 0; i < histories.length; i++) {
          var history = histories[i];
          maxP = Math.max(maxP, history.totalProgress);
          if (history.specialType) {
            //If the special type required an action, make sure the action has been completed
            if (history.actionType == "None" || history.actionResult) {
              specialType = Math.max(specialType, history.specialType);
            }
          }
          if (history.notifiable) {
            console.log("Found notifiable");
            if (!notifiableFound) {
              notifiableIndex = i;
              notifiableFound = true;
            } else {
              var err = new Error ("Multiple notifiable histories");
              console.error(err);
              reject(err);
            }
          }
          spentHours += history.spentHours;
        }
        console.log("Finished iterating through histories");

        //Create a data update object for the project
        var upData = {
          progress: maxP,
          spentHours: spentHours
        };

        var query = {"_id": projectId};
        var projection = {status: true};
        getOneDoc(Project, query, projection).then(function(projectData) {
          //WE could use the highestDate index here to do something fancy with the
          //substatus like set modifications if the previous thing was accepted with mods
          //But I think this will be a hassle because they might comment afterwards saying
          //what mods they need to do. How would we know when the mods are over?

          //If there are specialTypes, we need to get the project to see if we need to change the overall project status
          var basicStati = ["Scheduled", "Ongoing", "Finished"];
          var basicSubStati = ["Pending approval", "In Progress", "Complete"];
          upData.status = basicStati[specialType];
          upData.subStatus = basicSubStati[specialType];
          //If there is a notifiable, we need to setup the substatus to match
          if (notifiableFound) {
            console.log("Processing notifiable");
            var actionType = histories[notifiableIndex].actionType;
            console.log("Actiontype: " + actionType);
            if (upData.status == "Ongoing") {
              var switchObject = {
                "Client": "Client Approval",
                "Internal": "Internal Approval"
              };
              console.log("Running switchHelper");
              var switchRes = switchHelper(actionType, switchObject, "actionType");
              console.log("Ok!");
              if (switchRes.err) {
                reject(err);
              } else {
                upData.subStatus = switchRes.answer;
              }
            } else {
              console.log("Notifiable found but not for Ongoing project. Leaving substatus alone");
            }
          }
          console.log("Updating project with: ");
          console.log(upData);
          updateDocSimple(Project, projectId, upData).then(function (response) {
            fulfill();
          }, function(reason) {
            console.error(reason);
            reject(reason);
          });
        }, function(reason) {
          console.error(reason);
          reject(reason);
        });
      } else {
        fulfill();
      }
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}


function getProjects (userId, isAdmin, projectStatus) {
  //Gets a bunch of projects. Can be limited by:
  //  userId: Only projects with permission to that userId
  //  isAdmin: If true, all projects are available
  //  projectStatus: Only projects with the given status
  var query = {};
  if (userId && !isAdmin) {
    query.ofAccessUsers = userId;
  }
  if (projectStatus) {
    query.status = projectStatus;
  }
  return getDocs(Project, query);
}

function projectCloseoff(projectId) {
  console.log("Closing project " + projectId);
  return new Promise(function(fulfill,reject) {
    var hData = {
      text: "Project closed by administrator",
      project: projectId,
      spentHours: 0,
      totalProgress: 100,
      actionType: "None",
      specialType: 2 //Close project
    };
    createDoc(History, hData).then(function(hRes){
      var pData = {
        status: "Finished",
        subStatus: "Complete",
        reviewable: true,
        progress: 100,
        endDate: moment()
      };
      updateDocSimple(Project, projectId, pData).then(function(success) {
        fulfill(true);
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function projectKickoff (projectId, projectData, userId) {
  //For when the admin gives the first approval to a project
  //Updates the project
  //Then approves the first history
  console.log("Project kickoff");
  return new Promise(function(fulfill,reject) {
    //Add the new projectData to the project and update drive and calendar stuff
    projectData.status = "Ongoing";
    projectData.subStatus = "In Progress";
    projectData.startDate = moment();
    updateProject(projectId, projectData).then(function() {
      console.log("Project updated");
      //Find the only history for the project
      var query = {"project": projectId};
      var projection = {"_id": true};
      console.log("Finding query");
      getOneDoc(History, query, projection).then(function(doc) {
        console.log("Approving history");
        console.log("history doc: " + doc.id);
        console.log("userid: " + userId);
        approveHistory (doc.id, userId).then(function() {
          console.log("History approved");
          fulfill();
        }, function(reason) {
          console.error(reason);
          reject(reason);
        });
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function updateProject (projectId, projectData) {
  return new Promise(function(fulfill,reject) {
    updateDocSimple(Project, projectId, projectData).then(function(success) {
      setGooglePermissions(projectId).then(function(dfi) {
        fulfill();
      }, function(reason) {
        console.error(reason);
        next(reason);
      });
    }, function(reason) {
      console.error(reason);
      next(reason);
    });
  });
}

function makeReqAccessUsers (data) {
  var reqAccessUsers = [data.clientUser];
  if (data.responsibleUser) {
    reqAccessUsers.push(data.responsibleUser);
  }
  if (data.qcUser) {
    reqAccessUsers.push(data.qcUser);
  }
  return reqAccessUsers;
}

function makeAccessObject (projectData) {
  //Make accessObject based off existing information
  console.log("Making acces object");
  var accessObject = {
    users: projectData.ofAccessUsers || [],
    drive: projectData.ofUserDriveAccess || [],
    cal: projectData.ofUserCalAccess || []
  };
  console.log(accessObject);

  //Make a list of users requried to have access
  console.log("Making reqAccessUsers");
  var reqAccessUsers = makeReqAccessUsers(projectData);
  console.log(reqAccessUsers);


  var toBeAdded = [];
  var areExUsers = (projectData.ofAccesUsers && projectData.ofAccessUsers.length > 0);

  var include;
  for (let i = 0; i < reqAccessUsers.length; i++) {
    console.log("Testing user: " + reqAccessUsers[i]);
    include = true;
    if (isAdmin(reqAccessUsers[i])) {
      console.log("Is admin. Not being included");
      include = false;
    } else {
      if (areExUsers) {
        console.log("Checking against accessObject");
        //Check against existing access users
        for (let j = 0; j < accessObject.users.length; j++) {
          if (reqAccessUsers[i].equals(accessObject.users[j])) {
            include = false;
            console.log("Match found. Not being included");
          }
        }
      }
    }
    if (include) {
      console.log("Including user: "+ reqAccessUsers[i]);
      accessObject.users.push(reqAccessUsers[i]);
      accessObject.drive.push(false);
      accessObject.cal.push(false);
      console.log("Access object updated");
      console.log(accessObject);
    }
  }
  return accessObject;
}


function setGooglePermissions(projectId) {
  console.log("Setting google permissions");
  //Sets up drive permissions based on ofAccessUsers
  return new Promise (function (fulfill, reject) {
    var query = {"_id": projectId};
    getOneDoc(Project, query).then(function(projectData) {
      var accessObject = makeAccessObject(projectData);
      console.log("Made accessObject:");
      console.log(accessObject);
      //Get reference to drive folder
      console.log("Confirming drive and calendar");
      confirmDriveAndCalendar(projectData).then(function(mpR) {
        console.log("Confirmed frive and calendar");
        var dfi = mpR.dfi;
        var gci = mpR.gci;
        console.log("Confirmed with dfi: ");
        console.log(dfi);
        console.log("and gci:");
        console.log(gci);
        //Set permissions
        addUserPermissions(accessObject, dfi, gci).then(function(accessObject) {
          //Update project
          var upData = {
            ofAccessUsers: accessObject.users,
            ofUserDriveAccess: accessObject.drive,
            ofUserCalAccess: accessObject.cal,
            driveId: dfi,
            calendarId: gci
          };
          updateDocSimple(Project, projectId, upData).then(function (response) {
            console.log("DriveId and ofAccessUsers updated to project");
            fulfill(dfi);
          });
        }, function (reason) {
          console.error(reason);
          reject(reason);
        });
      }, function (reason) {
        console.error(reason);
        reject(reason);
      });
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function addUserPermissions (accessObject, dfi, gci) {
  console.log("Function - Add user permissions");
  return new Promise (function (fulfill, reject) {
    console.log("Existing accessObject:");
    console.log(accessObject);
    var mpObject = {};
    for (let i = 0; i < accessObject.users.length; i++) {
      mpObject[i] = setUserPermission(accessObject, i, dfi, gci);
    }
    multiPromiseLib.mp2(mpObject, {serial: true}).then(function(mpR) {
      console.log("Set user permissions, mpR is:");
      console.log(mpR);
      var len = Object.keys(mpR).length;
      var successCount = 0;
      for (let i = 0; i < len; i++) {
        console.log(mpR[i]);
        if (mpR[i].userError) {
          console.error("Error finding user " + accessObject.users[i]);
        } else {
          accessObject.drive[i] = mpR[i].drive;
          accessObject.cal[i] = mpR[i].cal;
          if (mpR[i].drive && mpR[i].cal) {
            successCount++;
          }
        }
      }
      console.log(successCount + " out of " + accessObject.users.length + " permissions added");
      console.log(accessObject);
      fulfill(accessObject);
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}


function confirmDriveAndCalendar(projectData) {
  var mpObject = {
    dfi: confirmDriveFolder(projectData),
    gci: confirmCalendar(projectData)
  };
  return multiPromiseLib.mp2(mpObject, {loud: true, serial: true});
}

function confirmDriveFolder (projectData) {
  return new Promise (function (fulfill, reject) {
    console.log("Confirming drive folder");
    if (!projectData.driveId) {
      console.log("Creating project Folder")
      driveHelper.createProjectFolder(projectData._id, projectData.clientName, projectData.title, projectData.description).then(function(dfi) {
        console.log("Drive project folder created with id: " + dfi);
        fulfill(dfi);
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    } else {
      fulfill(projectData.driveId);
    }
  });
}

function confirmCalendar (projectData) {
  return new Promise (function (fulfill, reject) {
    console.log("Confirming calendar");
    if (!projectData.calendarId) {
      console.log("Creating project calendar")
      calendarHelper.createCalendar(projectData._id, projectData.clientName, projectData.title, projectData.description).then(function(gci) {
        console.log("Google calendar created with id: " + gci);
        fulfill(gci);
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    } else {
      fulfill(projectData.calendarId);
    }
  });
}

function setUserPermission (accessObject, index, dfi, gci) {
  //PARRALLELIZE!!
  return new Promise (function (fulfill, reject) {
    var userId = accessObject.users[index];
    var userAccess = {
      drive: accessObject.drive[index],
      cal: accessObject.cal[index]
    };
    var addDrive = !userAccess.drive;
    var addCal = !userAccess.cal;
    console.log("Setting user permission for userId: " + userId);
    if (addDrive || addCal) {
      console.log("changes required");
      getUserStuff(userId).then(function(userData) {
        var gmail = userData.gmail;
        var mpObject = {};
        if (addDrive) {
          mpObject.drive = driveHelper.addPermission(dfi, gmail);
        }
        if (addCal) {
          mpObject.cal = calendarHelper.addPermission(gci, gmail);
        }
        multiPromiseLib.mp2(mpObject, {loud: true, passFail: true}).then(function(mpR) {
          if (mpR.drive) userAccess.drive = true;
          if (mpR.cal) userAccess.cal = true;
          fulfill(userAccess);
        });
      }, function(reason) {
        console.error(reason);
        userAccess.userError = true;
        fulfill(userAccess);
      });
    } else {
      console.log("No changes required");
      fulfill(userAccess);
    }
  });
}

function createProject (projectData, userId) {
  //CREATE HISTORY DOC WHICH HAS ACTION FOR ADMIN APPROVAL
  return new Promise (function (fulfill, reject) {
    createDocSimple(Conversation, {}).then(function (convoResponse) {
      userQuery(userId).then(function(userData) {
        projectData.conversation = convoResponse.docId;
        projectData.clientUser = userId;
        projectData.client = userData.companyId;
        createDocSimple(Project, projectData).then(function (projectResponse) {
          console.log("Project response: ");
          console.log(projectResponse);
          var projectId = projectResponse.docId;
          console.log("Project id: ");
          console.log(projectId);
          fulfill({docId: projectId});
        }, function (reason) {
          console.error(reason);
          reject(reason);
        });
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

//---------------COMPANIES---------------------
function getClientCompanies() {
  console.log("Getting client companies");
  return getTidyCompanies({"isClient": true});
}

function getTidyCompanies(query) {
  return new Promise (function (fulfill, reject) {
    getDocs(Company, query, {"_id": true, "name": true}).then(function(companies) {
      if (!companies) {
        fulfill(null);
      } else {
        var tidyCompanies = [];
        for (var i = 0; i < companies.length; i++) {
          tidyCompanies[i] = {id: companies[i]._id, text: companies[i].name};
        }
        fulfill(tidyCompanies);
      }
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}


//-------------------USERS--------------------

function userQuery(id) {
  return new Promise(function(fulfill, reject) {
    getUserStuff(id).then(function(doc) {
      var userData = {"isEng": !doc.isClient, "isAdmin": isAdmin(id), "companyId": doc.company};
      fulfill(userData);
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function getUserName (id) {
  return new Promise (function (fulfill, reject) {
    getUserStuff(id).then(function(doc) {
      fulfill(doc.firstName + " " + doc.lastName);
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function userPermission (accessUserId, objectUserId) {
  return new Promise(function(fulfill,reject) {
    getUserStuff(accessUserId).then(function(aDoc) {
      if (!aDoc.isClient) {
        fulfill(true); //Engineers can see all clients
        return;
      } else {
        getUserStuff(objectUserId).then(function(oDoc) {
          if (!oDoc.isClient) {
            fulfill(true); //Everyone can see engineers
            return;
          } else {
            fulfill(aDoc.company.equals(oDoc.company));  //People from the same company can see each other
          }
        });
      }
    });
  });
}

function getUserStuff (id) {
  return new Promise (function (fulfill, reject) {
    getOneDoc(User, {"_id": id}, {"firstName": true, "lastName": true, "company": true, "isClient": true, "gmail": true}).then(function(doc) {
      if (doc) {
        fulfill(doc);
      } else {
        reject();
      }
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function authenticate (gmail, pass) {
  return User.authenticate(gmail, pass);
}
function getEngineers() {
  return getTidyUsers({"isClient": false});
}

function getClientUsers(companyId) {
  if (companyId) {
    return getTidyUsers({"isClient": true, "company": companyId});
  } else {
    return getTidyUsers({"isClient": true});
  }
}

function getTidyUsers(query) {
  //Returns a nice userList for drop down menus
  return new Promise (function (fulfill, reject) {
    getDocs(User, query, {"_id": true, "firstName": true, "lastName": true}).then(function(users) {
      var tidyUsers = [];
      for (var i = 0; i < users.length; i++) {
        tidyUsers[i] = {id: users[i]._id, text: users[i].firstName + " " + users[i].lastName};
      }
      fulfill(tidyUsers);
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

//-----------------------HISTORY DOCS----------------------
function approveHistory (historyId, userId, isWithMods) {
  console.log("Approving history " + historyId);
  return new Promise(function(fulfill,reject) {
    console.log("Getting true doc");
    getTrueDoc(History, historyId).then(function(doc) {
      console.log("Running doc.approve");
      doc.approve(userId, (isWithMods)).then(function() {
        if (isWithMods) {
          console.log("Doc approved with mods");
        } else {
          console.log("Doc approved");
        }
        fulfill();
      }, function(reason) {
        reject(reason);
      });
    });
  });
}

//-----------------------REVIEWS----------------------
function createReview(data) {
  return new Promise (function (fulfill, reject) {
    console.log("Creating review");
    createDocSimple(Review, data).then(function(revRes) {
      console.log("Created review");
      var pData = {reviewable: false};
      console.log("Updating project");
      updateDocSimple(Project, data.project, pData).then(function(pRes) {
        console.log("Updated project");
        fulfill();
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

//-----------------------GENERAL DOCS----------------------
function doesDocExist(Model, id) {
  return new Promise (function (fulfill, reject) {
    getOneDoc(Model, {"_id": id}, null, true, true).then(function(response) {
      fulfill(response.found);
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function getTrueDoc(Model, id, projection) {
  Model = processModel(Model);
  if (!projection) {
    projection = {};
  }
  var query = {"_id": id};
  return new Promise (function (fulfill, reject) {
    if (!mongoose.Types.ObjectId.isValid(query._id)) {
      var error = new Error ("Invalid id: " + query._id + " (" + Model.modelName + ")");
      reject(error);
    }
    Model.findOne(query, projection, function (err, doc) {
      if (err) return reject(err);
      if (!doc) return reject(new Error ("Doc not found"));
      fulfill(doc);
    });
  });
}

function getOneDoc(Model, query, projection, isSafe, noProcess) {
  //A function to search for one document of a given modelName
  //Bonus options
  //  isSafe: Returns an object with {found: t/f, doc: doc}
  //          if the doc isn't found, then there is no error
  //  noProcess:  Prevents the processing of the results
  //              This can be good to save cpu if you are just wondering if the doc exists or not
  var loud = false;
  Model = processModel(Model);
  return new Promise (function (fulfill, reject) {
    if (loud) console.log("Running getOneDoc for model " + Model.modelName + " with query:");
    if (loud) console.log(query);
    if ('_id' in query) {
      if (!mongoose.Types.ObjectId.isValid(query._id)) {
        var error = new Error ("Invalid id: " + query._id + " (" + Model.modelName + ")");
        reject(error);
        return;
      }
    }
    if (loud) console.log("Finding one");
    Model.findOne(query, projection, function (err, doc) {
      if (err) {
        reject(err);
      } else {
        if (!doc) {
          if (loud) console.log("Not found");
          if (isSafe) {
            //In safe mode we stay calm and report that the doc wasn't found
            fulfill({found: false});
          } else {
            //Otherwise we freak out and take despeate measures (findThadDoc) to find it.
            findThatDoc(query._id, Model.modelName).then(function (isFound) {
              if (isFound) {
                err = new Error (query._id + " is not a " + Model.modelName);
              } else {
                err = new Error (query._id + " does not exist");
              }
              reject(err);
            }, function(reason) {
              reject(reason);
            });
          }
        } else {
          if (loud) console.log("Found");
          var bypass = false;
          if (noProcess) {
            bypass = true;
          }
          processData(doc, "load", false, bypass).then(function(data) {
            if (isSafe) {
              fulfill({found: true, doc: data});
            } else {
              fulfill(data);
            }
          }, function(reason) {
            console.error(reason);
            reject(reason);
          });
        }
      }
    });
  });
}

function findThatDoc (id, modelName) {
  console.log("You tried looking for a " + modelName + " with id " + id + " but it doesn't exist");
  console.log("Let me try find it somewhere else");
  return new Promise (function (fulfill, reject) {
    let Models = [User, Project, Company, Conversation];
    var k = 0;
    for (let i = 0; i < Models.length; i++) {
      Models[i].findOne({"_id": id}, {"_id": true}, function (err, doc) {
        if (doc) {
          doneSearch(i, true);
        } else {
          doneSearch(i, false);
        }
      });
    }
    function doneSearch(i, isFound) {
      if (isFound) {
        console.log("I found it. Actually the document you are looking for is a " + Models[i].modelName);
        fulfill(true);
      } else {
        k++;
        if (k == Models.length) {
          console.error("Sorry, the object id " + id + " doesn't correspond to anything");
          fulfill(false);
        }
      }
    }
  });
}

function getDocs(Model, query, projection) {
  Model = processModel(Model);
  if (!projection) {
    projection = Model.defaultProject || {};
  }
  return new Promise (function (fulfill, reject) {
    Model.find(query, projection, function (err, doc) {
      if (err) return reject(err);
      if (!doc) {
        err = new Error ("Doc not found");
        reject(err);
      }
      processData(doc, "load").then(function(data) {
        fulfill(data);
      });
    });
  });
}

function updateDoc (Model, id, data) {
  //Routing for updateDoc requests
  Model = processModel(Model);
  if (Model.modelName == "Project") {
    return updateProject(Model, id, data);
  } else {
    return updateDocSimple(Model, id, data);
  }
}


function updateDocSimple (Model, id, data) {
  Model = processModel(Model);
  return new Promise (function (fulfill, reject) {
    let query = {"_id": id};
    let options = {"multi": false, "upsert": false};
    processData(data, "save").then(function(data) {
      Model.update(query, data, options, function (err, doc) {
        if (err) {
          console.log(err);
          reject (err);
        } else {
          fulfill(true);
        }
      });
    });
  });
}

function createDoc (Model, data, extra) {
  //FOR ROUTING THE CREATE DOC REQUESTS
  Model = processModel(Model);
  switch(Model.modelName) {
    case "User":
      if (data.gmail == adminMail) { //If creating a user with adminmail, be sure to update admimail
        return new Promise (function (fulfill, reject) {
          createDocSimple(Model, data).then(function(docData) {
            adminId = docData.docId;
            fulfill(docData);
          }, function(reason) {
            reject(reason);
          });
        });
      } else {
        return createDocSimple(Model, data);
      }
    case "Project":
      return createProject(data, extra.userId);
    case "Review":
      return createReview(data);
    default:
      return createDocSimple(Model, data);
  }
}

function createDocSimple (Model, data, loud) {
  Model = processModel(Model);
  return new Promise (function (fulfill, reject) {
    if (loud) {
      console.log("Creating new " + Model.modelName.toLowerCase());
      console.log("Data:")
      console.log(data);
    }
    processData(data, "save").then(function (newData) {
      if (loud) console.log("Processed data:");
      var doc = new Model(newData);
      if (loud) console.log("Made doc:");
      return doc.save(function (error, doc) {
        if (loud) console.log("Doc saved");
        if (error) {
          console.error(error);
          reject(error);
        } else {
          var name = (doc.firstName || doc.title || doc.name);
          if (name) {
            console.log(name + " successfully created with ID " + doc._id);
          } else {
            console.log(Model.modelName + " successfully created with ID " + doc._id);
          }
          fulfill({docId: doc._id});
        }
      });
    }, function (reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function getDocData(Model, id, projection, reqFields, isSafe) {
  Model = processModel(Model);
  return new Promise (function (fulfill, reject) {
    if (!projection) {
      projection = Model.defaultProject || {};
    }
    let query = {"_id": id};
    if (reqFields) {
      for (let i = 0; i < reqFields.length; i++) {
        query[reqFields[i]] = {$exists: true};
      }
    }
    getOneDoc(Model, query, projection, isSafe).then(function(response) {
      fulfill(response);
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function deleteDoc (Model, id) {
  return new Promise (function (fulfill, reject) {
    Model = processModel(Model);
    Model.findByIdAndRemove(id, function (err, doc) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        fulfill();
      }
    });
  });
}

function processModel (Model) {
  if (typeof Model == "string") {
    switch(Model) {
      case "User":
        return User;
      case "Company":
        return Company;
      case "Project":
        return Project;
      case "Conversation":
        return Conversation;
      case "History":
        return History;
      case "Review":
        return Review;
      default:
        console.error("Bad model type");
        return null;
    }
  }
  return Model;
}

function reset () {

  var icerfishId;
  var astrowebId;
  var robbieId;
  var chrisId;

  function dropAll() {
    var mpObject = {};
    var models = [User, Company, Project, Conversation, History, Review];
    for (let i = 0; i < models.length; i++) {
      mpObject[i] = new Promise (function(fulfill, reject) {
        models[i].collection.drop(function(err, result) {
          if (err) {
            reject(err);
          } else {
            console.log("Dropped " + models[i].modelName);
            fulfill(result);
          }
        });
      });
    }
    return new Promise(function (fulfill, reject) {
      multiPromiseLib.mp2(mpObject).then(function(res) {
        console.log("Drop success");
        fulfill(res);
      }, function(reason) {
        console.log("Drop issue");
        console.error(reason);
        fulfill(true);
      });
    });
  }

  function makeCompanies() {
    return new Promise (function(fulfill, reject) {
      createDoc(Company, {name: "Navalis", isClient: false}).then(function () {
        createDoc(Company, {name: "Icerfish", isClient: true}).then(function (cRes) {
          icerfishId = cRes.docId;
          createDoc(Company, {name: "Astroweb", isClient: true}).then(function (cRes) {
            astrowebId = cRes.docId;
            fulfill();
          });
        });
      });
    });
  }
  function makeUsers() {
    return new Promise (function(fulfill, reject) {
      createDoc(User, {
        firstName: "Robbie",
        lastName: "Muir",
        email: "robbiemuir7@gmail.com",
        gmail: "robbiemuir7@gmail.com",
        password: "pass",
        userType: "Engineer"
      }).then(function (uRes) {
        robbieId = uRes.docId;
        createDoc(User, {
          firstName: "Chris",
          lastName: "Arms",
          email: "chrarms@gmail.com",
          gmail: "chrarms@gmail.com",
          password: "pass",
          userType: "Client",
          company: astrowebId
        }).then(function (uRes) {
          chrisId = uRes.docId;
          fulfill();
        });
      });
    });
  }
  function makeProjects () {
    console.log("Making projects");
    return new Promise (function(fulfill, reject) {
      var projectData = {
        title: "Project 1",
        description: "A cool project",
        shipType: "FPSO",
        responsibleUser: robbieId
      };
      console.log("Creating doc projects");
      var extra = {userId: chrisId};
      createDoc(Project, projectData, extra).then(function () {
        fulfill();
      });
    });
  }

  return new Promise (function(fulfill, reject) {
    dropAll().then(function(mpR) {
      console.log("Dropped all:");
      console.log(mpR);
      console.log("Creating Navalis");
      createDoc(Company, {name: "Navalis", isClient: false}).then(function(result) {
        fulfill();
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });


  /*
  return new Promise (function (fulfill, reject) {
    dropAll().then(function () {
      makeCompanies().then(function () {
        makeUsers().then(function () {
          fulfill();
        });
      });
    });
  });
  */
}

module.exports.makeSession = makeSession;
module.exports.init = init;

module.exports.getOneDoc = getOneDoc;
module.exports.getDocs = getDocs;
module.exports.updateDoc = updateDoc;
module.exports.createDoc = createDoc;
module.exports.getDocData = getDocData;
module.exports.doesDocExist = doesDocExist;
module.exports.deleteDoc = deleteDoc;

module.exports.addPost = addPost;
module.exports.approveHistory = approveHistory;

module.exports.getProjects = getProjects;
module.exports.projectKickoff = projectKickoff;
module.exports.projectCloseoff = projectCloseoff;
module.exports.resolveProjectHistories = resolveProjectHistories;

module.exports.authenticate = authenticate;
module.exports.getEngineers = getEngineers;
module.exports.getClientUsers = getClientUsers;
module.exports.userQuery = userQuery;
module.exports.userPermission = userPermission;

module.exports.getClientCompanies = getClientCompanies;

module.exports.reset = reset;

module.exports.getAdminId = getAdminId;
module.exports.isAdmin = isAdmin;
