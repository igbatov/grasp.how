/**
 * This module is used by the whole project as a persistent data storage
 * In fact, it is the ony module that communicates with server
 * (though other modules have no idea that there exists any server at all - they just use repository)
 * External modules knows that
 *  - Repository is responsible to set and get data in exactly the order it was requested by external modules
 *  - at any time Repository may fire events:
 *    # 'Unauthorized' (i.e. we cannot save data persistently right now, because user is not authorized),
 *    # 'Temporarily Unavailable' (i.e. we cannot save data persistently right now, because server is unavailable)
 *    # 'Unknown error' (i.e. we cannot save and we do not know why)
 *
 * For 'Unauthorized' and 'Server unavailable' as soon as user logs in or server is ready
 * we will execute all requests in queue to the server.
 * But if user closes or refreshes browser window until that moment, all data will be lost.
 *
 * 'Unknown error' means we cannot execute request and it will be removed from inner queue
 *
 * Repository knows about server and that it can communicate with it by means of this.transport.send()
 * It also expects that server can return following http codes
 * 200 (OK)
 * 401 (Unauthorized),
 * 503 (Server unavaliabe),
 * 500 (Unknown error)
 *
 * @param subscriber
 * @param publisher
 * @param transport
 * @param imageLoader
 * @constructor
 */
YOVALUE.Repository = function (subscriber, publisher, transport, imageLoader) {
  this.publisher = publisher;
  this.subscriber = subscriber;
  this.transport = transport;
  this.imageLoader = imageLoader;
  // We want all requests to reach server in  exactly the same order as they were given us
  // So we keep queue of all requests to send
  this.pendingRequests = [];
  // and variable that indicate that last send request successfully reached the server
  this.isLastRequestDone = true;

  this.subscriber.subscribe(this,[
    'graph_element_content_changed',
    'graph_name_changed',
    'create_new_graph',
    'set_graph_attributes',
    'graph_position_changed',

    'send_pending_requests',

    'repository_get_selected_positions',
    'repository_get_selected_layouts',
    'repository_get_selected_skins',

    'repository_get_graphs_model_settings',
    'repository_get_graphs_model_elements',
    'repository_get_graph_elements_attributes',
    'repository_get_graph_node_text',
    'repository_get_graphs_history_timeline',
    'repository_get_graphs_clone_list',

    'graph_history_item_added',
    'repository_update_node_mapping',

    'get_graph_diff',

    'node_source_added',
    'node_source_removed',
    'repository_get_graph_node_sources'

  ]);
};

