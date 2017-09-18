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
  ajaxLoad("fileShare", url, null, null, function (jqXHR, textStatus, err) {
    console.log("Drive project folder not found");
  });
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
function loadHistories(closed) {
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

function closeProject() {
  var url = "REST/closeProject?id=" + projectId;
  easyAjax("POST", url, null, function(data) {
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

//-------------GENERAL--------------------

function ajaxLoad(id, subUrl, data, sCallback, eCallback) {
  easyAjax("GET", "REST/" + subUrl, data, function(data) {
    $("#"+ id).html(data);
    if(sCallback) {
      sCallback();
    }
  }, function(textStatus, err) {
    if (eCallback) {
      eCallback(textStatus, err);
    } else {
      $("#"+ id).html("<i class='errText'>Unable to load</i>");
    }
  });
}

function easyAjax(type, url, data, sCallback, eCallback, timeout)  {
  $.ajax({
    type: type,
    url: url,
    timeout: timeout || 4000,
    data: data,
    success: function(data) {
      sCallback(data);
    },
    error: function(jqXHR, textStatus, err) {
      if (eCallback) {
        eCallback(textStatus, err);
      }
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
