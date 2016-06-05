module.exports = class Utils {

  static transformStringToKey(text) {
    return text
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/ /g,"_")
      .toLowerCase();
  }

};
