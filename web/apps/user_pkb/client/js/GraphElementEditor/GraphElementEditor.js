/**
 * Module that allows to edit node and edge content and properties.
 * You can think of it as node editor's View in MVC model.
 * It fires 'request_for_graph_element_content_change' when user manipulates an editor
 * (writes text, changes node type and etc.)
 * @param publisher
 * @param ViewManager
 * @param UI
 * @param formFields
 * @param i18n
 * @param jQuery
 * @param ajaxIndicator
 * @constructor
 */
GRASP.GraphElementEditor = function(publisher, ViewManager, UI, formFields, i18n, jQuery, ajaxIndicator){
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;
  this.formFields = formFields;
  this.i18n = i18n;

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

  eventListener: function(event){
    var $ = this.jQuery, v, that=this;

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
              && this._getEventElementType(event) == this.currentElement.elementType)
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
          var graphId = event.getData().graphId;
          var nodeId = event.getData().nodeId;
          var nodeContentId = event.getData().nodeContentId;
          var model = this.publisher.getInstant('get_graph_models', [graphId])[graphId];
          var parentNodeContentIds = model.getParentNodesContentIds(nodeId);

          this.publisher
              .publish(
                  ['get_graph_node_content', {graphId:graphId, nodeContentIds:[nodeContentId]}],
                  ['get_graph_node_content', {graphId:graphId, nodeContentIds:parentNodeContentIds}]
              )
              .then(function(nodeContents, parentNodeContents){
                var nodeFormElements = that._createNodeForm(
                    graphId,
                    event.getData().isEditable,
                    event.getData().nodeTypes,
                    nodeId,
                    nodeContentId,
                    nodeContents[nodeContentId],
                    parentNodeContents
                );
                for(var i in nodeFormElements) {
                  document.getElementById(v.attr('id')).appendChild(nodeFormElements[i]);
                }

              });

        }else if(event.getData().elementType == 'edge'){
          document.getElementById(v.attr('id')).appendChild(
            this._createEdgeForm(
              event.getData().graphId,
              event.getData().isEditable,
              event.getData().edgeTypes,
              event.getData().edge
          ));
        }

        GRASP.setDisplay(document.getElementById(v.attr('id')), 'block');
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

  _reloadEvent: function(){
    this.eventListener(this.currentEvent);
  },

  _createNodeForm: function(
      graphId,
      isEditable,
      nodeTypes,
      nodeId,
      nodeContentId,
      node,
      parentNodeContents
  ){
    var that = this;

    var remove = this.UI.createButton({
      name: 'removeNode',
      label: this.i18n.__('Remove node'),
      callback: this._removeNode.bind(this, graphId, nodeId)
    });

    var label = this._createLabel(graphId, nodeContentId, node);

    var accordionItems = [];
    accordionItems.push({
      label: this.i18n.__('Description'),
      content: this._createDescription(graphId, nodeContentId, node, isEditable)
    });

    if (node.type == GRASP.GraphViewNode.NODE_TYPE_FACT) {
      accordionItems.push({
        label: this.i18n.__('Sources'),
        content: this._createSources(graphId, nodeContentId, node, isEditable)
      });
    }

    if (
        (node.type == GRASP.GraphViewNode.NODE_TYPE_FACT || node.type == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION)
        && this.hasFactOrProposition(parentNodeContents)
    ) {
      accordionItems.push({
        label: this.i18n.__('Conditional probabilities'),
        content: this._createConditionalProbabilities(graphId, nodeContentId, nodeId, node, parentNodeContents, isEditable)
      });
    }

    var accordion = null;
    accordion = this.UI.createAccordion(accordionItems,{firstOpened: true, callback:function(){
      that._setAccordionTabHeight(accordion)
    }});
    this._setAccordionTabHeight(accordion);
    return [remove, label, accordion];
  },

  _setAccordionTabHeight: function(accordion){
    var that = this;
    var f = function(timeout) {
      setTimeout(function () {
        // if accordion was not mounted yet, then wait and repeat
        if(document.getElementById(accordion.id) === null) return f(100);
        // ok, it was mounted, so calculate tab content max height

        var editorId = accordion.parentNode.id;
        var cHeight = that.jQuery('#'+editorId).outerHeight();
        var cTop = that.jQuery('#'+editorId).offset().top;
        var tabs = that.jQuery('#'+editorId+' .tab');
        var aboveAccordionHeight = that.jQuery(tabs[0]).offset().top - cTop;
        var firstLabel = that.jQuery('#'+editorId+' .tab>label')[0];
        var allAccordionLabelsHeight = that.jQuery(firstLabel).outerHeight()*tabs.length;
        var tabContentHeight = cHeight - aboveAccordionHeight - allAccordionLabelsHeight;
        for (var i=0; i<tabs.length; i++) {
          var tabContent = that.jQuery(tabs[i]).find('.tab-content')[0];
          if(tabContent.parentNode.querySelectorAll('input')[0].checked){
            tabContent.style.maxHeight = tabContentHeight+'px';
          } else {
            tabContent.style.maxHeight = 0;
          }
        }
      }, timeout);
    };
    f(0);
  },

  /**
   * Form of conditional probabilities editor
   */
  _createConditionalProbabilities: function(graphId, nodeContentId, nodeId, node, parentContents, isEditable){
    var that = this;

    var fields = {};
    // array of each combination of parent alternatives,
    // ex.: [{p1:1,p2:1},{p1:1,p2:2},{p1:2,p2:1},{p1:2,p2:2}]
    var formKeys = [{}];

    var f = GRASP.nodeConditionalFormHelper.getNodeConditionalFormFields(
        node,
        isEditable,
        function(type){return type == GRASP.GraphViewNode.NODE_TYPE_FACT;},
        parentContents,
        [GRASP.GraphViewNode.NODE_TYPE_FACT, GRASP.GraphViewNode.NODE_TYPE_PROPOSITION],
        nodeId
    );
    fields = f.fields;
    formKeys = f.formKeys;

    fields['button'] = {type:'button', label:'Save',disabled:!isEditable};

    //var modalWindow = that.UI.createModal();
    var form = that.UI.createForm(
        fields,
        // form submit callback
        function (form) {
          var probabilities = {};

          for(var j in node.alternatives){
            probabilities[j] = {};
            for(var i in formKeys){
              var formKeyStr = JSON.stringify(formKeys[i]);
              probabilities[j][formKeyStr] = form[i+'_THEN_'+formKeyStr+'_'+j] != '' ? form[i+'_THEN_'+formKeyStr+'_'+j] : 1/GRASP.getObjectLength(node.alternatives);
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
          (function(formKeyStr, i, j, alternativeIds){
            that.UI.updateForm(form, i+'_THEN_'+formKeyStr+'_'+alternativeIds[j], {callback: function(name,value){
              var newValue = parseFloat(Number((1 - parseFloat(value))).toFixed(15));
              that.UI.updateForm(form, i+'_THEN_'+formKeyStr+'_'+alternativeIds[(parseInt(j)+1)%2], {value:newValue});
            }});
          })(formKeyStr, i, j, alternativeIds);
        }
      }
    }

    //that.UI.setModalContent(modalWindow, form);
    return form;
  },

  _createSources: function(graphId, nodeContentId, node, isEditable){
    var that = this;
    if(node.type != GRASP.GraphViewNode.NODE_TYPE_FACT) return;

    // create HTMLElements from list
    var list = node.alternatives[node.active_alternative_id]['list'];
    var htmllist = {};
    for(var i in list) htmllist[i] = this._createHTMLFromListItem(list[i], node.type);

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
      that._editListItem(graphId, nodeContentId, node.active_alternative_id, node.type, list[id],
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
                  nodeType:node.type
                }])
                .then(function (updateAnswer) {
                  // We do not change reliability of proposition based on falsification yet
                  if(node.type != GRASP.GraphViewNode.NODE_TYPE_FACT) return true;

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
          [
            'request_for_graph_element_content_change',
            {
              type:'node_list_remove_request',
              graphId:graphId, nodeContentId:nodeContentId,
              node_alternative_id:node.active_alternative_id,
              nodeType:node.type,
              itemId:id
            }
          ]
      ).then(function (updateAnswer) {
        if(node.type != GRASP.GraphViewNode.NODE_TYPE_FACT) return true;

        that.publisher.publish(['request_for_graph_element_content_change',{
          type: 'updateNodeAttribute',
          graphId: graphId,
          nodeContentId: nodeContentId,
          node_alternative_id:node.active_alternative_id,
          nodeAttribute: {name:'reliability', value:updateAnswer.reliability}
        }]);

        return true;
      });
      return true;
    };

    // define and add "add source button"
    var addListItem = function(){
      that._editListItem(graphId, nodeContentId, node.active_alternative_id, node.type, {source_type: 'article'},
          function(graphId, nodeContentId, node_alternative_id, item){
            if(!validateListItem(item)) return false;

            that.publisher
                .publish(['request_for_graph_element_content_change', {
                  type:'node_list_add_request',
                  graphId: graphId,
                  nodeContentId: nodeContentId,
                  node_alternative_id:node_alternative_id,
                  nodeType:node.type,
                  item:item
                }])
                .then(function (updateAnswer) {
                  // We do not change reliability of proposition based on falsification yet
                  if(node.type != GRASP.GraphViewNode.NODE_TYPE_FACT) return true;

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

    return this.UI.createListBox({
      name: 'list',
      items:htmllist,
      itemActions:{edit:updateListItem, remove:removeListItem},
      addLabel: this.i18n.__('add source'),
      addCallback: addListItem,
      disabled:!isEditable
    })
  },

  _createDescription: function(graphId, nodeContentId, node, isEditable){
    var that=this;
    var c = GRASP.createElement('div',{});
    var editNodeText = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeText',
        nodeContentId: nodeContentId,
        node_alternative_id: node.active_alternative_id,
        text: value
      }]);
    };
    var nodeText = node.alternatives[node.active_alternative_id]['text'];
    c.appendChild(this.UI.createTextareaBox({
      name:'text',
      value:nodeText,
      disabled:!isEditable,
      callback:editNodeText,
      callback_delay:1000
    }));
    c.appendChild(this.UI.createRange({
      name: 'importance',
      min: 1,
      max: 99,
      step: 1,
      value: node.importance,
      callback: this._attrChange.bind(this, graphId, nodeContentId, node),
      disabled: !isEditable
    }));
    return c;
  },

  _createLabel: function(graphId, nodeContentId, node){
    var c = GRASP.createElement('div',{}); // container
    var alternatives = node['alternatives'];
    if (node.type == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION) {
      // create list of alternative labels
      var alternativeLabels = {};
      for(var i in alternatives){
        alternativeLabels[i] = GRASP.createElement('div',
            {style:'position:relative; display: inline-block; width:100%; '+this._getPartialGradientStyle(alternatives[i].reliability)},
            alternatives[i].label + ' ' +alternatives[i].reliability+'%');
      }
      // create select with alternativeLabels
      var select = this.UI.createSelectBox({
        name: 'active_alternative_id',
        items: alternativeLabels,
        value: node.active_alternative_id,
        callback: this._attrChange.bind(this, graphId, nodeContentId, node),
        dropType:'multiple'
      });
      // create buttons to add and remove alternatives
      var add = this.UI.createButton({
        name: 'addAlternative',
        label: this.i18n.__('Add alternative'),
        callback: this._addAlternative.bind(this, graphId, nodeContentId)
      });
      var remove = this.UI.createButton({
        name: 'removeAlternative',
        label: this.i18n.__('Remove alternative'),
        callback: this._removeAlternative.bind(this, graphId, nodeContentId)
      });
      c.appendChild(select);
      c.appendChild(add);
      c.appendChild(remove);
    } else {
      var label = GRASP.createElement('div', {}, alternatives[node.active_alternative_id].label);
      c.appendChild(label);
    }

    return c;
  },

  _removeNode: function(graphId, nodeId){
    if(confirm('Are you sure?')){
      this.publisher.publish([
        "request_for_graph_model_change",
        {
          graphId: graphId,
          type: 'removeNode',
          elementId: nodeId
        }
      ]);
    }
  },

  _addAlternative: function(graphId, nodeContentId){
    var that = this;
    var modalWindow = that.UI.createModal();
    var form = that.UI.createForm({
          label: {
            label: that.i18n.__('Please, enter name of the alternative proposition'),
            type:'text',
            value:'',
            callback:function(){}
          },
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
        }
    );
    that.UI.setModalContent(modalWindow, form);
  },

  _attrChange: function(graphId, nodeContentId, node, name, value){
    this.publisher.publish(['request_for_graph_element_content_change', {
      graphId: graphId,
      type: 'updateNodeAttribute',
      nodeContentId: nodeContentId,
      node_alternative_id: node.active_alternative_id,
      nodeAttribute: {name:name, value:value}
    }]);

    // if node is of type FACT then we should also automatically rename its alternative on label edit
    if(name == 'label' && node.type == GRASP.GraphViewNode.NODE_TYPE_FACT){
      this.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeAttribute',
        nodeContentId: nodeContentId,
        node_alternative_id: 1,
        nodeAttribute: {name:name, value:this.DEFAULT_ALTERNATIVE_LABEL_PREFIX+value}
      }]);
    }
  },

  _removeAlternative: function(graphId, nodeContentId, node){

    if(GRASP.getObjectKeys(node.alternatives).length == 2){
      //alert('Извините, но должно быть минимум 2 альтернативы!');
      alert('Sorry, you cannot have only one alternative');
      return;
    }
    if(confirm('Are you sure?')){
      this.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'removeAlternative',
        nodeContentId: nodeContentId,
        node_alternative_id: node.active_alternative_id
      }]);
    }

  },

  /**
   * Check if node_content_ids contains 'fact' or 'proposition'
   * @param nodeContents
   */
  hasFactOrProposition: function(nodeContents){
    var that = this;
    var types = [];
    for(var i in nodeContents){
      types.push(nodeContents[i]['type']);
    }
    return types.indexOf(GRASP.GraphViewNode.NODE_TYPE_PROPOSITION) != -1 || types.indexOf(GRASP.GraphViewNode.NODE_TYPE_FACT) != -1;
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
   * Creating HTMLElement from node's list item
   * @param item - is a source (= {author:<string>, url:<string>, name:<string>, publisher:<string>}) or falsification
   * @returns {HTMLElement}
   * @private
   */
  _createHTMLFromListItem: function(item, nodeType){
    var el = null;
    if(nodeType == GRASP.GraphViewNode.NODE_TYPE_FACT){
      if(typeof(item.url) != 'undefined' && item.url.length > 0){
        el = GRASP.createElement('a',{href:item.url, target:'_blank', title:this._lineBreaksForTooltips(item.comment)}, item.author+' / '+item.name+' / '+item.publisher);
      }else{
        el = document.createTextNode(item.author+' / '+item.name+' / '+item.publisher);
      }
    }else if(nodeType == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION){
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
            that.publisher.publish(["request_for_graph_element_content_change", {graphId: graphId, type: 'removeEdge', edge:edge}]);
          }
        }
      }
    });

    return form;
  },

  /**
   * - Show modal window with node source fields
   * - Publish add/update event on form submit
   * - Call callback (graphId, nodeContentId,  item} after submit
   * @param graphId - to put in callback
   * @param nodeContentId - to put in callback
   * @param node_alternative_id - to put in callback
   * @param nodeType - to distinguish between 'fact' source form and 'proposition' falsification form
   * @param item - {name1:value1, name2:value2, ...}
   * @param callback - arguments are (graphId, nodeContentId, item)
   * @private
   */
  _editListItem: function(graphId, nodeContentId, node_alternative_id, nodeType, item, callback){
    var that = this;
    item = item || {source_type: 'article'};
    var modalWindow = that.UI.createModal();
    var form = that.UI.createForm({},
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
    var formFields = {};

    if(nodeType == GRASP.GraphViewNode.NODE_TYPE_FACT){
      formFields = that.formFields.getSourceFields(form);
    }else if(nodeType == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION){
      formFields = that.formFields.getFalsificationFields();
    }

    // fill in form fields
    if(GRASP.getObjectKeys(item).length){
      GRASP.getObjectKeys(formFields).forEach(function(v,k){
        if(typeof(item[v]) != 'undefined') formFields[v].value = item[v];
      });
    }

    for(var fieldName in formFields){
      that.UI.updateForm(form, fieldName, formFields[fieldName]);
    }

    // update fields in a form according to item source_type
    if(item.source_type && formFields['source_type']) formFields['source_type'].callback('',item.source_type);

    that.UI.setModalContent(modalWindow, form);

  },

  _getEventElementType: function(event){
    if(event.getName() == 'graph_element_content_changed' && [
          'updateEdgeAttribute',
          'addEdge'
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
          'addIcon'
        ].indexOf(event.getData().type) != -1) return 'node';

    return false;
  },

  _nl2br: function(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },

  _escapeNodeContentId: function(str){
    return str.replace('/', '\\/');
  }
};