//TO DO: Move processData into pre-save and pre-load hooks
//REFACTOR TO GET RID OF REPETITION FOR USER AND PROJECT ETC
//REFACTOR OH PLEASE REFACTOR

var Promise = require('promise');
var moment = require('moment');
var multiPromiseLib = require("../node/multiPromise.js");

var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var User = require("../models/user.js");
var Company = require("../models/company.js");
var Project = require("../models/project.js");
var Conversation = require("../models/conversation.js");
var History = require("../models/history.js");

var priorities = require("../data/priorities.js");
var multiPromise = require("../node/multiPromise.js");
var db = setUpMongo("navalis", false);
var myDriveHelper = require("../node/myDriveHelper.js");

var masterMail = "sirrobbiemuir@gmail.com"

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

function processData (mongoDoc, type, loud) {
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
    })
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

function conversationPermission (accessUserId, convoId) {
  return new Promise(function(fulfill,reject) {
    fulfill(true);  //We aren't too fussed about convos right now
  });
}

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


function projectPermission (accessUserId, projectId) {
  return new Promise(function(fulfill,reject) {
    var query = {"_id": projectId, "ofAccessUsers": accessUserId}; //Try finding a doc that has the projectId and contains the accessUser
    getOneDoc(Project, query, null, true).then(function(isFound) { //The fourth argument here is just to say that we are just wondering if it is there
      fulfill(isFound);
    }, function(reason) {
      console.error(reason);
      reject(reason);
    });
  });
}

function makeAccessUsers (data, clientId) {
  var ofAccessUsers = [clientId];
  if (data.responsibleUser) {
    ofAccessUsers.push(data.responsibleUser);
  }
  if (data.qcUser) {
    ofAccessUsers.push(data.qcUser);
  }
  return ofAccessUsers;
}

