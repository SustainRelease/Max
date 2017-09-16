
//Multipromises, for performing promises concurrentlly.
//Receives an array of functions which take no arguments
//Returns an array of results

function test(serial) {
  function myPromise (val) {
    return new Promise (function (fulfill, reject) {
      fulfill(val);
    });
  }
  var promiseObject = {
    "3": myPromise(3),
    "2": myPromise(2),
    "4": myPromise(4)
  };
  multiPromise(promiseObject, true, serial).then(function(results) {
    console.log(results);
  });
}

function multiPromiseSer (promiseObject, loud) {
  if (loud) console.log("Running a multi-promise in serial mode");
  return new Promise (function (fulfill, reject) {
    var keys = Object.keys(promiseObject);
    if (loud) console.log("Keys:");
    if (loud) console.log(keys);
    var nTasks = keys.length;
    if (loud) console.log("nTasks: " + nTasks);
    var results = {};
    var i = 0;

    function runOne () {
      promiseObject[keys[i]].then(function (result) {
        taskComplete(result, i);
      }, function (reason) {
        console.error(reason);
        reject(reason);
      });
    }

    function taskComplete(result, index) {
      if (loud) console.log("Task " + index + " complete");
      results[keys[index]] = result;
      i++;
      if (loud) console.log(i + " tasks complete");
      if (i == nTasks) {
        fulfill(results);
      } else {
        runOne();
      }
    }

    runOne();
  });
}


function multiPromisePar (promiseObject, loud) {
  if (loud) console.log("Running a multi-promise in parralel mode");
  return new Promise (function (fulfill, reject) {
    var keys = Object.keys(promiseObject);
    if (loud) console.log("Keys:");
    if (loud) console.log(keys);
    var nTasks = keys.length;
    if (loud) console.log("nTasks: " + nTasks);
    var tasksComplete = 0;
    var results = {};
    for (let i = 0; i < nTasks; i++) {
      promiseObject[keys[i]].then(function (result) {
        taskComplete(result, i);
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }
    function taskComplete(result, index) {
      if (loud) console.log("Task " + index + " complete");
      results[keys[index]] = result;
      tasksComplete++;
      if (loud) console.log(tasksComplete + " tasks complete");
      if (tasksComplete == nTasks) {
        fulfill(results);
      }
    }
  });
}


function multiPromise(promiseObject, loud, serial) {
  if (serial) {
    return multiPromiseSer(promiseObject, loud);
  } else {
    return multiPromisePar(promiseObject, loud);
  }
}

module.exports.test = test;
module.exports.mp = multiPromise;
