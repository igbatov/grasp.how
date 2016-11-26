/**
 * skin structure
 * var
 {
 "skin":{
   "node":{
     "constr":{
       "withoutIcon":"GraphViewNode",
       "withIcon":"GraphViewNodeImage"
     },
     "attr":{
       "typeColors":{
         "fact":"#00BFFF",
         "proposition":"#3CB371",
         "illustration":"#FF69B4",
         "question":"#FFFFE0",
         "to_read":"#FFFF00",
         "best_known_practice":"#FFA500"
       }
     }
   },
   "edge":{
     "constr":"GraphViewEdge",
     "attr":{
       "typeColors":{
         "link":"#00BFFF",
         "causal":"#87CEFA",
         "conditional":"#3CB371"
       }
     }
   },
   "nodeLabel":{
     "constr":"GraphViewNodeLabel",
     "attr":{
       "font":"Calibri",
       "fill":"#BBBBBB","maxSize":24
     }
   }
 },
 "layout":"basicLayout",
 "position":"not to be shown"
 }
 * @param publisher
 * @param constrs
 * @param default_skin
 * @constructor
 */
GRASP.SelectGraphSkinModel = function(publisher, constrs, default_skin){
  this.publisher = publisher;
  this.constrs = constrs;
  this.default_skin = default_skin;
  this.selectedSkins = {}; //key-graph_name, value-layout_name
};

GRASP.SelectGraphSkinModel.prototype = {
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
          this.publisher
            .publish(["repository_get_selected_skins", [graphId]])
            .then(function(data){
              // if no skin return set to default one from main.js
              if(typeof(data[graphId]) == 'undefined') data[graphId] = that.default_skin;
              // if skin returned but some parameter is absent, get it from default_skin
              for(var param in that.default_skin){
                if(typeof(data[graphId][param]) == 'undefined') data[graphId][param] = that.default_skin[param];
              }
              // change constructor names to actual constructors
              data[graphId] = that._replaceConstructorNameByConstructor(data[graphId], that.constrs);
              that.selectedSkins[graphId] = data[graphId];
              //console.log(that.selectedSkins[graphId]);
              event.setResponse(that.selectedSkins[graphId]);
            });
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
