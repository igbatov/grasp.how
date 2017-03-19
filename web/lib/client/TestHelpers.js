GRASP_TEST_DATA = {
  // here tests will put their test data
};
GRASP.TestHelpers = {
  cmp: function(testname, result, standard){
    var successCSS = "background-color:limegreen; color:black;";
    var errorCSS = "background-color:tomato; color:black;";

    if(GRASP.typeof(result) !== GRASP.typeof(standard)){
      console.log("%c"+testname+' - NOT OK! type of result '+GRASP.typeof(result)+' !== '+GRASP.typeof(standard), errorCSS);
      return false;
    }

    if(GRASP.typeof(standard) == 'string' || GRASP.typeof(standard) == 'number'){
      if(result !== standard){
        console.log("%c"+testname+' - NOT OK! result must be ', errorCSS, standard, ' got ', result);
        return false;
      }
    }

    if(GRASP.typeof(standard) == 'object' || GRASP.typeof(standard) == 'array'){
      if(!GRASP.compare(result, standard)){
        console.log("%c"+testname+' - NOT OK! result must be ', errorCSS, standard, ' got ', result);
        return false;
      }
    }

    if(GRASP.typeof(standard) == 'function'){
      if(result.toString() === standard.toString()){
        console.log("%c"+testname+' - NOT OK! result must be ', errorCSS, standard, ' got ', result);
        return false;
      }
    }

    console.log("%c"+testname+" - is OK", successCSS);
    return true;
  }
};