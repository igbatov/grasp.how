/**
 * Module that monitor keyboard events and publish appropriate GRASP.Events if necessary
 * @constructor
 */
GRASP.KeyManager = function(publisher){
  this.publisher = publisher;
  this.ctrlPushed = false;
  this.altPushed = false;

  var that = this;
  document.onkeyup = function(e){
    // Delete button
    if(e.keyCode == 46){
      that.publisher.publish(['delete_pressed',{}]);
    }
    // Ctrl off
    else if(that.ctrlPushed && !e.ctrlKey){
      that.ctrlPushed = false;
      that.publisher.publish(['ctrl_off',{}]);
    }
    // Alt off
    else if(that.altPushed && !e.altKey){
      that.altPushed = false;
      that.publisher.publish(['alt_off',{}]);
    }
  };

  document.onkeydown = function(e){
    // Ctrl+z
    if(e.keyCode == 90 && e.ctrlKey){
      that.publisher.publish(['undo_pressed',{}]);
    }
    // Ctrl+y
    else if(e.keyCode == 89 && e.ctrlKey){
      that.publisher.publish(['redo_pressed',{}]);
    }
    // Ctrl on
    else if(!that.ctrlPushed && e.ctrlKey){
      that.ctrlPushed = true;
      that.publisher.publish(['ctrl_on',{}]);
    }
    // Alt on
    else if(!that.altPushed && e.altKey){
      that.altPushed = true;
      that.publisher.publish(['alt_on',{}]);
    }
  }

};