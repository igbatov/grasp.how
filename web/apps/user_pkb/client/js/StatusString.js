/**
 * This module shows status of important events:
 *  - when user is not authorized StatusString show login form
 *  - when server is unavailable it shows error banner 'server is unavailable'
 * @param publisher
 * @param viewManager
 * @param jQuery
 * @constructor
 */
GRASP.StatusString = function (publisher, viewManager, jQuery) {
  this.publisher = publisher;
  this.container = jQuery("#"+viewManager.getViewContainer('statusString').id);
  this.jQuery = jQuery;
  this.container.append('<div id="dragModeStatus"></div>');
  this.container.append('<div id="serverStatus"></div>');
  this.serverStatusContainer = this.container.find('#serverStatus');
  this.dragModeStatusContainer = this.container.find('#dragModeStatus');
};

GRASP.StatusString.prototype = {
  eventListener: function(e){
    if(e.getName() === 'repository_error'){
      var errorStyle = 'color:red';
      if(e.getData()['reason'] == 'Unauthorized') {
        window.location = window.location;
      }else if(e.getData()['reason'] == 'Server unavailable'){
        this.serverStatusContainer.html('<p style="'+errorStyle+'">Error saving - server is temporarily unavailable</p>');
      }else{
        this.serverStatusContainer.html('<p style="'+errorStyle+'">Unknown error while saving</p>');
      }
    }
    if(e.getName() === 'repository_requests_send'){
      this.serverStatusContainer.html('All changes saved');
    }
    if(e.getName() === 'repository_processing'){
      this.serverStatusContainer.html('Working with server...');
    }
    if(e.getName() === 'set_drag_mode'){
      this.dragModeStatusContainer.html('Drag mode: '+ e.getData()['drag_mode']+'; ');
    }
  }
};