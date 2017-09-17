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
  likeInt: function likeTimestamp(){
    return new GRASP.TestHelpers.likeRegexp('[0-9]+');
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
      this.fetchStat[url] = 1;
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
  wait: function(millisecs){
    return new Promise(function(resolve){
      setTimeout(function(){
        resolve(true);
      }, millisecs);
    });
  },
  exit: function(testName){
    return GRASP.TestHelpers.fetch(
        testName,
        window.location.origin+'/commitTestChanges'
    ).then(function(){
      throw 'test exit';
    });
  },
  getFetchStat: function(){
    return this.fetchStat;
  },
  createNode: function(publisher, graphId, params) {
    /**
     * Add node content
     */
    var NODE_CONTENT = {};
    return p.publish(["request_for_graph_element_content_change",
      {
        type: 'addNode',
        graphId: graphId,
        element: {label: params.label, type: params.type}
      }
    ]).then(function (nodeContent) {
      NODE_CONTENT = nodeContent;
      /**
       * Add node with nodeContent to graph
       */
      return p.publish(
          ["request_for_graph_model_change", {
            graphId: GRAPH_ID,
            type: 'addNode',
            nodeContentId: nodeContent.nodeContentId
          }]
      )
    }).then(function () {
      return NODE_CONTENT;
    });
  },
  getGraphData: function(graphId, historyStep){
    var graph={};
    var nodeContent={};
    var nodeContentIds=[];
    var edgeContentIds=[];
    var elementAttributes={};

    var data = {};
    data[graphId]=historyStep;
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/getGraphsHistoryChunk',
        data
    )
    .then(function(e){
      graph.elements = JSON.parse(e)[0]['elements'];
      graph.node_mapping = JSON.parse(e)[0]['node_mapping'];
      return Promise.resolve();
    })
    .then(function(){
      graph.elements.nodes.forEach(function (t) { nodeContentIds.push(t.nodeContentId) });
      graph.elements.edges.forEach(function (t) { edgeContentIds.push(t.edgeContentId) });
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphNodeContent',
          {"graphId":graphId,"nodeContentIds":nodeContentIds}
      );
    })
    .then(function(e){
      nodeContent = JSON.parse(e);
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphElementsAttributes',
          {"nodes":nodeContentIds,"edges":edgeContentIds}
      );
    })
    .then(function(e){
      elementAttributes = JSON.parse(e);
      return Promise.resolve();
    })
    .then(function(){
      return Promise.resolve({
        graph: graph,
        nodeContent: nodeContent,
        elementAttributes: elementAttributes
      });
    });
  }
};