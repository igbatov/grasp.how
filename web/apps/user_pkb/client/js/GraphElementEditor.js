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
GRASP.GraphElementEditor = function(publisher, ViewManager, UI, jQuery, ajaxIndicator){
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;

  this.currentElement = null;
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

GRASP.GraphElementEditor.prototype = {
  NODE_TYPE_FACT: 'fact',
  NODE_TYPE_PROPOSITION: 'proposition',
  DEFAULT_ALTERNATIVE_LABEL_PREFIX: 'NOT TRUE: ',
  eventListener: function(event){
    var $ = this.jQuery, v;

    if(event.getData().position == 'rightGraphView') v = $('#'+this.leftContainer.id);
    else if(event.getData().position == 'leftGraphView') v = $('#'+this.rightContainer.id);

    var eventName = event.getName();
    switch (eventName)
    {
      case "graph_element_content_changed":
        if(this.currentElement == null) break;
        if(event.getData().graphId != this.currentElement.graphId) break;

        // reload editor if some reliabilities changed
        if(event.getData().type == 'updateNodesReliabilities'){
          this._reloadEvent();
          break;

        }else{
          // If this is update of opened node, then reload it
          if(event.getData().nodeContentId == this.currentElement.elementId
              && this.getEventElementType(event) == this.currentElement.elementType)
          {
            if([
                'addAlternative', 'removeAlternative', 'updateAlternative', 'updateNodeAlternativesP',
                'node_list_update_request', 'node_list_remove_request', 'node_list_add_request'
              ].indexOf(event.getData().type) != -1){
              this._reloadEvent();
              break;

            }else if(event.getData().type == 'updateNodeAttribute'
                && event.getData().nodeAttribute.name != 'importance'
                && event.getData().nodeAttribute.name != 'label'){
              this._reloadEvent();
              break;

            }
          }
        }

        break;

      case "show_graph_element_editor":
        var currentElement = {
          graphId:event.getData().graphId,
          elementType:event.getData().elementType,
          elementId:event.getData().elementType == 'node' ? event.getData().nodeContentId : event.getData().edge.id
        };

        // we do not want to open another editor, we let renew this one
        if(this.currentElement != null && JSON.stringify(this.currentElement) != JSON.stringify(currentElement)) return;

        this.currentElement = currentElement;
        // save for reload()
        this.currentEvent = event;

        v.html('');
        if(event.getData().elementType == 'node'){
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
        this.currentElement = null;
        this.currentEvent = null;

        $('#'+this.leftContainer.id).hide();
        $('#'+this.rightContainer.id).hide();
        break;
      default:
        break;
    }
  },

  getEventElementType: function(event){
    if(event.getName() == 'graph_element_content_changed' && [
      'updateEdgeAttribute',
      'addEdge',
    ].indexOf(event.getData().type) != -1) return 'edge';

    if(event.getName() == 'graph_element_content_changed' && [
      'updateNodeAttribute',
      'addAlternative',
      'removeAlternative',
      'updateAlternative',
      'updateNodeAlternativesP',
      'updateNodeText',
      'node_list_update_request',
      'node_list_remove_request',
      'node_list_add_request',
      'addNode',
      'addIcon',
    ].indexOf(event.getData().type) != -1) return 'node';

    return false;
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
            //label: {label:'Введите название альтернативной теории',type:'text',value:'',callback:function(){}},
            label: {label:'Please, enter name of the alternative proposition',type:'text',value:'',callback:function(){}},
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
            }]);

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
    formDef['editConditionals'] ={type:'hidden'};
    formDef['active_alternative_id'] = {type:'hidden'};
    formDef['addAlternative'] = {type:'hidden',disabled:!isEditable};
    formDef['removeAlternative'] = {type:'hidden',disabled:!isEditable};
    formDef['removeButton'] ={type:'button',label:'remove Node',disabled:!isEditable};
    formDef['type'] = {type:'select',items:[],value:'',disabled:!isEditable};
    formDef['importance'] =  {type:'range',min:0,max:99,step:1,value:100,disabled:!isEditable};
    formDef['node-alternative_division_line'] = {type:'hidden'};
    formDef['label'] = {type:'textarea',value:'',disabled:!isEditable};
    formDef['reliability'] = {type:'hidden'};
    //  formDef['icon'] =        {type:'file',items:{},addCallback:addIcon,removeCallback:removeIcon};
    formDef['text'] ={type:'textarea',label:'',disabled:!isEditable};
    formDef['list'] ={type:'list',disabled:!isEditable};

    var form = this.UI.createForm(formDef);

    this.publisher
        .publish(
            ['get_graph_node_content', {graphId:graphId, nodeContentIds:[nodeContentId]}]
        )
      // nodes - text, list - sources or falsifications
        .then(function(contents){

         console.info('contents',GRASP.clone(contents));

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
            }]);

            // if node is of type FACT then we should also automatically rename its alternative on label edit
            if(name == 'label' && node.type == that.NODE_TYPE_FACT){
              that.publisher.publish(['request_for_graph_element_content_change', {
                graphId: graphId,
                type: 'updateNodeAttribute',
                nodeContentId: nodeContentId,
                node_alternative_id: 1,
                nodeAttribute: {name:name, value:that.DEFAULT_ALTERNATIVE_LABEL_PREFIX+value}
              }]);
            }
          };

          var removeAlternative = function(){

            if(GRASP.getObjectKeys(node.alternatives).length == 2){
              //alert('Извините, но должно быть минимум 2 альтернативы!');
              alert('Sorry, you cannot have only one alternative');
              return;
            }
            if(confirm('Are you sure?')){
              that.publisher.publish(['request_for_graph_element_content_change', {
                    graphId: graphId,
                    type: 'removeAlternative',
                    nodeContentId: nodeContentId,
                    node_alternative_id: node.active_alternative_id
              }]);
            }

          };

          /**
           * Form of conditional probabilities editor
           */
          var editConditionals = function(){
            var model = that.publisher.getInstant('get_graph_models', [graphId])[graphId];
            var parentNodeContentIds = model.getParentNodesContentIds(nodeId);

            that.publisher
                .publish(
                    ['get_graph_node_content', {graphId:graphId, nodeContentIds:parentNodeContentIds}]
                )
                .then(function(parentContents){
                  var fields = {};
                  var formKeys = [{}]; // array of each combination of parent alternatives, ex.: [{p1:1,p2:1},{p1:1,p2:2},{p1:2,p2:1},{p1:2,p2:2}]

                  var f = GRASP.getNodeConditionalFormFields(
                      node,
                      isEditable,
                      function(){return node.type == that.NODE_TYPE_FACT;},
                      parentContents,
                      [that.NODE_TYPE_FACT, that.NODE_TYPE_PROPOSITION]
                  );
                  fields = f.fields;
                  formKeys = f.formKeys;

                  fields['button'] = {type:'button', label:'Save',disabled:!isEditable};

                  var modalWindow = that.UI.createModal();
                  var form = that.UI.createForm(
                    fields,
                    // form submit callback
                    function (form) {
                      var probabilities = {};

                      for(var j in node.alternatives){
                        probabilities[j] = {};
                        for(var i in formKeys){
                          var formKeyStr = JSON.stringify(formKeys[i]);
                          probabilities[j][formKeyStr] = form[formKeyStr+'__'+j] != '' ? form[formKeyStr+'__'+j] : 1/GRASP.getObjectLength(node.alternatives);
                        }
                      }  

                      // sanity check of probability values
                      for(var i in formKeys){
                        var formKeyStr = JSON.stringify(formKeys[i]);
                       
                        // check that every probability in [0,1]
                        for(var j in node.alternatives){
                          if(probabilities[j][formKeyStr]<0 || probabilities[j][formKeyStr]>1){
                            alert('Probability cannot be less than 0 and greater than 1');
                            return true;
                          }
                        }

                        // check that sum of probabilities by row equals 1
                        var sum = 0;
                        var alertMsg = '';
                        for(var j in node.alternatives){
                          sum += parseFloat(probabilities[j][formKeyStr]);
                          alertMsg += probabilities[j][formKeyStr]+'+';
                        }
                        if(sum != 1){
                          alertMsg = alertMsg.substring(0, alertMsg.length-1)+' != 1';
                          //alert(alertMsg+"\n"+'Сумма вероятностей всех альтернатив утверждения (при фиксированных значениях его условий) должна быть равна 1');
                          alert(alertMsg+"\n"+'Sum of probabilities of all proposition alternatives (under fixed conditions) must be equal to 1');
                          return true;
                        }

                      }

                      that.publisher.publish(["request_for_graph_element_content_change", {
                           graphId: graphId,
                           type: 'updateNodeAlternativesP',
                           nodeContentId: nodeContentId,
                           alternatives: probabilities
                         }]);

                      that.UI.closeModal(modalWindow);
                      return true;
                    }
                  );

                  // add auto-change of field values so that sum by row equals 1 (only for case of 2 alternatives)
                  if(GRASP.getObjectLength(node.alternatives) == 2){
                    for(var i in formKeys){
                      var formKeyStr = JSON.stringify(formKeys[i]);
                      var alternativeIds = GRASP.getObjectKeys(node.alternatives);
                      for(var j in alternativeIds){
                        (function(formKeyStr, j, alternativeIds){
                          that.UI.updateForm(form, formKeyStr+'__'+alternativeIds[j], {callback: function(name,value){
                            var newValue = parseFloat(Number((1 - parseFloat(value))).toFixed(15));
                              that.UI.updateForm(form, formKeyStr+'__'+alternativeIds[(parseInt(j)+1)%2], {value:newValue});
                          }});
                        })(formKeyStr, j, alternativeIds);
                      }
                    }
                  }

                  that.UI.setModalContent(modalWindow, form);
                });
          };

          if(node.type == that.NODE_TYPE_PROPOSITION){
            that.UI.updateForm(form, 'active_alternative_id', {type:'select',items:[],callback:attrChange,nodrop:true});
            that.UI.updateForm(form, 'addAlternative', {type:'button',label:'Add alternative',callback:addAlternative});
            that.UI.updateForm(form, 'removeAlternative', {type:'button',label:'Remove alternative',callback:removeAlternative});
            that.UI.updateForm(form, 'node-alternative_division_line', {type:'title',value:'================== Alternative =============='});
          }

          if(node.type == that.NODE_TYPE_PROPOSITION || node.type == that.NODE_TYPE_FACT){
            // if node is a child - let user edit its conditional probabilities
            var model = that.publisher.getInstant('get_graph_models', [graphId])[graphId];
            var parentNodeContentIds = model.getParentNodesContentIds(nodeId);
            if(parentNodeContentIds.length){
              // if parents contains node types 'fact' or 'proposition', then let user edit conditional probabilities
              that.checkNodesHasFactOrProposition(graphId, parentNodeContentIds, function(yes){
                if(yes) that.UI.updateForm(form, 'editConditionals', {type:'button',label:'Conditional probabilities',callback:editConditionals});
              });
            }
            that.UI.updateForm(form, 'reliability', {type:'range',min:0,max:100,step:1,value:activeAlternative.reliability,callback:attrChange,disabled:true});
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
   * Check if node_content_ids contains 'fact' or 'proposition'
   * @param graphId
   * @param node_content_ids
   * @param cb
   */
  checkNodesHasFactOrProposition: function(graphId, node_content_ids, cb){
    var that = this;
    this.publisher
        .publish(
            ['get_elements_attributes', {nodes:node_content_ids}]
        )
        .then(function(attrs){
          var types = [];
          for(var i in attrs['nodes']){
            types.push(attrs['nodes'][i]['type']);
          }
          cb(types.indexOf(that.NODE_TYPE_PROPOSITION) != -1 || types.indexOf(that.NODE_TYPE_FACT) != -1);
        });
  },

  /**
   * http://www.colorzilla.com/gradient-editor/
   * @param percent
   * @returns {string}
   * @private
   */
  _getPartialGradientStyle: function(percent){
    var str = '';
    /*
    str += 'background: -moz-linear-gradient(top, rgba(30,87,153,0) 0%, rgba(41,137,216,0) '+percent+'%, rgba(255,48,48,1) '+(percent+1)+'%, rgba(255,0,0,1) 100%); '; // FF3.6+
    str += 'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(30,87,153,0)), color-stop('+percent+'%,rgba(41,137,216,0)), color-stop('+(percent+1)+'%,rgba(255,48,48,1)), color-stop(100%,rgba(255,0,0,1))); '; // Chrome,Safari4+
    str += 'background: -webkit-linear-gradient(top, rgba(30,87,153,0) 0%,rgba(41,137,216,0) '+percent+'%,rgba(255,48,48,1) '+(percent+1)+'%,rgba(255,0,0,1) 100%); '; // Chrome10+,Safari5.1+
    str += 'background: -o-linear-gradient(top, rgba(30,87,153,0) 0%,rgba(41,137,216,0) '+percent+'%,rgba(255,48,48,1) '+(percent+1)+'%,rgba(255,0,0,1) 100%); '; // Opera 11.10+
    str += 'background: -ms-linear-gradient(top, rgba(30,87,153,0) 0%,rgba(41,137,216,0) '+percent+'%,rgba(255,48,48,1) '+(percent+1)+'%,rgba(255,0,0,1) 100%); '; // IE10+
    */
    str += 'background: linear-gradient(90deg, rgba(30,87,153,1) 0%,rgba(78,137,193,1) '+percent+'%,rgba(79,138,194,0) '+(parseInt(percent)+1)+'%,rgba(125,185,232,0) 100%); '; // W3C
    return str;
  },

  /**
   * Create promises to add text and source list (for fact) or falsification list (for proposition)
   * @param form
   * @param nodeContentId
   * @param nodeType
   * @param graphId
   * @param isEditable
   * @param contents
   * @private
   */
  _addContent: function(form, nodeContentId, nodeType, graphId, isEditable, contents){
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
        alternativeLabels[i] = GRASP.createElement('div',
          {style:'position:relative; display: inline-block; width:100%; '+that._getPartialGradientStyle(alternatives[i].reliability)},
          alternatives[i].label + ' ' +alternatives[i].reliability+'%');
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

    var validateListItem = function(item){
      // check that publisher reliability is from 0 to 10
      item.publisher_reliability = Number(item.publisher_reliability);
      if(item.publisher_reliability < 0 || item.publisher_reliability > 10){
        alert('reliability должен быть от 0 до 10');
        return false;
      }
      return true;
    };

    var updateListItem = function(id, el){
      that._editListItem(graphId, nodeContentId, active_alternative_id, nodeType, list[id],
         // this callback is called on 'submit' button
        function(graphId, nodeContentId, node_alternative_id, item){
          if(!validateListItem(item)) return false;

          // save updated list
          that.publisher
            .publish(['request_for_graph_element_content_change', {
                type:'node_list_update_request',
                graphId: graphId,
                nodeContentId: nodeContentId,
                node_alternative_id:node_alternative_id,
                item: item,
                nodeType:nodeType
              }])
            .then(function (updateAnswer) {
                // We do not change reliability of proposition based on falsification yet
                if(contents[nodeContentId].type != that.NODE_TYPE_FACT) return true;

                that.publisher.publish(['request_for_graph_element_content_change',{
                  type: 'updateNodeAttribute',
                  graphId: graphId,
                  nodeContentId: nodeContentId,
                  node_alternative_id:node_alternative_id,
                  nodeAttribute: {name:'reliability', value:updateAnswer.reliability}
                }]);

                return true;
            });
          return true;
        });
      return true;
    };

    var removeListItem = function(id, el){
      // save updated list
      that.publisher.publish(
          ['request_for_graph_element_content_change', {type:'node_list_remove_request', graphId:graphId, nodeContentId:nodeContentId, node_alternative_id:active_alternative_id, nodeType:nodeType, itemId:id}]
      ).then(function (updateAnswer) {
        // We do not change reliability of proposition based on falsification yet
        if(contents[nodeContentId].type != that.NODE_TYPE_FACT) return true;

        that.publisher.publish(['request_for_graph_element_content_change',{
          type: 'updateNodeAttribute',
          graphId: graphId,
          nodeContentId: nodeContentId,
          node_alternative_id:active_alternative_id,
          nodeAttribute: {name:'reliability', value:updateAnswer.reliability}
        }]);

        return true;
      });
      return true;
    };

    // define and add "add source button"
    var addListItem = function(){
      that._editListItem(graphId, nodeContentId, active_alternative_id, nodeType, {source_type: 'article'},
          function(graphId, nodeContentId, node_alternative_id, item){
            if(!validateListItem(item)) return false;

            that.publisher
            .publish(['request_for_graph_element_content_change', {
                  type:'node_list_add_request',
                  graphId: graphId,
                  nodeContentId: nodeContentId,
                  node_alternative_id:active_alternative_id,
                  nodeType:nodeType,
                  item:item
                }])
            .then(function (updateAnswer) {
              // We do not change reliability of proposition based on falsification yet
              if(contents[nodeContentId].type != that.NODE_TYPE_FACT) return true;

              that.publisher.publish(['request_for_graph_element_content_change',{
                type: 'updateNodeAttribute',
                graphId: graphId,
                nodeContentId: nodeContentId,
                node_alternative_id:node_alternative_id,
                nodeAttribute: {name:'reliability', value:updateAnswer.reliability}
              }]);

              return true;
            });

            return true;
          }
      );
    };

    that.UI.updateForm(form, 'list', {
      type:'list',
      items:htmllist,
      itemActions:{edit:updateListItem, remove:removeListItem},
      addLabel: (nodeType == that.NODE_TYPE_FACT ? 'add source' : 'add falsification'),
      addCallback: addListItem,
      disabled:!isEditable
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
        el = GRASP.createElement('a',{href:item.url, target:'_blank', title:this._lineBreaksForTooltips(item.comment)}, item.author+' / '+item.name+' / '+item.publisher);
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
    item = item || {source_type: 'article'};
    var modalWindow = that.UI.createModal();
    var form = {};
    var formFields = {};
    var SOURCE_TYPES = {
      'article':'article (peer-reviewed)',
      'meta-article':'meta-article (peer-reviewed)',
      'textbook':'textbook',
      'book':'book',
      'news':'news',
      'personal experience':'personal experience'
    };
    var MANUAL_RELIABILITY_SOURCE_TYPES = GRASP.getObjectKeys(SOURCE_TYPES);  // which source types permit manual reliability enter

    // define which source type has which fields visible
    var itemTypeVisible = {
      'all':{
        'name':'search','url':'text','author':'text','editor':'text',
        'publisher':'search','publisher_reliability':'text',
        'publish_date':'date','pages':'text','comment':'textarea'
      },
      'personal experience':{'name':'text','comment':'text','publisher_reliability':'text'}
    };

    var selectSourceType = function(name, value){
      if(MANUAL_RELIABILITY_SOURCE_TYPES.indexOf(value) != -1){
        that.UI.updateForm(form,'publisher_reliability',{disabled:false});
      }else{
        that.UI.updateForm(form,'publisher_reliability',{disabled:true});
      }

      // show only fields that is valid for 'personal experience'
      if(value == 'personal experience'){
        for(var fieldname in itemTypeVisible['all']){
          if(GRASP.getObjectKeys(itemTypeVisible['personal experience']).indexOf(fieldname) == -1){
            that.UI.updateForm(form,fieldname,{type:'hidden'});
          }
        }
      }
      // show all fields
      else{
        for(var fieldname in itemTypeVisible['all']){
          var fieldtype = itemTypeVisible['all'][fieldname];
          that.UI.updateForm(form,fieldname,{type:fieldtype});
        }
      }
    };

    var _createSourceFields = function(){
       var formFields = {
        'source_type':{'type':'select', 'label':'Тип',
          callback:selectSourceType,
          'items':SOURCE_TYPES,
          'value':'article'
        },
        'name':{'type':'search', label:'Title',
          findCallback:function(str){
            var source_type = that.UI.getFormValue(form, 'source_type');
            return that.publisher.publish(['find_sources',{source_type:source_type, substring:str}]);
          },
          selectCallback:function(name, value){
            // if value didn't come just return
            if(typeof(value.source_id) == 'undefined') return;

            GRASP.getObjectKeys(formFields).forEach(function(v){
              if(typeof(value[v]) != 'undefined'){
                that.UI.updateForm(form,v,{value:value[v]});
              }
            });
          },
          typeCallback:function(name, value){
            // reset default values
            that.UI.updateForm(form,'source_id',{value:''});
          }
        },
        'url':{'type':'text', label:'URL'},
        'author':{'type':'text', label:'Authors'},
        'editor':{'type':'text', label:'Reviewer'},
        'publisher':{
          type:'search',
          label:'Publisher',
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
        'publisher_reliability':{
          type:'text',
          disabled:true,
          label:'reliability'
        },
        'scopus_title_list_id':{type:'hidden'},
        'publish_date':{type:'date', label:'Publish date'},
        'pages':{type:'text', label:'volume, pages'},
        'comment':{type:'textarea', label:'Comment'},
        'source_id':{type:'hidden'},
        'id':{type:'hidden'},
        'button':{type:'button', label:'Save'}
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
    if(GRASP.getObjectKeys(item).length){
      GRASP.getObjectKeys(formFields).forEach(function(v,k){
        if(typeof(item[v]) != 'undefined') formFields[v].value = item[v];
        formFields['button'].value = 'Save';
      });
    }

    form = that.UI.createForm(formFields,
      // form submit callback
      function (form) {
        // set form fields to item
        GRASP.getObjectKeys(form).forEach(function (v) {
          if (typeof(form[v]) != 'undefined') item[v] = form[v];
        });
        if(callback(graphId, nodeContentId, node_alternative_id, item)){
          that.UI.closeModal(modalWindow);
        }
      }
    );

    // update fields in a form accourding to item source_type
    if(item.source_type) selectSourceType('',item.source_type);

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