var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var Promise = require('promise');
var moment = require('moment');
var Company = require("../models/company.js");

var UserSchema = new mongoose.Schema({
  gmail: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  isClient: {
    type: Boolean,
    required: true
  },
  //Maybe could get rid of this?
  userType: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  skype: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    reqruied: false,
    trim: true
  },
  postcode: {
    type: String,
    reqruied: false,
    trim: true
  },
  address: {
    type: String,
    reqruied: false,
    trim: true
  },
  city: {
    type: String,
    reqruied: false,
    trim: true
  },
  country: {
    type: String,
    required: false,
    trim: true
  },
  dob: {
    type: Date,
    required: false
  },
  birthCountry: {
    type: String,
    required: false,
    trim: true
  },
  joinedDate: {
    type: Date,
    required: true,
    default: Date.now()
  },
  img: {
    data: Buffer,
    contentType: String,
    required: false
  },
  engLev: {
    type: String,
    required: true,
    default: "None" //None Basic Medium Advanced Native
  },
  spaLev: {
    type: String,
    required: true,
    default: "None"
  },
  porLev: {
    type: String,
    required: true,
    default: "None"
  },
  jobDesc: {
    type: String,
    required: false
  },
  stuDesc: {
    type: String,
    required: false
  }
});

// authenticate input against database documents
UserSchema.statics.authenticate = function(gmail, password) {
  return new Promise (function (fulfill, reject) {
    User.findOne({gmail: gmail}, null, function (error, user) {
      if (error) {
        console.error(error);
        fulfill(false);
        reject(error);
      } else {
        if (!user) {
          console.log("User not found");
          fulfill(false);
        } else {
          bcrypt.compare(password, user.password , function(error, result) {
            if (error) {
              console.error(error);
              fulfill(false);
            } else {
              if (result) {
                fulfill(user);
              } else {
                fulfill(false);
              }
            }
          });
        }
      }
    });
  });
};

//Pre validate hook to manage userType, isEngineer and automatic population of company field
UserSchema.pre('validate', function(next) {
  var user = this;
  if (!user.isModified('userType')) return next();
  if (user.userType == "Engineer") {
    user.isClient = false;
    Company.findOne({"name": "Navalis"}, {"_id": true}, function (error, companyDoc) {
      if (error) next(new Error ("Couldn't find Navalis"));
      if (!companyDoc) next(new Error ("Couldn't find Navalis"));
      user.company = companyDoc._id;
      next();
    });
  } else {
    if (user.userType == "Client") {
      user.isClient = true;
      next();
    } else {
      next(new Error ("Invalid userType"));
    }
  }
});

// Check for existing doc before saving and hash password too
UserSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  User.findOne({"gmail": user.gmail}, {"_id": true}, function (error, gUser) {
    if (error) next(error);
    if (gUser) next(new Error ("User with gmail account '" + user.gmail + "' already exists"));
    User.findOne({"firstName": user.firstName, "lastName": user.lastName}, {"_id": true}, function (error, nUser) {
      if (error) next(error);
      if (nUser) next(new Error ("User with name '" + user.firstName + " " + user.lastName + "' already exists"));
      bcrypt.hash(user.password, 10, function(err, hash) {
        if (err) {
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  });
});

var User = mongoose.model('User', UserSchema);
User.defaultProject = {"img": false};
module.exports = User;
