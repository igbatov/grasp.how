/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @param ajax
 * @constructor
 */
YOVALUE.UIElements = function(){
  this.uniqueId = 0;
  this.SELECT_ITEM_MAX_LENGTH = 25;
  // list of all elements created
  this.elements = new YOVALUE.Table(['id', 'type', 'formname', 'name', 'definition', 'dom']);
};

YOVALUE.UIElements.prototype = {
  /**
   * Creating input that drops list of options based on input value
   * {function} findCallback - must return promise that will produce array of items in a form [{id:<string>,title:<string>}, ...}
   * {function} typeCallback - will bw called as user type smth in a search tree. Arguments are name and value (= selected object from items)
   * {function} selectCallback - function that will be called as user select item. Arguments are name and value (= selected object from items)
   * {boolean=} disabled
   * @param attrs - {name, label, value, findCallback, typeCallback, selectCallback, disabled, formname}
   */
  createSearch: function(attrs){
    var that = this,
        uniqId = this.generateId(),
        search = YOVALUE.createElement('input',{name:attrs.name,type:'text',value:attrs.value, placeholder:attrs.label, disabled:attrs.disabled});

    var selectBox = YOVALUE.createElement('div',{class:'ui_search',id:uniqId,value:'none'},'');
    var ul = YOVALUE.createElement('ul',{},'');
    selectBox.appendChild(search);
    selectBox.appendChild(ul);

    var items = {};
    search.addEventListener('keyup', function(){
      attrs.typeCallback(attrs.name,search.value);
      attrs.findCallback(search.value).then(function(v) {
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
        if(typeof(attrs.selectCallback) != 'undefined') attrs.selectCallback(attrs.name, items[value]);
        YOVALUE.setDisplay(ul,'none');
      }else{
        YOVALUE.setDisplay(ul,'none');
      }
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'search', definition:attrs, dom:selectBox});

    return selectBox;
  },

  /**
   * {name:{String}, items:{Object<string, string>}, defaultValue:{String}, callback:{function(string,string)=}, disabled:{boolean=}, formname:{String}}
   * Returns DOM element that can be used to select items
   * name - name of select box
   * items - in form {'value'=>'label', ...}
   * defaultValue - selected item name
   * callback - callback will receive select name and item name on selection
   * @returns {HTMLElement}
   */
  createSelectBox: function(attrs){
    var that = this,
        uniqId = this.generateId(),
        selectedItem = YOVALUE.createElement('span',{class:'selected',value:'none'},'none'),
        inputHidden = YOVALUE.createElement('input',{name:attrs.name,type:'hidden',value:null});

    if(typeof(attrs.disabled) == 'undefined') attrs.disabled = false;

    if(attrs.defaultValue){
      YOVALUE.updateElement(selectedItem, {value:attrs.defaultValue}, attrs.items[attrs.defaultValue]);
      YOVALUE.updateElement(inputHidden, {value:attrs.defaultValue});
    }

    var selectBox = YOVALUE.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    // create list of items
    var lis = Object.keys(attrs.items).map(function(key){
      return YOVALUE.createElement('li',{value:key},(attrs.items[key].length > that.SELECT_ITEM_MAX_LENGTH ? attrs.items[key].substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : attrs.items[key]))
    });

    var ul = YOVALUE.createElement('ul',{},'');
    lis.forEach(function(li){ ul.appendChild(li); });

    selectBox.appendChild(selectedItem);
    selectBox.appendChild(inputHidden);
    selectBox.appendChild(ul);

    document.body.addEventListener('click', function(evt){
      if(attrs.disabled) return;

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
        if(typeof(attrs.callback) != 'undefined') attrs.callback(attrs.name, value);
        YOVALUE.setDisplay(ul,'none');
      }else{
        YOVALUE.setDisplay(ul,'none');
      }
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'selectBox', definition:attrs, dom:selectBox});

    return selectBox;
  },

  /**
   *
   * @param attrs - name, items, addCallback, removeCallback,disabled,formname
   * {function=} addCallback - arguments are files to upload, li_list (HTMLElements for files to add to list), ul (HTMLElement for all li)
   * {function=} removeCallback - arguments are file id to remove, li (HTMLElement for file) to remove
   * {boolean=}  disabled
   */
  createFileBox: function(attrs){
    var uniqId = this.generateId();
    var container = YOVALUE.createElement('div',{class:'ui_file',id:uniqId});
    var file = YOVALUE.createElement('input',{type:'file',name:attrs.name,disabled:attrs.disabled});
    var list = this.createList(attrs.items,{remove:attrs.removeCallback});
    container.appendChild(file);
    container.appendChild(list);
    file.addEventListener('change',function(evt){
      attrs.addCallback(this.files,list);
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'fileBox', definition:attrs, dom:container});

    return container;
  },

  /**
   *
   * @param attrs - {name,value,min,max,step,callback,disabled,formname}
   * @returns {HTMLElement}
   */
  createRange: function(attrs){
    var uniqId = this.generateId();

    var range = YOVALUE.createElement('div',{class:'ui_range'});
    var label = YOVALUE.createElement('label',{},attrs.name+' ');
    var input = YOVALUE.createElement('input',{type:'range', name:attrs.name, value:attrs.value, min:attrs.min, max:attrs.max, step:attrs.step, disabled:attrs.disabled},'');
    if(attrs.disabled == true) YOVALUE.setDisplay(input,'none');
    var output = YOVALUE.createElement('span',{},attrs.value);
    range.appendChild(label);
    range.appendChild(input);
    range.appendChild(output);
    input.addEventListener('input',function(evt){
      output.innerText = input.value;
      attrs.callback(attrs.name,input.value);
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'range', definition:attrs, dom:range});

    return range;
  },


  /**
   * Create button
   * @param attrs - {name, label, callback, disabled, formname}
   *  {String} name - i.e. "yes"
   *  {String} label - i.e "I agree!"
   *  {function(object)=} callback - callback arg is event
   *  {boolean=} disabled
   */
  createButton: function(attrs){
    var uniqId = this.generateId();
    var el = YOVALUE.createElement('button',{id:uniqId, name:attrs.name, class:'ui_button',disabled:attrs.disabled},attrs.label);
    if(typeof(attrs.callback) != 'undefined'){
      el.addEventListener('click', function(evt){
        attrs.callback(evt);
      });
    }

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'button', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, label:, disabled:, callback:, classname:}
   * @returns {HTMLElement}
   */
  createTextBox: function(attrs){
    var uniqId = this.generateId();
    attrs['id'] = uniqId;
    var el = YOVALUE.createElement('input',{type:'text', name:attrs.name, value:attrs.value, placeholder:attrs.label, disabled:attrs.disabled},'',attrs.callback);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'textBox', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, label:, disabled:, callback:, formname:}
   * @returns {HTMLElement}
   */
  createTextareaBox: function(attrs){
    var uniqId = this.generateId();
    attrs['id'] = uniqId;
    var el = YOVALUE.createElement('textarea',{name:attrs.name, placeholder:attrs.label, disabled:attrs.disabled}, attrs.value, attrs.callback);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs['name'], type:'textareaBox', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, disabled:, callback:, formname:}
   * @returns {HTMLElement}
   */
  createDate: function(attrs){
    var uniqId = this.generateId();
    attrs['id'] = uniqId;
    attrs['type'] = 'date';
    var el = YOVALUE.createElement('input',{name:attrs.name, value:attrs.value, disabled:attrs.disabled},'',attrs.callback);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs['name'], type:'date', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:,value:, formname:}
   * @returns {HTMLElement}
   */
  createHidden: function(attrs){
    attrs['type'] = 'hidden';
    var uniqId = this.generateId();
    attrs['id'] = uniqId;
    var el = YOVALUE.createElement('input',{name:attrs.name, value:attrs.value},'');

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs['name'], type:'hidden', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {text:, formname:}
   * @returns {HTMLElement}
   */
  createTitle: function(attrs){
    var uniqId = this.generateId();
    var el = YOVALUE.createElement('h1',{id:uniqId},attrs.text);
    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:null, type:'title', definition:attrs, dom:el});

    return el;
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
      if(fields[name]['type'] == 'text') form.appendChild(this.createTextBox({name:name, value:fields[name]['value'], label:fields[name]['label'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], formname:uniqId}));
      if(fields[name]['type'] == 'textarea') form.appendChild(this.createTextareaBox({name:name, value:fields[name]['value'], label:fields[name]['label'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], formname:uniqId}));
      if(fields[name]['type'] == 'date') form.appendChild(this.createDate({name:name, value:fields[name]['value'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], formname:uniqId}));
      if(fields[name]['type'] == 'select') form.appendChild(this.createSelectBox({name:name, items:fields[name]['items'], defaultValue:fields[name]['value'], callback:fields[name]['callback'], disabled:fields[name]['disabled'], formname:uniqId}));
      if(fields[name]['type'] == 'button'){
        // if button field has callback - use it, if no - use general form callback and pass form data to it
        form.appendChild(this.createButton({
          name: name,
          label: fields[name]['value'],
          callback: fields[name]['callback'] ? fields[name]['callback'] : function(evt){
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
          disabled:fields[name]['disabled'],
          formname:uniqId
        }));
      }
      if(fields[name]['type'] == 'search') form.appendChild(this.createSearch({name:name, label:fields[name]['label'], value:fields[name]['value'], findCallback:fields[name]['findCallback'], typeCallback:fields[name]['typeCallback'], selectCallback:fields[name]['selectCallback'], disabled:fields[name]['disabled'], formname:uniqId}));
      if(fields[name]['type'] == 'file') form.appendChild(this.createFileBox({name:name, items:fields[name]['items'], addCallback:fields[name]['addCallback'], removeCallback:fields[name]['removeCallback'], disabled:fields[name]['disabled'], formname:uniqId}));
      if(fields[name]['type'] == 'range') form.appendChild(this.createRange({name:name, value:fields[name]['value'], min:fields[name]['min'], max:fields[name]['max'], step:fields[name]['step'], callback:fields[name]['callback'], disabled:fields[name]['disabled'], formname:uniqId}));
      if(fields[name]['type'] == 'hidden') form.appendChild(this.createHidden({name:name,value:fields[name]['value'], formname:uniqId}));
      if(fields[name]['type'] == 'title') form.appendChild(this.createTitle({text:fields[name]['value'], formname:uniqId}));
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
    var els = this.elements.getRows({formname:form.id, name:name});
    if(els.length){
      var el = els[0];

      // fill in absent attrs from old version
      for(var i in el.definition) if(typeof(attrs[i]) == 'undefined') attrs[i] = el.definition[i];
console.log(attrs);
      // create new version
      var newDom = null;
      if(el.type == 'search') newDom = this.createSearch(attrs);
      if(el.type == 'selectBox') newDom = this.createSelectBox(attrs);
      if(el.type == 'fileBox') newDom = this.createFileBox(attrs);
      if(el.type == 'range') newDom = this.createRange(attrs);
      if(el.type == 'button') newDom = this.createButton(attrs);
      if(el.type == 'textBox') newDom = this.createTextBox(attrs);
      if(el.type == 'textareaBox') newDom = this.createTextareaBox(attrs);
      if(el.type == 'hidden') newDom = this.createHidden(attrs);
      if(el.type == 'title') newDom = this.createTitle(attrs);

      //var oldDom = document.getElementById(el.id);
      var oldDom = el.dom;
      console.log(oldDom, newDom);
      oldDom.parentNode.insertBefore(newDom, oldDom);
      oldDom.parentNode.removeChild(oldDom);

      // remove old version
      this.elements.removeRowByIds(this.elements.getRowIds({id:el.id}));

      newDom.dispatchEvent(new Event('input'));
/*
      // if attrs has 'options' field then remove old list and create new one
      if(el.type == 'selectBox' && YOVALUE.getObjectKeys(attrs).indexOf('options') != -1){
        var options = attrs['options'];
        var selectedItemDom = el.dom.querySelector('[name="'+name+'"]');

        var value = typeof(attrs['value']) == 'undefined' ? selectedItemDom.value : attrs['value'];
        var callback = typeof(attrs['callback']) == 'undefined' ? el.callback : attrs['callback'];
        var disabled = typeof(attrs['disabled']) == 'undefined' ? el.definition['disabled'] : attrs['disabled'];
        var newDom = this.createSelectBox({name:name, items:attrs['options'], defaultValue:value, callback:callback, disabled:disabled, formname:form.id});

        // remove from selectBox div children
        while (el.dom.firstChild) el.dom.removeChild(el.dom.firstChild);
        while (newDom.firstChild) el.dom.appendChild(newDom.firstChild);

        // update this.elements
        el.definition = this.elements.getRows({id:newDom.id})[0].definition;

        // remove new selectBox from this.elements
        this.elements.removeRowByIds(this.elements.getRowIds({id:newDom.id}));

      }else{
        YOVALUE.updateElement(el.dom,attrs);

        // TODO: update this.elements definition

        el.dom.dispatchEvent(new Event('input'));
      }
      */
    }
  },

  /**
   * Create modal window
   * @return HTMLElement - can be removed with function closeModal(el)
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

    modalWindow.appendChild(YOVALUE.createElement('div',{class:'ui_modal_wrapper'}));

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

    var wrapper = modalWindow.childNodes[1];
    // remove all from wrapper
    [].forEach.call(wrapper, function(child) {
      modalWindow.removeChild(child);
    });

    wrapper.appendChild(content);
  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    var that = this, m = this.createModal(), modalContent = YOVALUE.createElement('div', {class:'ui_confirm'});
    modalContent.appendChild(this.createForm(
        {title:{type:'title', value:text}, yes:{type:'button',value:'Yes'}, no:{type:'button', value:'No'}},
        function(v){
          if(v['yes']) v = 'yes';
          else v = 'no';
          that.closeModal(m);
          callback(v);
        }
    ));
    this.setModalContent(m, modalContent);
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

    var buttons = YOVALUE.createElement('div',{class:'buttons'});
    li.appendChild(buttons);

    for(var name in actions){
      var button = this.createButton({name:name, label:name});
      (function(button, callback, id,li){
        button.addEventListener('click', function(evt){
          callback(id, li);
        });
      })(button, actions[name], id, li);
      buttons.appendChild(button);
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
  },

  getElements: function(){
    return this.elements;
  }
};