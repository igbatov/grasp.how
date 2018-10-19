/**
 * This module is used by node editor to get/set graph nodes contents and attributes
 * It encapsulates read/write from/to repository and caching
 * You can think of it as extra layer above repository that implements caching and some extra logic for:
 * - addNode: copy from existsing ot from empty node
 * - updateNodeAttribute, for attribute 'reliability' of "fact": for alternative #1 it changes alternative #2 as (1 - reliability/100)
 * - TODO: updateNodeAttribute, for attribute 'reliability' of "proposition": if node doesn't has alternative with falsification, it sets reliability of alternatives as equally possible
 * - addIcon: upload file and creates Image object
 *
 *
 * Though client (javascript) code do not rely on structure of contentId, I describe it here for reference -
 * contentId has the form 'graphId-contentId' or 'graphId-contentId/graphId-contentId' for diff graph.
 * Client code only implies that every node has unique (global) string contentId across all graphs
 *
 * @param publisher
 * @constructor
 */

GRASP.GraphElementsContent = function(publisher, i18n){
  this.publisher = publisher;

  // This is filled all at once for the whole graph at the very beginning, on get_elements_attributes request
  // elementType is 'node' or 'edge'
  // contentId is edgeContentId or nodeContentUd
  this.cacheContent = new GRASP.Cache(['elementType', 'contentId', 'content'], 5000000);
  this.nodeAttributeNames = ['type', 'importance', 'has_icon', 'active_alternative_id', 'value_type', 'value_range', 'p_samples'];
  this.nodeAlternativeAttributeNames = ['label', 'reliability', 'p'];
  this.edgeAttributeNames = ['label', 'type'];
  this.i18n = i18n;

  // this will be retrieved from server only on get_graph_node_content request
  this.nodeAlternativeContentNames = ['text', 'list'];


};

GRASP.GraphElementsContent.DEFAULT_ALTERNATIVE_LABEL_PREFIX = 'NOT TRUE:';

