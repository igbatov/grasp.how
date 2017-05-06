TEST_NAME='testBackend';
SUBTEST_NAME='testUser';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test publisher finder
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testSources(){
  return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/get_username',
      {}
  )
  .then(function(e){
    var response = JSON.parse(e);
    GRASP.TestHelpers.cmp(
        'response from get_username',
        response,
        {"username": new GRASP.TestHelpers.likeRegexp('testuser_(.+)')}
    );
    return Promise.resolve();
  });
};