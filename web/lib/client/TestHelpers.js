GRASP_TEST_DATA = {
  // here tests will put their test data
};
GRASP.TestHelpers = {
  fetchStat: {}, // statistics of fetches
  /**
   * Recursively substitutes values with corresponding element in replacement array
   * @param obj - object
   * @param values - for example ['1989','1987']
   * @param replacement - for example ['1982', '1980']
   */
  substituteValues: function(obj, values, replacement){
    for(var key in obj){
      if (obj.hasOwnProperty(key)){
        if (values.indexOf(obj[key]) !== -1) {
          obj[key] = replacement[values.indexOf(obj[key])];
        } else if (GRASP.typeof(obj[key]) === 'function') {
          continue;
        } else if (
            GRASP.typeof(obj[key]) === 'array'
            || GRASP.typeof(obj[key]) === 'object'
        ) {
          GRASP.TestHelpers.substituteValues(obj[key], values, replacement);
        }
      }
    }
  },
  /**
   * Recursively substitutes keys (field names) in fieldNames array with corresponding
   * element in replacement array
   * @param obj - object
   * @param fieldNames - for example ['created_at','updated_at']
   * @param replacement - for example ['createdAt', 'updatedAt']
   */
  substituteKeys: function(obj, fieldNames, replacement){
    for(var key in obj){
      if (obj.hasOwnProperty(key)){
        if (fieldNames.indexOf(key) !== -1) {
          obj[replacement[fieldNames.indexOf(key)]] = GRASP.clone(obj[key]);
          delete obj[key];
          return GRASP.TestHelpers.substituteKeys(obj, fieldNames, replacement);
        } else if (GRASP.typeof(obj[key]) === 'function') {
          continue;
        } else if (
            GRASP.typeof(obj[key]) === 'array'
            || GRASP.typeof(obj[key]) === 'object'
        ) {
          GRASP.TestHelpers.substituteKeys(obj[key], fieldNames, replacement);
        }
      }
    }
  },
  /**
   * Recursively substitutes values fields in fieldNames array with corresponding
   * element in replacement array
   * @param obj - object
   * @param fieldNames - for example ['created_at','updated_at']
   * @param replacement - for example ['01-01-1982 00:00:00', '01-01-1982 00:00:00']
   */
  substituteFields: function(obj, fieldNames, replacement){
    for(var key in obj){
      if (obj.hasOwnProperty(key)){
        if (fieldNames.indexOf(key) !== -1) {
          obj[key] = replacement[fieldNames.indexOf(key)];
        } else if (GRASP.typeof(obj[key]) === 'function') {
          continue;
        } else if (
            GRASP.typeof(obj[key]) === 'array'
            || GRASP.typeof(obj[key]) === 'object'
        ) {
          GRASP.TestHelpers.substituteFields(obj[key], fieldNames, replacement);
        }
      }
    }
  },
  likeTimestamp: function likeTimestamp(){
    return new GRASP.TestHelpers.likeRegexp('[0-9]+');
  },
  likeYYYYMMDD_HHMMSS: function likeYYYYMMDD_HHMMSS(){
    return new GRASP.TestHelpers.likeRegexp("^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})$");
  },
  likeRegexp: function likeRegexp(regexp){
    this.regexp = regexp;
  },
  cmp: function(testname, result, standard){
    var successCSS = "background-color:limegreen; color:black;";
    var errorCSS = "background-color:tomato; color:black;";

    if(GRASP.typeof(result) !== GRASP.typeof(standard)){
      console.log("%c"+testname+' - NOT OK! type of result '+GRASP.typeof(result)+' !== '+GRASP.typeof(standard), errorCSS);
      return false;
    }

    if(!GRASP.compare(result, standard, true)){
        console.log("%c"+testname+' - NOT OK! result must be ', errorCSS, standard, ' but got ', result);
        return false;
    }

    console.log("%c"+testname+" - is OK", successCSS);
    return true;
  },
  fetch: function(testName, url, obj){
    if (typeof this.fetchStat[url] === 'undefined') {
      this.fetchStat[url] = 0;
    } else {
      this.fetchStat[url]++;
    }
    if (typeof obj === 'undefined') obj = {}
    var formData = new FormData();
    formData.append('TEST_NAME',testName);
    formData.append('data',JSON.stringify(obj));
    return fetch(
        url,
        {
          method: 'post',
          body: formData,
          credentials: 'include'
        }
    ).then(function(response){
      return response.text();
    });
  },
  getFetchStat: function(){
    return this.fetchStat;
  }
};