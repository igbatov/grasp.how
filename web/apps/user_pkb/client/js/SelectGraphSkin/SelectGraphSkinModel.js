YOVALUE.SelectGraphSkinModel = function(subscriber, publisher, constrs, default_skin){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.constrs = constrs;
  this.default_skin = default_skin;
  this.selectedSkins = {}; //key-graph_name, value-layout_name

  this.subscriber.subscribe(this,[
    'get_selected_skin',
    'get_skin_by_skin_settings'
  ]);
};

YOVALUE.SelectGraphSkinModel.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_skin_by_skin_settings":
        var data = event.getData();
        data = that._replaceConstructorNameByConstructor(data, that.constrs);
        event.setResponse(data);
        break;

      case "get_selected_skin":
        var graphId = event.getData();

        if(typeof(this.selectedSkins[graphId]) == 'undefined'){
          var e = this.publisher.createEvent("repository_get_selected_skins", [graphId]);
          this.publisher.when(e).then(function(data){
            if(typeof(data[graphId]) == 'undefined') data[graphId] = that.default_skin;
            // change constructor names to actual constructors
            data[graphId] = that._replaceConstructorNameByConstructor(data[graphId], that.constrs);
            that.selectedSkins[graphId] = data[graphId];
            //console.log(that.selectedSkins[graphId]);
            event.setResponse(that.selectedSkins[graphId]);
          });
          this.publisher.publishEvent(e);
        }else{
          event.setResponse(this.selectedSkins[graphId]);
        }

        break;
    }
  },

  _replaceConstructorNameByConstructor: function(data, constructors){
    data.node.constr.withoutIcon = constructors[data.node.constr.withoutIcon];
    data.node.constr.withIcon = constructors[data.node.constr.withIcon];
    data.edge.constr = constructors[data.edge.constr];
    data.nodeLabel.constr = constructors[data.nodeLabel.constr];
    return data;
  }
};
