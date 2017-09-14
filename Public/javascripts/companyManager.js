function loadCompanyTable() {
  ajaxLoad("companyManager", "companyTable", null);
}

function submitText() {
  var companyName = $("#companyInput").val();
  companyName = $.trim(companyName);
  if (companyName.length) {
    easyAjax("POST", "REST/newCompany", {companyName: companyName}, function(data) {
      loadCompanyTable();
    });
  }
}

function ajaxLoad(id, subUrl, data, callback) {
  easyAjax("GET", "REST/" + subUrl, data, function(data) {
    $("#"+ id).html(data);
    if(callback) {
      callback();
    }
  });
}

function easyAjax(type, url, data, callback, timeout) {
  $.ajax({
    type: type,
    url: url,
    timeout: timeout || 4000,
    data: data,
    success: function(data) {
      callback(data);
    },
    error: function(jqXHR, textStatus, err) {
      alert('text status '+ textStatus +', err ' + err)
    }
  });
}

$(document).ready(function () {
  loadCompanyTable();
});
