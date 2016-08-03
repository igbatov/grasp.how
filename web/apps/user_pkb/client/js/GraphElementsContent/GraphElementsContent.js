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

  // This is filled all at once for the whole graph at the very beginning, on get_elements_attributes request
  // elementType is 'node' or 'edge'
  // contentId is edgeContentId or nodeContentUd
  this.cacheContent = new YOVALUE.Cache(['elementType', 'contentId', 'content'], 5000000);
  this.nodeAttributeNames = ['type', 'importance', 'has_icon', 'active_alternative_id'];
  this.nodeAlternativeAttributeNames = ['label', 'reliability', 'p'];
  this.edgeAttributeNames = ['label', 'label'];

  // this will be retrieved from server only on get_graph_node_content request
  this.nodeAlternativeContentNames = ['text', 'list'];


};

YOVALUE.GraphElementsContent.prototype = {

  eventListener: function(event){
    var that = this, eventName = event.getName();

    switch (eventName){
      case "request_for_graph_element_content_change":
        var e, er, ed;
        if(event.getData()['type'] == 'updateNodeText'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          e['alternatives'][event.getData()['node_alternative_id']]['text'] = event.getData()['text'];
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'node_list_update_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];
          var list = alternative['list'];
          var item = event.getData()['item'];
          list[item.id] = item;
          this.publisher.publish(["graph_element_content_changed",  event.getData()])
              .then(function(updateAnswer){
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                event.setResponse(updateAnswer);
              });

        }else if(event.getData()['type'] == 'node_list_remove_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];
          var list = alternative['list'];
          var item = event.getData()['item'];
          if(typeof(list[item.id]) != 'undefined') delete list[item.id];
          this.publisher.publish(["graph_element_content_changed",  event.getData()])
              .then(function(updateAnswer){
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                event.setResponse(updateAnswer);
              });

        }else if(event.getData()['type'] == 'node_list_add_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];
          var list = alternative['list'];
          var item = event.getData()['item'];
          this.publisher.publish(["graph_element_content_changed",  event.getData()])
              .then(function(updateAnswer){
                item.id = updateAnswer.id;
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                list[item.id] = item;
                event.setResponse(updateAnswer);
              });

        }else if(event.getData()['type'] == 'addAlternative'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var newAlternativeId = Math.max.apply(null, YOVALUE.getObjectKeys(e['alternatives']))+1;
          e['alternatives'][newAlternativeId] = {label:event.getData()['label'],list:null,p:null,reliability:null,text:''};
          e['active_alternative_id'] = newAlternativeId;
          er = {};
          ed = event.getData();

        }
        // update node attribute
        else if(event.getData()['type'] == 'updateNodeAttribute'){
          e = this.cacheContent.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].content;
          if(this.nodeAttributeNames.indexOf(event.getData().nodeAttribute.name) != -1) e[event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;
          if(this.nodeAlternativeAttributeNames.indexOf(event.getData().nodeAttribute.name) != -1) e['alternatives'][event.getData()['active_alternative_id']][event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'updateEdgeAttribute'){
          e = this.cacheContent.get({elementType: 'edge', contentId: event.getData().edgeContentId})[0].content;
          if(this.nodeAttributeNames.indexOf(event.getData().nodeAttribute.name) != -1) e[event.getData().edgeAttribute.name] = event.getData().edgeAttribute.value;
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
              that.cacheContent.add({elementType:'edge', contentId:newEdge.edgeContentId, content:newEdge});
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
                that.cacheContent.add({elementType:'node', contentId:nodeContentId, content:content});
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
            newNode.alternatives[0].label = event.getData().element.label;
            newNode.alternatives[1].label = 'НЕВЕРНО ЧТО: '+event.getData().element.label;
            newNode.type = event.getData().element.type;
            newNode.importance = 50;
            newNode.alternatives[0] = 0;
            newNode.icon = null;
            newNode.stickers = null;
            saveNewNode(event.getData()['graphId'], newNode);
          }

        }else if(event.getData()['type'] == 'addIcon'){
          e = this.cacheContent.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].content;
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
       * Returns
       *  - nodes attributes - all node content that we need to show in graph - active alternative type, label, reliability, node importance, ... - these are called node 'attributes'
       *  - edges attributes
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
          rows = this.cacheContent.get({elementType:'node', contentId:nodeContentId});
          if(rows.length == 0) undefinedContentIds.nodes.push(nodeContentId);
          else elementAttributes.nodes[nodeContentId] = rows[0]['content'];
        }

        for(i in edgeContentIds){
          edgeContentId = edgeContentIds[i];
          rows = this.cacheContent.get({elementType:'edge', contentId:edgeContentId});
          if(rows.length == 0) undefinedContentIds.edges.push(edgeContentId);
          else elementAttributes.edges[edgeContentId] = rows[0]['content'];
        }

        // get these absent element contents from server
        if(undefinedContentIds.edges.length > 0 || undefinedContentIds.nodes.length > 0){
          this.publisher
            .publish(["repository_get_graph_elements_attributes", undefinedContentIds])
            .then(function(data){
              var contentId;
              for(contentId in data.nodes){
                that.cacheContent.add({elementType:'node', contentId:contentId, content:data.nodes[contentId]});
                elementAttributes.nodes[contentId] = data.nodes[contentId];
              }

              for(contentId in data.edges){
                that.cacheContent.add({elementType:'edge', contentId:contentId, content:data.edges[contentId]});
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
        var i, nodeContentId;
        var cachedContents = [];
        var unavaliableNodeContentIds = [];

        // determine node contents that is not yet retrieved from server
        for(i in data['nodeContentIds']){
          nodeContentId = data['nodeContentIds'][i];
          var rows = this.cacheContent.get({elementType:'node', contentId:nodeContentId});
          // we assume that if even one alternative has text, then full node contents were already retrieved from server
          if(
            rows.length && 
            typeof(rows[0]['content']['alternatives'][0]['text']) != 'undefined' && 
            rows[0]['content']['alternatives'][0]['text'] != null
          ) cachedContents[nodeContentId] = rows[0]['content'];
          else unavaliableNodeContentIds.push(nodeContentId);
        }

        // retrieve absent node content from server
        if(unavaliableNodeContentIds.length > 0){
          this.publisher
            .publish(["repository_get_graph_node_content", {graphId:data['graphId'], nodeContentIds:unavaliableNodeContentIds}])
            .then(function(nodeContents){
              for(var nodeContentId in nodeContents){
                var row = that.cacheContent.get({elementType:'node',contentId: nodeContentId})[0];
                // here is the full node structure: nodeAttributeNames, nodeAlternativeAttributeNames, nodeAlternativeContentNames
                row['content'] = nodeContents[nodeContentId];
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