function createProject (projectData, userId) {
  //CREATE HISTORY DOC WHICH HAS ACTION FOR ADMIN APPROVAL
  return new Promise (function (fulfill, reject) {
    createDocSimple(Conversation, {}).then(function (convoResponse) {
      userQuery(userId).then(function(userData) {
        projectData.conversation = convoResponse.docId;
        projectData.clientUser = userId;
        projectData.client = userData.companyId;
        projectData.ofAccessUsers =  makeAccessUsers(projectData, userId);
        createDocSimple(Project, projectData).then(function (projectResponse) {
          var projectId = projectResponse.docId;
          projectData.id = projectId;
          var historyData = {text: "Project created by client", project: projectId};
          console.log("Let's try multiPromise");
          multiPromiseLib.mp({
            "responsePFI": myDriveHelper.createProjectFolder(projectId, projectData.title, projectData.description),
            "historyResponse": createHistory(historyData, projectData, "Admin")
          }).then(function(mpR) {
            var projectFolderId = mpR.responsePFI;
            console.log("Drive project folder created with id: " + projectFolderId);
            updateDoc(Project, projectId, {driveId: projectFolderId}).then(function (response) {
              console.log("DriveId added to project");
              fulfill({docId: projectId, driveFolderId: projectFolderId});
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


function companyPermission (accessUserId, companyId) {
  return new Promise(function(fulfill,reject) {
    fulfill(true);  //We aren't too fussed about companies
  });
}

function getClientCompanies() {
  return getTidyCompanies({"isClient": true});
}

function getTidyCompanies(query) {
  return new Promise (function (fulfill, reject) {
    getDocs(Company, query, {"_id": true, "name": true}).then(function(companies) {
      var tidyCompanies = [];
      for (var i = 0; i < companies.length; i++) {
        tidyCompanies[i] = {id: companies[i]._id, text: companies[i].name};
      }
      fulfill(tidyCompanies);
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
      var userData = {"isEng": !doc.isClient, "isAdmin": (doc.gmail == masterMail), "companyId": doc.company};
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
        getUserStuff(modelId).then(function(oDoc) {
          if (!oDoc.isClient) {
            fulfill(true); //Everyone can see engineers
            return;
          } else {
            fulfill(aDoc.company == oDoc.company);  //People from the same company can see each other
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

function findMasterId() {
  return new Promise (function (fulfill, reject) {
    getOneDoc(User, {"gmail": masterMail}, {"_id": true}).then(function (doc) {
      if (doc) {
        fulfill(doc.id);
      } else {
        console.error("Master not found");
        reject()
      }
    }, function(reason) {
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
function historyPermission (accessUserId, historyId) {
  return new Promise(function(fulfill,reject) {
    fulfill(true);  //We aren't too fussed about companies
  });
}

function createHistory(data, projectData, actionUserType) {
  console.log("Creating History with");
  console.log("data:");
  console.log(data);
  console.log("projectData:");
  console.log(projectData);
  console.log("actionUserType:");
  console.log(actionUserType);
  return new Promise(function(fulfill, reject) {
    findMasterId().then(function(adminId) {
      var actionType = "None";
      if (actionUserType) {
        actionType = "Internal";
        var actionUserId = null;
        switch(actionUserType) {
          case "Admin":
            actionUserId = adminId;
            break;
          case "Resp":
            actionUserId = projectData.responsibleUser;
            break;
          case "QC":
            actionUserId = projectData.qcUser;
            break;
          case "Client":
            actionUserId = projectData.clientUser;
            actionType = "Client";
            break;
          default:
            var err = new Error ("Invalid actionUserType");
            console.error(err);
            reject(err);
            return;
        }
        data.actionUser = actionUserId;
        data.actionType = actionType;
      }
      createDocSimple(History, data, true).then(function(response) {
        fulfill(response);
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

//-----------------------GENERAL DOCS----------------------

function docPermission (Model, modelId, accessUserId, isAdmin) {
  //Used for getting permission for individual objects
  if (isAdmin) {
    return new Promise (function (fulfill, reject) {
      fulfill(true);
    });
  } else {
    Model = processModel(Model);
    switch(Model.modelName) {
      case "User":
        return userPermission(accessUserId, modelId);
      case "Company":
        return companyPermission(accessUserId, modelId);
      case "Project":
        return projectPermission(accessUserId, modelId);
      case "Conversation":
        return conversationPermission(accessUserId, modelId);
      case "History":
        return historyPermission(accessUserId, modelId);
    }
  }
}


function doesDocExist(Model, id) {
  return getOneDoc(Model, {"_id": id}, null, true);
}

function getOneDoc(Model, query, projection, isDdeReq) {
  Model = processModel(Model);
  return new Promise (function (fulfill, reject) {
    if ('_id' in query) {
      if (!mongoose.Types.ObjectId.isValid(query._id)) {
        var error = new Error ("Invalid id: " + query._id + " (" + Model.modelName + ")");
        reject(error);
      }
    }
    Model.findOne(query, projection, function (err, doc) {
      if (err) return reject(err);
      if (isDdeReq) {
        if (doc) {
          fulfill(true);
        } else {
          fulfill(false)
        }
        return;
      }
      if (!doc) {
        findThatDoc(query._id, Model.modelName).then(function (isFound) {
          if (isFound) {
            err = new Error (query._id + " is not a " + Model.modelName);
          } else {
            err = new Error (query._id + " does not exist");
          }
          return reject(err);
        });
      } else {
        processData(doc, "load").then(function(data) {
          fulfill(data);
        });
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
        return reject(err);
      }
      processData(doc, "load").then(function(data) {
        fulfill(data);
      });
    });
  });
}

function updateDoc (Model, id, data) {
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
      return createDocSimple(Model, data);
    case "Company":
      return createDocSimple(Model, data);
    case "Project":
      return createProject(data, extra.userId);
    case "Conversation":
      return createDocSimple(Model, data);
    case "History":
      return createHistory(data, extra.projectData, extra.actionUserType);
    default:
      console.error("Model not found: " + Model.modelName);
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

function getDocData(Model, id, projection, reqFields, isDdeReq) {
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
    getOneDoc(Model, query, projection, isDdeReq).then(function(doc) {
      fulfill(doc);
    }, function(reason) {
      console.error(reason);
      reject(reason);
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
      default:
        console.error("Bad model type");
        return null;
    }
  }
  return Model;
}

function reset () {

  Company.collection.drop();
  Conversation.collection.drop();
  Project.collection.drop();

  var icerfishId;
  var astrowebId;
  var robbieId;
  var chrisId;

  function dropAll() {
    return new Promise (function(fulfill, reject) {
      console.log("Starting the drop");
      User.collection.drop(function (err, result) {
        console.log("Dropped users");
        Company.collection.drop(function (err, result) {
          console.log("Dropped companies");
          Project.collection.drop(function (err, result) {
            console.log("Dropped projects");
            Conversation.collection.drop(function (err, result) {
              console.log("Dropped conversations");
              History.collection.drop(function (err, result) {
                console.log("Dropped histories");
                fulfill();
              });
            });
          });
        });
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
        email: "sirrobbiemuir@gmail.com",
        gmail: "sirrobbiemuir@gmail.com",
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

  return new Promise (function (fulfill, reject) {
    dropAll().then(function () {
      makeCompanies().then(function () {
        makeUsers().then(function () {
          makeProjects().then(function () {
            fulfill();
          });
        });
      });
    });
  });
}

module.exports.makeSession = makeSession;
module.exports.setUpMongo = setUpMongo;

module.exports.docPermission = docPermission;
module.exports.getOneDoc = getOneDoc;
module.exports.getDocs = getDocs;
module.exports.updateDoc = updateDoc;
module.exports.createDoc = createDoc;
module.exports.getDocData = getDocData;
module.exports.doesDocExist = doesDocExist;

module.exports.addPost = addPost;

module.exports.getProjects = getProjects;

module.exports.authenticate = authenticate;
module.exports.getEngineers = getEngineers;
module.exports.getClientUsers = getClientUsers;
module.exports.userQuery = userQuery;

module.exports.getClientCompanies = getClientCompanies;

module.exports.reset = reset;
