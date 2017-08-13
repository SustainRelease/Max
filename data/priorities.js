var pArray = [
  "Low priority",
  "Medium priority",
  "High priority",
  "Very urgent"
]

var pSelectData = [];
for (var i = 0; i < pArray.length; i++) {
  pSelectData[i] = {id: i, text: pArray[i]};
}

module.exports.pArray = pArray;
module.exports.pSelectData = pSelectData;
