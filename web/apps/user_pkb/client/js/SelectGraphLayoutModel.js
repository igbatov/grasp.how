/**
 *
 * @param publisher
 * @param layouts
 * @constructor
 */
GRASP.SelectGraphLayoutModel = function(publisher, layouts){
  this.publisher = publisher;
  this.layouts = layouts;
  this.selectedLayouts = {}; //key-graph_name, value-layout_name
};

GRASP.SelectGraphLayoutModel.prototype = {
  eventListener: function(event){
    var that = this;

    switch (event.getName()){
      case "get_layout_by_name":
        event.setResponse({layoutName:event.getData(), layout: this.layouts[event.getData()]});
        break;

      case "get_selected_layout":
        var graphId = event.getData();

        if(typeof(this.selectedLayouts[graphId]) == 'undefined'){
          this.publisher
            .publish(["repository_get_selected_layouts", [graphId]])
            .then(function(data){
              that.selectedLayouts[graphId] = data[graphId];
              var layoutName = that.selectedLayouts[graphId];
              event.setResponse({layoutName:layoutName, layout: that.layouts[layoutName]});
            });

        }else{
          var layoutName = this.selectedLayouts[graphId];
          event.setResponse({layoutName:layoutName, layout: this.layouts[layoutName]});
        }

        break;
    }
  }
};
