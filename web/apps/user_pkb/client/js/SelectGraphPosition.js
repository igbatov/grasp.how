YOVALUE.SelectGraphPosition = function(subscriber, publisher, ViewManager, jQuery){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.selectedPosition = {};
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;

  this.subscriber.subscribe(this,[
    'get_selected_positions'    //request for graph position
  ]);

  this.container = this.ViewManager.getViewContainer('selectGraphPosition');

  var $ = jQuery, that = this;
  $('#'+this.container.id).on('change', 'select', function(){
    var position = $(this).attr('id'), graphId = $(this).find(":selected").attr('value');
    for(var i in that.selectedPosition){
      if(that.selectedPosition[i] == position) that.selectedPosition[i] = 'undefined';
    }

    that.selectedPosition[graphId] = position;
    that.publisher.publish('graph_position_changed', graphId);
  });
};

YOVALUE.SelectGraphPosition.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_selected_positions":
        var i, graphIds = event.getData(), unknownGraphIds=[], knownGraphIds=[];

        for(i  in graphIds){
          if(typeof(this.selectedPosition[graphIds[i]]) == 'undefined') unknownGraphIds.push(graphIds[i]);
          else knownGraphIds.push(graphIds[i]);
        }

        if(unknownGraphIds.length > 0){
          var e = this.publisher.createEvent("repository_get_selected_positions", unknownGraphIds);
          this.publisher.when(e).then(function(data){
            for(var i in data) that.selectedPosition[i] = data[i];
            that._createView(that.selectedPosition);
            event.setResponse(YOVALUE.extractKeyValues(graphIds, that.selectedPosition));
          });
          this.publisher.publishEvent(e);
        }else{
          event.setResponse(YOVALUE.extractKeyValues(graphIds, this.selectedPosition));
        }

        break;
    }
  },

  _createView: function(positions){
    var i, c = this.container, $ =  this.jQuery;

    var e = this.publisher.createEvent("get_graph_models");
    this.publisher.when(e).then(function(models){
      var leftSelect = '<select id="leftGraphView">';
      var rightSelect = '<select id="rightGraphView">';
      var isLeftGraphSelected = false;
      var isRightGraphSelected = false;
      for(i in models){
        if(positions[models[i].getGraphId()] == 'leftGraphView') isLeftGraphSelected = true;
        if(positions[models[i].getGraphId()] == 'rightGraphView') isRightGraphSelected = true;
        leftSelect += '<option '+(positions[models[i].getGraphId()] == 'leftGraphView' ? 'selected' : '')+' value="'+models[i].getGraphId()+'">'+models[i].getGraphName()+'</option>';
        rightSelect += '<option '+(positions[models[i].getGraphId()] == 'rightGraphView' ? 'selected' : '')+' value="'+models[i].getGraphId()+'">'+models[i].getGraphName()+'</option>';
      }
      leftSelect += '<option '+(!isLeftGraphSelected ? 'selected' : '')+' value="none">none</option></select>';
      rightSelect += '<option '+(!isRightGraphSelected ? 'selected' : '')+' value="none">none</option></select>';
      rightSelect += '</select>';
      $('#'+c.id).html(leftSelect+rightSelect);
    });
    this.publisher.publishEvent(e);
  }
};
