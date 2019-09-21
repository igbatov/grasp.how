/**
 * Module that draws graph select/add/remove menu
 * Using this menu user can select graph to be on left panel (leftGraphView), right panel (rightGraphView) or be hidden (not to be shown)
 * @param publisher
 * @param viewManager
 * @param UI
 * @param formFields - instance of GRASP.FormFields
 * @param jQuery
 * @param i18n - instance of GRASP.I18n
 * @constructor
 */
GRASP.GraphMenu = function(publisher, viewManager, UI, formFields, jQuery, i18n) {
  this.publisher = publisher;
  this.selectedPosition = {};  // {graphId:<'leftGraphView', 'rightGraphView', 'not to be shown'>, ...}
  this.viewManager = viewManager;
  this.UI = UI;
  this.formFields = formFields;
  this.jQuery = jQuery;
  this.i18n = i18n;

  this.container = this.viewManager.getViewContainer('horizontalMenu');

  // internal state vars
  this.graphs = {};
  this.trashItems = {};

  this.leftGraphId = null;
  this.rightGraphId = null;
  this.leftGraphViewSelect = null;
  this.rightGraphViewSelect = null;
};

GRASP.GraphMenu.prototype = {
  eventListener: function(event){
    var that = this;
    switch (event.getName()){
      case "get_selected_positions":
        var i, graphIds = event.getData(), unknownGraphIds=[], knownGraphIds=[];

        // determine graph id which is not in this.selectedPosition yet
        for(i in graphIds){
          var isNewNodesGraph = this.publisher.getInstant("is_new_node_graph_id", {'graphId':graphIds[i]});
          if(
              typeof(this.selectedPosition[graphIds[i]]) == 'undefined'
              && !isNewNodesGraph // we do not want to process aux NewNodesGraph
          ) {
            unknownGraphIds.push(graphIds[i]);
          } else {
            knownGraphIds.push(graphIds[i]);
          }
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

    this.publisher.publish("get_graph_models").then(function(graphs){
      that.graphs = graphs;
      that.trashItems = {};
      var items = {}, i;

      // fill in items and trashItems
      for(i in graphs){
        if(!graphs[i].getAttribute('isInTrash')) items[graphs[i].getGraphId()] = graphs[i].getGraphName();
        else that.trashItems[graphs[i].getGraphId()] = graphs[i].getGraphName();
      }

      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'leftGraphView') that.leftGraphId = i;
      for(i in that.selectedPosition) if(that.selectedPosition[i] == 'rightGraphView') that.rightGraphId = i;

      // clear our container
      $('#'+c.id).html('');

      // create logo
      var leftContainer = GRASP.createElement('div', {class:'leftContainer'});
      document.getElementById(c.id).appendChild(leftContainer);
      leftContainer.appendChild(GRASP.createElement('img', {src: '/lib/client/img/grasp.how_inverse.svg', height:'46px'}));

      // create left and right select box
      var selectItems = {
        SelectGraph: {value:that.i18n.__('Open'), items:items},
        New: GRASP.createElement('div',{class:'withAddIcon'},that.i18n.__('New')),
        Clones: GRASP.createElement('div',{class:'withCloneIcon'},that.i18n.__('Clones')),
        Share: GRASP.createElement('div',{class:'withShareIcon'}, that.i18n.__('Share')),
        EditName: GRASP.createElement('div',{class:'withEditIcon'},that.i18n.__('Rename')),
        DownloadAsText: GRASP.createElement('div',{class:'withDownloadIcon'},that.i18n.__('Download as text')),
      };
      if(GRASP.getObjectLength(items) > 1) {
        selectItems.Remove = GRASP.createElement('div',{class:'withTrashIcon'},that.i18n.__('Remove'));
      }
      that.leftGraphViewSelect = that.UI.createSelectBox({
        name:'leftGraphView',
        items:selectItems,
        defaultValue:that.leftGraphId,
        callback:function(name, value) {
          if(value === 'EditName'){
            that._onEdit.call(that, 'leftGraphView');
            return false;
          } else if (value === 'Clones') {
            that._showClones.call(that, 'leftGraphView')
            return false;
          } else if (value === 'New') {
            that._showNew.call(that);
            return false;
          } else if (value === 'Share') {
            that._shareCallback.call(that);
            return false;
          } else if (value === 'Remove') {
            that._onRemove.call(that, 'leftGraphView');
            return false;
          } else if (value === 'DownloadAsText') {
            that._onDownloadAsText.call(that, 'leftGraphView');
            return false;
          } else {
            // selection of graph (value = graphId)
            that._onSelect.call(that,'leftGraphView',value);
            return true;
          }
        }
      });
      leftContainer.appendChild(that.leftGraphViewSelect);

      /*
      that.rightGraphViewSelect = that.UI.createSelectBox({
        name:'rightGraphView',
        items:items,
        defaultValue:that.rightGraphId,
        callback:function(name, value) {
          that._onSelect.call(that,'rightGraphView',value);
        }
      });
      document.getElementById('rightSelectContainer').appendChild(that.rightGraphViewSelect);
       */
      var generalButtonsContainer = GRASP.createElement('div',{class:'GeneralButtons'});
      document.getElementById(c.id).appendChild(generalButtonsContainer);
      that.publisher.publish(['get_user_settings']).then(function(settings){
        // add general menu
        var sc = GRASP.createElement('div',{class:'hamburgerSelectBoxWrapper'});
        sc.appendChild(that.UI.createSelectBox({
          name:'Hamburger',
          items:{
            'Settings': that.i18n.__('Account settings'),
            'Trash': that.i18n.__('Trash bin'),
            'Sources': that.i18n.__('Fact sources'),
            'Support': that.i18n.__('Support'),
            'Logout': that.i18n.__('Logout')
          },
          callback:function(name, value){
            if(value === 'Trash') that._showTrash.call(that, that.trashItems);
            if(value === 'Sources') that._showSources.call(that);
            if(value === 'Settings') that._showSettings.call(that, settings);
            if(value === 'Support') GRASP.openInNewTab('https://github.com/igbatov/grasp.how/issues');
            if(value === 'Logout') {
              window.location.href = '/logout';
            }
          },
          dropType:'icon'
        }));
        generalButtonsContainer.appendChild(sc);

        generalButtonsContainer.appendChild(
            GRASP.createElement('span',{class:'username'}, settings.username)
        );
        // add edit and remove buttons to the right of select boxes
        generalButtonsContainer.appendChild(
            that.UI.createButton({
              name:'CalculateBayes',
              label:that.i18n.__('Calculate Bayes'),
              type:'bigButton',
              callback:function(){that._calculateBayes.call(that, 'leftGraphView')}
            })
        );
      });
    });
  },

  _onDownloadAsText: function(position){
    var graphId = '', that = this;
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == position) graphId = i;
    }
    if(typeof(this.graphs[graphId]) == 'undefined') return;
    var nodeContentIds = Object.values(this.graphs[graphId].getNodes()).map(
      function(node){
        return node && node.nodeContentId;
      }
    );
    this.publisher.publish(
        [
          'get_graph_node_content',
          {
            graphId: graphId,
            nodeContentIds: nodeContentIds,
          }
        ]
      )
      .then(function(nodeContents){
        function replacer(key, value) {
          return value;
        }
        GRASP.saveTextToFile(JSON.stringify(nodeContents, replacer, 5), that.graphs[graphId].getGraphName() + '.json');
      });

  },

  _onRemove: function(position){
    var graphToRemoveId = '', that = this;
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == position) graphToRemoveId = i;
    }
    var remainingGraphIds = [];
    for(var i in this.selectedPosition){
      if(Object.keys(this.trashItems).indexOf(i) === -1 && i !== graphToRemoveId) remainingGraphIds.push(i);
    }
    if(typeof(this.graphs[graphToRemoveId]) == 'undefined') return true;
    if(remainingGraphIds.length == 0){
      this.UI.showAlert('Sorry, you cannot remove your only map');
      return false;
    }
    this.UI.showConfirm(
      this.i18n.__('Are you sure you want to move "%s" to trash?', this.graphs[graphToRemoveId].getGraphName()),
      function(answer){
        if(answer == 'no') return true;

        that.publisher.publish(['set_graph_attributes', {graphId:graphToRemoveId, isInTrash:true}])
          .then(function(){
            that.leftGraphViewSelect.selectItem(remainingGraphIds[0]);
            that._createView();
          });
      }
    );
  },

  _onEdit: function(position){
    var graphId = null, that = this;
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == position) graphId = i;
    }
    if(typeof(this.graphs[graphId]) == 'undefined') return;

    var m = this.UI.createModal();
    this.UI.setModalContent(m, this.UI.createForm({
      'graphId':{rowType:'hidden', value:graphId},
      'name':{rowType:'text', rowLabel:that.i18n.__('Name')+':', value:this.graphs[graphId].getGraphName()},
      'submit':{
        rowClass:'twoColumn upMarginMiddle',
        rowType:'button',
        label:that.i18n.__('save'),
        type:'bigButton uppercase'
      },
      'cancel':{
        rowClass:'twoColumn upMarginMiddle',
        rowType:'button',
        type:'bigButton white uppercase',
        label:that.i18n.__('cancel'),
        callback: function(){
          that.UI.closeModal(m);
        }
      }
    }, function(form){
      if (!form['name']) {
        alert(that.i18n.__('Sorry, name cannot be empty'));
        return;
      }
      // say about this event to all subscribers
      that.publisher.publish(['graph_name_changed', {graphId:form['graphId'], name:form['name']}]);
      // redraw menu
      that._createView();
      that.UI.closeModal(m);
    }));
  },

  /**
   * Graph select callback
   * @param position
   * @param graphId
   */
  _onSelect: function(position, graphId){
    // set position of old selected graph to 'not to be shown'
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == position) this.selectedPosition[i] = 'not to be shown';
    }

    // set position of newly selected graph
    this.selectedPosition[graphId] = position;
    for(i in this.selectedPosition) if(this.selectedPosition[i] == 'leftGraphView') this.leftGraphId = i;
    for(i in this.selectedPosition) if(this.selectedPosition[i] == 'rightGraphView') this.rightGraphId = i;

    // ugly hack to quick set variable for mousemove.com plugin
    if (window._mfq) {
      window._mfq.push(["setVariable", "graph_id", graphId]);
    }

    // say about this event to all subscribers
    return this.publisher.publish(['graph_position_changed', {graphId:graphId, position:position}]);
  },

  _showNew: function(){
    var that = this;
    var m = this.UI.createModal();
    var newGraphId = null;
    this.UI.setModalContent(
      m,
      this.UI.createForm(
        {
          'name':{rowType:'text', rowLabel:that.i18n.__('Name')+':'},
          'submit':{
            rowClass:'twoColumn upMarginMiddle',
            rowType:'button',
            label:that.i18n.__('save'),
            type:'bigButton uppercase'
          }
        },
        function(form){
          if (!form['name']) {
            alert(that.i18n.__('Sorry, name cannot be empty'));
            return;
          }
          that.publisher.publish(['create_new_graph', {name:form['name']}]).then(function(data){
            newGraphId = data['graphId'];
            // reload graphs models
            return that.publisher.publish(['load_graph_models']);
          }).then(function(){
            // redraw menu
            that._createView();
            that.leftGraphViewSelect.selectItem(newGraphId);
          });
          that.UI.closeModal(m);
        }
      )
    );
  },

  _showSettings: function(settings){
    var that = this;
    var m = this.UI.createModal();

    var form = that.UI.createForm(
        {
          'lang': {
            rowType:'select',
            rowLabel:that.i18n.__('Language'),
            withDownArrow: true,
            items:{'en':'en', 'ru':'ru'},
            value:settings['lang'],
            dropType: 'single'
          },
          // 'bayesEngine': {
          //   rowType:'select',
          //   rowLabel:that.i18n.__('Bayes engine'),
          //   withDownArrow: true,
          //   items:{'gRain':'gRain', 'WebPPL':'WebPPL'},
          //   value:settings['bayesEngine'] ? settings['bayesEngine'] : 'gRain',
          //   dropType: 'single'
          // },
          'new_password':{
            rowType:'password',
            rowLabel:that.i18n.__('New password')
          },
          'confirm_new_password':{
            rowType:'password',
            rowLabel:that.i18n.__('Confirm new password')
          },
          'password_not_equal_error':{
            rowType:'hidden',
            value:that.i18n.__('Passwords do not match'),
            rowClass: 'red'
          },
          'save':{
            rowClass:'twoColumn upMarginMiddle',
            rowType:'button',
            label:that.i18n.__('save'),
            type:'bigButton uppercase'
          },
          'cancel':{
            rowClass:'twoColumn upMarginMiddle',
            rowType:'button',
            type:'bigButton white uppercase',
            label:that.i18n.__('cancel'),
            callback: function(){
              that.UI.closeModal(m);
            }
          }
        },
        function(settings){
          // sanity check
          if (settings.new_password || settings.confirm_new_password) {
            if (settings.new_password !== settings.confirm_new_password) {
              that.UI.updateForm(form, 'password_not_equal_error', {rowType:'string'});
              return;
            }
          }

          // save settings and close modal
          that.publisher.publish(['set_user_settings', settings]).then(function(){
            that.UI.closeModal(m);
            // redraw menu with new language
            that._createView();
          });
        }
    );

    that.UI.setModalContent(m, form);
  },

  /**
   *
   * @param trashItems - {graphId: name, ...}
   * @private
   */
  _showTrash: function(trashItems){
    var that = this;
    this.UI.showModalList(trashItems,
        [
          {
            name:'restore',
            type:'icon replay grey',
            callback: function(graphId, el){
              el.parentNode.removeChild(el);
              // say about this event to all subscribers
              that.publisher.publish(['set_graph_attributes', {graphId:graphId, isInTrash:false}]).then(function(){
                // redraw menu
                that._createView();
              });
            }
          }
        ]
    );
  },

  _calculateBayes: function(position){
    var graphId = null;
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == position) graphId = i;
    }
    if(typeof(this.graphs[graphId]) == 'undefined') return;
    this.publisher.publish(['calculate_bayes_probabilities', {graphId:graphId}]);
  },

  /**
   * Show list of clones of graph selected in position pos
   * @param pos
   */
  _showClones: function(pos){
    var graphId, that=this, m = that.UI.createModal({class:'middle'});

    // determine graphId selected on position pos
    for(var i in this.selectedPosition){
      if(this.selectedPosition[i] == pos) graphId = i;
    }

    this.publisher.publish("repository_get_graphs_clone_list").then(function(clones){
      var clonedFromHtmlList = that._createHTMLFromCloneList(
          clones[graphId]['cloned_from'],
          function(){  that.UI.closeModal(m); }
      );
      var clonedToHtmlList = that._createHTMLFromCloneList(
          clones[graphId]['cloned_to'],
          function(){  that.UI.closeModal(m); }
      );
      var actionsFrom = that._createCloneListActions(graphId, 'from', m);
      var actionsTo = that._createCloneListActions(graphId, 'to', m);

      var clonedFromList = that.UI.createList(
        clonedFromHtmlList,
        actionsFrom
      );

      var clonedToList = that.UI.createList(
        clonedToHtmlList,
        actionsTo
      );

      var cloneListContainer = GRASP.createElement('div', {class:'cloneListContainer'});
      cloneListContainer.appendChild(GRASP.createElement(
          'div',
          {class:'title'},
          that.i18n.__('This map was copied from:')
      ));
      cloneListContainer.appendChild(clonedFromList);
      cloneListContainer.appendChild(GRASP.createElement(
          'div',
          {class:'title'},
          that.i18n.__('This map was copied by:')
      ));
      cloneListContainer.appendChild(clonedToList);

      that.UI.setModalContent(m, cloneListContainer);
    });
  },

  _createCloneListActions: function(graphId, direction, modalWindow){
    var that = this;
    return [
      {
        name: 'show diff',
        type:'bigButton uppercase',
        label: that.i18n.__('Difference'),
        callback: function(cloneId){
          // get graph diff and show it
          var graphDiffId = direction === 'from' ? 'diff_'+cloneId+'_'+graphId : 'diff_'+graphId+'_'+cloneId
          that.publisher.publish(['load_graph_models', {graphIds:[graphDiffId]}]).then(function(){
            // and then show them
            that.publisher.publish('show_graphs');
            that.UI.closeModal(modalWindow);
          });
        }
      }
    ];
  },

  _createHTMLFromCloneList: function (clones, callback) {
    var that = this;
    var HTMLList = {};
    var buttonCb = function(graphId){
      that._showGraph(graphId).then(function(){ callback(); });
    };
    for(var graphId in clones){
      var clone = clones[graphId];
      var c = GRASP.createElement('div',{class:"cloneItem"});
      var user = GRASP.createElement('div',{class:'user'}, clone.user.username);
      var graph = this.UI.createButton({
        label:clone.graph.name,
        name:'show_graph_'+clone.graph.id,
        type:'likeHref',
        callback: buttonCb.bind(this, graphId)
      });
      c.appendChild(user);
      c.appendChild(graph);
      HTMLList[graphId] = c;
    }
    return HTMLList;
  },

  _showGraph: function(cloneId, promise){
    var that = this;
    // get graph diff and show it
    return this.publisher.publish(['load_graph_models', {graphIds:[cloneId]}])
      .then(function(){
        // change graph position
        that.selectedPosition[cloneId] = 'rightGraphView';
        // and then show them
        that.publisher.publish('show_graphs');

        return Promise.resolve();
      });
  },

  /**
   * Share button
   */
  _shareCallback: function(){
    var graphId = this.leftGraphId;
    var that = this;
    this.publisher.publish(["get_current_graph_step", [graphId]])
    .then(function(steps){
      var step = steps[graphId];
      var m = that.UI.createModal({class:'wide'});
      var title = GRASP.createElement(
          'div',
          {class:'shareTitle'},
          that.i18n.__(
              'To place the "%s" in a web page, copy one of the snippets:',
              that.graphs[graphId].getGraphName()
          )
      );

      var data = {"graphId":graphId,"step":step,"ts":Math.round(Date.now()/1000)};
      that.publisher
        .publish(['repository_get_hash_by_snap', {graphId: graphId, step: step, ts: data.ts,  settings:'{"editMapRibbon":false}'}])
        .then(function (data) {
          var hash = data['hash']
          var linkBlock = that._getLinkShareBlock(hash);
          var jsBlock = that._getJsShareBlock(hash);
          var imgBlock = that._getImgShareBlock(hash);
          var settingsBlock = that._getSettingsShareBlock(graphId, that.graphs[graphId].getAttributes()['discussionChannel']);

          var c = GRASP.createElement('div',{class:'share'});
          var leftCol = GRASP.createElement('div', {class:'leftCol'});
          var rightCol = GRASP.createElement('div', {class:'rightCol'});

          leftCol.appendChild(title);
          leftCol.appendChild(linkBlock);
          leftCol.appendChild(jsBlock);
          leftCol.appendChild(imgBlock);

          rightCol.appendChild(settingsBlock);

          c.appendChild(leftCol);
          c.appendChild(rightCol);

          that.UI.setModalContent(m, c);
        });
    });
  },

  _getSettingsShareBlock: function(graphId, discussionChannel){
    var that = this;
    var c = GRASP.createElement('div',{});

    var title = GRASP.createElement(
      'div',
      {class:'shareTitle'},
      this.i18n.__('Display settings')
    );

    var form = this.UI.createForm({
      'discussionChannel': {
        rowType: 'text',
        value: discussionChannel,
        rowLabel: this.i18n.__('Link to discussion channel:') + ':',
        placeholder: this.i18n.__('google group, telegram, slack, ...'),
        callback: GRASP.debounce(function(name, value) {
          that.publisher.publish(['set_graph_attributes', {
            graphId:graphId,
            discussionChannel:value,
          }]);
        }, 2000),
      },
    });

    c.appendChild(title);
    c.appendChild(form);
    return c;
  },

  _getLinkShareBlock: function(hash){
    var id = this.UI.generateId();

    var title = GRASP.createElement(
      'div',
      {class:'firstTitle'},
      this.i18n.__('Link on this map')
    );
    var code = GRASP.createElement(
      'div',
      {id:id, class:'code'},
      'http://www.grasp.how/embed/' + hash + '.html',
      null,
      true
    );

    var c = GRASP.createElement('div', {});
    c.appendChild(title);
    c.appendChild(code);

    return c;
  },

  _getImgShareBlock: function(hash) {
    var imgId = this.UI.generateId();
    var imgTitle = GRASP.createElement(
      'div',
      {class:'nextTitle'},
      this.i18n.__('HTML code for non-interactive image')
    );
    var defaultImgSize = '700x500';
    var imgSizeSelect = this.UI.createSelectBox({
      name: 'imgSizeSelect',
      items: {
        '250x250': '250x250',
        '700x500': '700x500',
        '1280x960': '1280x960',
      },
      defaultValue: defaultImgSize,
      callback: function(name, key){
        var imgCode = document.getElementById(imgId);
        imgCode.innerText = imgCode.innerText.replace(new RegExp('\\(.+\\)'), '('+key+')');
      },
      dropType: 'single',
      withDownArrow: true
    });
    imgSizeSelect.className = imgSizeSelect.className+' imgSizeSelect';
    var imgSizeSelectPostfix = GRASP.createElement('span',{class:'imgSizeSelectPostfix'},'px');
    var imgCode = GRASP.createElement(
      'div',
      {id:imgId, class:'code'},
      '<a target="_blank" href=\'http://www.grasp.how/embed/' + hash + '\'>' +
      '<img src=\'http://www.grasp.how/img/graph_shots/' + hash + '('+defaultImgSize+')'+'.jpg\'>' +
      '</a>',
      null,
      true
    );
    var imgButton = this.UI.createButton({
      rowType:'button',
      type:'bigButton uppercase',
      label:this.i18n.__('copy HTML'),
      callback: function(){
        GRASP.copyToClipboard(imgId);
      }
    });


    var c = GRASP.createElement('div', {});
    c.appendChild(imgTitle);
    c.appendChild(imgSizeSelect);
    c.appendChild(imgSizeSelectPostfix);
    c.appendChild(imgCode);
    c.appendChild(imgButton);

    return c;
  },

  _getJsShareBlock: function(hash){
    // exactly the same string must be in embedjs.php document.getElementById to get outer div
    // (to insert iframe in it)
    var divId = 'grasp-how-501cb8beb66019e90ed669caadbe7ad4';
    var jsId = this.UI.generateId();

    var jsTitle = GRASP.createElement(
      'div',
      {class:'nextTitle'},
      this.i18n.__('Javascript code for interactive map')
    );

    var jsCode = GRASP.createElement(
      'div',
      {id:jsId, class:'code'},
      '<div id="'+divId+'"><script src=\'http://www.grasp.how/embed.js?data=' + hash + '\'></script></div>',
      null,
      true
    );
    var jsButton = this.UI.createButton({
      rowType:'button',
      type:'bigButton uppercase',
      label:this.i18n.__('copy javascript'),
      callback: function(){
        GRASP.copyToClipboard(jsId);
      }
    });

    var c = GRASP.createElement('div', {});
    c.appendChild(jsTitle);
    c.appendChild(jsCode);
    c.appendChild(jsButton);

    return c;
  },

  _showSources: function(){
    var that=this;
    this.publisher.publish(['repository_get_user_sources', {}]).then(function(sources){
      var htmlList = {};
      for(var i in sources) {
        htmlList[i] = that._createHTMLFromSource(sources[i]);
      }

      var itemActions = [
        {
          name:'edit',
          type:'icon edit grey',
          callback: function(index, el) {
            var item = sources[index];
            var modalWindow = that.UI.createModal();

            // create empty form with submit callback
            var form = that.UI.createForm(
                {},
                function(form) {
                  // update sources
                  GRASP.getObjectKeys(sources[index]).forEach(function (v, k) {
                    if (typeof(form[v]) != 'undefined') sources[index][v] = form[v];
                  });
                  // update server
                  that.publisher.publish(['repository_update_source', form]).then(function () {
                    el.parentNode.insertBefore(that.UI.createListItem(index, that._createHTMLFromSource(sources[index]), itemActions), el);
                    el.parentNode.removeChild(el);
                    that.UI.closeModal(modalWindow);
                  });
                }
            );

            // create fields for this form
            var formFields = that.formFields.getSourceFields(form);
            // do not find other sources by name modification
            formFields['name']['findCallback'] = function () {};
            formFields['name']['selectCallback'] = function () {};
            formFields['name']['typeCallback'] = function () {};
            // remove 'pages' field because it is set custom for each concrete node
            delete formFields['pages'];
            // remove 'source' field because we gonna use id field instead
            delete formFields['source_id'];

            // add button
            formFields['save'] = {
              rowClass:'twoColumn upMarginMiddle',
              rowType:'button',
              type:'bigButton uppercase',
              label:that.i18n.__('save')
            };
            formFields['cancel'] = {
              rowClass:'twoColumn upMarginMiddle',
              rowType:'button',
              type:'bigButton white uppercase',
              label:that.i18n.__('cancel'),
              callback: function(){
                that.UI.closeModal(modalWindow);
              }};

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
          }
        },
        {
          name:'remove',
          type:'icon delete grey',
          callback: function(index, el){
            var sourceId = sources[index].id;
            that.publisher.publish(['repository_remove_user_sources', [sourceId]]).then(function(result){
              if(result['removed'].length && result['removed'][0] == sourceId){
                el.parentNode.removeChild(el);
              }
            });
          },
          show: function(index){
            return sources[index].usedIn.length === 0;
          }
        }
      ];

      var list = GRASP.createElement('div',{});
      list.appendChild(that._createSourceHeader());
      // wrapper that prevents fixed-positioned sourceHeader to hide list below
      var wrapper = GRASP.createElement('div',{class:'sourceHeadWrapper'},'&nbsp;');
      list.appendChild(wrapper);
      list.appendChild(that.UI.createList(htmlList, itemActions));
      var modalWindow = that.UI.createModal({
        class: 'wide'
      });
      that.UI.setModalContent(modalWindow, list);
    });
  },

  _createSourceHeader: function() {
    var sourceHeader = GRASP.createElement('div',{class:'sourceHeader'});
    var c = GRASP.createElement('div',{class:'source'});
    sourceHeader.appendChild(c);

    var leftC = GRASP.createElement('div',{class:'leftC'});
    leftC.appendChild(GRASP.createElement('div',{}, this.i18n.__('Sources')));

    var rightC = GRASP.createElement('div',{class:'rightC'});
    var row = GRASP.createElement('div',{class:'usedIn'});

    var rowLeftC = GRASP.createElement('div',{class:'rowLeftC'});
    rowLeftC.appendChild(GRASP.createElement('div',{}, this.i18n.__('used in maps')));
    var rowRightC = GRASP.createElement('div',{class:'rowRightC'});
    rowRightC.appendChild(GRASP.createElement('div',{}, this.i18n.__('in nodes')));

    row.appendChild(rowLeftC);
    row.appendChild(rowRightC);

    rightC.appendChild(row);

    c.appendChild(leftC);
    c.appendChild(rightC);

    return sourceHeader;
  },

  _createHTMLFromSource: function (source) {
    var c = GRASP.createElement('div',{class:'source'});
    var leftC = GRASP.createElement('div',{class:'leftC'});
    var rightC = GRASP.createElement('div',{class:'rightC'});

    /**
     * Left column - source name and authors
     */
    if(typeof(source.url) != 'undefined' && source.url.length > 0){
      var name = GRASP.createElement('div',{class:'name'});
      var a = GRASP.createElement('a',{
        href:source.url,
        target:'_blank'
      }, source.name);
      name.appendChild(a);
    } else {
      var name = GRASP.createElement('div',{class:'name'}, source.name);
    }
    var authors = GRASP.createElement('div',{class:'authors'}, source.author);
    leftC.appendChild(name);
    leftC.appendChild(authors);

    /**
     * Right column - graphs and nodes, source used in
     */
    for(var i in source.usedIn){
      var row = GRASP.createElement('div',{class:'usedIn'});
      var rowLeftC = GRASP.createElement('div',{class:'rowLeftC'});
      rowLeftC.appendChild(
          GRASP.createElement('div',{},source.usedIn[i]['graphName'])
      );
      var rowRightC = GRASP.createElement('div',{class:'rowRightC'});
      for (var j in source.usedIn[i].usedInNodes) {
        var node = source.usedIn[i].usedInNodes[j];
        rowRightC.appendChild(
            GRASP.createElement('div',{class:'nodeName'},'&mdash;&nbsp;&nbsp;'+node.label)
        );
      }
      row.appendChild(rowLeftC);
      row.appendChild(rowRightC);
      rightC.appendChild(row);
    }

    c.appendChild(leftC);
    c.appendChild(rightC);
    return c;
  }
};
