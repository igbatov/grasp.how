/**
 * The main task of this controller is to react on events that change drag mode of graph
 * @param publisher
 * @constructor
 */
GRASP.DragModeChangeController = function(publisher){
  this.publisher = publisher;
  this.currentDragMode = 'move';
};

GRASP.DragModeChangeController.CONNECT = 'connect';
GRASP.DragModeChangeController.MOVE = 'move';

GRASP.DragModeChangeController.prototype = {
  /**
   *
   * @param event
   * @param selectedElement - {graphId: Int g || null, elementType: String t || null, element: Object e || null}
   */
  execute: function(event, selectedElement){
    var eventName = event.getName(),
      acceptedEvents = ['dblclickbackground', 'alt_on', 'alt_off'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) {
      return;
    }

    if(eventName === 'alt_on') {
      this.currentDragMode = GRASP.DragModeChangeController.CONNECT;
    }
    if(eventName === 'alt_off') {
      this.currentDragMode = GRASP.DragModeChangeController.MOVE;
    }
    if(eventName === 'dblclickbackground'){
      if(this.currentDragMode === GRASP.DragModeChangeController.MOVE) {
        this.currentDragMode = GRASP.DragModeChangeController.CONNECT;
      } else if(this.currentDragMode === GRASP.DragModeChangeController.CONNECT) {
        this.currentDragMode = GRASP.DragModeChangeController.MOVE;
      }
    }

    this.publisher.publish(['set_drag_mode', {drag_mode:this.currentDragMode}, true]);
  }
};