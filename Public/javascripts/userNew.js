$(document).ready(function () {
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
  formValidator.setup("REST/userKusets", specialHandlers);
  form = $("#userForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      console.log("Preventing default");
      event.preventDefault();
    }
  });
});
