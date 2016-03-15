/**
 * This module intercepts events
 * - get_graph_node_sources
 * - node_source_add_request
 * - node_source_remove_request
 * and caches sources for all nodes
 * so that repository do not need to ask server for every get_graph_node_sources
 * @param subscriber
 * @param publisher
 * @constructor
 */
YOVALUE.NodeSourcesCache = function(subscriber, publisher){
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.cache = new YOVALUE.Table(['graphId', 'nodeContentId', 'sources', 'isChanged']);

  this.subscriber.subscribe(this,[
    'node_source_add_request',
    'node_source_update_request',
    'node_source_remove_request',
    'get_graph_node_sources'
  ]);
};

YOVALUE.NodeSourcesCache.prototype = {
  eventListener: function (event) {
    var that = this, eventName = event.getName(), eData = event.getData();
    var rows = this.cache.getRows({graphId: eData.graphId, nodeContentId: eData.nodeContentId});
    if (eventName === 'get_graph_node_sources') {
      if(rows.length == 0 || rows[0].isChanged == true) {
        var e = this.publisher.createEvent('repository_get_graph_node_sources', eData);
        this.publisher.when(e).then(function (sources) {
          if(rows.length && rows[0].isChanged == true) that.cache.removeRows({graphId: eData.graphId, nodeContentId: eData.nodeContentId});
          that.cache.insertRow({graphId: eData.graphId, nodeContentId: eData.nodeContentId, sources:sources, isChanged:false});
          event.setResponse(sources);
        });
        this.publisher.publishEvent(e);
      }else{
        event.setResponse(rows[0].sources);
      }
    }else if(eventName === 'node_source_add_request'
      || eventName === 'node_source_update_request'
      || eventName === 'node_source_remove_request'){
      rows[0].isChanged = true;
    }
  }
};