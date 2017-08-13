$(document).ready(function () {
  formValidator.setup("REST/projectKusets");
  form = $("#newProjectForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
