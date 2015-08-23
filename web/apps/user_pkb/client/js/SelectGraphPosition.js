/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param subscriber
 * @param publisher
 * @param ViewManager
 * @param UI
 * @constructor
 */
YOVALUE.SelectGraphPosition = function(subscriber, publisher, ViewManager, UI){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.selectedPosition = {};
  this.ViewManager = ViewManager;
  this.UI = UI;

  this.subscriber.subscribe(this,[
    'get_selected_positions'    //request for graph position
  ]);

  this.container = this.ViewManager.getViewContainer('selectGraphPosition');
};

YOVALUE.SelectGraphPosition.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_selected_positions":
        var i, graphIds = event.getData(), unknownGraphIds=[], knownGraphIds=[];

        // determine graph id which is not in this.selectedPosition yet
        for(i  in graphIds){
          if(typeof(this.selectedPosition[graphIds[i]]) == 'undefined') unknownGraphIds.push(graphIds[i]);
          else knownGraphIds.push(graphIds[i]);
        }

        // request positions of unknown graphs
        if(unknownGraphIds.length > 0){
          var e = this.publisher.createEvent("repository_get_selected_positions", unknownGraphIds);
          this.publisher.when(e).then(function(data){
            for(var i in data) that.selectedPosition[i] = data[i];
            that._createView();
            event.setResponse(YOVALUE.extractKeyValues(graphIds, that.selectedPosition));
          });
          this.publisher.publishEvent(e);
        }else{
          event.setResponse(YOVALUE.extractKeyValues(graphIds, this.selectedPosition));
        }

        break;
    }
  },

  _createView: function(){
    var c = this.container, that = this;

    var e = this.publisher.createEvent("get_graph_models");
    this.publisher.when(e).then(function(graphs){
      var items = {'new':' - CREATE NEW - ', 'trash':' - TRASH - '}, i, trashItems={};
      for(i in graphs){
        if(!graphs[i].getIsInTrash()) items[graphs[i].getGraphId()] = graphs[i].getGraphName();
        else trashItems[graphs[i].getGraphId()] = graphs[i].getGraphName();
      }

      var onRemove = function(graphId){
        console.log(graphId);
      };

      var createNewGraph = function(name){
        console.log(name);
      };

      var onSelect = function(position, graphId){

        if(graphId == 'new') that.UI.showModal({'name':{'type':'input', 'label':'Name:'}}, createNewGraph);
        if(graphId == 'trash') that.UI.showModal();

        // set position of old selected graph to 'not to be shown'
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) that.selectedPosition[i] = 'not to be shown';
        }

        // set position of newly selected graph
        that.selectedPosition[graphId] = position;

        // say about this event to all subscribers
        that.publisher.publish('graph_position_changed', graphId);
      };

      var leftGraphId = null, rightGraphId = null;
      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'leftGraphView') leftGraphId = i;
      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'rightGraphView') rightGraphId = i;

      that.UI.createSelectBox('#'+c.id, 'leftGraphView', items, onSelect, leftGraphId, 'selectGraphPosition', true, onRemove);
      that.UI.createSelectBox('#'+c.id, 'rightGraphView', items, onSelect, rightGraphId, 'selectGraphPosition', true, onRemove);
    });
    this.publisher.publishEvent(e);
  }
};
