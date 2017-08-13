$(document).ready(function () {
  formValidator.setup("/REST/userKusets");
  form = $("#registerForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
