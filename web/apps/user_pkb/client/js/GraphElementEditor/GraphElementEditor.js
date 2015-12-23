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
  $('#'+this.leftContainer.id+', #'+this.rightContainer.id).on('keyup change', 'file, input, select, textarea', function(e){
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
      that.publisher.publish('request_for_graph_element_content_change', {
        graphId: $('#'+containerId+' [name=graphId]').val(),
        type: 'updateEdgeAttribute',
        edgeContentId: $('#'+containerId+' [name=elementContentId]').val(),
        edgeAttribute: {name:fieldName, value:e.target.value}
      });
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
      case 'hide_graph_element_editor':
        $('#'+this.leftContainer.id).hide();
        $('#'+this.rightContainer.id).hide();
        break;
      default:
        break;
    }
  },

  _createEdgeForm: function(parentSelector, graphId, isEditable, edgeTypes, edge){
    if(!isEditable) return '';

    var i, typeOptions = '';
    for(i in edgeTypes){
      var type = edgeTypes[i],
        selected = type == edge.type ? 'selected' : '';
      typeOptions += '<option '+selected+' value="'+type+'">'+type+'</option>';
    }

    return '<input type="text" name="label" value="'+edge.label+'">'
    +'<select name="type">'+typeOptions+'</select>'
    +'<input type="hidden" name="elementType" value="edge">'
    +'<input type="hidden" name="elementId" value="'+edge.id+'">'
    +'<input type="hidden" name="elementContentId" value="'+edge.edgeContentId+'">'
    +'<input type="hidden" name="graphId" value="'+graphId+'">';
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
      +'<img class="ajax" id="node_'+graphId+'_'+node.nodeContentId+'_ajax" src="'+this.ajaxLoaderSrc+'"><textarea style="display:none; '+bgStyle+'" id="node_'+graphId+'_'+node.nodeContentId+'_text" name="nodeText" class="nodeText '+node.type+'NodeText"></textarea>'
      + (node.type == 'fact' ? '<div id="'+sourceListId+'" class="nodeSourceList"></div>' : '')
     // +'<input type="file" name="icon" />'
      +'<input type="hidden" name="elementType" value="node">'
      +'<input type="hidden" name="elementId" value="'+node.id+'">'
      +'<input type="hidden" name="elementContentId" value="'+node.nodeContentId+'">'
      +'<input type="hidden" name="graphId" value="'+graphId+'">';

    parent.append(form);

    var e = this.publisher.createEvent('get_graph_node_sources', {graphId:graphId, nodeContentId:node.nodeContentId});
    this.publisher.when(e).then(function(sources){
      that.UI.createItemsBox(
        '#'+sourceListId,
        {
          'source_type':{'type':'select','label':'тип','options':{'book':'книга','monography':'монография','textbook':'учебник','news':'новость', 'article':'научная статья'},'value':'book'},
          'field_type':{'type':'text','label':'область','value':''},
          'url':{'type':'text','label':'url',value:''},
          'author':{'type':'text', label:'Автор', value:''},
          'editor':{'type':'text', label:'Рецензент', value:''},
          'publisher':{'type':'text', label:'Издатель', value:''},
          'primacy':{'type':'select', label:'Первичность', 'options':{'1':'первичный','2':'вторичный',3:'третичный'}, value:''},
          'publish_date':{'type':'text', label:'Дата издания', value:''}
        },
        sources,
        function(item){
          console.log('addCallback', item);
          that.publisher.publish('node_source_added', {graphId:graphId, nodeContentId:node.nodeContentId, source:item});
          return true;
        },
        function(item){
          console.log('removeCallback', item);
          that.publisher.publish('node_source_removed', {graphId:graphId, nodeContentId:node.nodeContentId, source:item});
          return true;
        }
      );
    });
    this.publisher.publishEvent(e);

  //  return form;
  },

  _insertNodeText: function(graphId, nodeContentId, isEditable){
    var that = this, e = this.publisher.createEvent('get_graph_node_text', {graphId:graphId, nodeContentIds:[nodeContentId]});
    this.publisher.when(e).then(function(nodes){
      that.jQuery('#node_'+graphId+'_'+that._escapeNodeContenId(nodeContentId)+'_ajax').hide();
      var text = isEditable ? nodes[nodeContentId] : that._nl2br(nodes[nodeContentId]);
      that.jQuery('#node_'+graphId+'_'+that._escapeNodeContenId(nodeContentId)+'_text').html(text);
      that.jQuery('#node_'+graphId+'_'+that._escapeNodeContenId(nodeContentId)+'_text').show();
    });
    this.publisher.publishEvent(e);
  },

  _nl2br: function(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },

  _escapeNodeContenId: function(str){
    return str.replace('/', '\\/');
  }
};