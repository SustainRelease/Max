
var types  = [
  {
    "id": "pOngoing",
    "DOM": document.getElementById("pOngoing"),
    "name": "Ongoing projects"
  },
  {
    "id": "pScheduled",
    "DOM": document.getElementById("pScheduled"),
    "name": "Scheduled projects"
  },
  {
    "id": "pFinished",
    "DOM": document.getElementById("pFinished"),
    "name": "Finished projects"
  }
];
var title = document.getElementById("tableTitle");

function setTable (currentType) {
  for (var i = 0; i < types.length; i++) {
    if (types[i].id == currentType) {
      types[i].DOM.className = "linkBox selected";
      title.textContent = types[i].name;
    } else {
      types[i].DOM.className = "linkBox";
    }
  }
}
