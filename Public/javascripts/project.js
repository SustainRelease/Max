function loadFolderContent(folderId) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
     document.getElementById("fileShare").innerHTML = this.responseText;
    }
  };
  if (folderId) {
    console.log("There is a folderid");
    xhttp.open("GET", "REST/projectList?fid=" + folderId, true);
  } else {
    xhttp.open("GET", "REST/projectList", true);
  }
  xhttp.send();
}

function loadConversation() {
  console.log("Loading conversation");
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
     document.getElementById("conversation").innerHTML = this.responseText;
    }
  };
  xhttp.open("GET", "REST/conversation", true);
  xhttp.send();
}

function submitPost() {
  var postText = $("#postText").val();
  postText = $.trim(postText);
  if (postText.length) {
    $.ajax({
      type: "POST",
      url: "REST/conversation",
      timeout: 2000,
      data: {postText: postText},
      success: function(data) {
        loadConversation();
      },
      error: function(jqXHR, textStatus, err) {
        alert('text status '+ textStatus +', err ' + err)
      }
    });
  }
}

loadConversation();
loadFolderContent();
