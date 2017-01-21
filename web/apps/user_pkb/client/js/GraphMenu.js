/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param publisher
 * @param viewManager
 * @param UI
 * @param jQuery
 * @constructor
 */
GRASP.GraphMenu = function(publisher, viewManager, UI, jQuery){
  this.publisher = publisher;
  this.selectedPosition = {};  // {graphId:<'leftGraphView', 'rightGraphView', 'not to be shown'>, ...}
  this.viewManager = viewManager;
  this.UI = UI;
  this.jQuery = jQuery;

  this.container = this.viewManager.getViewContainer('horizontalMenu');
};

GRASP.GraphMenu.prototype = {
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
            event.setResponse(GRASP.extractKeyValues(graphIds, that.selectedPosition));
          });
        }else{
          event.setResponse(GRASP.extractKeyValues(graphIds, this.selectedPosition));
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
          'submit':{type:'button', label:'Изменить'}
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
            'name':{type:'text', label:'Name:'},
            'submit':{type:'button', label:'Создать'}
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

      var calculateBayes = function(position){
        var graphId = null;
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == position) graphId = i;
        }
        if(typeof(graphs[graphId]) == 'undefined') return;
        that.publisher.publish(['calculate_bayes_probabilities', {graphId:graphId}]);
      };

      /**
       * show list of clones of graph selected in position pos
       * @param pos
       */
      var showClones = function(pos){
        var graphId;

        // determine graphId selected on position pos
        for(var i in that.selectedPosition){
          if(that.selectedPosition[i] == pos) graphId = i;
        }

        var showGraph = function(cloneId){
          // get graph diff and show it
          that.publisher.publish(['load_graph_models', {graphIds:[cloneId]}]).then(function(){
            // change change graph position
            that.selectedPosition[cloneId] = 'rightGraphView';
            // and then show them
            that.publisher.publish('show_graphs');
            that.UI.closeModal(m);
          });
        };

        var clonedFromList = that.UI.createList(clones[graphId]['cloned_from'],
            {
              'show clone': showGraph,
              'show diff':function(cloneId){
                // get graph diff and show it
                that.publisher.publish(['load_graph_models', {graphIds:['diff_'+cloneId+'_'+graphId]}]).then(function(){
                  // and then show them
                  that.publisher.publish('show_graphs');
                  that.UI.closeModal(m);
                });
              }
            });

        var clonedToList = that.UI.createList(clones[graphId]['cloned_to'],
            {
              'show clone': showGraph,
              'show diff':function(cloneId){
                // get graph diff and show it
                that.publisher.publish(['load_graph_models', {graphIds:['diff_'+graphId+'_'+cloneId]}]).then(function(){
                  // and then show them
                  that.publisher.publish('show_graphs');
                  that.UI.closeModal(m);
                });
              }
            });

        var m = that.UI.createModal();

        var cloneListContainer = GRASP.createElement('div', {});
        cloneListContainer.appendChild(GRASP.createElement('h1', {}, 'Cloned from'));
        cloneListContainer.appendChild(clonedFromList);
        cloneListContainer.appendChild(GRASP.createElement('h1', {}, 'Cloned to'));
        cloneListContainer.appendChild(clonedToList);

        that.UI.setModalContent(m,cloneListContainer);
      };

      /**
       * Graph select
       * @param position
       * @param graphId
       */
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
      var generalButtonsContainer = GRASP.createElement('div',{class:'GeneralButtons'});
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
      document.getElementById('leftSelectContainer').appendChild(that.UI.createButton({name:'CalculateBayes', label:'Bayes|>', callback:function(){calculateBayes('leftGraphView')}}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Edit', label:'Edit', callback:function(){onEdit('rightGraphView')}}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Remove', label:'Remove', callback:function(){onRemove('rightGraphView')}}));

      // Share button
      document.getElementById(c.id).appendChild(that.UI.createButton({name:'Share',label:'Share', callback:function(){
        var m = that.UI.createModal();
        var uniqId = Math.floor(Math.random()*10000);
        var embedJSCode = '<div id="grasp-how-'+uniqId+'"><script src="http://www.grasp.how/embedjs/['+leftGraphId+']/grasp-how-'+uniqId+'"></script></div>';
        var embedImageCode = '<a target="_blank" href="http://www.grasp.how/embed/['+leftGraphId+']"><img src="http://www.grasp.how/img/graph_shots/'+leftGraphId+'.jpg"></a>';
        that.UI.setModalContent(
            m,
            that.UI.createForm({
              'title':{
                type:'title',
                value:'To place the "'+graphs[leftGraphId].getGraphName()+'" in a web page, copy snippet below'
              },
              'tabs':{
                type:'tabs',
                items:{
                  'javascript code':GRASP.createElement('textarea',{},embedJSCode),
                  'image':GRASP.createElement('textarea',{},embedImageCode)
                },
                defaultItem:'javascript code'
              }
            })
        );
      }}));
      document.getElementById(c.id).appendChild(GRASP.createElement('a',{href:'/logout',class:'logout'},'logout'));
    });
  }
};
