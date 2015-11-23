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
YOVALUE.GraphElementEditor = function(subscriber, publisher, ViewManager, jQuery, ajaxLoaderSrc){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.ViewManager = ViewManager;
  this.jQuery = jQuery;

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
        var form;
        if(event.getData().elementType == 'node'){
          form = this._getNodeForm(
            event.getData().graphId,
            event.getData().isEditable,
            event.getData().nodeTypes,
            event.getData().node
          );

          v.html(form);
          this._insertNodeText(event.getData().graphId, event.getData().node.nodeContentId, event.getData().isEditable);
        }else if(event.getData().elementType == 'edge'){
          form = this._getEdgeForm(
            event.getData().graphId,
            event.getData().isEditable,
            event.getData().edgeTypes,
            event.getData().edge
          );
          v.html(form);
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

  _getEdgeForm: function(graphId, isEditable, edgeTypes, edge){
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

  _getNodeForm: function(graphId, isEditable, nodeTypes, node){
    // show in view-only form
    if(!isEditable) return '<div><img class="ajax" id="node_'+graphId+'_'+node.nodeContentId+'_ajax" src="'+this.ajaxLoaderSrc+'"></div><div style="display:none" id="node_'+graphId+'_'+node.nodeContentId+'_text" name="nodeText"></div>';

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
    var form = '<textarea class="labelTextArea" name="label">'+node.label+'</textarea>'
      +'<select name="type">'+typeOptions+'</select>'
      +'<select name="importance">'+importanceOptions+'</select>'
      +'<select name="reliability">'+reliabilityOptions+'</select>'
      +'<img class="ajax" id="node_'+graphId+'_'+node.nodeContentId+'_ajax" src="'+this.ajaxLoaderSrc+'"><textarea style="display:none; '+bgStyle+'" id="node_'+graphId+'_'+node.nodeContentId+'_text" name="nodeText"></textarea>'
      +'<input type="file" name="icon" />'
      +'<input type="hidden" name="elementType" value="node">'
      +'<input type="hidden" name="elementId" value="'+node.id+'">'
      +'<input type="hidden" name="elementContentId" value="'+node.nodeContentId+'">'
      +'<input type="hidden" name="graphId" value="'+graphId+'">';

    return form;
  },

  _insertNodeText: function(graphId, nodeContentId, isEditable){
    var that = this, e = this.publisher.createEvent('get_graph_node_text', {graphId:graphId, nodeContentIds:[nodeContentId]});
    this.publisher.when(e).then(function(nodes){
      console.log('#node_'+graphId+'_'+that._escapeNodeContenId(nodeContentId)+'_ajax');
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