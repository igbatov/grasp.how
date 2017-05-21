/**
 * Class for translation of labels into different languages
 * Stores current language
 * @param translations - {ru:{engPhrase1:ruPhrase1, ...}, fr:{}, ...}
 * @param currentLang
 * @constructor
 */
GRASP.I18n = function (translations, currentLang) {
  this._translations = translations;
  this._possibleLangs = ['en','ru'];
  this._currentLang = typeof currentLang === 'undefined' ? 'en' : currentLang;
};

GRASP.I18n.prototype = {
  setLang: function(lang){
    if (this._possibleLangs.indexOf(lang) === -1) {
      throw Error('Language '+lang+' is not implemented yet!');
    }
    this._currentLang = lang;
  },

  __: function(phrase){
    var tr = this._translations[this._currentLang];
    if (typeof tr === 'undefined') return phrase;
    var trPhrase = this._translations[this._currentLang][phrase];
    return typeof trPhrase !== 'undefined' ? trPhrase : phrase;
  }
}