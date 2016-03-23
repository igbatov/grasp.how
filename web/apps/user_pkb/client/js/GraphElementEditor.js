/**
 * Module that allows to edit node and edge content and properties.
 * You can think of it as node editor's View in MVC model.
 * It fires 'request_for_graph_element_content_change' when user manipulates an editor (writes text, changes node type and etc.)
 * @param subscriber
 * @param publisher
 * @param ViewManager
 * @param jQuery
 * @constructor
 */
YOVALUE.GraphElementEditor = function(subscriber, publisher, ViewManager, UI, jQuery, ajaxIndicator){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;

  this.ajaxIndicator = ajaxIndicator;

  this.subscriber.subscribe(this,[
    'show_graph_element_editor',
    'hide_graph_element_editor'
  ]);

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
  eventListener: function(event){
    var $ = this.jQuery, v;
    if(event.getData().position == 'rightGraphView') v = $('#'+this.leftContainer.id);
    if(event.getData().position == 'leftGraphView') v = $('#'+this.rightContainer.id);

    var eventName = event.getName();
    switch (eventName)
    {
      case "show_graph_element_editor":
        v.html('');
        if(event.getData().elementType == 'node'){
          // show in view-only form
          if(!event.getData().isEditable) document.getElementById(v.attr('id')).append(this.ajaxIndicator);
          document.getElementById(v.attr('id')).appendChild(
            this._createNodeForm(
              event.getData().graphId,
              event.getData().isEditable,
              event.getData().nodeTypes,
              event.getData().node
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
        $('#'+this.leftContainer.id).hide();
        $('#'+this.rightContainer.id).hide();
        break;
      default:
        break;
    }
  },

  _createNodeForm: function(graphId, isEditable, nodeTypes, node){
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
    };

    var editNodeText = function(name, value){
      that.publisher.publish(['request_for_graph_element_content_change', {
        graphId: graphId,
        type: 'updateNodeText',
        nodeContentId: node.nodeContentId,
        text: value
      }]);
    };

    var removeNode = function(){
      if(confirm('Are you sure?')){
        that.publisher.publish(['delete_pressed',{}]);
      }
    };

    var addIcon = function(files,ul){
      console.log(files);
      /*
       that.publisher.publish(['request_for_graph_element_content_change', {
       graphId: graphId,
       type: 'addIcon',
       file: files,
       nodeContentId: node.nodeContentId
       }]);
       */
    };
    var removeIcon = function(){};

    var types = nodeTypes.reduce(function(prev,curr){ prev[curr]=curr; return prev; },{});

    var form = this.UI.createForm({
      label:       {type:'textarea',value:node.label,callback:attrChange},
      type:        {type:'select',options:types,value:node.type,callback:attrChange},
      importance:  {type:'range',min:0,max:99,step:1,value:node.importance,callback:attrChange},
      reliability: {type:'range',min:0,max:99,step:1,value:node.reliability,callback:attrChange},
      //  icon:        {type:'file',items:{},addCallback:addIcon,removeCallback:removeIcon},
      removeButton:{type:'button',value:'remove',callback:removeNode}
    });

    form.appendChild(this.ajaxIndicator);

    // add text and sources
    this.publisher
      .publish(
        ['get_graph_node_text', {graphId:graphId, nodeContentIds:[node.nodeContentId]}],
        ['get_graph_node_sources', {graphId:graphId, nodeContentId:node.nodeContentId}]
      )
      .then(function(nodes, sources){

        // add node text
        YOVALUE.setDisplay(that.ajaxIndicator,'none');
        if(isEditable){
          form.appendChild(YOVALUE.createElement(
            'textarea',
            {name:'nodeText'},
            nodes[node.nodeContentId],
            editNodeText
          ));
        }else{
          form.appendChild(YOVALUE.createElement(
            'div',
            {name:'nodeText'},
            that._nl2br(nodes[node.nodeContentId])
          ));
        }

        var items = [];
        for(var i in sources) items[i] = that._createHTMLFromSource(sources[i]);

        var editSourceItem = function(id, el){
          that._editSource(graphId, node.nodeContentId, sources[id], function(graphId, nodeContentId, item){
            el.removeChild(el.firstChild);
            el.insertBefore(that._createHTMLFromSource(item), el.firstChild);
          });
          return true;
        };

        var removeSourceItem = function(id, el){
          that.publisher.publish(['node_source_remove_request', {graphId:graphId, nodeContentId:node.nodeContentId, source:sources[id]}]);
          el.parentNode.removeChild(el);
          return true;
        };

        var sourceList = that.UI.createList(items,{edit:editSourceItem, remove:removeSourceItem});

        // add "add source button"
        form.appendChild(that.UI.createButton('addSource','add source',function(){
          that._editSource(graphId, node.nodeContentId,{},function(graphId, nodeContentId, item){
            sources[item.id] = item;
            // add item
            sourceList.appendChild(that.UI.createListItem(item.id, that._createHTMLFromSource(item),{edit:editSourceItem, remove:removeSourceItem}));
          });
        }));

        // add node sources
        form.appendChild(sourceList);

      });

    return form;
  },

  /**
   * Creating HTMLElement from node's source
   * @param source - {author:<string>, url:<string>, name:<string>, publisher:<string>}
   * @returns {HTMLElement}
   * @private
   */
  _createHTMLFromSource: function(source){
    var item = null;
    if(source.url.length > 0){
      item = YOVALUE.createElement('a',{href:source.url, target:'_blank'}, source.author+' / '+source.name+' / '+source.publisher);
    }else{
      item = document.createTextNode(source.author+' / '+source.name+' / '+source.publisher);
    }
    return item;
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
        options:edgeTypes.reduce(function(prev,curr){ prev[curr]=curr; return prev; },{}),
        value:edge.type,
        callback:onchange
      },
      'removeButton':{
        type:'button',
        value:'Remove edge',
        callback:function(){
          if(confirm('Are you sure?')){
            that.publisher.publish(['delete_pressed',{}]);
          }
        }
      }
    });

    return form;
  },

  /**
   * Show modal window with node source fields
   * @param graphId
   * @param nodeContentId
   * @param item
   * @param callback - {graphId: graphId, nodeContentId: nodeContentId, source: item}
   * @private
   */
  _editSource: function(graphId, nodeContentId, item, callback){
    var that = this, modalContent = YOVALUE.createElement('div',{},'');
    item = item || {};
    var modalWindow = that.UI.createModal();
    var formFields = {
      'source_type':{'type':'select', 'label':'Тип', callback:function(name, value){}, 'options':{'article':'статья (peer-reviewed)', 'meta-article':'мета-статья (peer-reviewed)', 'textbook':'учебник', 'book':'книга', 'news':'новость', 'personal experience':'личный опыт'},'value':'article'},
      'name':{'type':'text', label:'Название',value:''},
      'url':{'type':'text', label:'URL',value:''},
      'author':{'type':'text', label:'Автор', value:''},
      'editor':{'type':'text', label:'Рецензент', value:''},
      'publisher':{'type':'text', label:'Издатель', value:''},
      'publish_date':{'type':'date', label:'Дата издания', value:''},
      'pages':{'type':'text', label:'Том, страницы', value:''},
      'button':{'type':'button', value:'Добавить'}
    };
    if(typeof(item) != 'undefined'){
      YOVALUE.getObjectKeys(formFields).forEach(function(v,k){
        if(typeof(item[v]) != 'undefined') formFields[v].value = item[v];
        formFields['button'].value = 'Сохранить';
      });
    }

    modalContent.appendChild(that.UI.createForm(formFields,
      function (form) {
        // set form fields to item
        YOVALUE.getObjectKeys(form).forEach(function (v, k) {
          if (typeof(form[v]) != 'undefined') item[v] = form[v];
        });
        // send item for add or update
        if (typeof(item.id) == 'undefined')
          that.publisher.publish(['node_source_add_request', {
            graphId: graphId,
            nodeContentId: nodeContentId,
            source: item
           }]).then(function (result) {
            item.id = result.id;
            callback(graphId, nodeContentId, item);
            that.UI.closeModal(modalWindow);
          });
        else
          that.publisher
          .publish(['node_source_update_request', {graphId: graphId, nodeContentId: nodeContentId, source: item}])
          .then(function () {
            callback(graphId, nodeContentId, item);
            that.UI.closeModal(modalWindow);
          });
      })
    );

    that.UI.setModalContent(modalWindow, modalContent);
  },

  _nl2br: function(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },

  _escapeNodeContentId: function(str){
    return str.replace('/', '\\/');
  }
};