/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @param jQuery
 * @constructor
 */
YOVALUE.UIElements = function(jQuery){
  this.jQuery = jQuery;
  this.uniqueId = 0;
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
  createSelectBox: function(name, items, defaultValue, onSelectCallback){
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

  createForm: function(fields, callback){
    var name,
      uniqId = this.generateId(),
      form = YOVALUE.createElement('div',{id:uniqId, class:'form'},'');

    for(name in fields){
      if(fields[name]['type'] == 'input') form.appendChild(YOVALUE.createElement('input',{name:name,value:fields[name]['value'],placeholder:fields[name]['label']},''));
      if(fields[name]['type'] == 'hidden') form.appendChild(YOVALUE.createElement('input',{type:'hidden',name:name,value:fields[name]['value']},''));
      if(fields[name]['type'] == 'title') form.appendChild(YOVALUE.createElement('h1',{},fields[name]['value']));
      if(fields[name]['type'] == 'select') form.appendChild(this.createSelectBox(name, fields[name]['options']));
      if(fields[name]['type'] == 'button'){
        form.appendChild(this.createButton(name,fields[name]['value'],function(evt){
          var data = {};
          // gather data from form nodes
          [].forEach.call(form.childNodes, function(child) {
            // if not textNode and has attr name
            if(child.nodeType != Node.TEXT_NODE && child.hasAttribute('name')) {
              // if element is button then set data[element] = true if this button was pushed, false otherwise
              if (child.tagName == 'BUTTON') data[child.getAttribute('name')] = child == evt.target;
              // for other elements set its value
              else data[child.getAttribute('name')] = child.value;
            }
          });
          callback(data);
        }));
      }
    }

    return form;
  },

  /**
   * Create modal window
   * @param fields as array {name:{attr}, ...} - for example {
   *                                         'title':{'type':'input', 'label':'Write Title:'},
   *                                         'textType':{'type':'select', 'label':'Choose Text Type:'},
   *                                         'addButton':{'type':'button', 'label':'Add'},
   *                                         ...
   *                                       }
   * @param callback - callback will get form values as array 'name'=>'value'
   */
  createModal: function(){
    var uniqId = this.generateId(),
      modalWindow = YOVALUE.createElement('div',{id:uniqId, class:'ui_modal'},'');
    document.body.appendChild(modalWindow);

    var closeButton = YOVALUE.createElement('div',{class:'close_button'},'X');
    modalWindow.appendChild(closeButton);
    closeButton.addEventListener('click', function(evt){
      modalWindow.parentNode.removeChild(modalWindow);
    });

    YOVALUE.setDisplay(modalWindow, 'none');

    return modalWindow;
  },

  setModalContent: function(modalWindow, content){
    YOVALUE.setDisplay(modalWindow, 'block');
    YOVALUE.setDisplay(modalWindow, 'none');
    YOVALUE.setDisplay(modalWindow, 'block');
    // remove all except close button
    [].forEach.call(modalWindow.childNodes, function(child) {
      console.log(child);
      if(child.getAttribute('class') != 'close_button') modalWindow.removeChild(child);
    });

    modalWindow.appendChild(content);

  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    var m = this.createModal();
    this.setModalContent(
      m,
      this.createForm(
        {title:{type:'title', value:text}, yes:{type:'button',value:'Yes'}, no:{type:'button', value:'No'}},
        function(v){
          if(v['yes']) v = 'yes';
          else v = 'no';
          m.parentNode.removeChild(m);
          callback(v);
        }
      )
    );
  },

  /**
   * Create button
   * @param label - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  createButton: function(name, label, callback){
    var uniqId = this.generateId();
    var el = YOVALUE.createElement('button',{id:uniqId, name:name, class:'ui_button'},label);
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
    var id;
    var uniqId = this.generateId();
    var ul = YOVALUE.createElement('ul', {id:uniqId});
    for(id in items){
      var li = YOVALUE.createElement('li',{class:'actionItem'},items[id]);
      var href = YOVALUE.createElement('a',{class:'actionItemButton'},actionName);
      (function(id,li){
        href.addEventListener('click', function(evt){
          actionCallback(id, li)
        });
      })(id, li);
      li.appendChild(href);
      ul.appendChild(li);
    }
    this.setModalContent(this.createModal(),ul);
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
    this.uniqueId++;
    return 'UIElement-'+this.uniqueId;
  }
};