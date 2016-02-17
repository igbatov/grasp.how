/**
 * This module shows status of important events:
 *  - when user is not authorized StatusString show login form
 *  - when server is unavailable it shows error banner 'server is unavailable'
 * @param subscriber
 * @param publisher
 * @constructor
 */
YOVALUE.StatusString = function (subscriber, publisher, viewManager, jQuery) {
  this.publisher = publisher;
  this.subscriber = subscriber;
  this.container = jQuery("#"+viewManager.getViewContainer('statusString').id);
  this.jQuery = jQuery;
  this.container.append('<div id="dragModeStatus"></div>');
  this.container.append('<div id="serverStatus"></div>');
  this.serverStatusContainer = this.container.find('#serverStatus');
  this.dragModeStatusContainer = this.container.find('#dragModeStatus');

  this.subscriber.subscribe(this,[
    'repository_error',
    'repository_requests_send',
    'repository_processing',
    'set_drag_mode'
  ]);
};

YOVALUE.StatusString.prototype = {
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
      this.serverStatusContainer.html('All changed saved');
    }
    if(e.getName() === 'repository_processing'){
      this.serverStatusContainer.html('Loading/saving data...');
    }
    if(e.getName() === 'set_drag_mode'){
      this.dragModeStatusContainer.html('Drag mode: '+ e.getData()['drag_mode']+'; ');
    }
  }
};