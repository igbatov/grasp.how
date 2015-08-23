/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @param jQuery
 * @constructor
 */
YOVALUE.UIElements = function(jQuery){
  this.jQuery = jQuery;
  this.time = new Date();
};

YOVALUE.UIElements.prototype = {
  /**
   * Return html that can be used to select items
   * @param parentSelector - css selector of parent DOM element
   * @param name - name of select box
   * @param items as array - for example array(
   *                                       'value'=>'label',
   *                                       ...
   *                                     )
   * @param onSelectCallback - callback will receive item name on selection
   * @param defaultValue - selected item name
   * @param className
   * @param opt_showRemoveButton - boolean that indicates do we need Remove in item list
   * @param opt_removeCallback - callback on remove action
   */
  createSelectBox: function(parentSelector, name, items, onSelectCallback, defaultValue, className, opt_showRemoveButton, opt_removeCallback){
    var $ = this.jQuery,
        uniqId = this._generateId(),
        value,
        selectedItem = defaultValue == null ? '<span class="selected" value="none">none</span>' : '<span class="selected" value="'+defaultValue+'">'+items[defaultValue]+'</span>';

    var itemList = '';
    for(value in items){
      itemList += '<li value="'+value+'">'+(items[value].length > 25 ? items[value].substr(0, 25)+'...' :  items[value])+(opt_showRemoveButton ? '<div class="removeListItemButton"></div>':'')+'</li>';
    }
    var selectBox = '<div class="sel-box '+className+'" id="'+uniqId+'">'+selectedItem+'<ul '+(opt_showRemoveButton ? 'class="removable"' : '')+'>'+itemList+'</ul></div>';
    $(parentSelector).append(selectBox);

    // toggle show/hide of menu
    $('#'+uniqId+' .selected').click(function(){
      var ul = $('#'+uniqId+' ul');
      if(ul.is(":visible")) ul.hide();
      else ul.show();
    });

    // select option event
    $('#'+uniqId+' li').click(function(e){
      var value = $(this).attr('value');   // id of newly selected graph

      // change selected item
      $('#'+uniqId+' .selected').text($(this).text());
      $('#'+uniqId+' .selected').attr('value', $(this).attr('value'));
      $(this).parent().hide();
      e.preventDefault();

      // call callback
      onSelectCallback(name, $(this).attr('value'));
    });

    // click on remove button
    if(opt_showRemoveButton){
      $('#'+uniqId+" .removeListItemButton").click(function(e) {
        e.preventDefault();
        opt_removeCallback($(this).parent().attr('value'));
        $(this).parent().remove();
      });
    }

    return true;
  },

  /**
   * Show form in modal window
   * @param fields as array - for example {
   *                                         'title':{'type'=>'input', 'label'=>'Write Title:'},
   *                                         'textType':{'type'=>'select', 'label'=>'Choose Text Type:'},
   *                                         ...
   *                                       }
   * @param callback - callback will get form values as array 'name'=>'value'
   */
  showModal: function(fields, callback){

  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    var $ = this.jQuery;
  },

  /**
   * Create button
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  createButton: function(parentSelector, text, callback, className){
    var $ = this.jQuery;
    $(parentSelector).append('<div class="'+className+'">'+text+'</div>');
  },

  /**
   * private method to generate unique id for UI element
   * @private
   */
  _generateId: function(){
    return this.time.getTime() + '_' + Math.floor(Math.random()*1000);
  }
};