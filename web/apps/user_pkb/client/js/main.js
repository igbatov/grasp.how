var p = Modules['Publisher'];
// load data from back
p.publish('load_translations')
.then(function(translations){
  Modules['I18n'].setTranslations(translations);
  return p.publish('load_graph_models');
})
.then(function(){
  // and then show it
  p.publish('show_graphs');
});
