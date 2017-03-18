var p = Modules['Publisher'];
// init models
p.publish('load_graph_models').then(function(){
  // and then show them
  p.publish('show_graphs');
});
