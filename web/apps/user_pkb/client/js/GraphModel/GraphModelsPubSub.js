/**
 * This module
 * - creates new graph model on 'received_graph_data' event
 * - changes models on 'request_for_graph_model_change'
 * - return various additional info about graph on events
 *    'get_graph_shortest_paths',
 *    'get_graph_tree_depth',
 *     and so on...
 * - fires 'graph_model_initialized' and 'graph_model_changed' events
 *
 * @param subscriber
 * @param publisher
 * @param graphModelFactory
 * @constructor
 */
YOVALUE.GraphModelsPubSub = function (subscriber, publisher, graphModelFactory){
  this.graphModelFactory = graphModelFactory;
  this.graphModels = {};
  this.subscriber = subscriber;
  this.publisher = publisher;

  this.subscriber.subscribe(this,[
    'init_graph_models',

    'get_graph_models',

    'request_for_graph_model_change',
    'set_graph_model_elements',

    'get_node_by_nodeContentId'
  ]);
};

YOVALUE.GraphModelsPubSub.prototype = {
  eventListener: function(event){
    var that = this, eventName = event.getName();

    switch (eventName){
      case "init_graph_models":
        var e = this.publisher.createEvent("repository_get_graphs_model_settings", {});
        this.publisher.when(e).then(function(graphsSettings){
          var r, graphId, graphSettings;
          for(graphId in graphsSettings){
            that.graphModels[graphId] = that.graphModelFactory.create(graphId);
            graphSettings = graphsSettings[graphId];
            r = that.graphModels[graphId].init(
              graphSettings['name'],
              graphSettings['nodeTypes'],
              graphSettings['edgeTypes'],
              graphSettings['nodeDefaultType'],
              graphSettings['edgeDefaultType'],
              graphSettings['isEditable'],
              graphSettings['isInTrash']
            );
            if(r === false)  YOVALUE.errorHandler.throwError('Graph Model init error');
          }

          // for all graphs determine its current version (position, index, step) in history
          // (for the first time it will be just the very last version)
          return that.publisher.publish("get_current_graph_step", YOVALUE.getObjectKeys(graphsSettings));

        }).then(function(steps){
            return that.publisher.publish("graph_history_get_model_elements", steps);

        }).then(function(graphsElements){
          for(graphId in graphsElements){
            that.graphModels[graphId].setGraphElements(graphsElements[graphId].elements);
          }
          event.setResponse(true);

        });
        this.publisher.publishEvent(e);
        break;

      case "get_graph_models":
        var i, graphModels = {}, graphIds = typeof(event.getData()) == 'undefined' ? YOVALUE.getObjectKeys(this.graphModels)  : event.getData();
        for(i in graphIds){
          if(typeof(this.graphModels[graphIds[i]]) != 'undefined') graphModels[graphIds[i]] = this._factoryReadOnyModel(this.graphModels[graphIds[i]]);
        }
        event.setResponse(graphModels);
        break;

      case "request_for_graph_model_change":

        var graphId = event.getData()['graphId'];
        if(typeof(this.graphModels[graphId]) == 'undefined') YOVALUE.errorHandler.throwError('graphModel with graphId '+graphId+' not found');
        var graphModel = this.graphModels[graphId];

        if(!graphModel.getIsEditable()) return;

        var changesApplied = false, c = YOVALUE.clone(YOVALUE.iGraphModelChanges);

        // a set of changes
        if(event.getData()['type'] == 'changes'){
          c = event.getData()['changes'];
        }
        // add new node
        else if(event.getData()['type'] == 'addNode'){
          var e = this.publisher.createEvent("request_for_graph_element_content_change", {type: 'addEdge', graphId:graphId, elementType: graphModel.getEdgeDefaultType()});
          this.publisher.when(e).then(function(edgeContent){
            c.nodes.add = {'newNode': {nodeContentId: event.getData()['nodeContentId']}};
            c.edges.add = {'newEdge': {edgeContentId: edgeContent.edgeContentId, source: event.getData()['parentNodeId'], target:'newNode'}};
            that.applyChanges(event.getData()['type'], c, graphModel);
            changesApplied = true;
          });
          this.publisher.publishEvent(e);
        }
        // add new edge
        else if(event.getData()['type'] == 'addEdge'){
          c.edges.add = {'newEdge':{edgeContentId:event.getData()['edgeContentId'], source: event.getData()['fromNodeId'], target: event.getData()['toNodeId']}};
        }
        // remove node
        else if(event.getData()['type'] == 'removeNode'){
          c.nodes.remove = [event.getData()['elementId']];
        }
        // remove edge
        else if(event.getData()['type'] == 'removeEdge'){
          c.edges.remove = [event.getData()['elementId']];
        }
        // change nodes skeleton parent
        else if(event.getData()['type'] == 'changeSkeletonParent'){
          var parentEdges = graphModel.getEdges(graphModel.getEdgesFromParentIds(event.getData()['nodeId']));
          for(var i in parentEdges){
            if(parentEdges[i].isSkeleton){
              c.edges.update[i] = {isSkeleton: false};
            }
            if(parentEdges[i].source == event.getData()['newParentId']){
              c.edges.update[i] = {isSkeleton: true};
            }
          }
        }

        // If changes not applied yet, apply it now
        if(!changesApplied) this.applyChanges(event.getData()['type'], c, graphModel);
        break;

      case 'set_graph_model_elements':
        graphModel = this.graphModels[event.getData().graphId];

        if(!graphModel.getIsEditable()) return;

        graphModel.setGraphElements(event.getData().elements);
        this.publisher.publish("graph_model_changed", {type:'set_graph_model_elements', changes:null, graphModel:this._factoryReadOnyModel(graphModel)});
        break;

      case 'get_node_by_nodeContentId':
        var graphId = event.getData()['graphId'];
        if(typeof(this.graphModels[graphId]) == 'undefined') YOVALUE.errorHandler.throwError('graphModel with graphId '+graphId+' not found');
        var graphModel = this.graphModels[graphId];
        event.setResponse(graphModel.getNodeByNodeContentId(event.getData()['nodeContentId']));
        break;

      default:
        break;
    }
  },

  applyChanges: function(type, c, graphModel){
    // if changes are empty, do nothing
    if(YOVALUE.compare(c, YOVALUE.iGraphModelChanges)) return true;

    //  apply changes
    var changes = graphModel.applyChanges(c);

    // fire event that model was successfully changed
    if(YOVALUE.compare(changes, YOVALUE.iGraphModelChanges) !== true) this.publisher.publish("graph_model_changed", {type:type, changes:changes, graphModel:this._factoryReadOnyModel(graphModel)});
  },

  /**
   * This will create model that expose only 'get' methods
   * @param model
   * @return {Object}
   * @private
   */
  _factoryReadOnyModel: function(model){
    var readOnlyModel = {}, i;

    //create copy of model
    YOVALUE.mixin(model, readOnlyModel);

    //remove all modifiers
    var modifyFunctions = ['init', 'setIsEditable', 'setIsEditable', 'setGraphElements', 'removeEdge','removeNode','addEdge','addNode','updateEdge','updateNode'];
    for(i in modifyFunctions){
       delete readOnlyModel[modifyFunctions[i]];
    }

    //remove all private functions
    for(i in readOnlyModel){
      if(i.substring(0,1) == '_') delete readOnlyModel[i];
    }

    return readOnlyModel;
  }
};