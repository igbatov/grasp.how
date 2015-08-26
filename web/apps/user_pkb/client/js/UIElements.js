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
   * @param opt_className
   */
  createSelectBox: function(parentSelector, name, items, onSelectCallback, defaultValue, opt_className){
    var $ = this.jQuery,
        uniqId = this._generateId(),
        value,
        selectedItem = defaultValue == null ? '<span class="selected" value="none">none</span>' : '<span class="selected" value="'+defaultValue+'">'+items[defaultValue]+'</span>';

    var itemList = '';
    for(value in items){
      itemList += '<li value="'+value+'">'+(items[value].length > 25 ? items[value].substr(0, 25)+'...' :  items[value])+'</li>';
    }
    var selectBox = '<div class="ui_select '+opt_className+'" id="'+uniqId+'">'+selectedItem+'<ul>'+itemList+'</ul></div>';
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
    var $ = this.jQuery, uniqId = this._generateId(), name;
    $('body').append('<div id="'+uniqId+'" class="ui_modal"></div>');
    var c = $('#'+uniqId);
    c.css('top', window.innerHeight/4+'px');
    c.css('left', window.innerWidth/3+'px');

    var closeId = this._generateId();
    c.append('<div id="'+closeId+'" style="float: right; cursor: pointer">X</div>');
    $('#'+closeId).click(function(){
      c.remove();
    });

    for(name in fields){
      if(fields[name]['type'] == 'input') c.append('<input name="'+name+'" class="UIModalField" value="'+fields[name]['value']+'">');
      if(fields[name]['type'] == 'button'){
        var buttonId = this._generateId();
        c.append('<button id="'+buttonId+'" name="'+name+'">'+fields[name]['value']+'</button>');
        $('#'+buttonId).click(function(){
          var data = {};
          $('#'+uniqId+' .UIModalField').each(function(){
            data[$(this).attr('name')] = $(this).val();
          });
          callback(data);
          c.remove();
        });
      }
    }
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
   * @param parentSelector
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   * @param opt_className
   */
  createButton: function(parentSelector, text, callback, opt_className){
    opt_className = typeof(opt_className) == 'undefined' ? '' : opt_className;
    var $ = this.jQuery, uniqId = this._generateId();
    $(parentSelector).append('<button id="'+uniqId+'" class="ui_button '+opt_className+'">'+text+'</button>');
    $('#'+uniqId).click(function(){
      callback();
    });
  },

  /**
   * private method to generate unique id for UI element
   * @private
   */
  _generateId: function(){
    return this.time.getTime() + '_' + Math.floor(Math.random()*1000);
  }
};