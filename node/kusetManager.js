module.exports = function buildKusetManager (kusetData, tidyValsFuncIn) {
  var formVals = [];
  var tidyValsFunc = tidyValsFuncIn;
  var defaultKuset = kusetData.defaultKuset;
  var kusets = kusetData.kusets;
  var configs = kusetData.configs;
  if (!(defaultKuset && kusets && configs)) {
    var err = new Error ("Bad kuset data");
    throw err;
  }
  var configTag;          //The key naming the current configuration

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

  function addKuset (kui, isDup, selectData) {
    //Prepares a temporary kuset to be included in the form

    //Step 1: Shallow copy the master kuset array
    var tempKuset = shallowCopy(kusets[kui]);
    //Note that this is only a shallow copy.
    //Internal arrays and objects are pointers to the original kuset
    //so do not alter them

    //Step 2: Add special values
    if (configTag) {
      if (tempKuset[configTag + "Text"]) {
        tempKuset.text = tempKuset[configTag + "Text"];
      }
      if (tempKuset[configTag + "Req"]) {
        tempKuset.required = true;
      }
    }

    tempKuset.isInput = isInput(kui);
    if (isDup) {
      tempKuset.id = tempKuset.id + "Dup";
      tempKuset.text = "Confirm " + tempKuset.text;
      tempKuset.duplicate = true;
    }

    if (selectData) {
      tempKuset.selectData = selectData;
      tempKuset.select = true;  //Set a boolean tag just to make things easier for pug
    }

    //Step 3: Add to formVals
    formVals.push(tempKuset);
  }

  function isInput (kui) {
    //Checks whether a given kuset will be treated as an input for the given config
    if (configs[configTag].allInput) {
      return true;
    }
    if (!configs[configTag].allowInput) {
      return false;
    }
    if (kusets[kui].permanent && kusets[kui].value) {
      return false;
    }
    return true;
  }

  function configQueryVal (kui) {
    //Checks whether a given kuset should be included in the form for the given config
    var tag;
    var excludeIds;
    if (configs[configTag].tagEx) {
      for (let i = 0; i < configs[configTag].tagEx.length; i++) {
        tag = configs[configTag].tagEx[i];
        if (kusets[kui][tag]) {
          return false;
        }
      }
    }
    if (tag = configs[configTag].tagReq) {
      if(!kusets[kui][tag]) {
        return false;
      }
    }
    if (excludeIds = configs[configTag].excludeIds) {
      var id = kusets[kui].id;
      for (var i = 0; i < excludeIds.length; i++) {
        if (id == excludeIds[i]) {
          return false;
        }
      }
    }
    return true;
  }

  function setupFormVals(configTagIn, selectData) {
    //selectData is an array of id and text fields for the dropdown.
    if (!configs[configTagIn]) {
      console.error("Config '" + configTag  +"' not found");
      return;
    }
    configTag = configTagIn;
    formVals = [];
    dupOn = configs[configTag].allowDuplicates;
    var selectTag;
    for (let kui = 0; kui < kusets.length; kui++) {
      if (configQueryVal(kui)) {  //If this kuset is to be included in the formVals
        if (selectTag = kusets[kui].selectTag) {  //Check if it is a select element (with dropdown)
          if (!selectData) {
            console.error("No selectData supplied");
            return;
          }
          if (selectData[selectTag]) {
            //Populate the kui with the dropdown options
            addKuset(kui, false, selectData[selectTag]);
          } else {
            console.error("SelectTag '" + selectTag + "' not found.");
            return;
          }
        } else {  //If it isn't select, make call to addKuset for either normal case or duplicate case
          addKuset(kui, false);
          if (dupOn && kusets[kui].confirm) {
            addKuset(kui, true);
          }
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

  function buildIdLookup (arr) {
    var idLookup = {};
    for (var i = 0; i < arr.length; i++) {
      idLookup[arr[i].id] = i;
    }
    return idLookup;
  }

  function processVals (res, doSave) {
    //Saves the values to the kusets (optional) and returns a nice tidy Object
    //of key value pairs of the resulting data
    var tidyVals = {};
    var keys = Object.keys(res);
    var fvLookup = buildIdLookup(formVals);
    var kuLookup = buildIdLookup(kusets);
    for (var i = 0; i < keys.length; i++) {
      let id = keys[i];
      let val = res[id];
      let fvi = fvLookup[id];
      if (fvi == null) {
        console.log(fvLookup);
        console.error("Form value id not found: " + id);
      }
      if (!formVals[fvi].duplicate) {
        if (formVals[fvi].select) {
          if (val != "null") {
            tidyVals[id] = val;
          }
        } else {
          if (formVals[fvi].multi) {
            tidyVals[id] = formVals[fvi].ans[val];
          } else {
            tidyVals[id] = val;
          }
        }
      }
    }
    return tidyVals;
  }

  function updateFormVals (exData) {
    for (var i = 0; i < formVals.length; i++) {
      let key = formVals[i].id;
      if (exData[key] != null) {
        formVals[i].value = exData[key];
      }
    }
  }

  var my = {};

  my.getFormVals = function (tag, exData, selectData) {
    //Tag is the specifier for the ofrm
    //exData is the existing data to populate the form
    //SelectData is the custom data for drop-down elements
    if (tag) {
      if (selectData) {
        setupFormVals(tag, selectData);
      } else {
        setupFormVals(tag);
      }
    }
    if (exData) {
      updateFormVals(exData);
    }
    return formVals;
  }

  my.saveVals = function (res) {
    //Saves the values to the kusets and returns a nice tidy Object
    console.log("Deprecation warning: saveVals is redundant. Use tidyVals instead")
    return processVals(res, true);
  }

  my.tidyVals = function (res) {
    //Validates data matches form and returns a nice tidy object
    return processVals(res, false);
  }

  return my;
};
