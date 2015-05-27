YOVALUE.SelectGraphSkinModel = function(subscriber, publisher, skins){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.skins = skins;
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
            that.selectedSkins[graphId] = data[graphId];
            var skinName = that.selectedSkins[graphId];
            event.setResponse({skinName:skinName, skin: that.skins[skinName]});
          });
          this.publisher.publishEvent(e);
        }else{
          var skinName = this.selectedSkins[graphId];
          event.setResponse({skinName:skinName, skin: this.skins[skinName]});
        }

        break;
    }
  }
};
