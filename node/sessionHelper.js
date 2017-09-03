module.exports = function makeSesssionHelper(session) {
  if (!session.init) {
    console.log("New session");
    session.codeTranslator = [];
    session.init = true;
  }

  var my = {};

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
