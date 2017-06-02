/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @constructor
 */
GRASP.UIElements = function(){
  this.uniqueId = 0;
  this.SELECT_ITEM_MAX_LENGTH = 255;
  // list of all elements created
  this.elements = new GRASP.Table(['id', 'type', 'formname', 'name', 'definition', 'dom', 'state']);
};

GRASP.UIElements.prototype = {
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
        search = GRASP.createElement('input',{name:attrs.name,type:'text',value:attrs.value, placeholder:attrs.label, disabled:attrs.disabled});

    var selectBox = GRASP.createElement('div',{class:'ui_search',id:uniqId,value:'none'},'');
    var ul = GRASP.createElement('ul',{},'');
    selectBox.appendChild(search);
    selectBox.appendChild(ul);

    var items = {};
    search.addEventListener('keyup', function(){
      if(attrs.typeCallback) attrs.typeCallback(attrs.name,search.value);
      if(attrs.typeCallback) var promise = attrs.findCallback(search.value)
      if(typeof(promise) != 'undefined' && typeof(promise.then) != 'undefined') promise.then(function(v) {
         items = v;

        // remove all children from ul
        while (ul.firstChild) { ul.removeChild(ul.firstChild); }

        // create list of items
        var lis = Object.keys(items).map(function(key){
          var item = items[key];
          if(typeof(item.title) == 'undefined') throw 'UISearch: items given to droplist must have title field!';
          return GRASP.createElement('li',{value:key},(item.title.length > that.SELECT_ITEM_MAX_LENGTH ? item.title.substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : item.title));
        });

        lis.forEach(function(li){ ul.appendChild(li); });
        GRASP.setDisplay(ul,'block');
      });
    });


    document.body.addEventListener('click', function(evt){
      // click on item - select new one
      if(GRASP.objectToArray(ul.children).indexOf(evt.target) != -1 ){
        var value = evt.target.getAttribute('value');
        var label = evt.target.innerText;
        GRASP.updateElement(search, {value:label});
        if(typeof(attrs.selectCallback) != 'undefined') attrs.selectCallback(attrs.name, items[value]);
        GRASP.setDisplay(ul,'none');
      }else{
        GRASP.setDisplay(ul,'none');
      }
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'search', definition:attrs, dom:selectBox});

    return selectBox;
  },

  /**
   * attrs - {
   *    name:{String},
   *    items:{[key: string]: HTMLElement|string|Object},
   *    defaultValue:{String},
   *    callback:{function(string,string)=},
   *    disabled:{boolean=},
   *    formname:{String},
   *    nodrop:true
   *    map?: function(HTMLElement|string|Object) - optional callback function that modifies item before render
   * }
   * Returns DOM element that can be used to select items
   * name - name of select box
   * items - in form {'value'=>'label', ...}
   * defaultValue - selected item key
   * callback - callback will receive select name and item name on selection
   * nodrop - use drop down list or show all options at once
   * @returns {HTMLElement}
   */
  createSelectBox: function(attrs){
    var that = this,
        uniqId = this.generateId(),
        selectedItem = GRASP.createElement('div',{class:'selected'},'none'),
        inputHidden = GRASP.createElement('input',{name:attrs.name,type:'hidden',value:null}),
        selectBox = GRASP.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    if(typeof(attrs.disabled) == 'undefined') attrs.disabled = false;
    if(typeof attrs.map == 'undefined') attrs.map = function(v){return v;}
    /**
     * Create DOM element from selectBox item
     * @param item HTMLElement|string
     * @returns {HTMLElement}
     */
    function createDOMElement(item){
      if(GRASP.isDOMElement(item)){
        return GRASP.clone(item);
      }else if(GRASP.typeof(item) == 'string'){
        var text = (item.length > that.SELECT_ITEM_MAX_LENGTH ? item.substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : item);
        return GRASP.createElement('text',{},text);
      }else{
        throw new Error('please, use map option to define function that will convert item to string or HTMLElement');
      }
    }

    // create list of items
    var lis = Object.keys(attrs.items).map(function(key){
      var li = GRASP.createElement('li',{value:key});
      li.appendChild(createDOMElement(attrs.map(attrs.items[key])));
      return li;
    });
    var ul = GRASP.createElement('ul',{'class': attrs.nodrop ? 'nodrop' : ''},'');
    lis.forEach(function(li){ ul.appendChild(li); });

    if(!attrs.nodrop) selectBox.appendChild(selectedItem);
    selectBox.appendChild(inputHidden);
    selectBox.appendChild(ul);

    // set initial selection (defaultValue)
    if(typeof(attrs.defaultValue) != 'undefined' && GRASP.getObjectKeys(attrs.items).indexOf(attrs.defaultValue) != -1){
      if(attrs.nodrop){
        lis.forEach(function(li){ if(li.getAttribute('value') == attrs.defaultValue) li.classList.add('nodrop_selected'); });
      }else{
        GRASP.removeChilds(selectedItem);
        selectedItem.appendChild(createDOMElement(attrs.map(attrs.items[attrs.defaultValue])));
      }
      GRASP.updateElement(inputHidden, {value:attrs.defaultValue});
    }

    // behaviour: toggle show/hide of menu
    selectedItem.addEventListener('click', function(evt){
      if(attrs.disabled || attrs.nodrop) return;
      if(GRASP.getDisplay(ul) == 'none'){
        GRASP.setDisplay(ul,'block');
        // hide element that is already selected
        lis.forEach(function(li){
          if(li.getAttribute('value') == inputHidden.value){
            GRASP.setDisplay(li,'none');
          } else {
            GRASP.setDisplay(li,'block');
          }
        });
      }else{
        GRASP.setDisplay(ul,'none');
      }
    });

    // action: select new item
    selectBox.selectItem = function(value){
      GRASP.updateElement(inputHidden, {value:value});
      if(typeof(attrs.callback) != 'undefined') attrs.callback(attrs.name, value);
      if(attrs.nodrop){
        // select item in no drop select list (aka 'select multiple')
        var selectedLi = null;
        lis.forEach(function(li){
          li.classList.remove('nodrop_selected')
          if(li.value === value) selectedLi = li;
        });
        selectedLi.classList.add('nodrop_selected');
      } else {
        GRASP.removeChilds(selectedItem);
        selectedItem.appendChild(createDOMElement(attrs.map(attrs.items[value])));
        GRASP.setDisplay(ul,'none');
      }
    };

    // behaviour: click on item - select new one
    lis.forEach(function(li){
      li.addEventListener('click', function(evt){
        var value = li.getAttribute('value');
        selectBox.selectItem(value);
      });
    });

    // behaviour: hide menu when clicked outside menu
    document.body.addEventListener('click', function(evt){
      if(attrs.nodrop) return;
      if(!GRASP.isChildOf(evt.target, selectBox)){
        GRASP.setDisplay(ul,'none');
      }
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'select', definition:attrs, dom:selectBox});

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
    var container = GRASP.createElement('div',{class:'ui_file',id:uniqId});
    var file = GRASP.createElement('input',{type:'file',name:attrs.name,disabled:attrs.disabled});
    var list = this.createList(attrs.items,{remove:attrs.removeCallback});
    container.appendChild(file);
    container.appendChild(list);
    file.addEventListener('change',function(evt){
      attrs.addCallback(this.files,list);
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'file', definition:attrs, dom:container});

    return container;
  },

  /**
   *
   * @param attrs - {name,value,min,max,step,callback,disabled,formname}
   * @returns {HTMLElement}
   */
  createRange: function(attrs){
    var uniqId = this.generateId();

    var range = GRASP.createElement('div',{class:'ui_range'});
    var label = GRASP.createElement('label',{},attrs.name+' ');
    var input = GRASP.createElement('input',{type:'range', name:attrs.name, value:attrs.value, min:attrs.min, max:attrs.max, step:attrs.step, disabled:attrs.disabled},'');
    if(attrs.disabled == true) GRASP.setDisplay(input,'none');
    var output = GRASP.createElement('span',{},attrs.value);
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
    var el = GRASP.createElement('button',{id:uniqId, name:attrs.name, class:'ui_button',disabled:attrs.disabled},attrs.label);
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
    var el = GRASP.createElement('input',{id:uniqId, type:'text', name:attrs.name, value:attrs.value, placeholder:attrs.placeholder ? attrs.placeholder : attrs.label, disabled:attrs.disabled},'',attrs.callback);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'text', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, label:, disabled:, callback:, formname:, callback_delay:}
   * @returns {HTMLElement}
   */
  createTextareaBox: function(attrs){
    var uniqId = this.generateId();
    // if attrs.callback_delay>0 they want us to call callback
    // only after attrs.callback_delay ms after user finished typing
    var CALLBACK_DELAY = typeof(attrs.callback_delay) != 'undefined' ? attrs.callback_delay : 0;
    // internal state variables of element
    var state = {
      timer: null
    };
    var el = GRASP.createElement(
        'textarea',
        {
          id:uniqId,
          name:attrs.name,
          placeholder:attrs.label,
          disabled:attrs.disabled
        },
        attrs.value,
        function(name, value){
          if(CALLBACK_DELAY>0){
            if(state.timer) clearTimeout(state.timer);
            state.timer = setTimeout(function(){
              attrs.callback(name, value)
            }, CALLBACK_DELAY)
          }else{
            if(typeof(attrs.callback) != 'undefined') attrs.callback(name, value)
          }
        }
    );

    this.elements.insertRow({
      id:uniqId,
      formname:attrs.formname,
      name:attrs.name,
      type:'textarea',
      definition:attrs,
      dom:el,
      state:state
    });

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, disabled:, callback:, formname:}
   * @returns {HTMLElement}
   */
  createDate: function(attrs){
    var uniqId = this.generateId();
    var el = GRASP.createElement('input',{type:'date',id:uniqId,name:attrs.name, value:attrs.value, disabled:attrs.disabled},'',attrs.callback);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs['name'], type:'date', definition:attrs, dom:el});

    return el;
  },

  /**
   *
   * @param attrs - {name:,value:, formname:}
   * @returns {HTMLElement}
   */
  createHidden: function(attrs){
    var uniqId = this.generateId();
    var el = GRASP.createElement('input',{type:'hidden',id:uniqId, name:attrs.name, value:attrs.value, disabled:attrs.disabled},'');

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

    // create DOM
    var el = GRASP.createElement('h1',{id:uniqId},attrs.value);

    // update internal list of all UI elements
    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:null, type:'title', definition:attrs, dom:el});

    return el;
  },

  /**
   * Create list of items with Add button on top and itemActions buttons in front of every item
   * @param attrs - {name:, items:, itemActions:, addLabel:, addCallback:, formname:}
   * items - in a form {id:label, ...}, id is string, label is string or HTMLElement
   * actions - actions that can be made on item, in a form {name:callback, ...}, action args are item id and li (HTMLElement that represents item)
   * addLabel - name of add button
   * addCallback - callback on add button click
   */
  createListBox: function(attrs){
    var uniqId = this.generateId();
    var div = GRASP.createElement('div',{id:uniqId},'');
    if(typeof(attrs.addLabel) != 'undefined' && typeof(attrs.addCallback) != 'undefined') div.appendChild(this.createButton({name:'', label:attrs.addLabel, callback: attrs.addCallback, disabled: attrs.disabled}));
    if(typeof(attrs.items)!='undefined' && GRASP.getObjectKeys(attrs.items).length > 0){
       var HTMLList = this.createList(attrs.items, attrs.itemActions, attrs.disabled);
       div.appendChild(HTMLList);
    }
    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'list', definition:attrs, dom:div});

    return div;
  },

  /**
   * Create Toggle element - content will be toggled upon label click
   * @param attrs = {label: {string | HTMLElement}, content {string | HTMLElement}:, is_default_hide:, callback:, labelClassName:, contentClassName:, name:, formname:}
   * @returns {HTMLElement}
   * @constructor
   */
  createToggle: function(attrs){
    var label = attrs.label,
        content = attrs.content,
        is_default_hide = attrs.is_default_hide,
        callback = attrs.callback,
        labelClassName = attrs.labelClassName,
        contentClassName = attrs.contentClassName;

    var uniqId = this.generateId();

    if(GRASP.typeof(label) == 'string') label = GRASP.createElement('div',{class:labelClassName}, label);
    if(GRASP.typeof(content) == 'string') content = GRASP.createElement('div',{class:contentClassName}, content);

    if(!GRASP.typeof(content).includes('html')){
      console.log('Argument content in createToggle must be string or HTMLElement, got'+GRASP.typeof(content));
    }
    if(!GRASP.typeof(label).includes('html')){
      console.log('Argument label in createToggle must be string or HTMLElement, got '+GRASP.typeof(label));
    }

    label.className += ' ' + labelClassName;
    content.className += ' ' + contentClassName;

    var c = GRASP.createElement('div',{});
    label.addEventListener('click', function(){
      if(content.style.display == 'block'){
        if(callback) callback(false);
        content.style.display = 'none';
      }else{
        if(callback) callback(true);
        content.style.display = 'block';
      }
    });
    c.appendChild(label);
    GRASP.setDisplay(content, is_default_hide === false ? 'block' : 'none');
    c.appendChild(content);

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'toggle', definition:attrs, dom:c});

    return c;
  },

  /**
   * Create horizontal tabs
   * @param attrs - {name:, formname:, items:, defaultItem:}
   * items - {'tabLabel':HTMLElement, ...}
   * @returns {HTMLElement}
   */
  createTabs: function(attrs){
    var uniqId = this.generateId();

    var c = GRASP.createElement('div',{class:'ui_tabs'});
    var tabsC = GRASP.createElement('div',{class:'ui_tabs_tabContainer'});
    var tabContentC = GRASP.createElement('div',{class:'ui_tabs_tabContentContainer'});
    c.appendChild(tabsC);
    c.appendChild(tabContentC);

    for(var tabLabel in attrs.items){
      var tabUniqId = this.generateId();
      var tab = GRASP.createElement('span',{id:tabUniqId, class:'ui_tab'}, tabLabel);
      tabsC.appendChild(tab);
      var content = GRASP.createElement('div',{id:'tabContent_'+tabUniqId, class:'ui_tab_content'}, '');
      content.appendChild(attrs.items[tabLabel]);
      tabContentC.appendChild(content);
      if(tabLabel == attrs.defaultItem){
        tab.classList.add("active");
        content.classList.add("active");
      }
    }

    tabsC.addEventListener('click', function(e){
      /* tab */
      Array.prototype.map.call(tabsC.getElementsByClassName('ui_tab'), function(item){
        item.classList.remove("active");
      });
      document.getElementById(e.target.id).classList.add('active');

      /* content */
      Array.prototype.map.call(tabContentC.getElementsByClassName('ui_tab_content'), function(item){
        item.classList.remove("active");
      });
      document.getElementById('tabContent_'+e.target.id).classList.add('active');
    });

    this.elements.insertRow({id:uniqId, formname:attrs.formname, name:attrs.name, type:'toggle', definition:attrs, dom:c});
    return c;
  },


  /**
   * Creates form fields and buttons
   * @param fields
   * @param {Function=} callback - called when any button from fields is pressed
   * @returns {HTMLElement}
   */
  createForm: function(fields, submitCallback){
    var name,
      uniqId = this.generateId(),
      form = GRASP.createElement('div',{id:uniqId, class:'ui_form'},'');
      form.submitCallback = submitCallback;

    for(name in fields){
      form.appendChild(this.createFormField(form, name, fields[name]));
    }

    return form;
  },

  /**
   *
   * @param form
   * @param name
   * @param field
   * @returns {*}
   */
  createFormField: function(form, name, field){
    var fieldDOM;
    if(field['type'] == 'text') fieldDOM = this.createTextBox({name:name, value:field['value'], label:field['label'],placeholder:field['placeholder'], disabled:field['disabled'], callback:field['callback'], formname:form.id});
    if(field['type'] == 'textarea') fieldDOM = this.createTextareaBox({name:name, value:field['value'], label:field['label'], disabled:field['disabled'], callback:field['callback'], callback_delay:field['callback_delay'], formname:form.id});
    if(field['type'] == 'date') fieldDOM = this.createDate({name:name, value:field['value'], disabled:field['disabled'], callback:field['callback'], formname:form.id});
    if(field['type'] == 'select') fieldDOM = this.createSelectBox({name:name, items:field['items'], defaultValue:field['value'], callback:field['callback'], disabled:field['disabled'], formname:form.id, nodrop:field['nodrop']});
    if(field['type'] == 'button'){
      // if button field has callback - use it, if no - use general form submitCallback and pass form data to it
      fieldDOM = this.createButton({
        name: name,
        label: field['label'],
        callback: field['callback'] ? field['callback'] : function(evt){
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
          if(form.submitCallback) form.submitCallback(data);
        },
        disabled:field['disabled'],
        formname:form.id
      });
    }
    if(field['type'] == 'search') fieldDOM = this.createSearch({name:name, label:field['label'], value:field['value'], findCallback:field['findCallback'], typeCallback:field['typeCallback'], selectCallback:field['selectCallback'], disabled:field['disabled'], formname:form.id});
    if(field['type'] == 'file') fieldDOM = this.createFileBox({name:name, items:field['items'], addCallback:field['addCallback'], removeCallback:field['removeCallback'], disabled:field['disabled'], formname:form.id});
    if(field['type'] == 'range') fieldDOM = this.createRange({name:name, value:field['value'], min:field['min'], max:field['max'], step:field['step'], callback:field['callback'], disabled:field['disabled'], formname:form.id});
    if(field['type'] == 'hidden') fieldDOM = this.createHidden({name:name,value:field['value'], formname:form.id, disabled:field['disabled']});
    if(field['type'] == 'title') fieldDOM = this.createTitle({value:field['value'], formname:form.id});
    if(field['type'] == 'list') fieldDOM = this.createListBox({name:name,items:field['items'], itemActions:field['itemActions'], addLabel: field['addLabel'], addCallback:field['addCallback'], formname:form.id});
    if(field['type'] == 'tabs') fieldDOM = this.createTabs({name:name, items:field['items'], defaultItem:field['defaultItem'], formname:form.id});

    return fieldDOM;
  },

  /**
   * Updates form field with given name to given attrs
   * If element with this name is absent, create new one
   * @param form
   * @param name
   * @param attrs
   */
  updateForm: function(form,name,attrs){
    var els = this.elements.getRows({formname:form.id, name:name});

    if(els.length) {
      var el = els[0];

      // fill in absent attrs from old version
      for (var i in el.definition) if (typeof(attrs[i]) == 'undefined') attrs[i] = el.definition[i];
      if (typeof(attrs.type) == 'undefined') attrs.type = el.type;
    }else{
      // this is for brand new element
      attrs.name = name;
      attrs.formname = form.id;
    }

    // create new version
    var newDom = this.createFormField(form, name, attrs);

    // old element was found? remove it and create new one
    if(els.length) {
      var oldDom = el.dom;
      oldDom.parentNode.insertBefore(newDom, oldDom);
      oldDom.parentNode.removeChild(oldDom);

      // remove old version (new one was already inserted in create<ElementName>() above)
      this.elements.removeRowByIds(this.elements.getRowIds({id: el.id}));
    }
    // old element was not found? just insert new one at the end
    else{
      form.appendChild(newDom);
    }

    newDom.dispatchEvent(new Event('input'));
  },

  /**
   *
   * @param form
   * @param fieldname
   * @returns {*}
   */
  getFormValue: function(form, fieldname){
    var els = this.elements.getRows({formname:form.id, name:fieldname});

    if(els.length){
      var el = els[0];
      var domfield = el.dom.querySelectorAll("[name="+fieldname)[0];
      return domfield.value;
    }
    return false;
  },

  /**
   * Create modal window
   * @param options? - {"withCloseButton":boolean, "withOverlay":boolean}
   * @return HTMLElement - can be removed with function closeModal(el)
   */
  createModal: function(options){
    if(typeof options === 'undefined') options = {withCloseButton:true, withOverlay:true};
    if(typeof options['withCloseButton'] === 'undefined') options['withCloseButton'] = true;
    if(typeof options['withOverlay'] === 'undefined') options['withOverlay'] = true;
    var that = this,
      uniqId = this.generateId(),
      modalWindow = GRASP.createElement('div',{id:uniqId, class:'ui_modal'},'');

    if(options['withOverlay']){
      var overlay = GRASP.createElement('div',{id:'overlay'+uniqId, class:'ui_modal_overlay'},'');
      document.body.appendChild(overlay);
    }

    document.body.appendChild(modalWindow);

    if(options['withCloseButton']){
      var closeButton = GRASP.createElement('div',{class:'close_button'},'X');
      modalWindow.appendChild(closeButton);
      closeButton.addEventListener('click', function(evt){
        that.closeModal(modalWindow);
      });
    }

    modalWindow.appendChild(GRASP.createElement('div',{class:'ui_modal_wrapper'}));

    GRASP.setDisplay(modalWindow, 'none');

    return modalWindow;
  },

  closeModal: function(modalWindow){
    if(modalWindow.getAttribute('class') != 'ui_modal') GRASP.throwError('This is not a modal window HTMLElement');

    var overlay = document.getElementById('overlay'+modalWindow.getAttribute('id'));
    overlay.parentNode.removeChild(overlay);
    modalWindow.parentNode.removeChild(modalWindow);
  },

  setModalContent: function(modalWindow, content){
    GRASP.setDisplay(modalWindow, 'block');
    GRASP.setDisplay(modalWindow, 'none');
    GRASP.setDisplay(modalWindow, 'block');

    var wrapper = modalWindow.getElementsByClassName('ui_modal_wrapper')[0];
    // remove all from wrapper
    [].forEach.call(wrapper, function(child) {
      modalWindow.removeChild(child);
    });

    wrapper.appendChild(content);
  },

  createLoadingIndicator: function(){
    return GRASP.createElement('div',{class:'ui_spinner'},'');
  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    var that = this, m = this.createModal(), modalContent = GRASP.createElement('div', {class:'ui_confirm'});
    modalContent.appendChild(this.createForm(
        {title:{type:'title', value:text}, yes:{type:'button',label:'Yes'}, no:{type:'button', label:'No'}},
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
    var modal = this.createModal();
    this.setModalContent(modal,this.createList(items, actions));
    return modal;
  },

  /**
   * Creates list of items with action buttons next to each
   * @param {Object<string, string | HTMLElement>} items - in a form {id:label, ...}, id is string, label is string or HTMLElement
   * @param {Object<string, function>} actions - action that can be made on item, in a form {name:callback, ...}, action args are item id and li (HTMLElement that represents item)
   */
  createList: function(items, actions, disabled){
    var disabled = disabled || false;
    var uniqId = this.generateId();
    var ul = GRASP.createElement('ul', {id:uniqId, class:'ui_list'});
    for(var id in items){
      ul.appendChild(this.createListItem(id,items[id],actions,disabled));
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
  createListItem: function(id,label,actions,disabled){
    var disabled = disabled || false;
    var li = GRASP.createElement('li',{});
    if(typeof(label) == 'string'){
      li.appendChild(document.createTextNode(label));
    }else{
      li.appendChild(label);
    }

    var buttons = GRASP.createElement('div',{class:'buttons'});
    li.appendChild(buttons);

    for(var name in actions){
      var button = this.createButton({name:name, label:name, disabled:disabled});
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
   * Wraps el with tooltip
   * @param el {HTMLElement}
   * @param tooltiptext string
   * @returns {HTMLElement}
   */
  addTooltip: function(el, tooltiptext){
    // add tooltiped class
    el.className += ' tooltiped';
    el.title = tooltiptext;
    return el;
  },

  /**
   * Creates accordion menu
   * @param items - [{
   *    label: HTMLElement|string,
   *    content: HTMLElement|string
   * }]
   * @param options? - {
   *    firstOpened: boolean // show first tab opened, default false
   *    multiple: boolean // do not hide previously opened tabs, default false
   * }
   */
  createAccordion: function(items, options){
    if(GRASP.typeof(items) !== 'array') return false;
    var uniqId = this.generateId(), that=this;
    var c = GRASP.createElement('div',{class:'ui_accordion', id:uniqId});
    items.forEach(function (v, k) {
      var tab = GRASP.createElement('div',{class:'tab'});
      var uid = that.generateId();
      var input = GRASP.createElement('input',{
        id: uid,
        type: (options&&options.multiple?'checkbox':'radio'),
        name: uniqId
      });
      if(options['firstOpened'] && k === 0) input.checked = 'checked';
      var label = GRASP.createElement('label',{for:uid});
      label.appendChild(that.stringToDom(v.label));
      var content = GRASP.createElement('div',{class:'tab-content'});
      content.appendChild(that.stringToDom(v.content));
      tab.appendChild(input);
      tab.appendChild(label);
      tab.appendChild(content);
      c.appendChild(tab);
    });
    return c;
  },

  stringToDom: function(s){
    return GRASP.typeof(s)=='string' ? GRASP.createElement('div',{style:'display:inline;'},s): s;
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