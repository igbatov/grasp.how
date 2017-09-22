/**
 * Class for translation of labels into different languages
 * Stores current language and all translations
 * If arg translations is not passed, it fires GRASP.Event 'get_translations'
 * @param translations: optional {ru:{engPhrase1:ruPhrase1, ...}, fr:{}, ...}
 * @param currentLang: 'en'|'ru'|'fr'
 * @constructor
 */
GRASP.I18n = function (translations, currentLang) {
  this._translations = translations;
  this._possibleLangs = ['en','ru'];
  this._currentLang = typeof currentLang === 'undefined' ? 'en' : currentLang;
};

GRASP.I18n.prototype = {
  setTranslations: function(translations){
    this._translations = translations;
  },

  setLang: function(lang){
    if (this._possibleLangs.indexOf(lang) === -1) {
      throw Error('Language '+lang+' is not implemented yet!');
    }
    this._currentLang = lang;
  },

  /**
   * First arg is phrase to translate
   * Others are optional - data to insert into phrase in place of %s
   * @param phrase
   * @returns {*}
   * @private
   */
  __: function(phrase){
    var data = [].slice.call(arguments);
    data.shift();
    if (!this._translations) {
      return phrase;
    }
    var tr = this._translations[this._currentLang];
    if (!tr) return phrase;
    var trPhrase = this._translations[this._currentLang][phrase];
    trPhrase = typeof trPhrase !== 'undefined' ? trPhrase : phrase;
    data.forEach(function (v) {
      trPhrase = trPhrase.replace('%s', v);
    });
    return trPhrase;
  }
}