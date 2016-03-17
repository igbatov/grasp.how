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
YOVALUE.GraphElementEditor = function(subscriber, publisher, ViewManager, UI, jQuery, ajaxLoaderSrc){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;
  this.UI = UI;

  this.ajaxLoaderSrc = ajaxLoaderSrc;

  this.subscriber.subscribe(this,[
    'show_graph_element_editor',
    'hide_graph_element_editor'
  ]);

  this.leftContainer = this.ViewManager.getViewContainer('leftGraphElementEditor');
  this.rightContainer = this.ViewManager.getViewContainer('rightGraphElementEditor');

  var $ = this.jQuery, that = this, elementType;


  // Fire event on editor focusin and focusout
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('focus', 'input, select, textarea', function(e){
    that.publisher.publish('element_editor_focusin', {});
  });
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('focusout', 'input, select, textarea', function(e){
    that.publisher.publish('element_editor_focusout', {});
  });

  // Fire event on element content change
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('keyup click change', 'file, input, select, textarea, button', function(e){
    var fieldName = $(this).attr('name'),
      containerId = $(this).parent().attr('id'),
      elementType = $('#'+containerId+' [name=elementType]').val();

    if(elementType == 'node'){
      if(fieldName == 'nodeText'){
        that.publisher.publish('request_for_graph_element_content_change', {
          graphId: $('#'+containerId+' [name=graphId]').val(),
          type: 'updateNodeText',
          nodeContentId: $('#'+containerId+' [name=elementContentId]').val(),
          text: e.target.value
        });
      }else if(fieldName == 'addSource'){
        that._editSource($('#'+containerId+' [name=graphId]').val(), $('#'+containerId+' [name=elementContentId]').val(),{},function(item){
          // add item
        });
      }else if(fieldName == 'removeButton'){
        if(confirm('Are you sure?')){
          that.publisher.publish('delete_pressed',{});
        }
      }else if(fieldName == 'icon'){
        that.publisher.publish('request_for_graph_element_content_change', {
          graphId: $('#'+containerId+' [name=graphId]').val(),
          type: 'addIcon',
          file: this.files[0],
          nodeContentId: $('#'+containerId+' [name=elementContentId]').val()
        });
      }else if(['label', 'type', 'importance', 'reliability'].indexOf[fieldName] != -1 ){
        that.publisher.publish('request_for_graph_element_content_change', {
          graphId: $('#'+containerId+' [name=graphId]').val(),
          type: 'updateNodeAttribute',
          nodeContentId: $('#'+containerId+' [name=elementContentId]').val(),
          nodeAttribute: {name:fieldName, value:e.target.value}
        });
      }
    }else if(elementType == 'edge'){
     if(fieldName == 'removeButton'){
        if(confirm('Are you sure?')){
          that.publisher.publish('delete_pressed',{});
        }
     }else{
       that.publisher.publish('request_for_graph_element_content_change', {
         graphId: $('#'+containerId+' [name=graphId]').val(),
         type: 'updateEdgeAttribute',
         edgeContentId: $('#'+containerId+' [name=elementContentId]').val(),
         edgeAttribute: {name:fieldName, value:e.target.value}
       });
     }
    }
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
          this._createNodeForm(
            '#'+v.attr('id'),
            event.getData().graphId,
            event.getData().isEditable,
            event.getData().nodeTypes,
            event.getData().node
          );
          this._insertNodeText(event.getData().graphId, event.getData().node.nodeContentId, event.getData().isEditable);
        }else if(event.getData().elementType == 'edge'){
          this._createEdgeForm(
            '#'+v.attr('id'),
            event.getData().graphId,
            event.getData().isEditable,
            event.getData().edgeTypes,
            event.getData().edge
          );
        }
        v.show();
        break;
      case 'node_source_added':
        break;
      case 'node_source_updated':
        break;
      case 'node_source_removed':
        break;
      case 'hide_graph_element_editor':
        $('#'+this.leftContainer.id).hide();
        $('#'+this.rightContainer.id).hide();
        break;
      default:
        break;
    }
  },

  /**
   *
   * @param graphId
   * @param nodeContentId
   * @param item
   * @private
   */
  _editSource: function(graphId, nodeContentId, item){
    var that = this, modalContent = YOVALUE.createElement('div',{},'');
    item = item || {};
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

    var deferred = that.publisher.createEvent();
    (function(deferred) {
      modalContent.appendChild(that.UI.createForm(formFields,
        function (form) {
          // set form fields to item
          YOVALUE.getObjectKeys(form).forEach(function (v, k) {
            if (typeof(form[v]) != 'undefined') item[v] = form[v];
          });
          // send item for add or update
          if (typeof(item.id) == 'undefined') that.publisher.publish('node_source_add_request', {
            graphId: graphId,
            nodeContentId: nodeContentId,
            source: item
          });
          else that.publisher
            .when(['node_source_update_request', {graphId: graphId, nodeContentId: nodeContentId, source: item}])
            .then(function () {
              deferred.setResponse({graphId: graphId, nodeContentId: nodeContentId, source: item});
              console.log('HHHHHHHHHHHHHHHHHH');
            });
        }));
    })(deferred);
    that.UI.setModalContent(that.UI.createModal(), modalContent);
    return deferred;
  },

  _createEdgeForm: function(parentSelector, graphId, isEditable, edgeTypes, edge){
    var parent = this.jQuery(parentSelector);
    if(!isEditable) return '';

    var i, typeOptions = '';
    for(i in edgeTypes){
      var type = edgeTypes[i],
        selected = type == edge.type ? 'selected' : '';
      typeOptions += '<option '+selected+' value="'+type+'">'+type+'</option>';
    }

    var form = '<input type="text" name="label" value="'+edge.label+'">'
    +'<select name="type">'+typeOptions+'</select>'
    +'<button name="removeButton" class="removeButton">Remove edge</button>'
    +'<input type="hidden" name="elementType" value="edge">'
    +'<input type="hidden" name="elementId" value="'+edge.id+'">'
    +'<input type="hidden" name="elementContentId" value="'+edge.edgeContentId+'">'
    +'<input type="hidden" name="graphId" value="'+graphId+'">';

    parent.append(form);
  },

  _createNodeForm: function(parentSelector, graphId, isEditable, nodeTypes, node){
    var parent = this.jQuery(parentSelector), that = this;
    // show in view-only form
    if(!isEditable) parent.append('<div><img class="ajax" id="node_'+graphId+'_'+node.nodeContentId+'_ajax" src="'+this.ajaxLoaderSrc+'"></div><div style="display:none" id="node_'+graphId+'_'+node.nodeContentId+'_text" class="nodeText" name="nodeText"></div>');

    // select list for node types
    var i, typeOptions = '', importanceOptions = '', reliabilityOptions = '';
    for(i in nodeTypes){
      var type = nodeTypes[i],
      selected = type == node.type ? 'selected' : '';
      typeOptions += '<option '+selected+' value="'+type+'">'+type+'</option>';
    }

    // select list for importance options
    for(i=0; i<100; i++){
      selected = i == node.importance ? 'selected' : '';
      importanceOptions += '<option '+selected+' value="'+i+'">'+i+'</option>';
    }

    // select list for reliability options
    for(i=0; i<100; i++){
      selected = i == node.reliability ? 'selected' : '';
      reliabilityOptions += '<option '+selected+' value="'+i+'">'+i+'</option>';
    }

    var bgStyle = node.icon == null ? '' : 'background-image:url(\''+node.icon.src+'\'); background-repeat:no-repeat; background-position: center center;';
    var sourceListId = this.UI.generateId();
    var form = '<textarea class="labelTextArea" name="label">'+node.label+'</textarea>'
      +'<select name="type">'+typeOptions+'</select>'
      +'<select name="importance">'+importanceOptions+'</select>'
      +'<select name="reliability">'+reliabilityOptions+'</select>'
      +'<button name="addSource" class="addSource">Add source</button>'
      +'<button name="removeButton" class="removeButton">Remove node</button>'
      +'<img class="ajax" id="node_'+graphId+'_'+node.nodeContentId+'_ajax" src="'+this.ajaxLoaderSrc+'"><textarea style="display:none; '+bgStyle+'" id="node_'+graphId+'_'+node.nodeContentId+'_text" name="nodeText" class="nodeText '+node.type+'NodeText"></textarea>'
     // +'<input type="file" name="icon" />'
      +'<input type="hidden" name="elementType" value="node">'
      +'<input type="hidden" name="elementId" value="'+node.id+'">'
      +'<input type="hidden" name="elementContentId" value="'+node.nodeContentId+'">'
      +'<input type="hidden" name="graphId" value="'+graphId+'">';

    parent.append(form);

    this.publisher
      .when(['get_graph_node_sources', {graphId:graphId, nodeContentId:node.nodeContentId}])
      .then(function(sources){
        var items = [];
        for(var i in sources){
          if(sources[i].url.length > 0){
            items[i] = YOVALUE.createElement('a',{href:sources[i].url, target:'_blank'}, sources[i].author+' / '+sources[i].name+' / '+sources[i].publisher);
          }else{
            items[i] = document.createTextNode(sources[i].author+' / '+sources[i].name+' / '+sources[i].publisher);
          }
        }

        parent.append(that.UI.createList(
          items,
          {
            edit:function(id, el){
              that._editSource(graphId, node.nodeContentId, sources[id], function(item){
                // update element
              }).then(function(evt){
                console.log(evt);
              });
              return true;
            },
            remove:function(id, el){
              that.publisher.publish('node_source_remove_request', {graphId:graphId, nodeContentId:node.nodeContentId, source:sources[id]});
              return true;
            }
          }
        ));
      });

  //  return form;
  },

  _insertNodeText: function(graphId, nodeContentId, isEditable){
    var that = this;
    this.publisher
      .when(['get_graph_node_text', {graphId:graphId, nodeContentIds:[nodeContentId]}])
      .then(function(nodes){
        that.jQuery('#node_'+graphId+'_'+that._escapeNodeContentId(nodeContentId)+'_ajax').hide();
        var text = isEditable ? nodes[nodeContentId] : that._nl2br(nodes[nodeContentId]);
        that.jQuery('#node_'+graphId+'_'+that._escapeNodeContentId(nodeContentId)+'_text').html(text);
        that.jQuery('#node_'+graphId+'_'+that._escapeNodeContentId(nodeContentId)+'_text').show();
      });
  },

  _nl2br: function(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },

  _escapeNodeContentId: function(str){
    return str.replace('/', '\\/');
  }
};