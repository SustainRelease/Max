
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Promise = require('promise');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + "navalis.json";

var auth;

module.exports.getNewAuth = function getNewAuth(secretPath) {
  if (secretPath.substr(secretPath.length - 5) != ".json") {
    console.error("SecretPath must point to .json");
    return;
  }
  return new Promise(function (fulfill, reject) {
    //Should we need to read this old json file before creating a new auth?
    readJSON(secretPath).then(function(json) {
      oauth2Client = makeAuthClient(json);
      getNewToken(oauth2Client).then(function(res) {
        auth = res;
        fulfill(auth);
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

module.exports.getAuth = function getAuth(secretPath) {
  if (secretPath.substr(secretPath.length - 5) != ".json") {
    console.error("SecretPath must point to .json");
    return;
  }
  return new Promise(function (fulfill, reject) {
    readJSON(secretPath).then(function(json) {
      authorize(json).then(function(auth) {
        fulfill(auth);
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

function makeAuthClient(credentials) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var newAuth = new googleAuth();
  var oauth2Client = new newAuth.OAuth2(clientId, clientSecret, redirectUrl);
  return oauth2Client;
}

function authorize(credentials) {
  return new Promise(function (fulfill, reject) {
    oauth2Client = makeAuthClient(credentials);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        getNewToken(oauth2Client).then(function(res) {
          auth = res;
          fulfill(auth);
        }, function(reason) {
          console.error(reason);
          reject(reason);
        });
      } else {
        console.log("Current token found at " + TOKEN_PATH);
        oauth2Client.credentials = JSON.parse(token);
        auth = oauth2Client;
        fulfill(auth);
      }
    });
  });
}

function getNewToken(oauth2Client) {
  return new Promise(function (fulfill, reject) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close();
      oauth2Client.getToken(code, function(err, token) {
        if (err) {
          reject(err);
        }
        oauth2Client.credentials = token;
        storeToken(token).then(fulfill(oauth2Client));
      });
    });
  });
}

function storeToken(token) {  //MAYBE THIS DOESN'T WORK
  return new Promise(function (fulfill, reject) {
    try {
      fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
      if (err.code != 'EEXIST') {
        reject(err);
      }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
    fulfill();
  });
}
