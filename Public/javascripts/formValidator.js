buildFormValidator = function () {
  var formVals;
  var inputs = [];
  var form;

  var my = {};

  my.setup = function () {
    $.getJSON( "REST/kusets", function(data) {
      formVals = data;
      for (let i = 0; i < formVals.length; i++) {
        inputs[i] = $("#" + formVals[i].id);
        if (formVals[i].duplicate) {
          let handler = function () {
            checkIssues(i-1);
            checkIssues(i);
          }
          setHandler(i, handler);
          setHandler(i-1, handler);
        } else {
          setHandler(i, function ()  {
            checkIssues(i);
          });
        }
      }
    });
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

  function setHandler(i, handler) {
    inputs[i].focusout(handler);
    inputs[i].change(handler);
  }


  function checkIssues (i) {
    if (formVals[i].multi) {
      return 0;
    }
    var val = inputs[i].val();
    if (formVals[i].TAC) {    //SPECIAL TERMS AND CONDITIONS KUSET
      if (!inputs[i].is(':checked')) {
        setIssue(i, {type: "tacReq", text: "You must agree"})
        return 1;
      }
      clearIssues(i);
      return 0;
    }
    if (formVals[i].duplicate) {
      if (val != inputs[i-1].val()) {
        setIssue(i, {type: "conirmError", text: formVals[i-1].text + "s must match"});
        return 1;
      }
    }
    if (formVals[i].required) {
      if (!val) {
        setIssue(i, {type: "fieldRequired", text: "Required field"});
        return 1;
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

formValidator = buildFormValidator();
