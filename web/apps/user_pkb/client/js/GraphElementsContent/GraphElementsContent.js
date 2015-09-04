/**
 * This module is used by node editor to get/set graph nodes contents and attributes
 * It encapsulates read/write from/to repository and caching
 * You can think of it as extra layer above repository that implements caching and some extra logic for addNode, addIcon events
 * @param subscriber
 * @param publisher
 * @constructor
 */

YOVALUE.GraphElementsContent = function(subscriber, publisher){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.cacheElementAttributes = new YOVALUE.Cache(['contentId', 'elementType', 'attributes'], 5000000); //contentId is edgeContentId or nodeContentUd
  this.cacheNodeTexts = new YOVALUE.Cache(['nodeContentId', 'text'], 10000000);

  this.subscriber.subscribe(this,[
    'get_elements_attributes',
    'get_graph_node_text',

    'request_for_graph_element_content_change'
  ]);
};

YOVALUE.GraphElementsContent.prototype = {

  eventListener: function(event){
    var that = this, eventName = event.getName();

    switch (eventName){
      case "request_for_graph_element_content_change":
        var e, er, ed;
        if(event.getData()['type'] == 'updateNodeText'){
          e = this.cacheNodeTexts.get({nodeContentId: event.getData()['nodeContentId']})[0];
          e['text'] = event.getData()['text'];
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'updateNodeAttribute'){
          e = this.cacheElementAttributes.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].attributes;
          e[event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'updateEdgeAttribute'){
          e = this.cacheElementAttributes.get({elementType: 'edge', contentId: event.getData().edgeContentId})[0].attributes;
          e[event.getData().edgeAttribute.name] = event.getData().edgeAttribute.value;
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'addEdge'){
          var newEdge = YOVALUE.clone(YOVALUE.iGraphEdgeContent);
          newEdge.label = event.getData().elementType;
          newEdge.type = event.getData().elementType;

          e = this.publisher.createEvent("graph_element_content_changed", {graphId:event.getData()['graphId'], type:event.getData()['type'],  edge:newEdge});
          this.publisher.when(e).then(function(edgeContentId){
            newEdge.edgeContentId = edgeContentId;
            that.cacheElementAttributes.add({elementType:'edge', contentId:newEdge.edgeContentId, attributes:newEdge});
            event.setResponse(newEdge);
          });
          this.publisher.publishEvent(e);

        }else if(event.getData()['type'] == 'addNode'){
          if(event.getData().element.nodeContentId != null)
          {
            //retrieve node attributes and text
            var e1 = this.publisher.createEvent("get_elements_attributes", {nodes:[event.getData().element.nodeContentId], edges:[]});
            var e2 = this.publisher.createEvent("get_graph_node_text", {graphId:event.getData()['graphId'], nodeContentIds:[event.getData().element.nodeContentId]});
            this.publisher.when(e1, e2).then(function(attributes, texts){
              er = attributes.nodes[event.getData().element.nodeContentId];
              er.text = texts[event.getData().element.nodeContentId];
              event.setResponse(er);
            });
            this.publisher.publishEvent(e1, e2);
          }
          else
          {
            var newNode = YOVALUE.clone(YOVALUE.iGraphNodeContent);
            newNode.label = event.getData().element.label;
            newNode.type = event.getData().element.type;
            newNode.icon = null;

            e = this.publisher.createEvent("graph_element_content_changed",  {graphId:event.getData()['graphId'], type:event.getData()['type'],  node:newNode});
            this.publisher.when(e).then(function(nodeContentId){
              newNode.nodeContentId = nodeContentId;
              that.cacheElementAttributes.add({elementType:'node', contentId:newNode.nodeContentId, attributes:newNode});
              that.cacheNodeTexts.add({contentId:newNode.nodeContentId, text:''});
              event.setResponse(newNode);
            });
            this.publisher.publishEvent(e);
          }

        }else if(event.getData()['type'] == 'addIcon'){
          e = this.cacheElementAttributes.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].attributes;
          var icon = new Image();
          var reader  = new FileReader();
          reader.onload = function () {
            icon.src = reader.result;
            that.publisher.publish("graph_element_content_changed", event.getData());
            event.setResponse({});
          };
          reader.readAsDataURL(event.getData().file);
          e.icon = icon;

        }

        if(ed) this.publisher.publish("graph_element_content_changed", ed);
        if(er) event.setResponse(er);
        break;

      case "get_elements_attributes":
        var rows, i;
        var nodeContentIds = event.getData()['nodes'], nodeContentId;
        var edgeContentIds = event.getData()['edges'], edgeContentId;

        // get elements that does not exists in cacheElementAttributes
        var undefinedContentIds = {nodes:[], edges:[]};
        var elementAttributes = {nodes:[], edges:[]};
        for(i in nodeContentIds){
          nodeContentId = nodeContentIds[i];
          rows = this.cacheElementAttributes.get({elementType:'node', contentId:nodeContentId});
          if(rows.length == 0) undefinedContentIds.nodes.push(nodeContentId);
          else elementAttributes.nodes[nodeContentId] = rows[0]['attributes'];
        }

        for(i in edgeContentIds){
          edgeContentId = edgeContentIds[i];
          rows = this.cacheElementAttributes.get({elementType:'edge', contentId:edgeContentId});
          if(rows.length == 0) undefinedContentIds.edges.push(edgeContentId);
          else elementAttributes.edges[edgeContentId] = rows[0]['attributes'];
        }

        // get these absent element contents from server
        if(undefinedContentIds.edges.length > 0 || undefinedContentIds.nodes.length > 0){
          var e = this.publisher.createEvent("repository_get_graph_elements_attributes", undefinedContentIds);
          this.publisher.when(e).then(function(data){
            var contentId;
            for(contentId in data.nodes){
              that.cacheElementAttributes.add({elementType:'node', contentId:contentId, attributes:data.nodes[contentId]});
              elementAttributes.nodes[contentId] = data.nodes[contentId];
            }

            for(contentId in data.edges){
              that.cacheElementAttributes.add({elementType:'edge', contentId:contentId, attributes:data.edges[contentId]});
              elementAttributes.edges[contentId] = data.edges[contentId];
            }

            event.setResponse(elementAttributes);
          });
          this.publisher.publishEvent(e);
        }else{
          event.setResponse(elementAttributes);
        }
        break;

      case "get_graph_node_text":
        var data = event.getData();
        var i, nodeContentId;
        var cachedTexts = [];
        var unavaliableNodeContentIds = [];

        // determine node contents that is not yet retrieved from server
        for(i in data['nodeContentIds']){
          nodeContentId = data['nodeContentIds'][i];
          var rows = this.cacheNodeTexts.get({nodeContentId:nodeContentId});
          if(rows.length) cachedTexts[nodeContentId] = rows[0].text;
          else unavaliableNodeContentIds.push(nodeContentId);
        }

        // retrieve absent node content from server
        if(unavaliableNodeContentIds.length > 0){
          var e = this.publisher.createEvent("repository_get_graph_node_text", {graphId:data['graphId'], nodeContentIds:unavaliableNodeContentIds});
          this.publisher.when(e).then(function(nodeTexts){
            for(var nodeContentId in nodeTexts){
              that.cacheNodeTexts.add({nodeContentId: nodeContentId, text: nodeTexts[nodeContentId]});
            }
            event.setResponse(YOVALUE.deepmerge(cachedTexts, nodeTexts));
          });
          this.publisher.publishEvent(e);
        }else{
          event.setResponse(cachedTexts);
        }
        break;

    }
  }
};
