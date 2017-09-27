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
 * @constructor
 */
GRASP.GraphElementEditor = function(publisher, ViewManager, UI, formFields, i18n, jQuery){
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;
  this.formFields = formFields;
  this.i18n = i18n;

  this.currentElement = null;
  this.currentEvent = null;

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
        var graphId = event.getData().graphId;
        if(graphId != this.currentElement.graphId) break;

        // reload editor if some reliabilities changed
        if(event.getData().type == 'updateNodesReliabilities'){
          this._reloadEvent();
          break;

        } else if (
            event.getData().type == 'updateEdgeAttribute'
            && event.getData().edgeAttribute.name == 'type'
            && event.getData().edgeContentId == this.currentElement.elementId
        ) {
          /**
           * If edge type was changed we want to reload edge editor (if it is opened)
           */
          this._reloadEvent();
          break;

        } else {
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
          elementId:event.getData().elementType == 'node' ? event.getData().nodeContentId : event.getData().edgeContentId
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
                var view = document.getElementById(v.attr('id'));
                GRASP.removeChilds(view);
                for(var i in nodeFormElements) {
                  view.appendChild(nodeFormElements[i]);
                }

              });

        }else if(event.getData().elementType == 'edge'){
          var graphId = event.getData().graphId;
          var model = this.publisher.getInstant('get_graph_models', [graphId])[graphId];
          var edge = model.getEdge(event.getData().edgeId);
          var sourceNode = model.getNode(edge.source);
          var targetNode = model.getNode(edge.target);

          this.publisher
          .publish(
              ['get_graph_edge_content', {graphId:graphId, edgeContentIds:[edge.edgeContentId]}]
          ).then(function(edgeContents){
            document.getElementById(v.attr('id')).appendChild(
                that._createEdgeForm(
                    graphId,
                    event.getData().isEditable,
                    event.getData().edgeTypes,
                    edge,
                    edgeContents[edge.edgeContentId],
                    sourceNode,
                    targetNode
                ));
          });


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

  _createEdgeHead: function(graphId, edge, edgeContent, edgeTypes, isEditable) {
    var that = this;
    var c = GRASP.createElement('div', {class:'head', style:'color: ' + edgeTypes[edgeContent.type]})
    var label = GRASP.createElement('span', {class:'label'}, GRASP.ucfirst(this.i18n.__(edgeContent.type)));
    var remove = this.UI.createButton({
      disabled: !isEditable,
      name: 'removeEdge',
      type: 'icon delete grey',
      callback:function(){
        if(confirm(that.i18n.__('Are you sure?'))){
          that.publisher.publish(["request_for_graph_element_content_change", {
            graphId: graphId,
            type: 'removeEdge',
            edge:edge
          }]);
        }
      }
    });
    c.appendChild(label);
    c.appendChild(remove);
    return c;
  },

  _createNodeHead: function(graphId, nodeId, node, nodeTypes, isEditable) {
    var c = GRASP.createElement('div', {class:'head', style:'color: ' + nodeTypes[node.type]})
    var label = GRASP.createElement('span', {class:'label'}, GRASP.ucfirst(this.i18n.__(node.type)));
    var remove = this.UI.createButton({
      disabled: !isEditable,
      name: 'removeNode',
      type: 'icon delete grey',
      callback: this._removeNode.bind(this, graphId, nodeId)
    });
    c.appendChild(label);
    c.appendChild(remove);
    return c;
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
    isEditable = typeof isEditable === 'undefined' ? true : isEditable;
    var that = this;

    var head = this._createNodeHead(graphId, nodeId, node, nodeTypes, isEditable);

    var label = this._createLabel(graphId, nodeContentId, node, isEditable);

    var accordionItems = [];
    accordionItems.push({
      label: this.i18n.__('Description'),
      content: this._createDescription(graphId, nodeContentId, node, isEditable)
    });

    if (node.type == GRASP.GraphViewNode.NODE_TYPE_FACT) {
      accordionItems.push({
        label: this.i18n.__('Sources'),
        content: this._createSources(graphId, nodeContentId, node, isEditable),
        labelButtons: [
          this.UI.createButton({
            disabled: !isEditable,
            name: 'editConditionals',
            type: 'icon plusCircle grey',
            callback: that._addListItem.bind(this, graphId, nodeContentId, node)
          })
        ]
      });
    }

    if (
        (node.type == GRASP.GraphViewNode.NODE_TYPE_FACT || node.type == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION)
        && this.hasFactOrProposition(parentNodeContents)
    ) {
      accordionItems.push({
        label: this.i18n.__('Conditional probabilities'),
        content: this._createAlternatriveCondPInfo(
            graphId,
            nodeContentId,
            nodeId,
            node,
            parentNodeContents,
            isEditable
        ),
        labelButtons: [
            this.UI.createButton({
              name: 'editConditionals',
              type: 'icon edit grey',
              callback: function(){
                that._createConditionalProbabilitiesModal(
                    graphId,
                    nodeContentId,
                    nodeId,
                    node,
                    parentNodeContents,
                    isEditable
                );
              }
            })
        ]
      });
    }

    var accordion = this.UI.createAccordion(
      accordionItems,
      {
        firstOpened: true,
        adjustToHeight: function(){
          var e = document.getElementById('graphViews');
          var maxContainerHeight = parseInt(window.getComputedStyle(e, null).getPropertyValue("height").match(/\d+/));
          var parent = accordion.parentElement;
          var cTop = document.querySelector('#'+parent.id).getBoundingClientRect().top;
          var tabs = document.querySelectorAll('#'+parent.id+' .tab');
          var aboveAccordionHeight = tabs[0].getBoundingClientRect().top - cTop;
          var parentPadding = parseInt(
              window.getComputedStyle(parent,null).getPropertyValue("padding-bottom").match(/\d+/)
          );
          return maxContainerHeight - aboveAccordionHeight - parentPadding;
        }
      }
    );
    return [head, label, accordion];
  },

  /**
   * Form of conditional probabilities editor
   */
  _createConditionalProbabilitiesModal: function(graphId, nodeContentId, nodeId, node, parentContents, isEditable){
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
        nodeId,
        that.i18n
    );
    fields = f.fields;
    formKeys = f.formKeys;

    var modalWindow = that.UI.createModal();

    fields['save'] = {
      rowClass:'twoColumn upMarginMiddle',
      rowType:'button',
      label:that.i18n.__('save'),
      disabled:!isEditable,
      type:'bigButton uppercase',
    };
    fields['cancel'] = {
      rowClass:'twoColumn upMarginMiddle',
      rowType:'button',
      disabled:!isEditable,
      type:'bigButton white uppercase',
      label:that.i18n.__('cancel'),
      callback: function(){
        that.UI.closeModal(modalWindow);
      }
    };

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
              probabilities[j][formKeyStr] = probabilities[j][formKeyStr].replace(',','.');
              if(isNaN(probabilities[j][formKeyStr])){
                alert(that.i18n.__('Probability cannot be a number from 0 to 1'));
                return true;
              }
              if(probabilities[j][formKeyStr]<0 || probabilities[j][formKeyStr]>1){
                alert(that.i18n.__('Probability cannot be less than 0 and greater than 1'));
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
              alert(alertMsg+"\n"+that.i18n.__('Sum of probabilities of all proposition alternatives (under fixed conditions) must be equal to 1'));
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
            that.UI.updateForm(form, i+'_THEN_'+formKeyStr+'_'+alternativeIds[j], {
              callback: function(name,value){
                value = value.replace(',','.');
                if(isNaN(value)) {
                  return false;
                }
                var newValue = parseFloat(Number((1 - parseFloat(value))).toFixed(15));
                that.UI.updateForm(form, i+'_THEN_'+formKeyStr+'_'+alternativeIds[(parseInt(j)+1)%2], {value:newValue});
              }
            });
          })(formKeyStr, i, j, alternativeIds);
        }
      }
    }

    that.UI.setModalContent(modalWindow, form);
    return form;
  },
  /**
   * Form of conditional probabilities editor
   */
  _createAlternatriveCondPInfo: function(graphId, nodeContentId, nodeId, node, parentContents, isEditable){
    var that = this;
    var c = GRASP.createElement('div',{});
    var l = GRASP.createElement('div',{class:'condPInfoLabel'},this.i18n.__('Probability of proposition is:'));
    c.appendChild(l);
    var f = GRASP.nodeConditionalFormHelper.getNodeConditionalFormFields(
        node,
        isEditable,
        function(type){return type == GRASP.GraphViewNode.NODE_TYPE_FACT;},
        parentContents,
        [GRASP.GraphViewNode.NODE_TYPE_FACT, GRASP.GraphViewNode.NODE_TYPE_PROPOSITION],
        nodeId
    );

    for(var i in f.fieldsObj){
      var ifthenC = GRASP.createElement('div',{class:'ifThenContainer'});
      var ifthen = f.fieldsObj[i];
      var p = GRASP.createElement(
          'div',
          {class:'probability'},
          parseFloat(ifthen['THEN'][node.active_alternative_id].probability).toFixed(2)
      );
      var iflabel = GRASP.createElement('div',{class:'iflabel'}, that.i18n.__('if'));
      var ifcond = GRASP.createElement('div',{class:'ifcond'});
      for (var j in ifthen['IF']){
        ifcond.appendChild(
            GRASP.createElement('div', {}, ifthen['IF'][j].alternativeLabel)
        );
      }
      ifthenC.appendChild(p);
      ifthenC.appendChild(iflabel);
      ifthenC.appendChild(ifcond);
      c.appendChild(ifthenC);
    }

    return c;
  },

  _createSources: function(graphId, nodeContentId, node, isEditable){
    var that = this;
    if(node.type != GRASP.GraphViewNode.NODE_TYPE_FACT) return;

    // create HTMLElements from list
    var list = node.alternatives[node.active_alternative_id]['list'];
    var htmllist = {};
    for(var i in list) htmllist[i] = this._createHTMLFromListItem(list[i], node.type, isEditable);

    var updateListItem = function(id, el){
      that._editListItem(graphId, nodeContentId, node.active_alternative_id, node.type, list[id], false,
          // this callback is called on 'submit' button
          function(graphId, nodeContentId, node_alternative_id, item){
            if(!that._validateSourceListItem(item)) return false;

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

    return this.UI.createListBox({
      name: 'list',
      items:htmllist,
      itemActions:[
        {name:'edit', type:'icon edit grey', callback: updateListItem},
        {name:'remove', type:'icon delete grey', callback: removeListItem}
      ],
      disabled:!isEditable
    })
  },

  _validateSourceListItem: function(item){
    // check that publisher reliability is from 0 to 10
    item.publisher_reliability = Number(item.publisher_reliability);
    if(item.publisher_reliability < 0 || item.publisher_reliability > 10){
      alert('reliability должен быть от 0 до 10');
      return false;
    }
    return true;
  },

  _addListItem: function(graphId, nodeContentId, node){
    var that = this;
    this._editListItem(graphId, nodeContentId, node.active_alternative_id, node.type, {source_type: 'article'}, true,
        function(graphId, nodeContentId, node_alternative_id, item){
          if(!that._validateSourceListItem(item)) return false;

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
      callback_delay:1000,
      isContentEditable: true
    }));
    c.appendChild(this.UI.createRange({
      name: 'importance',
      label: this.i18n.__('Importance'),
      min: 1,
      max: 99,
      step: 1,
      value: node.importance,
      callback: this._attrChange.bind(this, graphId, nodeContentId, node),
      callback_delay:200,
      disabled: !isEditable
    }));
    return c;
  },

  _createLabel: function(graphId, nodeContentId, node, isEditable){
    isEditable = typeof(isEditable) === 'undefined' ? true : isEditable;
    var that = this;
    var c = GRASP.createElement('div',{}); // container
    var alternatives = {};
    for(var key in node['alternatives']){
      alternatives[key] = node['alternatives'][key];
      alternatives[key].alternative_id = key;
    }
    if (node.type == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION) {
      // create select with alternativeLabels
      var select = this.UI.createSelectBox({
        name: 'active_alternative_id',
        items: alternatives,
        defaultValue: node.active_alternative_id,
        callback: this._attrChange.bind(this, graphId, nodeContentId, node),
        dropType: 'single',
        map: this._alternativeToSelectBoxItem.bind(this, graphId, nodeContentId, node, isEditable),
        selectedItemMap: function(alternative){
          var c = GRASP.createElement('div',{class:'nodeLabel inSelectBox'});
          var r = GRASP.createElement('div',{class:'alternativeProbability'}, (alternative.reliability/100).toFixed(2));
          var lc = GRASP.createElement('div',{class:'textareaContainer'});
          var l = that.UI.createTextareaBox({
            disabled: !isEditable,
            name:'label',
            value:alternative.label,
            callback: that._attrChange.bind(that, graphId, nodeContentId, node),
            isContentEditable: true
          });
          lc.appendChild(l);
          // create buttons to add and remove alternatives
          var add = that.UI.createButton({
            disabled: !isEditable,
            name: 'addAlternative',
            type: 'icon plusCircle grey',
            callback: that._addAlternative.bind(that, graphId, nodeContentId)
          });
          c.appendChild(r);
          c.appendChild(lc);
          c.appendChild(add);
          return c;
        },
        withDownArrow: true
      });
      c.appendChild(select);
    } else if (node.type == GRASP.GraphViewNode.NODE_TYPE_FACT) {
      var alternative = alternatives[node.active_alternative_id];
      var label = GRASP.createElement('div',{class:'nodeLabel'});
      var r = GRASP.createElement('div',{class:'alternativeProbability'}, (alternative.reliability/100).toFixed(2));
      var l = this.UI.createTextareaBox({
        disabled: !isEditable,
        name:'label',
        class:'notInSelectLabel',
        value:alternative.label,
        callback: this._attrChange.bind(this, graphId, nodeContentId, node),
        isContentEditable: true
      });
      label.appendChild(r);
      label.appendChild(l);
      c.appendChild(label);
    } else {
      var alternative = alternatives[node.active_alternative_id];
      var label = GRASP.createElement('div',{class:'nodeLabel'});
      var l = this.UI.createTextareaBox({
        disabled: !isEditable,
        name:'label',
        class:'notInSelectLabel',
        value:alternative.label,
        callback: this._attrChange.bind(this, graphId, nodeContentId, node),
        isContentEditable: true
      });
      label.appendChild(l);
      c.appendChild(label);
    }

    return c;
  },

  _alternativeToSelectBoxItem: function(graphId, nodeContentId, node, isEditable, alternative){
    var c = GRASP.createElement('div',{class:'nodeLabel inSelectBox'});
    var r = GRASP.createElement('div',{class:'alternativeProbability'}, (alternative.reliability/100).toFixed(2));
    var l = GRASP.createElement('div',{class:'alternativeLabel'}, alternative.label);
    var remove = this.UI.createButton({
      disabled: !isEditable,
      name: 'removeAlternative',
      type: 'icon delete grey',
      callback: this._removeAlternative.bind(this, graphId, nodeContentId, node, alternative)
    });
    c.appendChild(r);
    c.appendChild(l);
    c.appendChild(remove);
    return c;
  },

  _removeNode: function(graphId, nodeId){
    if(confirm(this.i18n.__('Are you sure?'))){
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
            rowLabel: that.i18n.__('Please, enter name of the alternative proposition'),
            rowType:'text',
            value:'',
            callback:function(){}
          },
          button:{
            rowType:'button',
            label:that.i18n.__('Add'),
            type:'bigButton uppercase'
          }
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

  _removeAlternative: function(graphId, nodeContentId, node, alternative, e){
    e.stopPropagation();
    if(GRASP.getObjectKeys(node.alternatives).length == 2){
      alert(this.i18n('Sorry, you cannot have only one alternative'));
      return;
    }

    if(confirm(this.i18n.__('Are you sure?'))){
      this.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'removeAlternative',
        nodeContentId: nodeContentId,
        node_alternative_id: alternative.alternative_id
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
   * Creating HTMLElement from node's list item
   * @param item - is a source (= {author:<string>, url:<string>, name:<string>, publisher:<string>}) or falsification
   * @returns {HTMLElement}
   * @private
   */
  _createHTMLFromListItem: function(item, nodeType, isEditable){
    var c = GRASP.createElement('div',{class:'sourceItem'});
    if(nodeType == GRASP.GraphViewNode.NODE_TYPE_FACT){
      var leftC = GRASP.createElement('div',{class:'leftC'});

      if(typeof(item.url) != 'undefined' && item.url.length > 0){
        var name = GRASP.createElement('div',{class:'name'});
        var a = GRASP.createElement('a',{
          href:item.url,
          target:'_blank',
          title:this._lineBreaksForTooltips(item.comment)
        }, item.name);
        name.appendChild(a);
      } else {
        var name = GRASP.createElement('div',{class:'name'}, item.name);
      }

      var authors = GRASP.createElement('div',{class:'authors'}, item.author);
      leftC.appendChild(name);
      leftC.appendChild(authors);

      var rightC = GRASP.createElement('div',{class:'rightC'});
      var source_type = GRASP.createElement(
          'div',
          {class:'sourceType'},
          GRASP.ucfirst(this.i18n.__(item.source_type))
      );
      var publisherReliabilityLabel = GRASP.createElement(
          'div',
          {class:'publisherReliabilityLabel'}
      );
      var publisherReliability = GRASP.createElement(
          'span',
          {class:'publisherReliability'},
          item.publisher_reliability
      );
      var publisherReliabilityPostfix = GRASP.createElement(
          'span',
          {},
          ' ' + this.i18n.__('from') + ' 10'
      );
      publisherReliabilityLabel.appendChild(publisherReliability);
      publisherReliabilityLabel.appendChild(publisherReliabilityPostfix);
      rightC.appendChild(source_type);
      rightC.appendChild(publisherReliabilityLabel);

      c.appendChild(leftC);
      c.appendChild(rightC);
    }else if(nodeType == GRASP.GraphViewNode.NODE_TYPE_PROPOSITION){
      c.appendChild(document.createTextNode(item.name));
    }
    return c;
  },

  _lineBreaksForTooltips: function(text){
    return text.replace("\r\n","&#013;");
  },

  _createEdgeForm: function(graphId, isEditable, edgeTypes, edge, edgeContent, sourceNode, targetNode){
    var that = this;
    if(!isEditable) return '';

    var head = this._createEdgeHead(graphId, edge, edgeContent, edgeTypes, isEditable);

    var onchange = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateEdgeAttribute',
        edgeContentId: edge.edgeContentId,
        edgeAttribute: {name:name, value:value}
      }]);
    };

    var edgeTypeLabels = {};
    for (var type in edgeTypes) {
      edgeTypeLabels[type] = this.i18n.__(type);
    }
    var formSettings = {
      'type':{
        rowType:'select',
        rowLabel:'Edge type',
        items:edgeTypeLabels,
        value:edgeContent.type,
        withDownArrow: true,
        callback:onchange
      }
    };
    if (edgeContent.type !== GRASP.GraphViewEdge.EDGE_TYPE_LINK){
      formSettings['changeDirection'] = {
        rowType:'checkbox',
        rowLabel: 'Change direction',
        value:false
      };
    }
    var form = this.UI.createForm(formSettings);

    if (edgeContent.type !== GRASP.GraphViewEdge.EDGE_TYPE_LINK){
      this.UI.updateForm(form, 'changeDirection', {
        callback: this._changeDirection.bind(this, form, graphId, edge, targetNode)
      });
    }

    var c = GRASP.createElement('div',{class:'edgeEditorContainer'});
    c.appendChild(head);
    c.appendChild(form);

    return c;
  },

  _changeDirection: function(form, graphId, edge, targetNode,  name, value){
    var that = this;
    if (value === false) {
      return;
    }
    that.publisher
        .publish(
            ['get_graph_node_content', {graphId:graphId, nodeContentIds:[targetNode.nodeContentId]}]
        )
        .then(function(targetNodes){
          var targetNodeContent = targetNodes[targetNode.nodeContentId];
          that.UI.showConfirm(
              that.i18n.__(
                  'This action will' +
                  '<BR>1. Remove edge and all conditional probabilities from node "%s"' +
                  '<BR>2. Add new edge of opposite direction.'+
                  '<BR>Are you sure you want to do this?',
                  targetNodeContent.alternatives[targetNodeContent.active_alternative_id].label
              ),
              function(answer){
                if(answer === 'no') {
                  that.UI.updateForm(form, name, {value: false});
                  return false;
                }
                // remove this edge
                that.publisher.publish(["request_for_graph_element_content_change", {
                  graphId: graphId,
                  type: 'removeEdge',
                  edge:edge
                }])
                // create new one with opposite direction
                    .then(function(){
                      that.publisher.publish(
                          ["request_for_graph_model_change",
                            {
                              graphId: graphId,
                              type: 'addEdge',
                              edgeContentId:edge.edgeContentId,
                              fromNodeId:edge.target,
                              toNodeId:edge.source
                            }
                          ]
                      );
                    });
              }
          );
        });
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
   * @param isCreate - is this form for creation of new list item
   * @param callback - arguments are (graphId, nodeContentId, item)
   * @private
   */
  _editListItem: function(graphId, nodeContentId, node_alternative_id, nodeType, item, isCreate, callback){
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
    if(GRASP.getObjectKeys(item).length){
      GRASP.getObjectKeys(formFields).forEach(function(v,k){
        if(typeof(item[v]) != 'undefined') formFields[v].value = item[v]+"";
      });
    }

    for(var fieldName in formFields){
      that.UI.updateForm(form, fieldName, formFields[fieldName]);
    }

    // block source fields (they can be edited from 'Fact Sources' only)
    if (!isCreate) {
      that.formFields.getImmutableSourceFields().forEach(function(v){
        that.UI.updateForm(form,v,{disabled:true});
      });
    }

    // update fields in a form according to item source_type
    if(item.source_type && formFields['source_type']) {
      formFields['source_type'].callback('',item.source_type);
    }

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