var p = Modules['Publisher'];
// load data from back
p.publish('load_translations', 'init_user_settings')
.then(function(translations){
  Modules['I18n'].setTranslations(translations);
  return p.publish('load_graph_models');
})
.then(function(){
  // and then show it
  return p.publish('show_graphs');
});
