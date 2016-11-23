/**
 * This module allocate template views for different components in one layout.
 * All components that have views (i.e. GraphsPanelPresenter, NodeContentEditor)
 * should call GRASP.ViewManager.getViewContainer to get div where they can place their view.
 * @param jQuery
 * @param settings - {
 *  'graphElementEditor': {id,padding},
 *  'graphViews': {id,padding},
 *  'leftGraphView': {id,padding},
 *  'rightGraphView': {id,padding},
 *  'statusString': {id,padding},
 * }
 * @constructor
 */
GRASP.ViewManager = function(jQuery, settings){
  this.jQuery = jQuery;
  this.settings = settings;
  /*
  var gv = $('#'+this.settings.graphViews.id);
  var w = (100 * parseFloat(gv.css('width')) / parseFloat(gv.parent().css('width'))) - this.settings.graphViews.padding[0];
  console.log(w);
  gv.width(w + '%');
  gv.css('left', this.settings.graphViews.padding[0]/2 + '%');
*/
};

GRASP.ViewManager.prototype = {

  getViewContainer: function(componentName){
    var $ = this.jQuery, gv = $('#'+this.settings.graphViews.id);
    var x, y, w = gv.width(), h = gv.height(), id;

    if(componentName === 'leftGraphElementEditor'){
      id = this.settings.leftGraphElementEditor.id;
      return {id:id, width:w, height:h};
    }else if(componentName === 'rightGraphElementEditor'){
      id =  this.settings.rightGraphElementEditor.id;
      return {id:id, width:w, height:h};
    }else if(componentName === 'graphViews'){
      return {id: gv.attr('id'), width:w, height:h};
    }else if(componentName === 'leftGraphView'){
      w = w/2;
      x = w/2;
      y = h/2;
      return {id: gv.attr('id'), centerX: x, centerY:y, width:w, height:h};
    }else if(componentName === 'rightGraphView'){
      return {id: gv.attr('id'), centerX: gv.width()*(3/4), centerY:gv.height()/2, width:w/2, height:h};
    }else if(componentName === 'statusString'){
      return {id: this.settings.statusString.id};
    }else if(componentName === 'horizontalMenu'){
      return {id: this.settings.horizontalMenu.id};
    }else{
      return false;
    }
  },

  hideAjaxLoader: function(){
    this.jQuery('#ajaxLoader').hide();
  }
};