GRASP.GraphElementsContent.prototype = {

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

        }else if(event.getData()['type'] == 'node_stickers_add_request'){
          for(var nodeContentId in event.getData()['stickers']){
            var es = this.cacheContent.get({elementType:'node', contentId: nodeContentId});
            if(!es.length) continue;
            e = es[0].content;
            if(typeof(e['stickers']) != 'undefined' || e['stickers'] == null) e['stickers'] = [];
            e['stickers'] = GRASP.arrayHelper.union(e['stickers'], event.getData()['stickers'][nodeContentId]);
          }
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'node_stickers_remove_request'){
          for(var nodeContentId in event.getData()['stickers']){
            e = this.cacheContent.get({elementType:'node', contentId: nodeContentId})[0].content;
            if(typeof(e['stickers']) != 'undefined' || e['stickers'] == null) e['stickers'] = [];
            e['stickers'] = GRASP.arrayHelper.difference(e['stickers'], event.getData()['stickers'][nodeContentId]);
          }
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'node_list_update_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];
          var list = alternative['list'];
          var item = event.getData()['item'];
          list[item.id] = item;
          this.publisher.publish(["repository_request_for_graph_element_content_change",  event.getData()])
              .then(function(updateAnswer){
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                event.setResponse(updateAnswer);
                that.publisher.publish(["graph_element_content_changed",  event.getData(), true]);
              });

        }else if(event.getData()['type'] == 'node_list_remove_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];

          var list = alternative['list'];
          var itemId = event.getData()['itemId'];
          if(typeof(list[itemId]) != 'undefined') delete list[itemId];
          this.publisher.publish(["repository_request_for_graph_element_content_change",  event.getData()])
              .then(function(updateAnswer){
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                event.setResponse(updateAnswer);
                that.publisher.publish(["graph_element_content_changed",  event.getData(), true]);
              });

        }else if(event.getData()['type'] == 'node_list_add_request'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var alternative = e['alternatives'][event.getData()['node_alternative_id']];
          var list = alternative['list'];
          var item = event.getData()['item'];
          this.publisher.publish(["repository_request_for_graph_element_content_change",  event.getData()])
              .then(function(updateAnswer){
                item.id = updateAnswer.id;
                if(typeof(updateAnswer.reliability) != 'undefined') alternative.reliability = updateAnswer.reliability;
                list[item.id] = item;
                event.setResponse(updateAnswer);
                that.publisher.publish(["graph_element_content_changed",  event.getData(), true]);
              });

        }else if(event.getData()['type'] == 'removeAlternative'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          if(typeof( e['alternatives'][event.getData()['node_alternative_id']]) != 'undefined'){
            delete e['alternatives'][event.getData()['node_alternative_id']];
            e['active_alternative_id'] = GRASP.getObjectKeys(e['alternatives'])[0];
            er = {};
            ed = event.getData();
          }

        }else if(event.getData()['type'] == 'addAlternative'){
          e = this.cacheContent.get({elementType:'node', contentId: event.getData()['nodeContentId']})[0].content;
          var newAlternativeId = Math.max.apply(null, GRASP.getObjectKeys(e['alternatives']))+1;
          e['alternatives'][newAlternativeId] = GRASP.clone(GRASP.iGraphNodeContent.alternatives[0]);
          e['alternatives'][newAlternativeId]['label'] = event.getData()['label'];
          e['active_alternative_id'] = newAlternativeId;
          er = {};
          ed = event.getData();
          ed.new_alternative_id = newAlternativeId;
          ed.alternative = e['alternatives'][newAlternativeId];

        }
        // for all node's alternatives update theirs attribute p
        else if(event.getData()['type'] == 'updateNodeAlternativesP'){
          e = this.cacheContent.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].content;
          for(var i in e.alternatives){
            if (typeof event.getData().alternatives[i] !== 'undefined') {
              e.alternatives[i].p = event.getData().alternatives[i];
            }
          }
          er = {};
          ed = event.getData();
        }
        // update nodes reliabilities attribute
        else if(event.getData()['type'] == 'updateNodesReliabilities'){
          for(var nodeContentId in event.getData().data){
            var alternatives =  event.getData().data[nodeContentId];
            e = this.cacheContent.get({elementType: 'node', contentId: nodeContentId})[0].content;
            if(typeof(e) == 'undefined') continue;
            if (e.value_type == 'continuous') {
                e.p_samples = JSON.stringify(alternatives)
            } else {
              for(var j in alternatives){
                  // TODO: check if we have any falsifications in a proposition list, then change event.getData() accordingly
                  e.alternatives[j]['reliability'] = alternatives[j];
              }
            }
          }
          er = {};
          ed = event.getData();

        // update node attribute
        }else if(event.getData()['type'] == 'updateNodeAttribute'){
          e = this.cacheContent.get({elementType: 'node', contentId: event.getData().nodeContentId})[0].content;
          /// if we changed 'type' attribute, then reload full node from server
          if(event.getData().nodeAttribute.name == 'type'){
            // for node editor we must update whole node content, so remove it from cache here
            this.cacheContent.remove({elementType:'node', contentId:event.getData().nodeContentId});
            this.publisher.publish(["repository_request_for_graph_element_content_change",  event.getData()]).then(function(){
                event.setResponse({});
                // server is updated, now we can fire 'graph_element_content_changed'
                that.publisher.publish(["graph_element_content_changed",  event.getData(), true])
              });

          }else if(event.getData().nodeAttribute.name == 'reliability' && e.type == 'fact'){
            e['alternatives'][0]['reliability'] = event.getData().nodeAttribute.value;
            e['alternatives'][1]['reliability'] = parseFloat(100-parseFloat(event.getData().nodeAttribute.value));
            var secondAlternativeEvent = GRASP.clone(event.getData());
            secondAlternativeEvent.node_alternative_id = 1;
            secondAlternativeEvent.nodeAttribute.value = e['alternatives'][1]['reliability'];

            // update first fact alternative
            this.publisher.publish(["repository_request_for_graph_element_content_change",  event.getData()]).then(function(){
              // update second fact alternative
              return that.publisher.publish(["repository_request_for_graph_element_content_change",  secondAlternativeEvent]);
            }).then(function(){
              event.setResponse({});
              that.publisher.publish(["graph_element_content_changed",  event.getData(), true]);
              that.publisher.publish(["graph_element_content_changed",  secondAlternativeEvent, true]);
            })

          } else {
            if(this.nodeAttributeNames.indexOf(event.getData().nodeAttribute.name) != -1) {
              e[event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;
            } else if(this.nodeAlternativeAttributeNames.indexOf(event.getData().nodeAttribute.name) != -1) {
              e['alternatives'][event.getData()['node_alternative_id']][event.getData().nodeAttribute.name] = event.getData().nodeAttribute.value;
            } else {
              throw new Error('Node alternative attribute ' + event.getData().nodeAttribute.name + ' not in GraphElementsContent.nodeAttributeNames or nodeAlternativeAttributeNames list');
            }
            er = {};
            ed = event.getData();
          }

        }else if(event.getData()['type'] == 'updateEdgeAttribute'){
          e = this.cacheContent.get({elementType: 'edge', contentId: event.getData().edgeContentId})[0].content;
          if(this.edgeAttributeNames.indexOf(event.getData().edgeAttribute.name) != -1) e[event.getData().edgeAttribute.name] = event.getData().edgeAttribute.value;
          er = {};
          ed = event.getData();

        }else if(event.getData()['type'] == 'addEdge'){
          
          var newEdge = GRASP.clone(GRASP.iGraphEdgeContent);
          newEdge.label = event.getData().elementType;
          newEdge.type = event.getData().elementType;

          this.publisher
            .publish(["repository_request_for_graph_element_content_change", {graphId:event.getData()['graphId'], type:'addEdge',  edge:newEdge}])
            .then(function(answer){
              newEdge.edgeContentId = answer.edgeContentId;
              that.cacheContent.add({elementType:'edge', contentId:newEdge.edgeContentId, content:newEdge});
              that.publisher.publish([
                "graph_element_content_changed",
                {graphId:event.getData()['graphId'], type:'addEdge',  edge:newEdge},
                true
              ]);
              event.setResponse(newEdge);
            });

        }else if(event.getData()['type'] == 'removeEdge') {
          var graphId = event.getData()['graphId'];
          var edgeContentId = event.getData()['edge']['edgeContentId'];
          var nodeId;
          var graphModel;
          var edge;

          // save removed edge nodeId
          that.publisher.publish(["get_graph_models", [graphId]]).then(
            function(graphModels){
              graphModel = graphModels[graphId];
              edge = graphModel.getEdgeByEdgeContentId(edgeContentId);
              nodeId = edge.target;
              // remove edge from model
              return that.publisher.publish(["request_for_graph_model_change", {graphId: graphId, type: 'removeEdge', elementId:edge.id}]);
            })
            // when all target node's income edges were removed its conditional probabilities should be dropped
            .then(function(){
              // check that target node has no more income edges
              if(graphModel.getEdgesFromParentIds(nodeId).length == 0){
                var nodeContentId = graphModel.getNode(nodeId)['nodeContentId'];
                that.publisher.publish(["repository_request_for_graph_element_content_change",  {graphId:graphId, type:'clear_node_conditionalPs', nodeContentId:nodeContentId}]);
              }
              event.setResponse('ok');

            });

        }else if(event.getData()['type'] == 'addNode'){

          // function to save new node (here and in repo) and to set response with new node
          var saveNewNode = function(graphId, newNode){
            that.publisher
              .publish(["repository_request_for_graph_element_content_change",  {graphId:graphId, type:'addNode', node:newNode}])
              .then(function(answer){
                newNode.nodeContentId = answer.nodeContentId;
                that.cacheContent.add({elementType:'node', contentId:answer.nodeContentId, content:newNode});
                that.publisher.publish([
                  "graph_element_content_changed",
                  {graphId:graphId, type:'addNode', node:newNode},
                  true
                ]);
                event.setResponse(newNode);
              });
          };

          // if this is copy from already existing node, then get its data, copy and call saveNewNode
          if(event.getData().element.nodeContentId != null){
            //retrieve node attributes and text
            this.publisher
              .publish(
                    ["get_graph_node_content", {graphId:event.getData()['graphId'], nodeContentIds:[event.getData().element.nodeContentId]}])
              .then(function(attributes, contents){
                // create new node and copy all info from old
                var newNode = GRASP.clone(contents[event.getData().element.nodeContentId]);
                newNode.nodeContentId = null;
                saveNewNode(
                    event.getData()['graphId'],
                    newNode
                );
              });
          }
          // if it is brand new node just set default values and call saveNewNode
          else{
            var newNode = GRASP.clone(GRASP.iGraphNodeContent);
            newNode.alternatives[0].label = event.getData().element.label;
            newNode.alternatives[0].reliability = 50;
            newNode.alternatives[1].label = this.i18n.__(GRASP.GraphElementsContent.DEFAULT_ALTERNATIVE_LABEL_PREFIX) + ' ' + event.getData().element.label;
            newNode.alternatives[1].reliability = 50;

            newNode.type = event.getData().element.type;
            newNode.importance = 50;
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
            that.publisher.publish(["repository_request_for_graph_element_content_change", event.getData()]);
            that.publisher.publish(["graph_element_content_changed", event.getData(), true]);
            event.setResponse({});
          };
          reader.readAsDataURL(event.getData().file);
          e.icon = icon;

        }

        if(ed){
          this.publisher.publish(["repository_request_for_graph_element_content_change", ed]);
          this.publisher.publish(["graph_element_content_changed", ed, true]);
        }
        if(er) event.setResponse(er);
        break;

      /**
       * Returns from cache (get from repo if cache is empty)
       *  - nodes attributes - all node data except text and list
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

      case "get_graph_edge_content":
        var data = event.getData();
        var i, edgeContentId;
        var cachedContents = {};

        /**
         * We assume here that "get_elements_attributes" was already called
         * and thus this.cacheContent contains all necessary data.
         */
        for(i in data['edgeContentIds']){
          edgeContentId = data['edgeContentIds'][i];
          var rows = this.cacheContent.get({elementType:'edge', contentId:edgeContentId});
          cachedContents[edgeContentId] = rows[0]['content'];
        }
        event.setResponse(cachedContents);

        break;

      case "get_graph_node_content":
        var data = event.getData();
        var i, nodeContentId;
        var cachedContents = {};
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
          ){
             cachedContents[nodeContentId] = rows[0]['content'];
          }else unavaliableNodeContentIds.push(nodeContentId);
        }

        // retrieve absent node content from server
        if(unavaliableNodeContentIds.length > 0){
          this.publisher
            .publish(["repository_get_graph_node_content", {graphId:data['graphId'], nodeContentIds:unavaliableNodeContentIds}])
            .then(function(nodeContents){
              for(var nodeContentId in nodeContents){
               // nodeContents[nodeContentId] contains full node structure: nodeAttributeNames, nodeAlternativeAttributeNames, nodeAlternativeContentNames
                var rows = that.cacheContent.get({elementType:'node',contentId: nodeContentId});
                // if there is a row for this node, update its content
                if(rows.length){
                  var row = rows[0];
                  row['content'] = nodeContents[nodeContentId];
                }
                // else create brand new row
                else{
                  that.cacheContent.add({elementType:'node',contentId: nodeContentId, content:nodeContents[nodeContentId]});
                }
              }
              var response = GRASP.deepmerge(cachedContents, nodeContents);
              event.setResponse(response);
            });
        }else{
          event.setResponse(cachedContents);
        }
        break;

    }
  }
};
