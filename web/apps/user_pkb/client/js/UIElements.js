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
        uniqId = this.generateId(),
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
    var $ = this.jQuery, uniqId = this.generateId(), name;
    $('body').append('<div id="'+uniqId+'" class="ui_modal"></div>');
    var w = $('#'+uniqId), c;
    w.css('top', window.innerHeight/2+'px');
    w.css('left', window.innerWidth/2+'px');

    var closeId = this.generateId();
    w.append('<div id="'+closeId+'"  class="close_button">X</div>');
    $('#'+closeId).click(function(){
      w.remove();
    });

    w.append('<div class="ui_modal_content"></div>');
    c = $("#"+uniqId+' .ui_modal_content');

    for(name in fields){
      if(fields[name]['type'] == 'input') c.append('<input name="'+name+'" class="UIModalField" value="'+fields[name]['value']+'">');
      if(fields[name]['type'] == 'hidden') c.append('<input type="hidden" name="'+name+'" class="UIModalField" value="'+fields[name]['value']+'">');
      if(fields[name]['type'] == 'title') c.append('<div class="ui_modal_title">'+fields[name]['value']+'</div>');
      if(fields[name]['type'] == 'html') c.append(fields[name]['value']);
      if(fields[name]['type'] == 'confirm'){
        var yesButtonId = this.generateId();
        var noButtonId = this.generateId();
        c.append('<button id="'+yesButtonId+'" class="confirm_button">yes</button><button id="'+noButtonId+'" class="confirm_button">no</button>');
        $('#'+yesButtonId).click(function(){
          callback('yes');
          w.remove();
        });
        $('#'+noButtonId).click(function(){
          callback('no');
          w.remove();
        });
      }
      if(fields[name]['type'] == 'button'){
        var buttonId = this.generateId();
        c.append('<button id="'+buttonId+'" name="'+name+'">'+fields[name]['value']+'</button>');
        $('#'+buttonId).click(function(){
          var data = {};
          $('#'+uniqId+' .UIModalField').each(function(){
            data[$(this).attr('name')] = $(this).val();
          });
          callback(data);
          w.remove();
        });
      }
    }

    // correct windows position with respect to window size
    w.css('top', (window.innerHeight/3 - c.height()/2)+'px');
    w.css('left', (window.innerWidth/2 - c.width()/2)+'px');
  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    this.showModal({'title':{'type':'title', 'value':text}, 'confirm':{'type':'confirm'}}, callback);
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
    var $ = this.jQuery, uniqId = this.generateId();
    $(parentSelector).append('<button id="'+uniqId+'" class="ui_button '+opt_className+'">'+text+'</button>');
    $('#'+uniqId).click(function(){
      callback();
    });
  },

  /**
   *
   * @param items
   * @param actionName
   * @param actionCallback
   */
  showModalList: function(items, actionName, actionCallback){
    var id, list={};
    for(id in items){
      list[id] = {'type':'html', 'value':this._createActionItem(id, items[id], actionName, function(id, html){
        actionCallback(id, html)
      })};
    }
    this.showModal(list, function(){});
  },

  /**
   * Creates form and list of items created from this list
   * @param parentSelector
   * @param fields
   * @param items
   * @param addCallback
   * @param removeCallback
   */
  createItemsBox: function(parentSelector, fields, items, addCallback, removeCallback){
    var that = this, i, j, form, options, list="", $ = this.jQuery, uniqId, buttonId, listId;

    // create form
    form = "<tr>";
    for(i in fields) form += "<th>"+fields[i]['label']+"</th>";
    form += "<th></th></tr><tr>";

    for(i in fields){
      form += '<td>';
      if(fields[i]['type'] == 'text') form += '<input type="text" name="'+i+'" value="'+fields[i]['value']+'"></input>';
      if(fields[i]['type'] == 'select'){
        options = "";
        for(var v in fields[i]['options']) options += '<option value="'+v+'" '+(v == fields[i]['selected'] ? 'selected':'')+'>'+fields[i]['options'][v]+'</option>';
        form += '<select  name="'+i+'">'+options+'</select>';
      }
      form += '</td>';
    }
    // append add button to form
    buttonId = this.generateId();
    form += '<td><button id="'+buttonId+'" class="ui_button">+</button></td></tr>';

    // create list of already added items
    listId = this.generateId();
    list = '<tr id="'+listId+'">';
    for(i in items){
      list += "<td>";
      var item_fields = "";
      for(j in items[i]) item_fields += "; "+items[i][j];
      list += this._createActionItem(i, item_fields, 'delete', removeCallback);
      list += "</td>";
    }
    list += "</tr>";

    uniqId = this.generateId();
    $(parentSelector).append('<table id="'+uniqId+'" class="itemsBox">'+form+list+"</table>");

    $('#'+buttonId).click(function(){
      var value = "", item = {};
      for(i in fields){
        if(fields[i]['type'] == 'text') value = $(this).parent().parent().find("input[name='"+i+"']").val();
        if(fields[i]['type'] == 'select') value = $(this).parent().parent().find("select[name='"+i+"']").val();
        item[i] = value;
      }

      if(addCallback(item)){
        var item_fields = "";
        for(j in item) item_fields += "<td>"+item[j]+"</td>";
        list += '<tr>'+item_fields+'<td>delete</td></tr>';
        console.log(list);
        $('#'+listId).append(list);
      }
    });

    return uniqId;
  },

  /**
   * Method to generate unique id for UI element
   * @private
   */
  generateId: function(){
    return this.time.getTime() + '_' + Math.floor(Math.random()*1000);
  },

  /**
   * Private method creates item for the list with possibility of action on this items
   * @param itemId
   * @param itemName
   * @param actionName
   * @param actionCallback
   */
  _createActionItem: function(itemId, itemName, actionName, actionCallback){
    var uniqId = this.generateId(), $ = this.jQuery;
    $(document).on('click', '#'+uniqId+' a', function(){
      actionCallback(itemId, $('#'+uniqId));
    });
    return '<ul id="'+uniqId+'"  class="actionItem"><li>'+itemName+' <a href="#" class="actionButton">'+actionName+'</a></li></ul>';
  }
};