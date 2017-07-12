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


loadFolderContent();
