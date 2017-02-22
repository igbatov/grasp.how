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
      attrs.typeCallback(attrs.name,search.value);
      attrs.findCallback(search.value).then(function(v) {
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
   * attrs - {name:{String}, items:{Object<string, string>}, defaultValue:{String}, callback:{function(string,string)=}, disabled:{boolean=}, formname:{String}, nodrop:true}
   * Returns DOM element that can be used to select items
   * name - name of select box
   * items - in form {'value'=>'label', ...}
   * defaultValue - selected item name
   * callback - callback will receive select name and item name on selection
   * nodrop - use drop down list or show all options at once
   * @returns {HTMLElement}
   */
  createSelectBox: function(attrs){
    var that = this,
        uniqId = this.generateId(),
        selectedItem = GRASP.createElement('div',{class:'selected',value:'none',style:'display:inline;'},'none'),
        inputHidden = GRASP.createElement('input',{name:attrs.name,type:'hidden',value:null}),
        selectBox = GRASP.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    if(typeof(attrs.disabled) == 'undefined') attrs.disabled = false;

    /**
     * Create DOM element from selectBox item
     * @param item
     * @returns {HTMLElement}
     */
    function createDOMElement(item){
      if(GRASP.isDOMElement(item)){
        return GRASP.clone(item);
      }else if(GRASP.typeof(item) == 'string'){
        var text = (item.length > that.SELECT_ITEM_MAX_LENGTH ? item.substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : item);
        return GRASP.createElement('text',{},text);
      }else{
        return GRASP.createElement('span',{},'');
      }
    }

    // create list of items
    var lis = Object.keys(attrs.items).map(function(key){
      var li = GRASP.createElement('li',{value:key});
      li.appendChild(createDOMElement(attrs.items[key]));
      return li;
    });
    var ul = GRASP.createElement('ul',{'class': attrs.nodrop ? 'nodrop' : ''},'');
    lis.forEach(function(li){ ul.appendChild(li); });

    if(!attrs.nodrop) selectBox.appendChild(selectedItem);
    selectBox.appendChild(inputHidden);
    selectBox.appendChild(ul);

    // set selected item
    if(typeof(attrs.defaultValue) != 'undefined' && GRASP.getObjectKeys(attrs.items).indexOf(attrs.defaultValue) != -1){
      if(attrs.nodrop){
        lis.forEach(function(li){ if(li.getAttribute('value') == attrs.defaultValue) li.classList.add('nodrop_selected'); });
      }else{
        GRASP.removeChilds(selectedItem);
        selectedItem.appendChild(createDOMElement(attrs.items[attrs.defaultValue]));
      }
      GRASP.updateElement(inputHidden, {value:attrs.defaultValue});
    }

    // behaviour: toggle show/hide of menu
    selectedItem.addEventListener('click', function(evt){
      if(attrs.disabled || attrs.nodrop) return;
      if(GRASP.getDisplay(ul) == 'none'){
        GRASP.setDisplay(ul,'block');
      }else{
        GRASP.setDisplay(ul,'none');
      }
    });

    // behaviour: click on item - select new one
    lis.forEach(function(li){
      li.addEventListener('click', function(evt){
        var value = li.getAttribute('value');
        GRASP.updateElement(inputHidden, {value:value});
        if(typeof(attrs.callback) != 'undefined') attrs.callback(attrs.name, value);
        if(attrs.nodrop){
          lis.forEach(function(li){ li.classList.remove('nodrop_selected') });
          li.classList.add('nodrop_selected');
        } else {
          GRASP.removeChilds(selectedItem);
          selectedItem.appendChild(createDOMElement(attrs.items[value]));
          GRASP.setDisplay(ul,'none');
        }
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
            attrs.callback(name, value)
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
  createForm: function(fields, callback){
    var name,
      uniqId = this.generateId(),
      form = GRASP.createElement('div',{id:uniqId, class:'ui_form'},'');


    for(name in fields){
      if(fields[name]['type'] == 'text') form.appendChild(this.createTextBox({name:name, value:fields[name]['value'], label:fields[name]['label'],placeholder:fields[name]['placeholder'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], formname:uniqId}));
      if(fields[name]['type'] == 'textarea') form.appendChild(this.createTextareaBox({name:name, value:fields[name]['value'], label:fields[name]['label'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], callback_delay:fields[name]['callback_delay'], formname:uniqId}));
      if(fields[name]['type'] == 'date') form.appendChild(this.createDate({name:name, value:fields[name]['value'], disabled:fields[name]['disabled'], callback:fields[name]['callback'], formname:uniqId}));
      if(fields[name]['type'] == 'select') form.appendChild(this.createSelectBox({name:name, items:fields[name]['items'], defaultValue:fields[name]['value'], callback:fields[name]['callback'], disabled:fields[name]['disabled'], formname:uniqId, nodrop:fields[name]['nodrop']}));
      if(fields[name]['type'] == 'button'){
        // if button field has callback - use it, if no - use general form callback and pass form data to it
        form.appendChild(this.createButton({
          name: name,
          label: fields[name]['label'],
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
      if(fields[name]['type'] == 'hidden') form.appendChild(this.createHidden({name:name,value:fields[name]['value'], formname:uniqId, disabled:fields[name]['disabled']}));
      if(fields[name]['type'] == 'title') form.appendChild(this.createTitle({value:fields[name]['value'], formname:uniqId}));
      if(fields[name]['type'] == 'list') form.appendChild(this.createListBox({name:name,items:fields[name]['items'], itemActions:fields[name]['itemActions'], addLabel: fields[name]['addLabel'], addCallback:fields[name]['addCallback'], formname:uniqId}));
      if(fields[name]['type'] == 'tabs') form.appendChild(this.createTabs({name:name, items:fields[name]['items'], defaultItem:fields[name]['defaultItem'], formname:uniqId}));
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
      if(typeof(attrs.type) == 'undefined') attrs.type = el.type;

      // create new version
      var newDom = null;
      if(attrs.type == 'search') newDom = this.createSearch(attrs);
      if(attrs.type == 'select') newDom = this.createSelectBox(attrs);
      if(attrs.type == 'file') newDom = this.createFileBox(attrs);
      if(attrs.type == 'range') newDom = this.createRange(attrs);
      if(attrs.type == 'button') newDom = this.createButton(attrs);
      if(attrs.type == 'text') newDom = this.createTextBox(attrs);
      if(attrs.type == 'textarea') newDom = this.createTextareaBox(attrs);
      if(attrs.type == 'hidden') newDom = this.createHidden(attrs);
      if(attrs.type == 'title') newDom = this.createTitle(attrs);
      if(attrs.type == 'list') newDom = this.createListBox(attrs);
      if(attrs.type == 'date') newDom = this.createDate(attrs);

      //var oldDom = document.getElementById(el.id);
      var oldDom = el.dom;
      oldDom.parentNode.insertBefore(newDom, oldDom);
      oldDom.parentNode.removeChild(oldDom);

      // remove old version
      this.elements.removeRowByIds(this.elements.getRowIds({id:el.id}));

      newDom.dispatchEvent(new Event('input'));
    }
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
   * @return HTMLElement - can be removed with function closeModal(el)
   */
  createModal: function(){
    var that = this,
      uniqId = this.generateId(),
      modalWindow = GRASP.createElement('div',{id:uniqId, class:'ui_modal'},''),
      overlay = GRASP.createElement('div',{id:'overlay'+uniqId, class:'ui_modal_overlay'},'');
    document.body.appendChild(overlay);
    document.body.appendChild(modalWindow);

    var closeButton = GRASP.createElement('div',{class:'close_button'},'X');
    modalWindow.appendChild(closeButton);
    closeButton.addEventListener('click', function(evt){
      that.closeModal(modalWindow);
    });

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
    this.setModalContent(this.createModal(),this.createList(items, actions));
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
  addToopltip: function(el, tooltiptext){
    // add tooltiped class
    el.className += ' tooltiped';
    el.title = tooltiptext;
    return el;
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