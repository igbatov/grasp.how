/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param subscriber
 * @param publisher
 * @param ViewManager
 * @param UI
 * @param jQuery
 * @constructor
 */
YOVALUE.SelectGraphPosition = function(subscriber, publisher, ViewManager, UI, jQuery){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.selectedPosition = {};
  this.ViewManager = ViewManager;
  this.UI = UI;
  this.jQuery = jQuery;

  this.subscriber.subscribe(this,[
    'get_selected_positions'    //request for graph position
  ]);

  this.container = this.ViewManager.getViewContainer('horizontalMenu');
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
    var c = this.container, that = this, $ = this.jQuery;

    var e = this.publisher.createEvent("get_graph_models");
    this.publisher.when(e).then(function(graphs){
      var items = {'none':'none'}, i, trashItems={};
      for(i in graphs){
        if(!graphs[i].getIsInTrash()) items[graphs[i].getGraphId()] = graphs[i].getGraphName();
        else trashItems[graphs[i].getGraphId()] = graphs[i].getGraphName();
      }

      var onRemove = function(graphId){
        console.log(graphId);
      };

      var createNewGraph = function(data){
        console.log(data);
      };

      var showNew = function(){
        that.UI.showModal({
          'name':{'type':'input', 'label':'Name:', 'value':''},
          'submit':{'type':'button', 'label':'', 'value':'Создать'}
        }, createNewGraph);
      };

      var showTrash = function(){

      };

      var onSelect = function(position, graphId){
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

      // create New and Trash Buttons
      that.UI.createButton('#'+c.id, 'Trash', showTrash);
      that.UI.createButton('#'+c.id, 'New', showNew);

      // create containers for select boxes
      $('#'+c.id).append('<div id="leftSelectContainer" class="selectGraphPosition"></div>');
      $('#'+c.id).append('<div id="rightSelectContainer" class="selectGraphPosition"></div>');

      // create left and right select box
      that.UI.createSelectBox('#leftSelectContainer', 'leftGraphView', items, onSelect, leftGraphId);
      that.UI.createSelectBox('#rightSelectContainer', 'rightGraphView', items, onSelect, rightGraphId);

      // add edit and remove buttons to the right of select boxes
      that.UI.createButton('#leftSelectContainer', 'Edit', showTrash);
      that.UI.createButton('#leftSelectContainer', 'Remove', showNew);
      that.UI.createButton('#rightSelectContainer', 'Edit', showTrash);
      that.UI.createButton('#rightSelectContainer', 'Remove', showNew);
    });
    this.publisher.publishEvent(e);
  }
};
