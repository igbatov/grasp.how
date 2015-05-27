/**
 * This module deals with errors received from the server:
 *  - when user is not authorized ServerStatus show login form
 *  - when server is unavailable it shows error banner 'server is unavailable'
 * @param subscriber
 * @param publisher
 * @constructor
 */
YOVALUE.ServerStatus = function (subscriber, publisher, viewManager, jQuery) {
  this.publisher = publisher;
  this.subscriber = subscriber;
  this.container = jQuery("#"+viewManager.getViewContainer('serverStatus').id);
  this.jQuery = jQuery;

  this.subscriber.subscribe(this,[
    'repository_error',
    'repository_requests_send',
    'repository_processing'
  ]);
};

YOVALUE.ServerStatus.prototype = {
  eventListener: function(e){
    if(e.getName() === 'repository_error'){
      var errorStyle = 'color:red';
      if(e.getData()['reason'] == 'Unauthorized') {
        window.location = window.location;
      }else if(e.getData()['reason'] == 'Server unavailable'){
        this.container.html('<p style="'+errorStyle+'">Error saving - server is temporarily unavailable</p>');
      }else{
        this.container.html('<p style="'+errorStyle+'">Unknown error while saving</p>');
      }
    }
    if(e.getName() === 'repository_requests_send'){
      this.container.html('All changed saved');
    }
    if(e.getName() === 'repository_processing'){
      this.container.html('Saving changes...');
    }
  }
};