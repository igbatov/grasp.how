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
    if(event.getData().position == 'rightGraphView') v = $('#'+this.leftContainer.id);
    else if(event.getData().position == 'leftGraphView') v = $('#'+this.rightContainer.id);

    var eventName = event.getName();
    switch (eventName)
    {
      case "show_graph_element_editor":
        var newElementHash = JSON.stringify({
          graphId:event.getData().graphId,
          elementId:event.getData().elementType == 'node' ? event.getData().node.id : event.getData().edge.id
         // alternativeId:event.getData().elementType == 'node' && event.getData().node.type == this.NODE_TYPE_PROPOSITION ? event.getData().node.alternativeId :null
        });

        // only one editor can be opened
        if(this.currentElementHash != null && this.currentElementHash != newElementHash) return;
        this.currentElementHash = newElementHash;

        v.html('');
        if(event.getData().elementType == 'node'){
          // show in view-only form
          if(!event.getData().isEditable) document.getElementById(v.attr('id')).append(this.ajaxIndicator);
          document.getElementById(v.attr('id')).appendChild(
            this._createNodeForm(
              event.getData().graphId,
              event.getData().isEditable,
              event.getData().nodeTypes,
              event.getData().node,
              event.getData().position
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

  _createNodeForm: function(graphId, isEditable, nodeTypes, node, position){
    // select list for node types
    var that = this;

    // define callbacks for fields
    var attrChange = function(name,value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeAttribute',
        nodeContentId: node.nodeContentId,
        nodeAttribute: {name:name, value:value}
      }]);

      // its an node type change - reload whole editor
      if(name == 'type'){
        node.type = value;
        that.publisher.publish(['node_list_reload', {graphId: graphId, nodeContentId: node.nodeContentId}]);
        that.publisher.publish(['show_graph_element_editor', {elementType:'node', graphId: graphId, position:position, isEditable: isEditable, nodeTypes:nodeTypes, node:node}]);
      }
    };

    var removeNode = function(){
      if(confirm('Are you sure?')){
        that.publisher.publish(["request_for_graph_model_change", {graphId: graphId, type: 'removeNode', elementId: node.id}]);
      }
    };

    var addAlternative = function(){
      var modalWindow = that.UI.createModal();
      var form = that.UI.createForm({
        label: {label:'Введите название альтернативной теории',type:'text',value:'',callback:function(){}},
        'button':{'type':'button', value:'Добавить'}
      },
      // form submit callback
      function (form) {
        // set form fields to item
        that.publisher.publish(["request_for_graph_element_content_change", {graphId: graphId, type: 'addAlternative', nodeContentId: node.nodeContentId}]);
        that.UI.closeModal(modalWindow);
      });
      that.UI.setModalContent(modalWindow, form);

    };

    var selectAlternative = function(alternative){
      console.log('alternative selected', alternative);
    };

    var editConditionals = function(){

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

    var types = nodeTypes.reduce(function(prev,curr){ prev[curr]=curr; return prev; },{});

    var formDef = {};
    if(node.type == this.NODE_TYPE_PROPOSITION){
      formDef['alternatives'] = {type:'select',items:[],callback:selectAlternative};
      formDef['addAlternative'] = {type:'button',value:'Add alternative',callback:addAlternative};
    }

    formDef['type'] = {type:'select',items:types,value:node.type,callback:attrChange};
    formDef['importance'] =  {type:'range',min:0,max:99,step:1,value:node.importance,callback:attrChange};
    formDef['label'] =       {type:'textarea',value:node.label,callback:attrChange};
    formDef['editConditionals'] ={type:'button',value:'Conditional probabilities',callback:editConditionals};
    formDef['reliability'] = {type:'range',min:0,max:99,step:1,value:node.reliability,callback:attrChange,disabled:true};
    //  formDef['icon'] =        {type:'file',items:{},addCallback:addIcon,removeCallback:removeIcon};
    formDef['removeButton'] ={type:'button',value:'remove',callback:removeNode};

    var form = this.UI.createForm(formDef);
    form.appendChild(this.ajaxIndicator);
    YOVALUE.setDisplay(that.ajaxIndicator,'block');

    this._addContent(form, node, graphId, isEditable);

    return form;
  },

  /**
   * Create promises to add text and source list (for fact) or falsification list (for proposition)
   * @param form
   * @param node
   * @param graphId
   * @param isEditable
   * @private
   */
  _addContent: function(form, node, graphId, isEditable){
    var that = this;

    var editNodeText = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeText',
        nodeContentId: node.nodeContentId,
        text: value
      }]);
    };

    this.publisher
      .publish(
        ['get_graph_node_content', {graphId:graphId, nodeContentIds:[node.nodeContentId]}]
      )
      // nodes - text, list - sources or falsifications
      .then(function(contents){
        var alternatives = contents[node.nodeContentId]['alternatives'];

        if(node.type == that.NODE_TYPE_PROPOSITION){
          // create list of alternative labels
          var alternativeLabels = {};
          for(var i in alternatives){
            alternativeLabels[i] = alternatives[i].label;
          }

          // update alternative list
          that.UI.updateForm(form,'alternatives',{items:alternativeLabels, defaultValue:contents[node.nodeContentId]['active_alternative_id']});
        }

        // add node text
        var nodeText = alternatives[contents[node.nodeContentId]['active_alternative_id']]['text'];
        YOVALUE.setDisplay(that.ajaxIndicator,'none');
        if(isEditable){
          form.appendChild(YOVALUE.createElement(
            'textarea',
            {name:'nodeText'},
            nodeText,
            editNodeText
          ));
        }else{
          form.appendChild(YOVALUE.createElement(
            'div',
            {name:'nodeText'},
            that._nl2br(nodeText)
          ));
        }

        if(node.type != that.NODE_TYPE_FACT && node.type != that.NODE_TYPE_PROPOSITION) return;

        // create HTMLElements from list
        var list = alternatives[contents[node.nodeContentId]['active_alternative_id']]['list'];
        var items = [];
        for(var i in list) items[i] = that._createHTMLFromListItem(list[i], node.type);
        var updateListItem = function(id, el){
          that._editListItem(graphId, node.nodeContentId, node.type, list[id], function(graphId, nodeContentId, item){
            that.publisher
              .publish(['node_list_update_request', {graphId: graphId, nodeContentId: nodeContentId, item: item, nodeType:node.type}])
              .then(function (updateAnswer) {
                // update li content
                el.removeChild(el.firstChild);
                el.insertBefore(that._createHTMLFromListItem(item, node.type), el.firstChild);

                // update list
                YOVALUE.getObjectKeys(item).forEach(function(v){ list[item.id][v] = item[v]; });

                // update node reliability
                if(typeof(updateAnswer.reliability) != 'undefined') that.UI.updateForm(form,'reliability',{value:updateAnswer.reliability});
              });
          });
          return true;
        };

        var removeListItem = function(id, el){
          that.publisher.publish(
              ['node_list_remove_request', {graphId:graphId, nodeContentId:node.nodeContentId, nodeType:node.type, item:list[id], nodeType:node.type}]
          ).then(function(updateAnswer){
              if(typeof(updateAnswer.reliability) != 'undefined') that.UI.updateForm(form,'reliability',{value:updateAnswer.reliability});
          });
          el.parentNode.removeChild(el);
          return true;
        };

        var HTMLList = that.UI.createList(items,{edit:updateListItem, remove:removeListItem});

        // define and add "add source button"
        form.appendChild(that.UI.createButton({
          name:'addList',
          label:(node.type == that.NODE_TYPE_FACT ? 'add source' : 'add falsification'),
          callback:function(){
            that._editListItem(graphId, node.nodeContentId, node.type, {},function(graphId, nodeContentId, item){
              that.publisher
                .publish(['node_list_add_request', {graphId: graphId, nodeContentId: nodeContentId,  nodeType:node.type,  item: item}])
                .then(function (updateAnswer) {
                  item.id = updateAnswer.id;
                  // update list item object
                  list[item.id] = item;
                  // add item
                  HTMLList.appendChild(that.UI.createListItem(item.id, that._createHTMLFromListItem(item, node.type),{edit:updateListItem, remove:removeListItem}));
                  // update node reliability
                  that.UI.updateForm(form,'reliability',{value:updateAnswer.reliability});
                });
            });
          }})
        );

        // add node list
        form.appendChild(HTMLList);

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
      if(item.url.length > 0){
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
        value:'Remove edge',
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
   * @param nodeType
   * @param item
   * @param callback - arguments are (graphId, nodeContentId, item)
   * @private
   */
  _editListItem: function(graphId, nodeContentId, nodeType, item, callback){
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
        'publish_date':{'type':'date', label:'Дата издания'},
        'pages':{'type':'text', label:'Том, страницы'},
        'comment':{'type':'textarea', label:'Комментарий'},
        'source_id':{'type':'hidden'},
        'button':{'type':'button', value:'Добавить'}
      };

      return formFields;
    };

    var _createFalsificationFields = function(){
      var formFields = {
        'name':{'type':'text', label:'Название'},
        'comment':{'type':'textarea', label:'Описание'},
        'button':{'type':'button', value:'Добавить'}
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
        callback(graphId, nodeContentId, item);
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