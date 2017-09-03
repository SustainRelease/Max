var projectId;
var actionHistoryId;
var submission = false;



//----------------PROJECT SUMMARY---------------
function loadProjectSummary() {
  var url = "projectSummary?id=" + projectId;
  ajaxLoad("projectSummary", url, null);
}


//--------------FOLDER STUFF-----------------

function loadFolderContent(fileCode) {
  if (fileCode) {
    var url = "projectList?fCode=" + fileCode;
  } else {
    var url = "projectList";
  }
  ajaxLoad("fileShare", url);
}



//------------CONVO STUFF-----------------
function loadConversation() {
  ajaxLoad("conversation", "conversation");
}

function submitPost() {
  var postText = $("#postText").val();
  postText = $.trim(postText);
  if (postText.length) {
    easyAjax("POST", "REST/conversation", {postText: postText}, function(data) {
      loadConversation();
    });
  }
}


//------------HISTORY STUFF-----------------
function loadHistories() {
  var url = "REST/histories?id=" + projectId;
  easyAjax("GET", url, null, function(data) {
    $("#histories").html(data);
    getHistoryId();
    submission = true;
  });
}

function reloadHistories() {
  loadHistories();
  loadProjectSummary();
}

function formSetup() {
  formValidator.setup("REST/historyKusets");
  form = $("#historyForm");
  form.submit(function(event) {
    event.preventDefault(); //This form never gets submitted
    if (submission) {
      submission = false;
      console.log("Submission allowed");
      var nIssues = formValidator.checkAll(true);
      if (nIssues) {
        submission = true;
      } else {
        var nhVals = formValidator.extractAll();
        submitHistory(nhVals);
      }
    } else {
      console.log("Submission denied");
    }
  });
}

function submitHistory(historyData) {
  var url = "REST/history?id=" + projectId;
  easyAjax("POST", url, historyData, function(data) {
    reloadHistories();
  });
}

function showNewHistory() {
  $("#nhButton").addClass("hidden");
  $("#newHistory").removeClass("hidden");
  formSetup();
}

function action(aType, hId) {
  if (!hId) {
    hId = actionHistoryId;
  }
  var url = "REST/historyAction?hId=" + hId;
  easyAjax("POST", url, {"aType": aType}, function(data) {
    reloadHistories();
  });
}

function getHistoryId () {
  var url = "REST/actionHistoryId?id=" + projectId;
  easyAjax("GET", url, null, function(data) {
    actionHistoryId = data.actionHistoryId;
  });
}

function deleteHistory(historyId) {
  console.log("Deleting history: " + historyId);
  action("delete", historyId);
}


//-------------GENERAL

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

//----------------INIT----------------

easyAjax("GET", "REST/projectId", null, function (data) {
  console.log("Running callback");
  projectId = data.projectId;
  loadProjectSummary();
  loadHistories();
  loadConversation();
  loadFolderContent();
});
