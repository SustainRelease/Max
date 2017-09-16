$(document).ready(function () {
  formValidator.setup("REST/reviewKusets");
  form = $("#reviewForm");
  form.submit(function(event) {
    var nIssues = formValidator.checkAll(true);
    if (nIssues) {
      event.preventDefault();
    }
  });
});
