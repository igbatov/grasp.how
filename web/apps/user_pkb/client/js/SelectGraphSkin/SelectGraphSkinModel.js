YOVALUE.SelectGraphSkinModel = function(subscriber, publisher, constrs, default_skin){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.constrs = constrs;
  this.default_skin = default_skin;
  this.selectedSkins = {}; //key-graph_name, value-layout_name

  this.subscriber.subscribe(this,[
    'get_selected_skin'
  ]);
};

YOVALUE.SelectGraphSkinModel.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_selected_skin":
        var graphId = event.getData();

        if(typeof(this.selectedSkins[graphId]) == 'undefined'){
          var e = this.publisher.createEvent("repository_get_selected_skins", [graphId]);
          this.publisher.when(e).then(function(data){
            if(typeof(data[graphId]) == 'undefined') data[graphId] = that.default_skin;
            // change constructor names to actual constructors
            data[graphId].node.constr.withoutIcon = that.constrs[data[graphId].node.constr.withoutIcon];
            data[graphId].node.constr.withIcon = that.constrs[data[graphId].node.constr.withIcon];
            data[graphId].edge.constr = that.constrs[data[graphId].edge.constr];
            data[graphId].nodeLabel.constr = that.constrs[data[graphId].nodeLabel.constr];

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
  }
};
