buildFormValidator = function () {
  var formVals;
  var inputs = [];
  var form;
  var freePass = {};
  var my = {};

  function setFreePass(freePassIds) {
    for (let i = 0; i < freePassIds.length; i++) {
      freePass[freePassIds[i]] = true;
    }
    console.log("Free pass set: ");
    console.log(freePass);
  }

  my.setup = function (kusetPath, specialHandlers, freePassIds) {
    $.getJSON(kusetPath, function(data) {
      formVals = data;
      if (!formVals) {
        console.error("Form values not found");
      }
      for (let i = 0; i < formVals.length; i++) {
        freePass[formVals[i].id] = false;
        let specHandler = getSpecHandler(specialHandlers, formVals[i].id);
        if (formVals[i].multi) {
          freePass[formVals[i].id] = true;
          var nMultis = formVals[i].ans.length;
          inputs[i] = [];
          let handler = function () {
            var val = formVals[i].ans[this.value];
            if (specHandler) specHandler(val, freePass);
          }
          $('input:radio[name=' + formVals[i].id + ']').change(handler);
        } else {
          inputs[i] = $("#" + formVals[i].id);
          if (formVals[i].duplicate) {
            let handler = function () {
              checkIssues(i-1);
              checkIssues(i);
              if (specHandler) specHandler(inputs[i].val(), freePass);
            }
            setHandler(i, handler);
            setHandler(i-1, handler);
          } else {
            let handler = function () {
              checkIssues(i);
              if (specHandler) specHandler(inputs[i].val(), freePass);
            }
            setHandler(i, handler);
          }
        }
        //Add existing values of select elements
        if (formVals[i].select) {
          console.log("Found select field: " + formVals[i].id);
          if (formVals[i].value) {
            console.log("Value found: " + formVals[i].value);
            var selector = ("#" + formVals[i].id + ' option[value="' + formVals[i].value + '"]');
            $(selector).prop('selected', true);
          } else {
            console.log("No value found");
          }
        }

        if (freePassIds) {  //Add free passes
          setFreePass(freePassIds);
        }
      }
    });
  }

  my.extractAll = function() {
    var exVals = {};
    for (let i = 0; i < formVals.length; i++) {
      if (formVals[i].multi) {
        var index = $('input[name=' + formVals[i].id + ']:checked').val();
        var val = formVals[i].ans[index];
      } else {
        var val = inputs[i].val();
      }
      exVals[formVals[i].id] = val;
    }
    return exVals;
  }

  my.checkAll = function(doReport) {
    var nIssues = 0;
    for (let i = 0; i < formVals.length; i++) {
      if (checkIssues(i)) {
        nIssues++;
        if (doReport) {
          console.log("Issue found");
          console.log(formVals[i])
        }
      }
    }
    return nIssues;
  }

  function getSpecHandler (specialHandlers, id) {
    if (specialHandlers) {
      if (specialHandlers[id]) {
        return specialHandlers[id];
      }
    }
    return null;
  }

  function setHandler(i, handler) {
    inputs[i].focusout(handler);
    inputs[i].change(handler);
  }

  function checkIssues (i) {
    if (freePass[formVals[i].id]) {
      return 0;
    }
    var val = inputs[i].val();
    if (formVals[i].TAC) {    //SPECIAL TERMS AND CONDITIONS KUSET
      if (!inputs[i].is(':checked')) {
        setIssue(i, {type: "tacReq", text: "You must agree"})
        return 1;
      } else {
        return 0;
      }
    }
    if (formVals[i].date) {
      if (val && !isValidDate(val)) {
        setIssue(i, {type: "dateError", text: "Invalid date"});
        return 1;
      }
    }
    if (formVals[i].duplicate) {
      if (val != inputs[i-1].val()) {
        setIssue(i, {type: "conirmError", text: formVals[i-1].text + "s must match"});
        return 1;
      }
    }
    if (formVals[i].required) {
      if (formVals[i].select) {
        if (val == "null") {
          setIssue(i, {type: "fieldRequired", text: "Required field"});
          return 1;
        }
      } else {
        if (!val) {
          setIssue(i, {type: "fieldRequired", text: "Required field"});
          return 1;
        }
      }
    }
    if (formVals[i].email) {
      var atpos = val.indexOf("@");
      var dotpos = val.lastIndexOf(".");
      if (atpos<1 || dotpos<atpos+2 || dotpos+2>=val.length) {
        setIssue(i, {type: "badEmail", text: "Invalid email"});
        return 1;
      }
    }
    if (formVals[i].gmail) {
      if (val.substr(val.length - 10) != "@gmail.com") {
        setIssue(i, {type: "badGmail", text: "Invalid gmail"});
        return 1;
      };
    }
    clearIssues(i);
    return 0;
  }

  function setIssue (i, issue) {
    formVals[i].issue = issue;
    inputs[i].parent().addClass("issue");
    inputs[i].parent().siblings(".issueText").text(issue.text);
  }

  function clearIssues (i) {
    inputs[i].parent().removeClass("issue");
    inputs[i].parent().siblings(".issueText").text("");
  }

  return my;
}

function isValidDate(dateString)
{
    // First check for the pattern
    if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))
        return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if(year < 1000 || year > 3000 || month == 0 || month > 12)
        return false;

    var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    // Adjust for leap years
    if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
};

formValidator = buildFormValidator();
