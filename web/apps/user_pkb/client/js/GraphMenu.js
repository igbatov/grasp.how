/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param publisher
 * @param viewManager
 * @param UI
 * @param jQuery
 * @constructor
 */
YOVALUE.GraphMenu = function(publisher, viewManager, UI, jQuery){
  this.publisher = publisher;
  this.selectedPosition = {};
  this.viewManager = viewManager;
  this.UI = UI;
  this.jQuery = jQuery;

  this.container = this.viewManager.getViewContainer('horizontalMenu');
};

YOVALUE.GraphMenu.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_selected_positions":
        var i, graphIds = event.getData(), unknownGraphIds=[], knownGraphIds=[];

        // determine graph id which is not in this.selectedPosition yet
        for(i in graphIds){
          if(typeof(this.selectedPosition[graphIds[i]]) == 'undefined') unknownGraphIds.push(graphIds[i]);
          else knownGraphIds.push(graphIds[i]);
        }

        // request positions of unknown graphs
        if(unknownGraphIds.length > 0){
          this.publisher.publish(["repository_get_selected_positions", unknownGraphIds]).then(function(data){
            for(var i in data) that.selectedPosition[i] = data[i];
            that._createView();
            event.setResponse(YOVALUE.extractKeyValues(graphIds, that.selectedPosition));
          });
        }else{
          event.setResponse(YOVALUE.extractKeyValues(graphIds, this.selectedPosition));
        }

        break;
    }
  },

  _createView: function(){
    var c = this.container, that = this, $ = this.jQuery;

    this.publisher.publish("get_graph_models", "repository_get_graphs_clone_list").then(function(graphs, clones){
      var items = {'none':'none'}, i, trashItems={};

      // get our own graph names
      for(i in graphs){
        if(!graphs[i].getAttribute('isInTrash')) items[graphs[i].getGraphId()] = graphs[i].getGraphName();
        else trashItems[graphs[i].getGraphId()] = graphs[i].getGraphName();
      }

      var onRemove = function(position){
        var graphId = '';
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) graphId = i;
        }
        if(typeof(graphs[graphId]) == 'undefined') return true;
        that.UI.showConfirm('Are you sure you want to move "'+graphs[graphId].getGraphName()+'" to trash?', function(answer){
          if(answer == 'no') return true;
          // set it as not to be shown
          onSelect('not to be shown', graphId);
          // say about this event to all subscribers
          that.publisher.publish(['set_graph_attributes', {graphId:graphId, isInTrash:true}]);
          // redraw menu
          that._createView();
        });
      };

      var onEdit = function(position){
        var graphId = null;
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) graphId = i;
        }
        if(typeof(graphs[graphId]) == 'undefined') return;
        var m = that.UI.createModal();
        that.UI.setModalContent(m, that.UI.createForm({
          'graphId':{'type':'hidden', 'value':graphId},
          'name':{'type':'text', 'label':'Name:', 'value':graphs[graphId].getGraphName()},
          'submit':{type:'button', value:'Изменить'}
        }, function(form){
          // say about this event to all subscribers
          that.publisher.publish(['graph_name_changed', {graphId:form['graphId'], name:form['name']}]);
          // redraw menu
          that._createView();
          that.UI.closeModal(m);
        }));
      };

      var showNew = function(){
        var m = that.UI.createModal();
        that.UI.setModalContent(
          m,
          that.UI.createForm({
            'name':{'type':'text', 'label':'Name:', 'value':''},
            'submit':{'type':'button', 'label':'', 'value':'Создать'}
          },
          function(form){
            that.publisher.publish(['create_new_graph', {name:form['name']}]).then(function(){
              // reload graphs models
              return that.publisher.publish(['load_graph_models']);
            }).then(function(){
              // redraw menu
              that._createView();
            });
            that.UI.closeModal(m);
          })
        );
      };

      var showTrash = function(){
        that.UI.showModalList(trashItems, {'restore':function(graphId, el){
          el.parentNode.removeChild(el);
          // say about this event to all subscribers
          that.publisher.publish(['set_graph_attributes', {graphId:graphId, isInTrash:false}]);
          // redraw menu
          that._createView();
        }});
      };

      var showClones = function(pos){
        var graphId;
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == pos) graphId = i;
        }
        that.UI.showModalList(clones[graphId], {'show diff':function(cloneId, html){
          // get graph diff and show it
          that.publisher.publish(['get_graph_diff', {graphId:graphId, cloneId:cloneId}]).then(function(graphViewSettings){
            //create graphModel for diff graph
            that.publisher.publish(["add_graph_model", {
              graphId:graphViewSettings.graphId,
              graphSettings:graphViewSettings.graphModelSettings,
              elements:graphViewSettings.graphModel
            }]);

            // set graphArea for diff graph
            var position = 'rightGraphView';
            var graphArea = that.viewManager.getViewContainer(position);
            that.selectedPosition[graphViewSettings.graphId] = position;

            // build graphViewSettings
            graphViewSettings.skin = that.publisher.getInstant("get_skin_by_skin_settings", graphViewSettings.skin);

            var decoration = that.publisher.getInstant("get_graph_decoration", {
                  graphModel:graphViewSettings.graphModel,
                  graphNodeAttributes:graphViewSettings.graphNodeAttributes,
                  graphEdgeAttributes:graphViewSettings.graphEdgeAttributes,
                  scale:Math.min(graphArea.width, graphArea.height),
                  skin:graphViewSettings.skin
                }
            );
            graphViewSettings.decoration = decoration;

            // Create node label layout for GraphView
            var nodeLabels = {};
            var graphNodes = graphViewSettings.graphModel.nodes;
            for(var nodeId in graphNodes){
              nodeLabels[graphNodes[nodeId].id] = {
                id: graphNodes[nodeId].id,
                label: graphViewSettings.graphNodeAttributes[graphNodes[nodeId].nodeContentId].label,
                size: decoration.nodeLabels[nodeId].size
              };
            }
            var nodeLabelAreaList = that.publisher.getInstant("get_graph_view_label_area", {
              nodeLabels:nodeLabels,
              skin:graphViewSettings.skin
            });
            var nodeMappingHint = graphViewSettings.nodeMapping;
            graphViewSettings.layout = that.publisher.getInstant("get_layout_by_name",'basicLayout');
            // Create node layout for GraphView
            graphViewSettings.nodeMapping = that.publisher.getInstant("get_node_mapping", {
              graphId:graphViewSettings.graphId,
              model:graphViewSettings.graphModel,
              hint:nodeMappingHint,
              layout:graphViewSettings.layout,
              nodeLabelAreaList:nodeLabelAreaList,
              area:graphArea
            });

           // that.publisher.publish(['hide_all_graphs']);
            that.publisher.publish(["draw_graph_view", graphViewSettings]);
          });

        }});
      };

      var onSelect = function(position, graphId){
        // set position of old selected graph to 'not to be shown'
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) that.selectedPosition[i] = 'not to be shown';
        }

        // set position of newly selected graph
        that.selectedPosition[graphId] = position;

        // say about this event to all subscribers
        that.publisher.publish(['graph_position_changed', {graphId:graphId, position:position}]);
      };

      var leftGraphId = null, rightGraphId = null;
      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'leftGraphView') leftGraphId = i;
      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'rightGraphView') rightGraphId = i;

      // clear our container
      $('#'+c.id).html('');

      // create New and Trash Buttons
      var generalButtonsContainer = YOVALUE.createElement('div',{class:'GeneralButtons'});
      document.getElementById(c.id).appendChild(generalButtonsContainer);
      generalButtonsContainer.appendChild(that.UI.createButton({name:'New',label:'New', callback:showNew}));
      generalButtonsContainer.appendChild(that.UI.createButton({name:'Trash',label:'Trash', callback:showTrash}));

      // create containers for select boxes
      $('#'+c.id).append('<div id="leftSelectContainer" class="GraphMenu"></div>');
      $('#'+c.id).append('<div id="rightSelectContainer" class="GraphMenu"></div>');

      // create left and right select box
      document.getElementById('leftSelectContainer').appendChild(that.UI.createSelectBox({name:'leftGraphView', items:items, defaultValue:leftGraphId, callback:onSelect}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createSelectBox({name:'rightGraphView', items:items, defaultValue:rightGraphId, callback:onSelect}));

      // add edit and remove buttons to the right of select boxes
      document.getElementById('leftSelectContainer').appendChild(that.UI.createButton({name:'EditName',label:'Edit name', callback:function(){onEdit('leftGraphView')}}));
      document.getElementById('leftSelectContainer').appendChild(that.UI.createButton({name:'Remove', label:'Remove', callback:function(){onRemove('leftGraphView')}}));
      document.getElementById('leftSelectContainer').appendChild(that.UI.createButton({name:'Clones', label:'Clones', callback:function(){showClones('leftGraphView')}}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Edit', label:'Edit', callback:function(){onEdit('rightGraphView')}}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Remove', label:'Remove', callback:function(){onRemove('rightGraphView')}}));
    });
  }
};
