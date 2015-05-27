/**
 * Helper functions to simulate mouse and keyboard events for canvasDrawer in tests
 * Uses jQuery and jquery.simulate
 * @type {Object}
 */
jasmineCanvasDrawerEventSimulation = {
  /**
   * Simulate mouse and keyboard events
   * @param el - DOM element on which mouse should act
   * @param eventType - ['mouseover', 'mouseout', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'click', 'keyup', 'keydown', 'keypress']
   * @param coord - for mouse events coordinates relative to el in a form {x:x, y:y}
   */
  simulate: function(el, eventType, coord){
    var absCoord = this._transformElementCoordToGlobalCoord(el, coord);
    var opt = {clientX:absCoord.x, clientY:absCoord.y};
    // when real user clicks mouse there are in fact 3 events triggers: 'mousedown', 'mouseup', 'click'
    // (source http://www.quirksmode.org/dom/events/click.html)
    // so we simulate here real user
    if(eventType == "click"){
      jQuery(el).simulate('mousedown', opt);
      jQuery(el).simulate('mouseup', opt);
      jQuery(el).simulate('click');
    }else if(eventType == "dblclick"){
      jQuery(el).simulate('mousedown', opt);
      jQuery(el).simulate('mouseup', opt);
      jQuery(el).simulate('click');
      jQuery(el).simulate('mousedown', opt);
      jQuery(el).simulate('mouseup', opt);
      jQuery(el).simulate('click');
      jQuery(el).simulate('dblclick');
    }else{
      jQuery(el).simulate(eventType, opt);
    }
  },

  drag: function(el, startCoord, stopCoord){
    var absCoord = this._transformElementCoordToGlobalCoord(el, startCoord);
    jQuery(el).simulate('mousemove', {clientX:absCoord.x, clientY:absCoord.y});
    jQuery(el).simulate('mousedown', {clientX:absCoord.x, clientY:absCoord.y});
    var absCoord = this._transformElementCoordToGlobalCoord(el, stopCoord);
    jQuery(el).simulate('mousemove', {clientX:absCoord.x, clientY:absCoord.y});
    jQuery(el).simulate('mouseup', {clientX:absCoord.x, clientY:absCoord.y});
  },

  _transformElementCoordToGlobalCoord: function(el, relCoord){
    var contentPositionX = jQuery(el).offset().left;
    var contentPositionY = jQuery(el).offset().top;
    var clientX = relCoord.x + contentPositionX;
    var clientY = relCoord.y + contentPositionY;
    return {'x':clientX, 'y':clientY};
  }
}