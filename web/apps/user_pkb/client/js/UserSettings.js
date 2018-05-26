/**
 * This module sets and gets all user personal settings (language, login, password, avatar, birthday etc.)
 * It also updates other modules that uses user_settings, i.e I18n
 * @param publisher
 * @param i18n
 * @constructor
 */
GRASP.UserSettings = function(publisher, i18n){
  this.publisher = publisher;
  this._i18n = i18n;
  this._settings = {}; // store user settings, cached from backend
};
GRASP.UserSettings.FIELD_LANG = 'lang';
GRASP.UserSettings.FIELD_BAYES_ENGINE = 'bayesEngine';
GRASP.UserSettings.prototype = {
  eventListener: function (event) {
    var that = this;
    if (event.getName() === 'init_user_settings') {
      this.publisher.publish(['repository_get_user_settings']).then(function(r){
        // init cache
        that._settings = r;
        // init i18n
        if(r['lang']){
          that._i18n.setLang(r[GRASP.UserSettings.FIELD_LANG]);
        }
        event.setResponse(r);
      });
    }

    if (event.getName() === 'get_user_settings') {
      if(GRASP.getObjectLength(this._settings)) {
        event.setResponse(this._settings);
      } else {
        GRASP.errorHandler.throwError('You should execute "init_user_settings" before requesting "get_user_settings"');
      }
      return true;
    }

    if (event.getName() === 'set_user_settings') {
      this.publisher.publish(['repository_set_user_settings', event.getData()]).then(function(r){
        // update cache
        for(var i in event.getData()) {
          that._settings[i] = event.getData()[i];
        }
        // update i18n
        if(r['lang']){
          that._i18n.setLang(r[GRASP.UserSettings.FIELD_LANG]);
        }
        event.setResponse(r);
      });

      return true;
    }
  }
}