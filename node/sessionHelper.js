var count = 0;

module.exports = function makeSesssionHelper(session) {
  if (!session.index) {
    session.index = count;
    count++;
    console.log("Creating session: " + session.index);
    session.codeTranslator = [];
  } else {
    console.log("Loading existing session: " + session.index);
  }

  var my = {};

  my.display = function display() {
    var sesCondense = {};
    var keys = Object.keys(session);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (key != "cookie") {
        sesCondense[key] = session[key];
      }
    }
    console.log(sesCondense);
  }

  my.uncode = function uncode(fCode) {
    if (fCode) {
      return session.codeTranslator[fCode];
    } else {
      return session.projectFolderId;
    }
  }

  my.processDriveFiles = function processDriveFiles(files) {
    var count = 0;
    session.codeTranslator = [];
    for (let i = 0; i < files.length; i++) {
      files[i].code = count;
      session.codeTranslator[count] = files[i].id;
      count++;
      if (i == 0) { //The first item is always the containing folder
        if (files[i].id == session.projectFolderId) {
          files[i].isProject = true;
        } else { // If this isn't the project folder, add it's parent folder's id
          files[i].parentCode = count;
          session.codeTranslator[count] = files[i].parents[0]
          count++;
        }
      }
    }
  }

  return my;
}
