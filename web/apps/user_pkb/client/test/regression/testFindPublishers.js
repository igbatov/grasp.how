TEST_NAME='testBackend';
SUBTEST_NAME='testFindPublishers';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test publisher finder
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testFindPublishers(){
  return  GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/findPublishers',
        {"substring":"New Scientist"}
      )
      .then(function(e){
        var response = JSON.parse(e);
        GRASP.TestHelpers.cmp(
            'response from findPublishers',
            response,
            [
              {"id":"24459","title":"New Scientist","reliability":3,"order":0},
              {"id":"24460","title":"New scientist and science journal","reliability":3,"order":21}
            ]
        );
        return Promise.resolve();
      });
};