
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

function multiPromiseSer (promiseObject, loud, passFail) {
  //IN PASS FAIL MODE, THE ANSWER IS TRUE FOR PASS AND FALSE FOR FAIL (THERE IS NO ERROR)
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
        taskComplete(passFail || result, i);
      }, function (reason) {
        console.error(reason);
        if (passFail) {
          taskComplete(false, i);
        } else {
          reject(reason);
        }
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


function multiPromisePar (promiseObject, loud, passFail) {
  //IN PASS FAIL MODE, THE ANSWER IS TRUE FOR PASS AND FALSE FOR FAIL (THERE IS NO ERROR)
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
        taskComplete(passFail || result, i);
      }, function(reason) {
        console.error(reason);
        if (passFail) {
          taskComplete(false, i);
        } else {
          reject(reason);
        }
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


function multiPromiseOld(promiseObject, loud, serial, passFail) {
  console.log("THIS VERSION OF MULTI-PROMISE IS DEPRECATED");
  if (serial) {
    return multiPromiseSer(promiseObject, loud, passFail);
  } else {
    return multiPromisePar(promiseObject, loud, passFail);
  }
}

function multiPromise(promiseObject, options) {
  if (options) {
    var loud = options.loud || false;
    var passFail = options.passFail || false;
    if (options.serial) {
      return multiPromiseSer(promiseObject, loud, passFail);
    } else {
      return multiPromisePar(promiseObject, loud, passFail);
    }
  } else {
    return multiPromisePar(promiseObject, false, false);
  }
}

module.exports.test = test;
module.exports.mp = multiPromiseOld;
module.exports.mp2 = multiPromise;
