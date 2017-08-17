
//Multipromises, for performing promises concurrentlly.
//Receives an array of functions which take no arguments
//Returns an array of results

function test() {
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
  multiPromise(promiseObject).then(function(results) {
    console.log(results);
  });
}


function multiPromise(promiseObject) {
  return new Promise (function (fulfill, reject) {
    var keys = Object.keys(promiseObject);
    var nTasks = keys.length;
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
      results[keys[index]] = result;
      tasksComplete++;
      if (tasksComplete == nTasks) {
        fulfill(results);
      }
    }
  });
}

module.exports.test = test;
module.exports.mp = multiPromise;
