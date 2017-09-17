var goodTable = [
  "Poor",
  "Average",
  "Good",
  "Very good",
  "Excellent"
];

var recommendTable = [
  "Definitely not",
  "No",
  "Maybe",
  "Yes",
  "Definitely"
]

var types = [
  "qualityScore",
  "coopScore",
  "recommendScore"
];

function getSelectData(base) {
  var table;
  var selectData = {
    goodScore: [],
    recommendScore: []
  };
  for (let i = 0; i < goodTable.length; i++) {
    selectData.goodScore[i] = {
      id: i,
      text: (i+1) + "-" + goodTable[i]
    }
  }
  for (let i = 0; i < recommendTable.length; i++) {
    selectData.recommendScore[i] = {
      id: i,
      text: (i+1) + "-" + recommendTable[i]
    }
  }
  return selectData;
}

function roundScore (score) {
  return Math.round(score*10)/10;
}

function collateReviews(reviews) {
  console.log("Collating reviews");
  var averageScores = {};
  var nTypes = types.length;
  var nReviews = reviews.length;
  var overallScore = 0;
  for (let i = 0; i < nTypes; i++) {
    let scoreName = types[i];
    averageScores[scoreName] = 0;
    for (let j = 0; j < nReviews; j++) {
      let tempScore = reviews[j][scoreName];
      averageScores[scoreName] += tempScore;
      overallScore += tempScore;
    }
    averageScores[scoreName] = roundScore(averageScores[scoreName]/nReviews);
  }
  averageScores.overall = roundScore(overallScore/(nTypes*nReviews));
  return averageScores;
}


module.exports.collateReviews = collateReviews;
module.exports.getSelectData = getSelectData;
