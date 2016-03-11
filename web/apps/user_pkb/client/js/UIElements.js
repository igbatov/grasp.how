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
  createSelectBox: function(name, items, onSelectCallback, defaultValue){
    var uniqId = this.generateId(),
        selectedItem = YOVALUE.createElement('span',{class:'selected',value:'none'},'none');

    if(defaultValue) YOVALUE.updateElement(selectedItem, {value:defaultValue}, items[defaultValue]);

    var selectBox = YOVALUE.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    // create list of items
    var lis = Object.keys(items).map(function(key){
      return YOVALUE.createElement('li',{value:key},(items[key].length > 25 ? items[key].substr(0, 25)+'...' : items[key]))
    });

    var ul = YOVALUE.createElement('ul',{},'');
    lis.forEach(function(li){
      ul.appendChild(li);
    });

    selectBox.appendChild(selectedItem);
    selectBox.appendChild(ul);

    document.body.addEventListener('click', function(evt){
      // toggle show/hide of menu
      if(evt.target == selectedItem){
        if(YOVALUE.getDisplay(ul) == 'none'){
          YOVALUE.setDisplay(ul,'block');
        }else{
          YOVALUE.setDisplay(ul,'none');
        }
      }
      // click on item - select new graph
      else if(lis.indexOf(evt.target) != -1 ){
        var value = evt.target.getAttribute('value');
        YOVALUE.updateElement(selectedItem, {value:value}, evt.target.innerText);
        onSelectCallback(name, value);
        YOVALUE.setDisplay(ul,'none');
      }else{
        YOVALUE.setDisplay(ul,'none');
      }
    });

    return selectBox;
  },

  /**
   * Show form in modal window
   * @param fields as array {name:{attr}, ...} - for example {
   *                                         'title':{'type':'input', 'label':'Write Title:'},
   *                                         'textType':{'type':'select', 'label':'Choose Text Type:'},
   *                                         'addButton':{'type':'button', 'label':'Add'},
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
      if(fields[name]['type'] == 'input') c.append('<input name="'+name+'" class="UIModalField" value="'+fields[name]['value']+'" placeholder="'+fields[name]['label']+'">');
      if(fields[name]['type'] == 'hidden') c.append('<input type="hidden" name="'+name+'" class="UIModalField" value="'+fields[name]['value']+'">');
      if(fields[name]['type'] == 'title') c.append('<div class="ui_modal_title">'+fields[name]['value']+'</div>');
      if(fields[name]['type'] == 'html') c.append(fields[name]['value']);
      if(fields[name]['type'] == 'select'){
        var options = "";
        for(var v in fields[name]['options']) options += '<option value="'+v+'" '+(v == fields[name]['selected'] ? 'selected':'')+'>'+fields[name]['options'][v]+'</option>';
        c.append('<select  name="'+name+'">'+options+'</select>');
      }
      if(fields[name]['type'] == 'confirm'){
        var yesButtonId = this.generateId();
        var noButtonId = this.generateId();
        c.append('<button id="'+yesButtonId+'" class="confirm_button">yes</button><button id="'+noButtonId+'" class="confirm_button">no</button>');
        $('#'+yesButtonId).click(function(){
          callback('yes',w);
        });
        $('#'+noButtonId).click(function(){
          callback('no',w);
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
          callback(data,w);
        });
      }
    }

    // correct windows position with respect to window size
    w.css('top', (window.innerHeight/2 - c.height()/2)+'px');
    w.css('left', (window.innerWidth/2 - c.width()/2)+'px');
  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    this.showModal({'title':{'type':'title', 'value':text}, 'confirm':{'type':'confirm'}}, function(v,w){callback(v); w.remove();});
  },

  /**
   * Create button
   * @param label - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  createButton: function(label, callback){
    var uniqId = this.generateId();
    var el = YOVALUE.createElement('button',{id:uniqId, class:'ui_button'},label);
    el.addEventListener('click', function(evt){
      callback(evt);
    });
    return el;
  },

  /**
   * Show list of items with action buttons next to each
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
    list = '';
    for(i in items){
      list += createItemRow(items[i], fields, removeCallback);
    }

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
        $('#'+uniqId).append(createItemRow(item, fields, removeCallback));
      }
    });

    function createItemRow(item, fields, removeCallback){
      var item_fields = "", id = that.generateId(), field_names = YOVALUE.getObjectKeys(fields);
      for(j in item){
        if(field_names.indexOf(j) != -1) item_fields += "<td>"+item[j]+"</td>";
      }
      item_fields = '<tr>'+item_fields+'<td id="'+id+'" style="cursor:pointer">X</td></tr>';
      $(document).on('click', '#'+id, function(){
        $(this).parent().remove();
        removeCallback(item);
      });
      return item_fields;
    };

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