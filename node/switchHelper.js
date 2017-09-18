module.exports = function switchHelper(input, matchObject, eString) {
  var keys = Object.keys(matchObject);
  for (let i = 0; i < keys.length; i++) {
    if (input == keys[i]) {
      return {err: false, answer: matchObject[keys[i]]};
    }
  }

  var err = new Error("Invalid " + eString + ": " + input);
  console.error(err);
  return {err: err};
}
