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
      '/repository_set_user_settings',
      {'lang':'ru'}
  )
  .then(function(e){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/repository_get_user_settings'
    );
  })
  .then(function(e){
    var response = JSON.parse(e);
    GRASP.TestHelpers.cmp(
        'response from repository_get_user_settings',
        response,
        {
          "username": new GRASP.TestHelpers.likeRegexp('testuser_(.+)'),
          "lang":'ru'
        }
    );
    return Promise.resolve();
  });
};