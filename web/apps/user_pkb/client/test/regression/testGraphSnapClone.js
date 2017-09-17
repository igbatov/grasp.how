// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;

var p = Modules['Publisher'];

// globals that test can use and modify
var USERNAME = null;
var USER_ID = null;
var GRAPH_ID = null

var sw = new GRASP.stopWatch(TEST_NAME);

// create new DB for this test and switch on it
GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/createTestUser'
).then(function(loginData){
  /**
   * Login under test user
   */
    console.log(loginData)
    loginData = JSON.parse(loginData);
    USERNAME = loginData['username'];
    USER_ID = loginData['id'];
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        window.location.origin+'/loginTestUser?username='+USERNAME
    );
}).then(function(){
  return p.publish(['create_new_graph', {name:'testGraph'}])
}).then(function(){
  //return p.publish(['create_new_graph', {name:'testGraph'}])
}).then(function(){
  /**
   * Remove test user and print test statistic
   */
  var allEvents = p.getAllEvents();
  Modules['Promise'].when.apply(Modules['Promise'], allEvents)
      .then(function(){
        console.log('clearing test DB');
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/clearTest');
      })
      .then(function(){
        console.log('all is done');
        console.log('finished at', new Date());
        console.log('total time', sw.elapsed()/1000);
        console.log('fetchStat: ', GRASP.TestHelpers.getFetchStat());
      });
});