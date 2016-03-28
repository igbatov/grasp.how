/**
 * The main task of this controller is to react on 'undo' and 'redo' buttons push
  * @param publisher
 * @constructor
 */
YOVALUE.HistoryController = function(publisher){
  this.publisher = publisher;
};

YOVALUE.HistoryController.prototype = {
  /**
   *
   * @param event
   * @param selectedElement - {graphId: Int g || null, elementType: String t || null, element: Object e || null}
   */
  execute: function(event, selectedElement){
    var that = this,
      eventName = event.getName(),
      graphId,
      acceptedEvents = ['undo_pressed', 'redo_pressed', 'element_editor_focusin', 'element_editor_focusout'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    if(eventName === 'undo_pressed' || eventName === 'redo_pressed'){
      // if focus is on test editor do nothing
      if(this.isElementEditorFocused) return;

      // user should select graph witch it want to undo/redo
      if(!selectedElement.graphId) return;
      else graphId = selectedElement.graphId;


      this.publisher
        .publish([(eventName == 'undo_pressed' ? 'get_previous_graph_step' : 'get_next_graph_step'), [graphId]])
        .then(function(step){
          that.publisher.publish(["graph_history_set_current_step", step]);
          return that.publisher.publish(["graph_history_get_model_elements", step]);
        })
        .then(function(graphs){
        var elements = graphs[graphId].elements;
        // set new graph model
        that.publisher.publish(['set_graph_model_elements', {graphId:graphId, elements: elements}]);
      });

    }else if(eventName === 'element_editor_focusin'){
      this.isElementEditorFocused = true;

    }else if(eventName === 'element_editor_focusout'){
      this.isElementEditorFocused = false;

    }
  }
};