YOVALUE.Repository.prototype = {
  eventListener: function(e){
    var name = e.getName(), that = this;
    if(name == 'graph_history_item_added'){
      this.pendingRequests.push({url:'addGraphHistoryItem', data:e.getData()['item'], callback:function(){}});
      this.sendPendingRequests();

    }else if(name == 'repository_update_node_mapping'){
      this.pendingRequests.push({url:'updateNodeMapping', data:e.getData(), callback:function(){}});
      this.sendPendingRequests();

    }else if(name == 'get_graph_diff'){
      this.pendingRequests.push({url:'getGraphDiff', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'graph_element_content_changed'){
      this.pendingRequests.push({url:'updateGraphElementContent', data:e.getData(), files: e.getData().file,  callback:function(data){
        e.setResponse(data);
      }});
      this.sendPendingRequests();

    }else if(name == 'graph_name_changed'){
      this.pendingRequests.push({url:'updateGraphName', data:e.getData(),  callback:function(data){
        e.setResponse(data);
      }});
      this.sendPendingRequests();

    }else if(name == 'create_new_graph'){
      this.pendingRequests.push({url:'createNewGraph', data:e.getData(),  callback:function(data){
        e.setResponse(data);
      }});
      this.sendPendingRequests();

    }else if(name == 'set_graph_attributes'){
      this.pendingRequests.push({url:'setGraphAttributes', data:e.getData(),  callback:function(data){
        e.setResponse(data);
      }});
      this.sendPendingRequests();

    }else if(name == 'graph_position_changed'){
      this.pendingRequests.push({url:'changeGraphPosition', data:e.getData(),  callback:function(data){
        e.setResponse(data);
      }});
      this.sendPendingRequests();

    }else if(name == 'send_pending_requests'){
      this.sendPendingRequests();

    }else if(name == "repository_get_selected_positions"){
      this.pendingRequests.push({url:'getGraphSettings', data:e.getData(), callback:function(data){
        var r={}, i;
        data = JSON.parse(data);
        for(i in data){
          r[i] = data[i]['position'];
        }
        e.setResponse(r);
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_selected_layouts'){
      this.pendingRequests.push({url:'getGraphSettings', data:e.getData(), callback:function(data){
        var data = JSON.parse(data), r={};
        for(var i in data){
          r[i] = data[i]['layout'];
        }
        e.setResponse(r);

      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_selected_skins'){
      this.pendingRequests.push({url:'getGraphSettings', data:e.getData(), callback:function(data){
        var data = JSON.parse(data), r={};
        for(var i in data){
          r[i] = data[i]['skin'];
        }
        e.setResponse(r);
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graphs_model_settings'){
      this.pendingRequests.push({url:'getGraphsModelSettings', data:null, callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graphs_model_elements'){
      this.pendingRequests.push({url:'getGraphsHistoryChunk', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graph_elements_attributes'){

      this.pendingRequests.push({url:'getGraphElementsAttributes', data:e.getData(), callback:function(data){
        var i, attrs = JSON.parse(data), srcs = [], nodes = attrs.nodes;
        for(i in nodes){
          if(nodes[i].iconSrc != null){
            srcs.push(nodes[i].iconSrc);
            nodes[i].icon = new Image();
            nodes[i].icon.src = nodes[i].iconSrc;
          }else{
            nodes[i].icon = null;
          }
          delete nodes[i].iconSrc;
        }
        that.imageLoader.load(srcs, function(){
          e.setResponse(attrs);
        });
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graph_node_text'){
      this.pendingRequests.push({url:'getGraphNodeText', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graphs_history_timeline'){
      this.pendingRequests.push({url:'getGraphsHistoryTimeline', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_graph_node_icon_upload'){
      this.pendingRequests.push({url:'uploadIcon', data:e.getData().contentId, files:e.getData().file, callback:function(data){}});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graphs_clone_list'){
      this.pendingRequests.push({url:'getGraphsCloneList', data:null, callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'node_source_added'){
      this.pendingRequests.push({url:'addNodeContentSource', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'node_source_removed'){
      this.pendingRequests.push({url:'removeNodeContentSource', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }else if(name == 'repository_get_graph_node_sources'){
      this.pendingRequests.push({url:'getNodeContentSourceList', data:e.getData(), callback:function(data){
        e.setResponse(JSON.parse(data));
      }});
      this.sendPendingRequests();

    }
  },

  sendPendingRequests: function(){
    // if previous request still has no answer or there is nothing to send, do nothing
    if(!this.isLastRequestDone) return;
    if(this.pendingRequests.length === 0){
      this.publisher.publish("repository_requests_send", {});
      return;
    }

    var that = this, r = that.pendingRequests[0];
    this.publisher.publish("repository_processing", {});

    this.isLastRequestDone = false;
    var formData = new FormData();
    formData.append('data', JSON.stringify(r.data));
    formData.append('files', r.files);

    this.transport.send({
      url: r.url,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      // server returns 200 (OK)
      success: function(data) {
        that.pendingRequests.shift();
        that.isLastRequestDone = true;
        r.callback(data);
        that.sendPendingRequests();
      },
      // server returns 401, 500 or 503 error
      error: function(data){
        var reason = '';
        if(data.status == 401){
          reason = 'Unauthorized';
        }else if(data.status == 503){
          reason = 'Server unavailable';
          that.isLastRequestDone = true;
        }else{
          reason = 'Unknown error';
          that.pendingRequests.shift();
          that.isLastRequestDone = true;
        }
        that.publisher.publish("repository_error", {reason:reason});
      }
    });
  }
};
