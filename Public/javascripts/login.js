$(document).ready(function () {
  formValidator.setup("REST/userKusets");
  form = $("#loginForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
