$(document).ready(function () {
  formValidator.setup("REST/projectKusets");
  form = $("#projectForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
