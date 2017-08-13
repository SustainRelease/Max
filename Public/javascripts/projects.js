
var elements  = {
  "ongoing": {
    "BUT": $("#bOngoing"),
    "TAB": $("#tOngoing"),
    "Text": "Ongoing"
  },
  "scheduled": {
    "BUT": $("#bScheduled"),
    "TAB": $("#tScheduled"),
    "Text": "Scheduled"
  },
  "finished": {
    "BUT": $("#bFinished"),
    "TAB": $("#tFinished"),
    "Text": "Finished"
  }
};

var keys = Object.keys(elements);
var tableHeading = $("#tableHeading");

function setTable (currentType) {
  for (var i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (currentType == key) {
      tableHeading.text(elements[key].Text);
      elements[key].BUT.addClass("selected");
      elements[key].TAB.removeClass("hidden");
    } else {
      elements[key].BUT.removeClass("selected");
      elements[key].TAB.addClass("hidden");
    }
  }
}

setTable("scheduled");
