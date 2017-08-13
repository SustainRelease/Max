
//Multipromises, for performing promises concurrentlly.
//Receives an array of functions which take no arguments
//Returns an array of results

function test() {
  function myPromise (val) {
    return new Promise (function (fulfill, reject) {
      fulfill(val);
    });
  }
  var promises = [
    () => myPromise(3),
    () => myPromise(2),
    () => myPromise(4)
  ];
  var keys = ["3", "2", "4"];
  multiPromise(promises, keys).then(function(results) {
    console.log(results);
  });
}


function multiPromise(promises, keys) {
  return new Promise (function (fulfill, reject) {
    var nTasks = promises.length;
    var tasksComplete = 0;
    var results = {};
    for (let i = 0; i < nTasks; i++) {
      promises[i]().then(function (result) {
        taskComplete(result, i);
      }, function(reason) {
        console.error(reason);
        reject(reason);
      });
    }
    function taskComplete(result, index) {
      console.log("Task " + index + " complete with result " + result);
      results[keys[index]] = result;
      tasksComplete++;
      if (tasksComplete == nTasks) {
        fulfill(results);
      }
    }
  });
}

module.exports = multiPromise;
