GRASP_TEST_DATA = {
  // here tests will put their test data
};
GRASP.TestHelpers = {
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

    if(GRASP.typeof(standard) == 'object' || GRASP.typeof(standard) == 'array'){
      if(!GRASP.compare(result, standard, true)){
        console.log("%c"+testname+' - NOT OK! result must be ', errorCSS, standard, ' but got ', result);
        return false;
      }
    }

    console.log("%c"+testname+" - is OK", successCSS);
    return true;
  },
  fetch: function(testName, url, obj){
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
  }
};