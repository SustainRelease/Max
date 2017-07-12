module.exports = function buildKusetManager (defaultKuset, kusets) {
  var formVals = [];
  var defaultKuset = defaultKuset;
  var kusets = kusets;
  var userData = {};

  validateKusets();

  //Add defaults to kusets and validate input. Add issue key
  function validateKusets() {
    for (var i = 0; i < kusets.length; i++) {
      for (var key in defaultKuset) {
        if (!(key in kusets[i])) {
          kusets[i][key] = defaultKuset[key];
        }
        if (!("id" in kusets[i])) {
          console.error("Missing kuset ID");
        }
        if (!("text" in kusets[i])) {
          console.error("Missing kuset text");
        }
      }
    }
  }

  function shallowCopy (k1) {
    let keys = Object.keys(k1);
    let k2 = {};
    for (let i = 0; i < keys.length; i++) {
      k2[keys[i]] = k1[keys[i]];
    }
    return k2;
  }

  function buildIdLookup (arr) {
    var idLookup = {};
    for (var i = 0; i < arr.length; i++) {
      idLookup[arr[i].id] = i;
    }
    return idLookup;
  }


  function setupFormVals(tag) {
    formVals = [];
    for (let i = 0; i < kusets.length; i++) {
      if (!tag || kusets[i][tag]) {
        formVals.push(kusets[i]);
        if (kusets[i].confirm) {
          let tempKuset = shallowCopy(kusets[i]);
          tempKuset.id = tempKuset.id + "Dup";
          tempKuset.text = "Confirm " + tempKuset.text;
          tempKuset.duplicate = true;
          formVals.push(tempKuset);
        }
      }
    }
    clearIssues();
  }

  function clearIssues () {
    issues = 0;
    for (var i = 0; i < formVals.length; i++) {
      formVals[i].issue = {active: false};
    }
  }

  var my = {};

  my.getFormVals = function (tag) {
    if (tag) {
      if (tag == "Current") {
        return formVals;
      } else {
        setupFormVals(tag);
      }
    } else {
      setupFormVals(null);
    }
    return formVals;
  }

  my.saveVals = function (res) {
    console.log(res);

    var keys = Object.keys(res);
    var fvLookup = buildIdLookup(formVals);
    var kuLookup = buildIdLookup(kusets);
    for (var i = 0; i < keys.length; i++) {
      let id = keys[i];
      let val = res[id];
      let fvi = fvLookup[id];
      if (!fvi) {
        console.error("Form value id not found: " + id);
      }
      if (!formVals[fvi].duplicate) {
        kui = kuLookup[id];
        if (formVals[fvi].multi) {
          kusets[kui].value = formVals[fvi].ans[val];
        } else {
          kusets[kui].value = val;
        }
      }
    }
  }

  my.getUserData = function () {
    return userData;
  }

  return my;
};
