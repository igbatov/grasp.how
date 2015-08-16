/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param subscriber
 * @param publisher
 * @param ViewManager
 * @param jQuery
 * @constructor
 */
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
    var i, c = this.container, $ =  this.jQuery, that = this;

    var e = this.publisher.createEvent("get_graph_models");
    this.publisher.when(e).then(function(graphs){
      // ================ Draw Html ===========================
      var leftSelect = '';
      var rightSelect = '';

      var leftSelected = '<span class="selected" value="none">none</span>';
      var rightSelected = '<span class="selected"value="none">none</span>';
      for(i in graphs){
        if(positions[graphs[i].getGraphId()] == 'leftGraphView') leftSelected = '<span class="selected" value="'+graphs[i].getGraphId()+'">'+graphs[i].getGraphName()+'</span>';
        if(positions[graphs[i].getGraphId()] == 'rightGraphView') rightSelected = '<span class="selected" value="'+graphs[i].getGraphId()+'">'+graphs[i].getGraphName()+'</span>';
        leftSelect += '<li value="'+graphs[i].getGraphId()+'">'+graphs[i].getGraphName()+'</li>';
        rightSelect += '<li value="'+graphs[i].getGraphId()+'">'+graphs[i].getGraphName()+'</li>';
      }

      leftSelect = '<div class="sel-box" id="leftGraphView">'+leftSelected+'<ul class="toc-odd">'+leftSelect+'</ul></div>';
      rightSelect = '<div class="sel-box" id="rightGraphView">'+rightSelected+'<ul class="toc-odd">'+rightSelect+'</ul></div>';
      $('#'+c.id).html(leftSelect+rightSelect);

      // ============ Create Event Handlers ====================


      // toggle show/hide of menu
      $('.selected').click(function(){
        var ul = $('#'+$(this).parent().attr('id')+' .toc-odd');
        if(ul.is(":visible")) ul.hide();
        else ul.show();
      });

      // select option event
      $('.toc-odd li').click(function(e){
        // determine if this is left or right selectbox
        var position =  $(this).parent().parent().attr('id'),    // left or right panel
            graphId = $(this).attr('value');   // id of newly selected graph

        // ------------ change selected item in menu ------------------
        $('#'+position+' .selected').text($(this).text());
        $('#'+position+' .selected').attr('value', graphId);
        $('.toc-odd').hide();
        e.preventDefault();


        // ------------------ change selected item in model ------------------------
        // set position of old selected graph to 'not to be shown'
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) that.selectedPosition[i] = 'not to be shown';
        }

        // set position of newly selected graph
        that.selectedPosition[graphId] = position;

        // say about this event to all subscribers
        that.publisher.publish('graph_position_changed', graphId);
      });

      // click on remove button
      $("ul").on("click", "button", function(e) {
        e.preventDefault();
        $(this).parent().remove();
      });
    });
    this.publisher.publishEvent(e);
  }
};
