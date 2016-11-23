GRASP.GraphHistory = function(publisher){
  this.publisher = publisher;

  this.historyTimeline = {}; // {graphId1: {1: timestamp1, 2: timestamp2, ...}, ... }

  // state var
  this.currentStep = {};     // {int graphId1: int step1, int graphId2: int step2, ...}
  this.lastStep = {};        // {int graphId1: int step1, int graphId2: int step2, ...}

  // storage of history
  this.history = new GRASP.Table(['graphId', 'step', 'timestamp', 'elements', 'node_mapping']);
};

GRASP.GraphHistory.prototype = {
  eventListener: function(event){
    var that = this, eventName = event.getName();

    if(eventName === 'graph_history_get_model_elements'){
      var i, r={}, graphsModelElements, graphId,
        historyRequest = event.getData(); // {graphId1: int step1 || null, graphId2: int step2 || null, ... }

      graphsModelElements = this._getElementsFromHistory(historyRequest);

      // get graphIds from historyRequest that are not in this.history
      var emptyIds = GRASP.arrayHelper.difference(GRASP.getObjectKeys(historyRequest), GRASP.getObjectKeys(graphsModelElements));

      // retrieve it from repository
      if(emptyIds.length > 0){
        for(i in emptyIds) r[emptyIds[i]] = historyRequest[emptyIds[i]];
        this.publisher.publish(["repository_get_graphs_model_elements", r]).then(function(graphsElements){
          for(i in graphsElements){
            that.history.insertRow(graphsElements[i]);
            that._setLastStep(graphsElements[i]['graphId'], graphsElements[i]['step']);
          }
          event.setResponse(that._getElementsFromHistory(historyRequest));
        });

      }else{
        event.setResponse(graphsModelElements);
      }

    }else if(eventName === 'graph_history_get_node_mapping'){
      var graphId = event.getData()['graphId'];
      if(typeof(this.currentStep[graphId]) == 'undefined') GRASP.errorHandler.throwError('currentStep for graphId '+graphId+' is not defined');
      var step = this.currentStep[graphId];
      event.setResponse(this.history.getRows({graphId: graphId, step: step})[0]['node_mapping']);

    }else if(eventName === 'node_mapping_changed'){
      var graphId = event.getData()['graphId'];
      if(typeof(this.currentStep[graphId]) == 'undefined') GRASP.errorHandler.throwError('currentStep for graphId '+graphId+' is not defined');
      var step = this.currentStep[graphId];

      // update cache
      var cnt = this.history.updateRows({graphId: graphId, step: step}, {node_mapping: event.getData()['node_mapping']});
      if(cnt == 0) GRASP.errorHandler.throwError('cache has no items for graphId '+graphId+', step '+step);

      // save in repository
      this.publisher.publish(['repository_update_node_mapping', {graphId: graphId, step: step, node_mapping: event.getData()['node_mapping']}]);

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
      var node_mapping = this.history.getRows({graphId: graphModel.getGraphId(), step: step})[0]['node_mapping'];

      step++;
      this._setLastStep(graphModel.getGraphId(), step);
      var item = {
        graphId: graphModel.getGraphId(),
        step: step,
        timestamp: (new Date()).getTime()/1000,
        elements: {nodes:graphModel.getNodes(), edges:graphModel.getEdges()},
        node_mapping: node_mapping
      };
      this.history.insertRow(item);

      // update timeline and current step
      this.historyTimeline[item.graphId][item.step] = item.timestamp;
      this.currentStep[item.graphId] = item.step;

      this.publisher.publish(['graph_history_item_added', {item: item, changes: event.getData()['changes']}]);

    }else if(eventName === 'get_previous_graph_step'){
      var i, graphIds = event.getData(), previousStep = {};

      // check that we have current step for all graphIds
      for(i in graphIds) if(typeof(that.currentStep[graphIds[i]]) == 'undefined') GRASP.errorHandler.throwError('get_previous_graph_step requested but no current step for graphId='+graphIds[i]);

      that.publisher.publish(["get_graphs_history_timeline", {ids:graphIds}]).then(function(timeline){
        for(i in graphIds) previousStep[graphIds[i]] =  that._getPreviousStep(graphIds[i], that.currentStep[graphIds[i]], timeline);
        event.setResponse(previousStep);
      });

    }else if(eventName === 'get_next_graph_step'){
      var i, graphIds = event.getData(), nextStep = {};

      // check that we have current step for all graphIds
      for(i in graphIds) if(typeof(that.currentStep[graphIds[i]]) == 'undefined') GRASP.errorHandler.throwError('get_next_graph_step requested but no current step for graphId='+graphIds[i]);

      that.publisher.publish(["get_graphs_history_timeline", {ids:graphIds}]).then(function(timeline){
        for(i in graphIds) nextStep[graphIds[i]] =  that._getNextStep(graphIds[i], that.currentStep[graphIds[i]], timeline);
        event.setResponse(nextStep);
      });

    }else if(eventName === 'get_current_graph_step'){

      // get graphIds that are not yet in that.currentStep
      var emptyIds = GRASP.arrayHelper.difference(event.getData(), GRASP.getObjectKeys(that.currentStep));

      // for all such graphIds init currentStep to the last step in the timeline
      if(emptyIds.length > 0){
        that.publisher.publish(["get_graphs_history_timeline", {ids:emptyIds}]).then(function(timeline){
          var graphId;
          for(graphId in timeline){
            if(emptyIds.indexOf(graphId) !== -1) that.currentStep[graphId] = Math.max.apply(null, GRASP.getObjectKeys(that.historyTimeline[graphId]));
          }
          event.setResponse(that.currentStep);
        });
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
      // get graphIds that are not yet in this.historyTimeline
      var emptyIds = GRASP.arrayHelper.difference(event.getData()['ids'], GRASP.getObjectKeys(that.historyTimeline));
      if(emptyIds.length > 0){
        that.publisher.publish(["repository_get_graphs_history_timeline", {ids:emptyIds}]).then(function(timeline){
          for(var id in timeline){
            that.historyTimeline[id] = timeline[id];
          }
          event.setResponse(that.historyTimeline);
        });
      }else{
        event.setResponse(that.historyTimeline);
      }
    }
  },

  /**
   *
   * @param request Request in a form {graphId1: step1, graphId2: step2, ...}
   */
  _getElementsFromHistory: function(request){
    var graphId,
        graphsElements = {}; // {graphId1: {graphId: graphId1, step: step1, timestamp: ts1, elements: {nodes:{}, edges:{}}}, ...}

    for(graphId in request){
      var step = request[graphId] == null ? this._getLastStep(graphId) : request[graphId];
      var row = this.history.getRows({graphId:graphId, step:step})[0];
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
      minStep = Math.min.apply(null, GRASP.strToInt(GRASP.getObjectKeys(timeline[graphId]))),
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
      maxStep = Math.max.apply(null, GRASP.strToInt(GRASP.getObjectKeys(timeline[graphId]))),
      nextStep = maxStep;

    if(step == maxStep) return maxStep;

    for(s in timeline[graphId]){
      s = +s; // string to int conversion
      if(s>step && s<nextStep) nextStep = s;
    }
    return nextStep;
  }
};