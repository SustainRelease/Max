$(document).ready(function () {
  $("#company").parent().parent().addClass("hidden");
  var userTypeHandler = function (val, freePass) {
    var companyInput = $("#company");
    companyInput.prop('selectedIndex',0)
    if (val == "Client") {
      companyInput.parent().parent().removeClass("hidden");
      freePass.company = false;
    } else {
      companyInput.parent().parent().addClass("hidden");
      freePass.company = true;
    }
  }
  var specialHandlers = {
    userType: userTypeHandler
  }
  var freePassIds = ["company"];
  formValidator.setup("REST/userKusets", specialHandlers, freePassIds);
  form = $("#userForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      console.log("Preventing default");
      event.preventDefault();
    }
  });
});
