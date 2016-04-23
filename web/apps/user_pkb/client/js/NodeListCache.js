/**
 * This module intercepts events
 * - get_graph_node_list
 * - node_list_add_request
 * - node_list_remove_request
 * and caches list for all nodes
 * so that repository do not need to ask server for every get_graph_node_list
 * @param subscriber
 * @param publisher
 * @constructor
 */
YOVALUE.NodeListCache = function(subscriber, publisher){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.cache = new YOVALUE.Table(['graphId', 'nodeContentId', 'list', 'isChanged']);

  this.subscriber.subscribe(this,[
    'node_list_add_request',
    'node_list_update_request',
    'node_list_remove_request',
    'node_list_reload',
    'get_graph_node_list'
  ]);
};

YOVALUE.NodeListCache.prototype = {
  eventListener: function (event) {
    var that = this, eventName = event.getName(), eData = event.getData();
    var rows = this.cache.getRows({graphId: eData.graphId, nodeContentId: eData.nodeContentId});
    if (eventName === 'get_graph_node_list') {
      if(rows.length == 0 || rows[0].isChanged == true) {
        this.publisher.publish(['repository_get_graph_node_list', eData]).then(function (list) {
          if(rows.length && rows[0].isChanged == true) that.cache.removeRows({graphId: eData.graphId, nodeContentId: eData.nodeContentId});
          that.cache.insertRow({graphId: eData.graphId, nodeContentId: eData.nodeContentId, list:list, isChanged:false});
          event.setResponse(list);
        });
      }else{
        event.setResponse(rows[0].list);
      }
    }else if(eventName === 'node_list_add_request'
      || eventName === 'node_list_update_request'
      || eventName === 'node_list_remove_request'
      || eventName === 'node_list_reload'
    ){
      rows[0].isChanged = true;
    }
  }
};