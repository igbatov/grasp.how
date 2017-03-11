/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param publisher
 * @param viewManager
 * @param UI
 * @param formFields
 * @param jQuery
 * @constructor
 */
GRASP.GraphMenu = function(publisher, viewManager, UI, formFields, jQuery){
  this.publisher = publisher;
  this.selectedPosition = {};  // {graphId:<'leftGraphView', 'rightGraphView', 'not to be shown'>, ...}
  this.viewManager = viewManager;
  this.UI = UI;
  this.formFields = formFields;
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
            // change graph position
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
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Edit', label:'Edit name', callback:function(){onEdit('rightGraphView')}}));
      document.getElementById('rightSelectContainer').appendChild(that.UI.createButton({name:'Remove', label:'Remove', callback:function(){onRemove('rightGraphView')}}));

      // Share button
      document.getElementById('leftSelectContainer').appendChild(that.UI.createButton({name:'Share',label:'Share', class:'share_button', callback:function(){
        var m = that.UI.createModal();
        var uniqId = Math.floor(Math.random()*10000);
        var embedJSCode = '<div id="grasp-how-'+uniqId+'"><script src=\'http://www.grasp.how/embed.js?data={"graphIds":['+leftGraphId+'],"uniqId":"grasp-how-'+uniqId+'"}\'></script></div>';
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

      // Sources button
      generalButtonsContainer.appendChild(
        that.UI.createButton({
          name:'Sources',
          label:'Sources',
          class:'sources_button',
          callback:function(){
            that.publisher.publish(['repository_get_user_sources', {}]).then(function(sources){
              var items = {};

              function createSourceDOM(source){
                var dom = GRASP.createElement('div', {}, source.name
                    +' //'+source.author+' // '
                    +source.publisher
                    +' // (rel. '+source.publisher_reliability
                    +')\n || Used in graphs:\n');

                // create DOM for nodes used in sources[i]
                for(var j in source.usedIn){
                  var usedInNodesLabels = 'Used in nodes:\n';
                  for(var k in source.usedIn[j].usedInNodes) usedInNodesLabels += '"'+source.usedIn[j].usedInNodes[k].label+'",';
                  var graph = that.UI.addToopltip(GRASP.createElement('div', {}, source.usedIn[j]['graphName']), usedInNodesLabels);
                  dom.appendChild(graph);
                }

                return dom;
              }

              // create label for every source
              for(var i in sources){
                items[sources[i].id] = createSourceDOM(sources[i]);
              }

              var itemActions = {
                edit:function(id, el){
                  var item = sources[id];
                  var modalWindow = that.UI.createModal();
                  // create blank form with submit callback
                  var form = that.UI.createForm(
                      {},
                      function(form) {
                        // update sources
                        GRASP.getObjectKeys(sources[id]).forEach(function (v, k) {
                          if (typeof(form[v]) != 'undefined') sources[id][v] = form[v];
                        });
                        // update server
                        that.publisher.publish(['repository_update_source', form]).then(function () {
                          el.parentNode.insertBefore(that.UI.createListItem(id, createSourceDOM(sources[id]), itemActions), el);
                          el.parentNode.removeChild(el);
                          that.UI.closeModal(modalWindow);
                        });
                      }
                  );

                  // create fields for this form
                  var formFields = that.formFields.getSourceFields(form);
                  // do not find other sources by name modification
                  formFields['name']['findCallback'] = function () {
                  };
                  formFields['name']['selectCallback'] = function () {
                  };
                  formFields['name']['typeCallback'] = function () {
                  };
                  // remove 'pages' field because it is set custom for each concrete node
                  delete formFields['pages'];
                  // remove 'source' field because we gonna use id field instead
                  delete formFields['source_id'];

                  // fill in form fields
                  if (GRASP.getObjectKeys(item).length) {
                    GRASP.getObjectKeys(formFields).forEach(function (v, k) {
                      if (typeof(item[v]) != 'undefined') formFields[v].value = item[v];
                    });
                  }

                  // fill blank form with fields
                  for (var fieldName in formFields) {
                    that.UI.updateForm(form, fieldName, formFields[fieldName]);
                  }

                  // show/hide fields in a form according to item source_type
                  if (item.source_type) formFields['source_type'].callback('', item.source_type);

                  that.UI.setModalContent(modalWindow, form);
                },
                remove: function(id, el){
                  that.publisher.publish(['repository_remove_user_sources', [id]]).then(function(result){
                    if(result['removed'].length && result['removed'][0] == id){
                      el.parentNode.removeChild(el);
                    }
                  });
                }
              };
              that.UI.showModalList(items, itemActions);

            });
          }
        })
      );

      // logout button
      document.getElementById('rightSelectContainer').appendChild(GRASP.createElement('a',{href:'/logout',class:'logout'},'logout'));

      // username
      that.publisher.publish(['get_username']).then(function(data){
        document.getElementById('rightSelectContainer').appendChild(GRASP.createElement('span',{class:'username'},data.username));
      });
    });
  }
};
