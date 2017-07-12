var formVals;
var inputs = [];
var form;


$(document).ready(function () {
  $.getJSON( "REST/kusets", function(data) {
    formVals = data;
    for (let i = 0; i < formVals.length; i++) {
      inputs[i] = $("#" + formVals[i].id);
      inputs[i].focusout(function() {
        checkIssues(i);
      });
      inputs[i].change(function() {
        checkIssues(i);
      });
    }
  });
  form = $("#registerForm");
  form.submit(function(event) {
    var nIssues = 0;
    for (let i = 0; i < formVals.length; i++) {
      if (checkIssues(i)) {
        nIssues++;
        console.log("Issue found");
        console.log(formVals[i])
      }
    }
    if (nIssues) {
      event.preventDefault();
    }
  });
});

function checkIssues (i) {
  if (formVals[i].multi) {
    return 0;
  }
  if (formVals[i].TAC) {    //SPECIAL TERMS AND CONDITIONS KUSET
    if (!inputs[i].is(':checked')) {
      setIssue(i, {type: "tacReq", text: "You must agree"})
      return 1;
    }
    clearIssues(i);
    return 0;
  }
  if (formVals[i].duplicate) {
    if (inputs[i].val() != inputs[i-1].val()) {
      setIssue(i, {type: "conirmError", text: formVals[i-1].text + "s must match"});
      return 1;
    }
  }
  if (formVals[i].required) {
    if (!inputs[i].val()) {
      setIssue(i, {type: "fieldRequired", text: "Required field"});
      return 1;
    }
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
