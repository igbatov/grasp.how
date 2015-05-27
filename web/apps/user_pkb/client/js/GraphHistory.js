YOVALUE.GraphHistory = function(subscriber, publisher){
  this.publisher = publisher;
  this.subscriber = subscriber;

  this.historyTimeline = {}; // {graphId1: {1: timestamp1, 2: timestamp2, ...}, ... }

  // state var
  this.currentStep = {};     // {int graphId1: int step1, int graphId2: int step2, ...}
  this.lastStep = {};        // {int graphId1: int step1, int graphId2: int step2, ...}

  // storage of history
  this.cache = new YOVALUE.Cache(['graphId', 'step', 'timestamp', 'elements', 'node_mapping'], 1000000);

  this.subscriber.subscribe(this,[
    'graph_model_changed',
    'node_mapping_changed',

    'graph_history_get_model_elements',
    'graph_history_get_node_mapping',

    'get_current_graph_step',
    'get_previous_graph_step',
    'get_next_graph_step',
    'graph_history_set_current_step',

    'get_graphs_history_timeline'
  ]);
};

YOVALUE.GraphHistory.prototype = {
  eventListener: function(event){
    var that = this, eventName = event.getName();

    if(eventName === 'graph_history_get_model_elements'){
      var i, r={}, graphsModelElements, graphId,
        historyRequest = event.getData(); // {graphId1: int step1 || null, graphId2: int step2 || null, ... }

      graphsModelElements = this._getElementsFromCache(historyRequest);

      // get graphIds from historyRequest that are not in this.cache
      var emptyIds = YOVALUE.arrayHelper.difference(YOVALUE.getObjectKeys(historyRequest), YOVALUE.getObjectKeys(graphsModelElements));
      // retrieve it from repository and
      if(emptyIds.length > 0){
        for(i in emptyIds) r[emptyIds[i]] = historyRequest[emptyIds[i]];
        var e = this.publisher.createEvent("repository_get_graphs_model_elements", r);

        this.publisher.when(e).then(function(graphsElements){
          for(i in graphsElements){
            that.cache.add(graphsElements[i]);
            that._setLastStep(graphsElements[i]['graphId'], graphsElements[i]['step']);
          }

          event.setResponse(that._getElementsFromCache(historyRequest));
        });
        this.publisher.publishEvent(e);
      }else{
        event.setResponse(graphsModelElements);
      }

    }else if(eventName === 'graph_history_get_node_mapping'){
      var graphId = event.getData()['graphId'];
      if(typeof(this.currentStep[graphId]) == 'undefined') YOVALUE.errorHandler.throwError('currentStep for graphId '+graphId+' is not defined');
      var step = this.currentStep[graphId];
      event.setResponse(this.cache.get({graphId: graphId, step: step})[0]['node_mapping']);

    }else if(eventName === 'node_mapping_changed'){
      var graphId = event.getData()['graphId'];
      if(typeof(this.currentStep[graphId]) == 'undefined') YOVALUE.errorHandler.throwError('currentStep for graphId '+graphId+' is not defined');
      var step = this.currentStep[graphId];

      // update cache
      var cnt = this.cache.update({graphId: graphId, step: step}, {node_mapping: event.getData()['node_mapping']});
      if(cnt == 0) YOVALUE.errorHandler.throwError('cache has no items for graphId '+graphId+', step '+step);

      // save in repository
      this.publisher.publish('repository_update_node_mapping', {graphId: graphId, step: step, node_mapping: event.getData()['node_mapping']});

    }
    // create new history item from model modification
    // and save it to repository
    else if(eventName === 'graph_model_changed'){
      // If it is change of full {nodes, edges} set - ignore it
      // We track only atomic changes of nodes and edges (add, remove)
      if( event.getData()['type'] == 'set_graph_model_elements') return;

      var graphModel = event.getData()['graphModel'];
      var step = parseInt(this._getLastStep(graphModel.getGraphId()));

      // get node mapping from previous step
      var node_mapping = this.cache.get({graphId: graphModel.getGraphId(), step: step})[0]['node_mapping'];

      step++;
      this._setLastStep(graphModel.getGraphId(), step);
      var item = {
        graphId: graphModel.getGraphId(),
        step: step,
        timestamp: (new Date()).getTime()/1000,
        elements: {nodes:graphModel.getNodes(), edges:graphModel.getEdges()},
        node_mapping: node_mapping
      };
      this.cache.add(item);

      // update timeline and current step
      this.historyTimeline[item.graphId][item.step] = item.timestamp;
      this.currentStep[item.graphId] = item.step;

      this.publisher.publish('graph_history_item_added', {item: item, changes: event.getData()['changes']});

    }else if(eventName === 'get_previous_graph_step'){
      var i, graphIds = event.getData(), previousStep = {};

      // check that we have current step for all graphIds
      for(i in graphIds) if(typeof(that.currentStep[graphIds[i]]) == 'undefined') YOVALUE.errorHandler.throwError('get_previous_graph_step requested but no current step for graphId='+graphIds[i]);

      var e = this.publisher.createEvent("get_graphs_history_timeline", {});
      that.publisher.when(e).then(function(timeline){
        for(i in graphIds) previousStep[graphIds[i]] =  that._getPreviousStep(graphIds[i], that.currentStep[graphIds[i]], timeline);
        event.setResponse(previousStep);
      });
      this.publisher.publishEvent(e);

    }else if(eventName === 'get_next_graph_step'){
      var i, graphIds = event.getData(), nextStep = {};

      // check that we have current step for all graphIds
      for(i in graphIds) if(typeof(that.currentStep[graphIds[i]]) == 'undefined') YOVALUE.errorHandler.throwError('get_next_graph_step requested but no current step for graphId='+graphIds[i]);

      var e = this.publisher.createEvent("get_graphs_history_timeline", {});
      that.publisher.when(e).then(function(timeline){
        for(i in graphIds) nextStep[graphIds[i]] =  that._getNextStep(graphIds[i], that.currentStep[graphIds[i]], timeline);
        event.setResponse(nextStep);
      });
      this.publisher.publishEvent(e);

    }else if(eventName === 'get_current_graph_step'){

      // get graphIds that are not yet in that.currentStep
      var emptyIds = YOVALUE.arrayHelper.difference(event.getData(), YOVALUE.getObjectKeys(that.currentStep));

      // for all such graphIds init currentStep to the last step in the timeline
      if(emptyIds.length > 0){
        var e = this.publisher.createEvent("get_graphs_history_timeline", {});
        that.publisher.when(e).then(function(timeline){
          var graphId;
          for(graphId in timeline){
            if(emptyIds.indexOf(graphId) !== -1) that.currentStep[graphId] = Math.max.apply(null, YOVALUE.getObjectKeys(that.historyTimeline[graphId]));
          }
          event.setResponse(that.currentStep);
        });
        this.publisher.publishEvent(e);
      }
      // if all graphIds from event.getData() is defined, just return all currentSteps
      else{
        event.setResponse(that.currentStep);
      }

    }else if(eventName === 'graph_history_set_current_step'){
      for(var i in event.getData()){
        that.currentStep[i] = event.getData()[i];
      }

    }else if(eventName === 'get_graphs_history_timeline'){
      if(YOVALUE.getObjectLength(that.historyTimeline) == 0){
        var e = this.publisher.createEvent("repository_get_graphs_history_timeline", {});
        that.publisher.when(e).then(function(timeline){
          that.historyTimeline = timeline;
          event.setResponse(timeline);
        });
        this.publisher.publishEvent(e);
      }else{
        event.setResponse(that.historyTimeline);
      }
    }
  },

  /**
   *
   * @param request Request in a form {graphId1: step1, graphId2: step2, ...}
   */
  _getElementsFromCache: function(request){
    var graphId,
        graphsElements = {}; // {graphId1: {graphId: graphId1, step: step1, timestamp: ts1, elements: {nodes:{}, edges:{}}}, ...}

    for(graphId in request){
      var step = request[graphId] == null ? this._getLastStep(graphId) : request[graphId];
      var row = this.cache.get({graphId:graphId, step:step})[0];
      if(typeof(row) != 'undefined') graphsElements[graphId] = row;
    }
    return graphsElements;
  },

  _getLastStep: function(graphId){
    return this.lastStep[graphId];
  },


  /**
   *
   * @param graphId
   * @param {Number} step
   * @private
   */
  _setLastStep: function(graphId, step){
    if(typeof(this.lastStep[graphId]) == 'undefined') this.lastStep[graphId] = 0;
    if(this.lastStep[graphId] < step) this.lastStep[graphId] = step;
  },


  _getPreviousStep: function(graphId, step, timeline){
    var s,
      minStep = Math.min.apply(null, YOVALUE.strToInt(YOVALUE.getObjectKeys(timeline[graphId]))),
      previousStep = minStep;

    if(step == minStep) return minStep;

    for(s in timeline[graphId]){
      s = +s; // string to int conversion
      if(s>previousStep && s<step) previousStep = s;
    }
    return previousStep;
  },

  _getNextStep: function(graphId, step, timeline){
    var s,
      maxStep = Math.max.apply(null, YOVALUE.strToInt(YOVALUE.getObjectKeys(timeline[graphId]))),
      nextStep = maxStep;

    if(step == maxStep) return maxStep;

    for(s in timeline[graphId]){
      s = +s; // string to int conversion
      if(s>step && s<nextStep) nextStep = s;
    }
    return nextStep;
  }
};