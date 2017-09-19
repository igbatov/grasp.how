DEBUG_MODE = true;

var testGraphSnapClone = {
  name: 'testGraphSnapClone',
  run: function (next) {
// name test
    TEST_NAME='testGraphSnapClone';
    console.log('-------'+TEST_NAME+'-------');


    var p = Modules['Publisher'];

// globals that test can use and modify
    var USERNAME = null;
    var USER_ID = null;
    var GRAPH_ID = null;
    var NODE_CONTENT1 = null;
    var SNAPSHOT_TIMESTAMP = null;

    var sw = new GRASP.stopWatch(TEST_NAME);

    /**
     * Create new DB for this test and switch on it
     */
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
      return Modules['Starter'].start();
    }).then(function(){
      /**
       * Create new graph and load it into client from server
       */
      return p.publish(['create_new_graph', {name:'testGraph'}]).then(function(e){
        GRAPH_ID = e.graphId;
        return p.publish(['load_graph_models']);
      });
    }).then(function(e){
      /**
       * Create node in graph
       */
      return GRASP.TestHelpers.createNode(
          p,
          GRAPH_ID,
          {
            label: 'node 1',
            type: GRASP.GraphViewNode.NODE_TYPE_FACT
          }
      );
    }).then(function(nodeContent){
      NODE_CONTENT1 = nodeContent;
      /**
       * Change node text
       */
      return p.publish(
          ["request_for_graph_element_content_change", {
            graphId: GRAPH_ID,
            type: 'updateNodeText',
            nodeContentId: nodeContent.nodeContentId,
            node_alternative_id: nodeContent.active_alternative_id,
            text: 'text 1'
          }]
      );
    }).then(function(nodeContent){
      /**
       * Wait for all events to be resolved
       */
      var allEvents = p.getAllEvents();
      return Modules['Promise'].when.apply(Modules['Promise'], allEvents);

    }).then(function(){
      /**
       * Create snapshot of node contents
       */
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/createNodeContentSnapshots');
    }).then(function(e){
      /**
       * Wait for sometime
       */
      return GRASP.TestHelpers.wait(1000);
    }).then(function(){
      /**
       * Change node text once again
       */
      return p.publish(
          ["request_for_graph_element_content_change", {
            graphId: GRAPH_ID,
            type: 'updateNodeText',
            nodeContentId: NODE_CONTENT1.nodeContentId,
            node_alternative_id: NODE_CONTENT1.active_alternative_id,
            text: 'text 2'
          }]
      );
    }).then(function(nodeContent){
      /**
       * Wait for all events to be resolved
       */
      var allEvents = p.getAllEvents();
      return Modules['Promise'].when.apply(Modules['Promise'], allEvents);

    }).then(function(){
      /**
       * Create second snapshot of node contents
       */
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/createNodeContentSnapshots');
    }).then(function(e){
      e = JSON.parse(e);
      SNAPSHOT_TIMESTAMP = e.timestamp;
      /**
       * Wait for sometime
       */
      return GRASP.TestHelpers.wait(1000);
    }).then(function(){
      return GRASP.TestHelpers.createNode(
          p,
          GRAPH_ID,
          {
            label: 'node 2',
            type: GRASP.GraphViewNode.NODE_TYPE_PROPOSITION
          }
      );
    }).then(function(nodeContent){
      /**
       * Change node 1 text for the third time
       */
      return p.publish(
          ["request_for_graph_element_content_change", {
            graphId: GRAPH_ID,
            type: 'updateNodeText',
            nodeContentId: NODE_CONTENT1.nodeContentId,
            node_alternative_id: NODE_CONTENT1.active_alternative_id,
            text: 'text 3'
          }]
      );
    }).then(function(nodeContent){
      /**
       * Wait for all events to be resolved
       */
      var allEvents = p.getAllEvents();
      return Modules['Promise'].when.apply(Modules['Promise'], allEvents);

    }).then(function(){
      /**
       * Create clone of graph snapshot
       */
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/cloneGraph/'+GRAPH_ID+'/2/'+SNAPSHOT_TIMESTAMP
      );

    }).then(function(){
      /**
       * Get first step of the cloned graph
       * @type {number}
       */
      var cloneGraphLocalId = parseInt(GRAPH_ID.split('.')[1])+1;
      var cloneGraphId = GRAPH_ID.split('.')[0] + '.' + cloneGraphLocalId;
      return GRASP.TestHelpers.getGraphData(cloneGraphId, 1);

    }).then(function(e){
      var clone = e;
      /**
       * Check that edges is empty and nodes have only one element (it is history step 2, not 3)
       */
      GRASP.TestHelpers.cmp('edges is empty', clone.graph.elements.edges, []);
      GRASP.TestHelpers.cmp(
          'nodes contains one element',
          clone.graph.elements.nodes,
          [{
            id: 0,
            nodeContentId: new GRASP.TestHelpers.likeRegexp('.+')
          }]
      );
      var nodeContentId = clone.graph.elements.nodes[0].nodeContentId;
      GRASP.TestHelpers.cmp(
          'node content contains text version closest to but not greater than snap timestamp',
          clone.nodeContent[nodeContentId].alternatives[0].text,
          'text 2'
      );
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
          .then(function() {
            // we need to logout because otherwise every other request will be for removed user
            return GRASP.TestHelpers.fetch(
                TEST_NAME,
                window.location.origin + '/logout');
          })
          .then(function(){
            console.log('all is done');
            console.log('finished at', new Date());
            console.log('total time', sw.elapsed()/1000);
            console.log('fetchStat: ', GRASP.TestHelpers.getFetchStat());
            next();
          });
    });
  }
};

// register test (to be force all tests run one, by one, not in parallel)
GRASP.TestHelpers.register(testGraphSnapClone);
