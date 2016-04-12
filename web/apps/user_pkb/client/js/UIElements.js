/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @param ajax
 * @constructor
 */
YOVALUE.UIElements = function(){
  this.uniqueId = 0;
  this.SELECT_ITEM_MAX_LENGTH = 25;
};

YOVALUE.UIElements.prototype = {
  /**
   * Creating input that drops list of options based on input value
   * @param name
   * @param label
   * @param value
   * @param {function} findCallback - must return promise that will produce
   * array of items in a form [{id:<string>,title:<string>}, ...}
   * @param {function} typeCallback - will bw called as user type smth in a search tree. Arguments are name and value (= selected object from items)
   * @param {function} selectCallback - function that will be called as user select item. Arguments are name and value (= selected object from items)
   * @param {boolean=} disabled
   */
  createSearch: function(name, label, value, findCallback, typeCallback, selectCallback, disabled){
    var that = this,
        uniqId = this.generateId(),
        search = YOVALUE.createElement('input',{name:name,type:'text',value:value, placeholder:label, disabled:disabled});

    var selectBox = YOVALUE.createElement('div',{class:'ui_search',id:uniqId,value:'none'},'');
    var ul = YOVALUE.createElement('ul',{},'');
    selectBox.appendChild(search);
    selectBox.appendChild(ul);

    var items = {};
    search.addEventListener('keyup', function(){
      typeCallback(name,search.value);
      findCallback(search.value).then(function(v) {
         items = v;

        // remove all children from ul
        while (ul.firstChild) { ul.removeChild(ul.firstChild); }

        // create list of items
        var lis = Object.keys(items).map(function(key){
          var item = items[key];
          if(typeof(item.title) == 'undefined') throw 'UISearch: items given to droplist must have title field!';
          return YOVALUE.createElement('li',{value:key},(item.title.length > that.SELECT_ITEM_MAX_LENGTH ? item.title.substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : item.title));
        });

        lis.forEach(function(li){ ul.appendChild(li); });
        YOVALUE.setDisplay(ul,'block');
      });
    });


    document.body.addEventListener('click', function(evt){
      // click on item - select new one
      if(YOVALUE.objectToArray(ul.children).indexOf(evt.target) != -1 ){
        var value = evt.target.getAttribute('value');
        var label = evt.target.innerText;
        YOVALUE.updateElement(search, {value:label});
        if(typeof(selectCallback) != 'undefined') selectCallback(name, items[value]);
        YOVALUE.setDisplay(ul,'none');
      }else{
        YOVALUE.setDisplay(ul,'none');
      }
    });

    return selectBox;
  },

  /**
   * Returns DOM element that can be used to select items
   * @param {String} name - name of select box
   * @param {Object<string, string>} items - in form {'value'=>'label', ...}
   * @param {String} defaultValue - selected item name
   * @param {function(string,string)=} onSelectCallback - callback will receive select name and item name on selection
   * @param {boolean=} disabled
   * @returns {HTMLElement}
   */
  createSelectBox: function(name, items, defaultValue, onSelectCallback, disabled){
    var that = this,
        uniqId = this.generateId(),
        selectedItem = YOVALUE.createElement('span',{class:'selected',value:'none'},'none'),
        inputHidden = YOVALUE.createElement('input',{name:name,type:'hidden',value:null});

    if(typeof(disabled) == 'undefined') disabled = false;

    if(defaultValue){
      YOVALUE.updateElement(selectedItem, {value:defaultValue}, items[defaultValue]);
      YOVALUE.updateElement(inputHidden, {value:defaultValue});
    }

    var selectBox = YOVALUE.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    // create list of items
    var lis = Object.keys(items).map(function(key){
      return YOVALUE.createElement('li',{value:key},(items[key].length > that.SELECT_ITEM_MAX_LENGTH ? items[key].substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : items[key]))
    });

    var ul = YOVALUE.createElement('ul',{},'');
    lis.forEach(function(li){ ul.appendChild(li); });

    selectBox.appendChild(selectedItem);
    selectBox.appendChild(inputHidden);
    selectBox.appendChild(ul);

    document.body.addEventListener('click', function(evt){
      if(disabled) return;

      // toggle show/hide of menu
      if(evt.target == selectedItem){
        if(YOVALUE.getDisplay(ul) == 'none'){
          YOVALUE.setDisplay(ul,'block');
        }else{
          YOVALUE.setDisplay(ul,'none');
        }
      }
      // click on item - select new one
      else if(lis.indexOf(evt.target) != -1 ){
        var value = evt.target.getAttribute('value');
        YOVALUE.updateElement(selectedItem, {value:value}, evt.target.innerText);
        YOVALUE.updateElement(inputHidden, {value:value});
        if(typeof(onSelectCallback) != 'undefined') onSelectCallback(name, value);
        YOVALUE.setDisplay(ul,'none');
      }else{
        YOVALUE.setDisplay(ul,'none');
      }
    });

    return selectBox;
  },

  /**
   *
   * @param name
   * @param items
   * @param {function=} addCallback - arguments are files to upload, li_list (HTMLElements for files to add to list), ul (HTMLElement for all li)
   * @param removeCallback - arguments are file id to remove, li (HTMLElement for file) to remove
   * @param {boolean=} disabled
   */
  createFileBox: function(name, items, addCallback, removeCallback,disabled){
    var container = YOVALUE.createElement('div',{class:'ui_file'});
    var file = YOVALUE.createElement('input',{type:'file',name:name,disabled:disabled});
    var list = this.createList(items,{remove:removeCallback});
    container.appendChild(file);
    container.appendChild(list);
    file.addEventListener('change',function(evt){
      addCallback(this.files,list);
    });
    return container;
  },

  /**
   *
   * @param name
   * @param value
   * @param min
   * @param max
   * @param step
   * @param callback
   * @param {boolean=} disabled
   * @returns {HTMLElement}
   */
  createRange: function(name,value,min,max,step,callback,disabled){
    var range = YOVALUE.createElement('div',{class:'ui_range'});
    var label = YOVALUE.createElement('label',{},name+' ');
    var input = YOVALUE.createElement('input',{type:'range',name:name,value:value,min:min,max:max,step:step,disabled:disabled},'');
    if(disabled == true) YOVALUE.setDisplay(input,'none');
    var output = YOVALUE.createElement('span',{},value);
    range.appendChild(label);
    range.appendChild(input);
    range.appendChild(output);
    input.addEventListener('input',function(evt){
      output.innerText = input.value;
      callback(name,input.value);
    });
    return range;
  },
  /**
   * Creates form fields and buttons
   * @param fields
   * @param {Function=} callback - called when any button from fields is pressed
   * @returns {HTMLElement}
   */
  createForm: function(fields, callback){
    var name,
      uniqId = this.generateId(),
      form = YOVALUE.createElement('div',{id:uniqId, class:'ui_form'},'');

    for(name in fields){
      if(fields[name]['type'] == 'text') form.appendChild(YOVALUE.createElement('input',{type:'text', name:name,value:fields[name]['value'],placeholder:fields[name]['label'],disabled:fields[name]['disabled']},'',fields[name]['callback']));
      if(fields[name]['type'] == 'textarea') form.appendChild(YOVALUE.createElement('textarea',{name:name,placeholder:fields[name]['label'],disabled:fields[name]['disabled']},fields[name]['value'],fields[name]['callback']));
      if(fields[name]['type'] == 'date') form.appendChild(YOVALUE.createElement('input',{type:'date', name:name,value:fields[name]['value'],disabled:fields[name]['disabled']},'',fields[name]['callback']));
      if(fields[name]['type'] == 'select') form.appendChild(this.createSelectBox(name, fields[name]['options'],fields[name]['value'],fields[name]['callback'],fields[name]['disabled']));
      if(fields[name]['type'] == 'button'){
        // if button field has callback - use it, if no - use general form callback and pass form data to it
        form.appendChild(this.createButton(
          name,
          fields[name]['value'],
          fields[name]['callback'] ? fields[name]['callback'] : function(evt){
            var data = {};
            // gather data from form fields
            [].forEach.call(form.getElementsByTagName("textarea"), function(child) {
              data[child.getAttribute('name')] = child.value;
            });
            [].forEach.call(form.getElementsByTagName("button"), function(child) {
              data[child.getAttribute('name')] = child == evt.target;
            });
            [].forEach.call(form.getElementsByTagName("input"), function(child) {
              data[child.getAttribute('name')] = child.value;
            });
            callback(data);
          },
          fields[name]['disabled'])
        );
      }
      if(fields[name]['type'] == 'search') form.appendChild(this.createSearch(name, fields[name]['label'], fields[name]['value'], fields[name]['findCallback'], fields[name]['typeCallback'], fields[name]['selectCallback'], fields[name]['disabled']));
      if(fields[name]['type'] == 'file') form.appendChild(this.createFileBox(name,fields[name]['items'],fields[name]['addCallback'],fields[name]['removeCallback'],fields[name]['disabled']));
      if(fields[name]['type'] == 'range') form.appendChild(this.createRange(name,fields[name]['value'],fields[name]['min'],fields[name]['max'],fields[name]['step'],fields[name]['callback'],fields[name]['disabled']));
      if(fields[name]['type'] == 'hidden') form.appendChild(YOVALUE.createElement('input',{type:'hidden',name:name,value:fields[name]['value']},''));
      if(fields[name]['type'] == 'title') form.appendChild(YOVALUE.createElement('h1',{},fields[name]['value']));
    }

    return form;
  },

  /**
   * Updates form field with given name to given attrs
   * @param form
   * @param name
   * @param attrs
   */
  updateForm: function(form,name,attrs){

    var el = form.querySelector('[name="'+name+'"]');
    if(el != null){
      YOVALUE.updateElement(el,attrs);
      el.dispatchEvent(new Event('input'));
    }
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
   * @return HTMLElement el that must be removed with function closeModal(el)
   */
  createModal: function(){
    var that = this,
      uniqId = this.generateId(),
      modalWindow = YOVALUE.createElement('div',{id:uniqId, class:'ui_modal'},''),
      overlay = YOVALUE.createElement('div',{id:'overlay'+uniqId, class:'ui_modal_overlay'},'');
    document.body.appendChild(overlay);
    document.body.appendChild(modalWindow);

    var closeButton = YOVALUE.createElement('div',{class:'close_button'},'X');
    modalWindow.appendChild(closeButton);
    closeButton.addEventListener('click', function(evt){
      that.closeModal(modalWindow);
    });

    YOVALUE.setDisplay(modalWindow, 'none');

    return modalWindow;
  },

  closeModal: function(modalWindow){
    if(modalWindow.getAttribute('class') != 'ui_modal') YOVALUE.throwError('This is not a modal window HTMLElement');

    var overlay = document.getElementById('overlay'+modalWindow.getAttribute('id'));
    overlay.parentNode.removeChild(overlay);
    modalWindow.parentNode.removeChild(modalWindow);
  },

  setModalContent: function(modalWindow, content){
    YOVALUE.setDisplay(modalWindow, 'block');
    YOVALUE.setDisplay(modalWindow, 'none');
    YOVALUE.setDisplay(modalWindow, 'block');
    // remove all except close button
    [].forEach.call(modalWindow.childNodes, function(child) {
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
    var that = this, m = this.createModal();
    this.setModalContent(
      m,
      this.createForm(
        {title:{type:'title', value:text}, yes:{type:'button',value:'Yes'}, no:{type:'button', value:'No'}},
        function(v){
          if(v['yes']) v = 'yes';
          else v = 'no';
          that.UI.closeModal(m);
          callback(v);
        }
      )
    );
  },

  /**
   * Create button
   * @param {String} name - i.e. "yes"
   * @param {String} label - i.e "I agree!"
   * @param {function(object)=} callback - callback arg is event
   * @param {boolean=} disabled
   */
  createButton: function(name, label, callback,disabled){
    var uniqId = this.generateId();
    var el = YOVALUE.createElement('button',{id:uniqId, name:name, class:'ui_button',disabled:disabled},label);
    if(typeof(callback) != 'undefined'){
      el.addEventListener('click', function(evt){
        callback(evt);
      });
    }
    return el;
  },

  /**
   * Shows list of items with action buttons next to each
   * @param {Object<string, string>} items - in a form {id:label, ...}
   * @param {Object<string, string>} actions - action that can be made to item, in a form {name:callback, ...}
   */
  showModalList: function(items, actions){
    this.setModalContent(this.createModal(),this.createList(items, actions));
  },

  /**
   * Creates list of items with action buttons next to each
   * @param {Object<string, string | HTMLElement>} items - in a form {id:label, ...}, id is string, label is string or HTMLElement
   * @param {Object<string, function>} actions - action that can be made on item, in a form {name:callback, ...},
   * action args are item id and li (HTMLElement that represents item)
   */
  createList: function(items, actions){
    var uniqId = this.generateId();
    var ul = YOVALUE.createElement('ul', {id:uniqId, class:'ui_list'});
    for(var id in items){
      ul.appendChild(this.createListItem(id,items[id],actions));
    }
    return ul;
  },

  /**
   * Creating item for the createList
   * @param id
   * @param label
   * @param actions
   * @returns {HTMLElement}
   */
  createListItem: function(id,label,actions){
    var li = YOVALUE.createElement('li',{});
    if(typeof(label) == 'string'){
      li.appendChild(document.createTextNode(label));
    }else{
      li.appendChild(label);
    }
    for(var name in actions){
      var button = this.createButton(name, name);
      (function(button, callback, id,li){
        button.addEventListener('click', function(evt){
          callback(id, li);
        });
      })(button, actions[name], id, li);
      li.appendChild(button);
    }
    return li;
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