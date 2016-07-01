/**
 * This module is used by node editor to get/set graph nodes contents and attributes
 * It encapsulates read/write from/to repository and caching
 * You can think of it as extra layer above repository that implements caching and some extra logic for addNode,
 * addIcon events
 *
 * Though client (javascript) code do not rely on structure of contentId, I describe it here for reference -
 * contentId has the form 'graphId-contentId' or 'graphId-contentId/graphId-contentId' for diff graph.
 * Client code only implies that every node has unique (global) string contentId across all graphs
 *
 * @param publisher
 * @constructor
 */

YOVALUE.GraphElementsContent = function(publisher){
  this.publisher = publisher;
  // this is filled all at once for the whole graph at the very beginning
  this.cacheElementAttributes = new YOVALUE.Cache(['contentId', 'elementType', 'attributes'], 5000000); //contentId is edgeContentId or nodeContentUd
  // this is filled for every concrete node upon request (because we assume that it can contain a lot of data)
  // and contain full node structure with attributes and alternatives
  this.cacheNodeContent = new YOVALUE.Cache(['nodeContentId', 'content'], 10000000);
};

YOVALUE.GraphElementsContent.prototype = {

  eventListener: function(event){
    var that = this, eventName = event.getName();

    switch (eventName){
      case "request_for_graph_element_content_change":
        var e, er, ed;
        if(event.getData()['type'] == 'updateNodeText'){
          e = this.cacheNodeContent.get({nodeContentId: event.getData()['nodeContentId']})[0];
          e['content']['alternatives'][event.getData()['alternativeId']]['text'] = event.getData()['text'];
          er = {};
          ed = event.getData();

        }
        // add node alternative
        else if(event.getData()['type'] == 'addAlternative'){

        }
        // update general node attribute
        else if(event.getData()['type'] == 'updateNodeAttribute'){
          e = this.cacheElementAttributes.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].attributes;
          e[event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;

          er = {};
          ed = event.getData();
        }else if(event.getData()['type'] == 'updateNodeAlternativeAttribute'){

        }else if(event.getData()['type'] == 'updateEdgeAttribute'){
          e = this.cacheElementAttributes.get({elementType: 'edge', contentId: event.getData().edgeContentId})[0].attributes;
          e[event.getData().edgeAttribute.name] = event.getData().edgeAttribute.value;
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'addEdge'){
          var newEdge = YOVALUE.clone(YOVALUE.iGraphEdgeContent);
          newEdge.label = event.getData().elementType;
          newEdge.type = event.getData().elementType;

          this.publisher
            .publish(["graph_element_content_changed", {graphId:event.getData()['graphId'], type:event.getData()['type'],  edge:newEdge}])
            .then(function(edgeContentId){
              newEdge.edgeContentId = edgeContentId;
              that.cacheElementAttributes.add({elementType:'edge', contentId:newEdge.edgeContentId, attributes:newEdge});
              event.setResponse(newEdge);
            });

        }else if(event.getData()['type'] == 'addNode'){

          // function to save new node (here and in repo) and to set response with new node
          var saveNewNode = function(graphId, nodeContentId, attributes, content){
            if(typeof(graphId) == 'undefined') YOVALUE.errorHandler.throwError('no graphId');
            if(typeof(newNode) == 'undefined') YOVALUE.errorHandler.throwError('no newNode');

            that.publisher
              .publish(["graph_element_content_changed",  {graphId:graphId, type:'addNode', node:content}])
              .then(function(nodeContentId){
                that.cacheElementAttributes.add({elementType:'node', contentId:nodeContentId, attributes:attributes});
                that.cacheNodeContent.add({contentId:newNode.nodeContentId, content:content});
                event.setResponse(newNode);
              });
          };

          // if this is copy from already existing node, then get its data, copy and call saveNewNode
          if(event.getData().element.nodeContentId != null){
            //retrieve node attributes and text
            this.publisher
              .publish(
                    ["get_elements_attributes", {nodes:[event.getData().element.nodeContentId], edges:[]}],
                    ["get_graph_node_content", {graphId:event.getData()['graphId'], nodeContentIds:[event.getData().element.nodeContentId]}])
              .then(function(attributes, contents){
                // create new node and copy all info from old
                saveNewNode(
                    event.getData()['graphId'],
                    event.getData().element.nodeContentId,
                    attributes.nodes[event.getData().element.nodeContentId],
                    contents[event.getData().element.nodeContentId]
                );
              });
          }
          // if it is brand new node just set default values and call saveNewNode
          else{
            var newNode = YOVALUE.clone(YOVALUE.iGraphNodeContent);
            newNode.label = event.getData().element.label;
            newNode.type = event.getData().element.type;
            newNode.importance = 50;
            newNode.reliability = 0;
            newNode.icon = null;
            saveNewNode(event.getData()['graphId'], newNode);
          }

        }else if(event.getData()['type'] == 'addIcon'){
          e = this.cacheElementAttributes.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].attributes;
          var icon = new Image();
          var reader  = new FileReader();
          reader.onload = function () {
            icon.src = reader.result;
            that.publisher.publish(["graph_element_content_changed", event.getData()]);
            event.setResponse({});
          };
          reader.readAsDataURL(event.getData().file);
          e.icon = icon;

        }

        if(ed) this.publisher.publish(["graph_element_content_changed", ed]);
        if(er) event.setResponse(er);
        break;

    /**
     * Returns from server
     *  - nodes attributes (type, label, reliability, importance, has_icon)
     *  - edges attributes (type, label)
     */
      case "get_elements_attributes":
        var rows, i;
        var nodeContentIds = event.getData()['nodes'], nodeContentId;
        var edgeContentIds = event.getData()['edges'], edgeContentId;

        // get elements that does not exists in cacheElementAttributes
        var undefinedContentIds = {nodes:[], edges:[]};
        var elementAttributes = {nodes:{}, edges:{}};
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
          this.publisher
            .publish(["repository_get_graph_elements_attributes", undefinedContentIds])
            .then(function(data){
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
        }else{
          event.setResponse(elementAttributes);
        }
        break;

      case "get_graph_node_content":
        var data = event.getData();
        var i, nodeContentId, alternativeId;
        var cachedContents = [];
        var unavaliableNodeContentIds = [];

        // determine node contents that is not yet retrieved from server
        for(i in data['nodeContentIds']){
          nodeContentId = data['nodeContentIds'][i];
          var rows = this.cacheNodeContent.get({nodeContentId:nodeContentId});
          if(rows.length) cachedContents[nodeContentId] = rows[0]['content'];
          else unavaliableNodeContentIds.push(nodeContentId);
        }

        // retrieve absent node content from server
        if(unavaliableNodeContentIds.length > 0){
          this.publisher
            .publish(["repository_get_graph_node_content", {graphId:data['graphId'], nodeContentIds:unavaliableNodeContentIds}])
            .then(function(nodeContents){
              for(var nodeContentId in nodeContents){
                that.cacheNodeContent.add({nodeContentId: nodeContentId, content: nodeContents[nodeContentId]});
              }
              event.setResponse(YOVALUE.deepmerge(cachedContents, nodeContents));
            });
        }else{
          event.setResponse(cachedContents);
        }
        break;

    }
  }
};
