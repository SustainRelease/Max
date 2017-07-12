$(document).ready(function () {
  formValidator.setup();
  form = $("#profileForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
