GRASP_TEST_DATA = {
  // here tests will put their test data
};
GRASP.TestHelpers = {
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
  }
};