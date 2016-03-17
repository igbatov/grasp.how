/**
 * The main task of this controller is to react on events that change drag mode of graph
 * @param publisher
 * @constructor
 */
YOVALUE.DragModeChangeController = function(publisher){
  this.publisher = publisher;
  this.currentDragMode = 'move';
};

YOVALUE.DragModeChangeController.prototype = {
  /**
   *
   * @param event
   * @param selectedElement - {graphId: Int g || null, elementType: String t || null, element: Object e || null}
   */
  execute: function(event, selectedElement){
    var eventName = event.getName(),
      acceptedEvents = ['dblclickbackground', 'ctrl_on', 'ctrl_off'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    if(eventName === 'alt_on') this.currentDragMode = 'connect';
    if(eventName === 'alt_off') this.currentDragMode = 'move';
    if(eventName === 'dblclickbackground'){
      if(this.currentDragMode == 'move') this.currentDragMode = 'connect';
      else if(this.currentDragMode == 'connect') this.currentDragMode = 'move';
    }

    this.publisher.publish('set_drag_mode', {drag_mode:this.currentDragMode});
  }

};