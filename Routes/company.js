module.exports = function () {
  var express = require('express');
  var router = express.Router();
  var mid = require('../middleware/middle.js');

  router.get('/companyManager', mid.checkAdmin, function(req, res, next) {
    res.render('companyManager');
  });

  router.get('/REST/companyTable', mid.checkAdmin, mid.getCompanies, function (req, res, next) {
    res.render('rest/companyTable');
  });

  router.post('/REST/newCompany', function (req, res, next) {
    console.log("Posting company");
    var companyName = req.body.companyName;
    var docData = {name: companyName, isClient: true};
    res.locals.mongoHelper.createDoc("Company", docData).then(function (doc) {
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
