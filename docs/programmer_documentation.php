Основные функциональные блоки

// Отослать событие без ответа
<?php
  this.publisher.publish(name, {"some data object"});
?>

// Отослать событие на которое нужно дать моментальный ответ
<?php
  var decoration = this.publisher.publishResponseEvent(this.publisher.createEvent("get_graph_decoration", {"some data object"}));
?>
// Ответить на событие которое должно получить моментальный ответ
<?php
eventListener: function(event){
  var eventName = event.getName(),
  switch (eventName){
   case "get_graph_decoration":
     var d = this.graphDecoration.getDecoration(graphModel, graphNodeAttributes, graphEdgeAttributes);
     event.setResponse(d);
   break;
  }
}
?>

// Отослать одно или несколько событий событие с отложенным ответом
<?php
  var e1 = this.publisher.createEvent("get_selected_skin", graphId);
  var e2 = this.publisher.createEvent("get_selected_layout", graphId);
  var e3 = this.publisher.createEvent("get_elements_attributes", {nodes:nodeContentIds, edges:edgeContentIds});
  this.publisher.when(e1, e2, e3).then(function(s, l, c){
    // some data manipulations here

    // if we want to publish another one event with deferred response
    return that.publisher.publish("request_for_graph_element_content_change",{});
  }).then(function(edgeContent){
    // some more manipulations here
  });
  this.publisher.publishEvent(e1, e2, e3);
?>
// Ответить на событие с отложенным запросом
<?php
eventListener: function(event){
      switch (eventName){
        case "name":
          var e = this.publisher.createEvent("repository_request", {"some data object"});
          this.publisher.when(e).then(function(data){
            event.setResponse(data);
          });
          break;
      }
}
?>
