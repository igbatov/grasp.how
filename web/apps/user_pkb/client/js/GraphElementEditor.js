/**
 * Module that allows to edit node and edge content and properties.
 * You can think of it as node editor's View in MVC model.
 * It fires 'request_for_graph_element_content_change' when user manipulates an editor
 * (writes text, changes node type and etc.)
 * @param publisher
 * @param ViewManager
 * @param UI
 * @param jQuery
 * @param ajaxIndicator
 * @constructor
 */
YOVALUE.GraphElementEditor = function(publisher, ViewManager, UI, jQuery, ajaxIndicator){
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;

  this.currentElementHash = null;
  this.currentEvent = null;

  this.ajaxIndicator = ajaxIndicator;

  this.leftContainer = this.ViewManager.getViewContainer('leftGraphElementEditor');
  this.rightContainer = this.ViewManager.getViewContainer('rightGraphElementEditor');

  var $ = this.jQuery, that = this;


  // Fire event on editor focusin and focusout
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('focus', 'input, select, textarea', function(e){
    that.publisher.publish(['element_editor_focusin', {}]);
  });
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('focusout', 'input, select, textarea', function(e){
    that.publisher.publish(['element_editor_focusout', {}]);
  });
};

YOVALUE.GraphElementEditor.prototype = {
  NODE_TYPE_FACT: 'fact',
  NODE_TYPE_PROPOSITION: 'proposition',
  eventListener: function(event){
    var $ = this.jQuery, v;

    // save for reload()
    this.currentEvent = event;

    if(event.getData().position == 'rightGraphView') v = $('#'+this.leftContainer.id);
    else if(event.getData().position == 'leftGraphView') v = $('#'+this.rightContainer.id);

    var eventName = event.getName();
    switch (eventName)
    {
      case "show_graph_element_editor":

        var newElementHash = JSON.stringify({
          graphId:event.getData().graphId,
          elementId:event.getData().elementType == 'node' ? event.getData().nodeId : event.getData().edge.id
        });

        // only one editor can be opened
        if(this.currentElementHash != null && this.currentElementHash != newElementHash) return;

        v.html('');
        if(event.getData().elementType == 'node'){
          // show in view-only form
          if(!event.getData().isEditable) document.getElementById(v.attr('id')).append(this.ajaxIndicator);
          document.getElementById(v.attr('id')).appendChild(
            this._createNodeForm(
              event.getData().graphId,
              event.getData().isEditable,
              event.getData().nodeTypes,
              event.getData().nodeId,
              event.getData().nodeContentId
          ));
        }else if(event.getData().elementType == 'edge'){
          document.getElementById(v.attr('id')).appendChild(
            this._createEdgeForm(
              event.getData().graphId,
              event.getData().isEditable,
              event.getData().edgeTypes,
              event.getData().edge
          ));
        }
        v.show();
        break;
      case 'hide_graph_element_editor':
        this.currentElementHash = null;
        $('#'+this.leftContainer.id).hide();
        $('#'+this.rightContainer.id).hide();
        break;
      default:
        break;
    }
  },

  _reloadEvent: function(){
    this.eventListener(this.currentEvent);
  },

  _createNodeForm: function(graphId, isEditable, nodeTypes, nodeId, nodeContentId){
    // select list for node types
    var that = this;

    // define callbacks for fields
    var removeNode = function(){
      if(confirm('Are you sure?')){
        that.publisher.publish(["request_for_graph_model_change", {graphId: graphId, type: 'removeNode', elementId: nodeId}]);
      }
    };

    var addAlternative = function(){
      var modalWindow = that.UI.createModal();
      var form = that.UI.createForm({
            label: {label:'Введите название альтернативной теории',type:'text',value:'',callback:function(){}},
            button:{type:'button', label:'Добавить'}
          },
          // form submit callback
          function (form) {
            // set form fields to item
            that.publisher.publish(["request_for_graph_element_content_change", {
              graphId: graphId, 
              type: 'addAlternative', 
              nodeContentId: nodeContentId,
              label: form.label
            }]).then(function(){
              that._reloadEvent();
            });

            that.UI.closeModal(modalWindow);
          });
      that.UI.setModalContent(modalWindow, form);
    };

    /*
     var addIcon = function(files,ul){

     that.publisher.publish(['request_for_graph_element_content_change', {
     graphId: graphId,
     type: 'addIcon',
     file: files,
     nodeContentId: node.nodeContentId
     }]);
     };
     var removeIcon = function(){};
     */

    // create empty form with all necessary fields
    var formDef = {};
    formDef['active_alternative_id'] = {type:'hidden'};
    formDef['addAlternative'] = {type:'hidden'};
    formDef['removeAlternative'] = {type:'hidden'};
    formDef['removeButton'] ={type:'button',label:'remove Node'};
    formDef['type'] = {type:'select',items:[],value:''};
    formDef['importance'] =  {type:'range',min:0,max:99,step:1,value:100};
    formDef['node-alternative_division_line'] = {type:'hidden'};
    formDef['label'] =       {type:'textarea',value:''};
    formDef['editConditionals'] ={type:'hidden'};
    formDef['reliability'] = {type:'hidden'};
    //  formDef['icon'] =        {type:'file',items:{},addCallback:addIcon,removeCallback:removeIcon};
    formDef['text'] ={type:'textarea',label:''};
    formDef['list'] ={type:'list'};

    var form = this.UI.createForm(formDef);

    this.publisher
        .publish(
            ['get_graph_node_content', {graphId:graphId, nodeContentIds:[nodeContentId]}]
        )
      // nodes - text, list - sources or falsifications
        .then(function(contents){
          var node = contents[nodeContentId];
          var activeAlternative = node.alternatives[node.active_alternative_id];
          var types = nodeTypes.reduce(function(prev,curr){ prev[curr]=curr; return prev; },{});

          var attrChange = function(name,value){
            that.publisher.publish(['request_for_graph_element_content_change', {
              graphId: graphId,
              type: 'updateNodeAttribute',
              nodeContentId: nodeContentId,
              node_alternative_id: node.active_alternative_id, 
              nodeAttribute: {name:name, value:value}
            }]).then(function(){
              // if attribute is importance or label we do not want to reload whole node editor
              if(name != 'importance' && name != 'label') that._reloadEvent();
            });
          };

          var removeAlternative = function(){

            if(YOVALUE.getObjectKeys(node.alternatives).length == 2){
              alert('Извините, но должно быть минимум 2 альтернативы!');
              return;
            }
            if(confirm('Вы уверены?')){
              that.publisher.publish(['request_for_graph_element_content_change', {
                    graphId: graphId,
                    type: 'removeAlternative',
                    nodeContentId: nodeContentId,
                    node_alternative_id: node.active_alternative_id
              }]).then(function(){
                that._reloadEvent();
              });
            }

          };

          var editConditionals = function(){
            var model = that.publisher.getInstant('get_graph_models', [graphId])[graphId];
            var parentEdges = model.getEdges(model.getEdgesFromParentIds(nodeId));
            var parentNodeIds = [];
            for(var i in parentEdges) parentNodeIds.push(parentEdges[i].source);
            var parentNodes = model.getNodes(parentNodeIds);
            var parentNodeContentIds = [];
            console.log(parentNodes);
            for(i in parentNodes) parentNodeContentIds.push(parentNodes[i].nodeContentId);
            that.publisher
                .publish(
                    ['get_graph_node_content', {graphId:graphId, nodeContentIds:parentNodeContentIds}]
                )
              // nodes - text, list - sources or falsifications
                .then(function(parentContents){
                  console.log(parentContents);

                  var fields = {};
                  var formKeys = [{}];

                  // add parentContent alternatives to formKeys:
                  // input formKeys = [{p1:1},{p1:2}]
                  // output [{p1:1,p2:1},{p1:1,p2:1},{p1:2,p2:1},{p1:2,p2:1}]
                  function addAlternativeColumn(formKeys, parentContentId, parentContent){
                    for(var i in formKeys){
                      for(var parentAlternativeId in parentContent.alternatives){
                        var row = YOVALUE.clone(formKeys[i]);
                        row[parentContentId] = parentAlternativeId;
                        formKeys.push(row);
                      }
                      delete formKeys[i];
                    }
                  }
                  for(var parentContentId in parentContents){
                    addAlternativeColumn(formKeys, parentContentId, parentContents[parentContentId]);
                  }

                  // create form fields for each combination of parent alternatives
                  for(var i in formKeys){
                    var fieldLabel = '';
                    for(var j in formKeys[i]){
                      fieldLabel = parentContents[j].alternatives[formKeys[i][j]].label;
                      fields[i+'_'+j+'_label'] = {type:'title',value:'ЕСЛИ - "'+fieldLabel+'"'};
                    }
                    fields[i+'_label'] = {type:'title',value:'ТО ВЕРОЯТНОСТЬ - "'+activeAlternative.label+'"'};
                    var formKeyStr = JSON.stringify(formKeys[i]);
                    fields[formKeyStr] = {type:'text', value:activeAlternative.p[formKeyStr]};
                  }

                  fields['button'] = {type:'button', label:'Сохранить'};

                  var modalWindow = that.UI.createModal();
                  var form = that.UI.createForm(
                    fields,
                    // form submit callback
                    function (form) {
                     var probabilities = {};
                      for(var i in formKeys){
                        var formKeyStr = JSON.stringify(formKeys[i]);
                        if(form[formKeyStr]>=0 && form[formKeyStr]<=1) probabilities[formKeyStr] = form[formKeyStr];
                        else{
                          alert('Вероятность должна быть больше 0 и меньше 1');
                          return true;
                        }
                     }
                     that.publisher.publish(["request_for_graph_element_content_change", {
                           graphId: graphId,
                           type: 'updateNodeAttribute',
                           nodeContentId: nodeContentId,
                           node_alternative_id: node.active_alternative_id,
                           nodeAttribute: {name:'p', value:probabilities}
                         }]).then(function(){
                       that._reloadEvent();
                     });
                     that.UI.closeModal(modalWindow);
                     return true;
                   });

                   that.UI.setModalContent(modalWindow, form);
                });
          };

          if(node.type == that.NODE_TYPE_PROPOSITION){
            that.UI.updateForm(form, 'active_alternative_id', {type:'select',items:[],callback:attrChange});
            that.UI.updateForm(form, 'addAlternative', {type:'button',label:'Add alternative',callback:addAlternative});
            that.UI.updateForm(form, 'removeAlternative', {type:'button',label:'Remove alternative',callback:removeAlternative});
            that.UI.updateForm(form, 'node-alternative_division_line', {type:'title',value:'================== Alternative =============='});
          }

          if(node.type == that.NODE_TYPE_PROPOSITION || node.type == that.NODE_TYPE_FACT){
            // if node is a child - let user edit its conditional probabilities
            that.UI.updateForm(form, 'editConditionals', {type:'button',label:'Conditional probabilities',callback:editConditionals});
            that.UI.updateForm(form, 'reliability', {type:'range',min:0,max:99,step:1,value:activeAlternative.reliability,callback:attrChange,disabled:true});
          }

          that.UI.updateForm(form, 'type', {type:'select',items:types,defaultValue:node.type,callback:attrChange});
          that.UI.updateForm(form, 'importance', {type:'range',min:0,max:99,step:1,value:node.importance,callback:attrChange});
          that.UI.updateForm(form, 'label', {type:'textarea',value:activeAlternative.label,callback:attrChange});
          //  formDef['icon',      {type:'file',items:{},addCallback:addIcon,removeCallback:removeIcon};
          that.UI.updateForm(form, 'removeButton', {type:'button',label:'remove Node',callback:removeNode});

          that._addContent(form, nodeContentId, node.type, graphId, isEditable, contents);
    });



    return form;
  },

  /**
   * Create promises to add text and source list (for fact) or falsification list (for proposition)
   * @param form
   * @param nodeContentId
   * @param graphId
   * @param isEditable
   * @private
   */
  _addContent: function(form, nodeContentId, nodeType, graphId, isEditable, contents){
    console.log('+++++++++++++++++++',YOVALUE.clone(contents));

    var that = this;
    var active_alternative_id = contents[nodeContentId]['active_alternative_id'];

    var editNodeText = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeText',
        nodeContentId: nodeContentId,
        node_alternative_id: active_alternative_id,
        text: value
      }]);
    };

    var alternatives = contents[nodeContentId]['alternatives'];

    if(nodeType == that.NODE_TYPE_PROPOSITION){
      // create list of alternative labels
      var alternativeLabels = {};
      for(var i in alternatives){
        alternativeLabels[i] = alternatives[i].label;
      }

      // update alternatives select
      that.UI.updateForm(form,'active_alternative_id',{items:alternativeLabels, defaultValue:contents[nodeContentId]['active_alternative_id']});
    }

    // update node text
    var nodeText = alternatives[contents[nodeContentId]['active_alternative_id']]['text'];
    if(isEditable){
      that.UI.updateForm(form,'text',{type:'textarea', value:nodeText, callback:editNodeText});
    }else{
      that.UI.updateForm(form,'text',{type:'textarea', value:nodeText, callback:editNodeText, disabled:true});
    }

    if(nodeType != that.NODE_TYPE_FACT && nodeType != that.NODE_TYPE_PROPOSITION) return;

    // create HTMLElements from list
    var list = alternatives[active_alternative_id]['list'];
    var htmllist = {};
    for(var i in list) htmllist[i] = that._createHTMLFromListItem(list[i], nodeType);

    var updateListItem = function(id, el){
      that._editListItem(graphId, nodeContentId, active_alternative_id, nodeType, list[id], function(graphId, nodeContentId, node_alternative_id, item){
        // save updated list
        that.publisher
          .publish(['request_for_graph_element_content_change', {type:'node_list_update_request', graphId: graphId, nodeContentId: nodeContentId, node_alternative_id:node_alternative_id, item: item, nodeType:nodeType}])
          .then(function (updateAnswer) {
            that._reloadEvent();
          });
      });
      return true;
    };

    var removeListItem = function(id, el){
      // save updated list
      that.publisher.publish(
          ['request_for_graph_element_content_change', {type:'node_list_remove_request', graphId:graphId, nodeContentId:nodeContentId, node_alternative_id:active_alternative_id, nodeType:nodeType, itemId:id}]
      ).then(function(updateAnswer){
          that._reloadEvent();
      });
      return true;
    };

    // define and add "add source button"
    var addCallback = function(){
      that._editListItem(graphId, nodeContentId, active_alternative_id, nodeType, {},
          function(graphId, nodeContentId, node_alternative_id, item){
            that.publisher
            .publish(['request_for_graph_element_content_change', {type:'node_list_add_request', graphId: graphId, nodeContentId: nodeContentId, node_alternative_id:active_alternative_id, nodeType:nodeType, item:item}])
            .then(function () {
              that._reloadEvent();
            });
      });
    };

    that.UI.updateForm(form, 'list', {
      type:'list',
      items:htmllist,
      itemActions:{edit:updateListItem, remove:removeListItem},
      addLabel: (nodeType == that.NODE_TYPE_FACT ? 'add source' : 'add falsification'),
      addCallback: addCallback
    });
  },

  /**
   * Creating HTMLElement from node's list item
   * @param item - is a source (= {author:<string>, url:<string>, name:<string>, publisher:<string>}) or falsification
   * @returns {HTMLElement}
   * @private
   */
  _createHTMLFromListItem: function(item, nodeType){
    var el = null;
    if(nodeType == this.NODE_TYPE_FACT){
      if(typeof(item.url) != 'undefined' && item.url.length > 0){
        el = YOVALUE.createElement('a',{href:item.url, target:'_blank', title:this._lineBreaksForTooltips(item.comment)}, item.author+' / '+item.name+' / '+item.publisher);
      }else{
        el = document.createTextNode(item.author+' / '+item.name+' / '+item.publisher);
      }
    }else if(nodeType == this.NODE_TYPE_PROPOSITION){
      el = document.createTextNode(item.name);
    }
    return el;
  },

  _lineBreaksForTooltips: function(text){
    return text.replace("\r\n","&#013;");
  },

  _createEdgeForm: function(graphId, isEditable, edgeTypes, edge){
    var that = this;
    if(!isEditable) return '';
    var onchange = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateEdgeAttribute',
        edgeContentId: edge.edgeContentId,
        edgeAttribute: {name:name, value:value}
      }]);
    };
    var form = this.UI.createForm({
      'label':{
        type:'text',
        value:edge.label,
        callback:onchange
      },
      'type':{
        type:'select',
        items:edgeTypes.reduce(function(prev,curr){ prev[curr]=curr; return prev; },{}),
        value:edge.type,
        callback:onchange
      },
      'removeButton':{
        type:'button',
        label:'Remove edge',
        callback:function(){
          if(confirm('Are you sure?')){
            that.publisher.publish(["request_for_graph_model_change", {graphId: graphId, type: 'removeEdge', elementId:edge.id}]);
          }
        }
      }
    });

    return form;
  },

  /**
   * - Show modal window with node source fields
   * - Publish add/update event on form submit
   * - Call callback (graphId, nodeContentId,  item}
   * @param graphId
   * @param nodeContentId
   * @param node_alternative_id
   * @param nodeType
   * @param item - {name1:value1, name2:value2, ...}
   * @param callback - arguments are (graphId, nodeContentId, item)
   * @private
   */
  _editListItem: function(graphId, nodeContentId, node_alternative_id, nodeType, item, callback){
    var that = this;
    item = item || {};
    var modalWindow = that.UI.createModal();
    var form = {};
    var formFields = {};

    var _createSourceFields = function(){
       var formFields = {
        'source_type':{'type':'select', 'label':'Тип', callback:function(name, value){},
          'items':{
            'article':'статья (peer-reviewed)',
            'meta-article':'мета-статья (peer-reviewed)',
            'textbook':'учебник',
            'book':'книга',
            'news':'новость',
            'personal experience':'личный опыт'
          },'value':'article'},
        'name':{'type':'search', label:'Название',
          findCallback:function(str){
            return that.publisher.publish(['find_sources',{substring:str}]);
          },
          selectCallback:function(name, value){
            // if value didn't come just return
            if(typeof(value.id) == 'undefined') return;

            YOVALUE.getObjectKeys(formFields).forEach(function(v){
              if(typeof(value[v]) != 'undefined'){
                that.UI.updateForm(form,v,{value:value[v]});
              }
            });
            that.UI.updateForm(form,'source_id',{value:value.id});
          },
          typeCallback:function(name, value){
            // reset default values
            YOVALUE.getObjectKeys(formFields).forEach(function(v){
              if(typeof(value[v]) != 'undefined') that.UI.updateForm(form,v,null);
            });
            that.UI.updateForm(form, 'source_type', {value:'article'});
          }
        },
        'url':{'type':'text', label:'URL'},
        'author':{'type':'text', label:'Автор'},
        'editor':{'type':'text', label:'Рецензент'},
        'publisher':{
          type:'search',
          label:'Издание (журнал, книга)',
          findCallback:function(str){
            return that.publisher.publish(['find_publishers',{substring:str}]);
          },
          selectCallback:function(name, value){
            that.UI.updateForm(form, 'publisher', {value:value.title});
            that.UI.updateForm(form, 'publisher_reliability', {value:value.reliability});
            that.UI.updateForm(form, 'scopus_title_list_id', {value:value.id});
          },
          typeCallback:function(name, value){
            that.UI.updateForm(form, 'publisher_reliability', {value:0});
            that.UI.updateForm(form, 'scopus_title_list_id', {value:null});
          }
        },
        'publisher_reliability':{type:'text',disabled:true,label:'reliability'},
        'scopus_title_list_id':{type:'hidden'},
        'publish_date':{type:'date', label:'Дата издания'},
        'pages':{type:'text', label:'Том, страницы'},
        'comment':{type:'textarea', label:'Комментарий'},
        'source_id':{type:'hidden'},
        'button':{type:'button', label:'Добавить'}
      };

      return formFields;
    };

    var _createFalsificationFields = function(){
      var formFields = {
        'name':{type:'text', label:'Название'},
        'comment':{type:'textarea', label:'Описание'},
        'button':{type:'button', label:'Добавить'}
      };
      return formFields;
    };

    if(nodeType == this.NODE_TYPE_FACT){
      formFields = _createSourceFields();
    }else if(nodeType == that.NODE_TYPE_PROPOSITION){
      formFields = _createFalsificationFields();
    }

    // fill in form fields
    if(YOVALUE.getObjectKeys(item).length){
      YOVALUE.getObjectKeys(formFields).forEach(function(v,k){
        if(typeof(item[v]) != 'undefined') formFields[v].value = item[v];
        formFields['button'].value = 'Сохранить';
      });
    }

    form = that.UI.createForm(formFields,
      // form submit callback
      function (form) {
        // set form fields to item
        YOVALUE.getObjectKeys(form).forEach(function (v) {
          if (typeof(form[v]) != 'undefined') item[v] = form[v];
        });
        callback(graphId, nodeContentId, node_alternative_id, item);
        that.UI.closeModal(modalWindow);
      }
    );


    that.UI.setModalContent(modalWindow, form);

  },

  _nl2br: function(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },

  _escapeNodeContentId: function(str){
    return str.replace('/', '\\/');
  }
};