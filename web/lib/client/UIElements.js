/**
 * This module render common UI elements - select box, modal window, text box, etc
 * @constructor
 */
GRASP.UIElements = function(i18n){
  this.i18n = i18n;
  this.uniqueId = 0;
  this.SELECT_ITEM_MAX_LENGTH = 255;
  this.MODAL_WINDOW_ZINDEX = 999;
  // list of all elements created
  this.formRows = new GRASP.Table(['id', 'type', 'formname', 'name', 'definition', 'dom', 'state']);
};

GRASP.UIElements.prototype = {
  /**
   * Creating input that drops list of options based on input value
   * {function} findCallback - must return promise that will produce array of items in a form [{id:<string>,title:<string>}, ...}
   * {function} typeCallback - will bw called as user type smth in a search tree. Arguments are name and value (= selected object from items)
   * {function} selectCallback - function that will be called as user select item. Arguments are name and value (= selected object from items)
   * {boolean=} disabled
   * @param attrs - {name, placeholder, value, findCallback, typeCallback, selectCallback, disabled, formname}
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

    return selectBox;
  },

  /**
   * attrs - {
   *    name:{String},
   *    items:{[key: string]: HTMLElement|string|Object},
   *    defaultValue:{String},
   *    callback:{function(name: string, value: string)}, // name = attrs.name, value = item.key
   *    disabled:{boolean=},
   *    formname:{String},
   *    dropType: 'multiple'|'single'|'icon'
   *    icon?: HTMLElement - icon that will be used for dropType = 'icon'
   *    withDownArrow: boolean,
   *    map?: function(HTMLElement|string|Object) - optional callback function that modifies item before render
   *    selectedItemMap?: function(HTMLElement|string|Object) - optional callback function that modifies selected item before render
   * }
   * Returns DOM element that can be used to select items
   * name - Name of select box
   * items - In a form {'value1':'label1', 'value2':{'label2','items':['value3'=>'label3'], ...}
   * defaultValue - Selected item key
   * callback - Callback will receive select name and item name on selection. If callback returns false, selectBox do not change selected element
   * dropTypes:
   *    'single' - use drop down list
   *    'multiple' - show all options at once
   *    'icon' - show icon (default three lines) and use menu items as buttons
   * @returns {HTMLElement}
   */
  createSelectBox: function(attrs){
    var that = this,
        uniqId = this.generateId(),
        inputHidden = GRASP.createElement('input',{name:attrs.name,type:'hidden',value:null}),
        selectBox = GRASP.createElement('div',{class:'ui_select',id:uniqId,value:'none'},'');

    attrs.withDownArrow = !!attrs.withDownArrow;
    if(typeof(attrs.dropType) == 'undefined') attrs.dropType = 'single';
    if(typeof(attrs.icon) == 'undefined') attrs.icon = GRASP.createElement('div',{class:'hamburger'});
    if(typeof(attrs.disabled) == 'undefined') attrs.disabled = false;
    if(typeof attrs.map == 'undefined') attrs.map = function(v){return v;}
    var selectedItem = attrs.dropType == 'icon' ?
        attrs.icon : GRASP.createElement('div',{class:'selected' + (attrs.withDownArrow ? ' withDownArrow' : '')},'none');

    /**
     * Create DOM element from selectBox item
     * If item = {'value':DOMElement, 'items':{'value':DOMElement, ...}} then also creates url for next level
     * @param item HTMLElement|string
     * @returns {HTMLElement}
     */
    function createDOMElement(item) {
      if (GRASP.isDOMElement(item)) {
        var a = GRASP.createElement('a',{});
        a.appendChild(item);
        return a;
      } else if(GRASP.typeof(item) == 'string' || GRASP.typeof(item) == 'number') {
        var text = (item.length > that.SELECT_ITEM_MAX_LENGTH ? item.substr(0, that.SELECT_ITEM_MAX_LENGTH)+'...' : item);
        return GRASP.createElement('a',{},text);
      } else if (GRASP.typeof(item) === 'object' && GRASP.typeof(item['items']) === 'object') {
        var c = GRASP.createElement('div',{})
        var subitem = createDOMElement(item['value']);
        subitem.className += 'with_left_arrow';
        subitem.appendChild(GRASP.createElement('div',{class:'left_arrow'}));
        var ul = createUL(item['items']);
        c.appendChild(subitem);
        c.appendChild(ul);
        return c;
      } else {
        throw new Error('please, use map option to define function that will convert item to string or HTMLElement');
      }
    }

    // recursively create multi-level list of items
    function createUL(items){
      var lis = Object.keys(items).map(function(key){
        var li = GRASP.createElement('li',{value:key});
        li.appendChild(createDOMElement(attrs.map(items[key])));

        var submenu = li.getElementsByTagName('ul').length ? li.getElementsByTagName('ul')[0] : null;

        if(submenu){
          li.addEventListener('mouseover', function(){
            submenu.style.display = 'block';
          })
          li.addEventListener('mouseout', function(e){
            // if mouseout event was not on submenu element, hide submenu
            if (!submenu.contains(e.target)){
              submenu.style.display = 'none';  
            }
          })
        }else{
          // behaviour: click on item - select new one
          li.addEventListener('click', function(evt){
            var value = li.getAttribute('value');
            selectBox.selectItem(value);
          });
        }
        
        // for all li in list except this, hide theirs submenu
        li.addEventListener('mouseover', function(){
          var children = [].slice.call(li.parentNode.children);
          children.forEach(function(ch){
            if(li !== ch && ch.getElementsByTagName('ul').length){
              ch.getElementsByTagName('ul')[0].style.display = 'none';
            }
          });
        })

        return li;
      });
      var ul = GRASP.createElement('ul',{'class': attrs.dropType},'');
      lis.forEach(function(li){ ul.appendChild(li); });
      return ul;
    }

    var ul = createUL(attrs.items);
    var lis = ul.getElementsByTagName('li');

    // create selected item
    if(attrs.dropType !== 'multiple') {
      selectBox.appendChild(selectedItem);
    }
    selectBox.appendChild(inputHidden);
    selectBox.appendChild(ul);

    // behaviour: toggle show/hide of menu
    selectedItem.addEventListener('click', function(evt){
      if(attrs.disabled || attrs.dropType === 'multiple') return;
      if(GRASP.getDisplay(ul) == 'none'){
        GRASP.setDisplay(ul,'block');
        // hide element that is already selected
        if(attrs.dropType !== 'icon'){
          for(var i = 0; i < lis.length; i++){
            var li = lis[i];
            if(li.getAttribute('value') == inputHidden.value){
              GRASP.setDisplay(li,'none');
            } else {
              GRASP.setDisplay(li,'block');
            }
          }
        }
      }else{
        GRASP.setDisplay(ul,'none');
      }
    });

    // action: select new item
    selectBox.selectItem = function(value, doNotCallUserCallback) {
      if(!that._findSelectBoxItem(attrs.items, value)) return false;
      var cbResult = true;
      if(typeof(attrs.callback) != 'undefined' && !doNotCallUserCallback) {
        cbResult = attrs.callback(attrs.name, value);
      }

      // if callback returns false, do not change selected element
      if (cbResult === false) return GRASP.setDisplay(ul,'none');

      GRASP.updateElement(inputHidden, {value:value});
      if(attrs.dropType === 'multiple'){
        // select item in no drop select list (aka 'select multiple')
        var selectedLi = null;
        for(var i = 0; i < lis.length; i++){
          var li = lis[i];
          li.classList.remove('multiple_selected')
          if(li.value.toString() === value) selectedLi = li;
        }
        selectedLi.classList.add('multiple_selected');
      } else if (attrs.dropType === 'single') {
        GRASP.removeChilds(selectedItem);
        if (attrs.selectedItemMap) {
          var l = attrs.selectedItemMap(that._findSelectBoxItem(attrs.items, value));
        } else {
          var l = attrs.map(that._findSelectBoxItem(attrs.items, value));
        }
        selectedItem.appendChild(createDOMElement(l));
        GRASP.setDisplay(ul,'none');
      } else {
        // dropType === 'icon' - just hide menu
        GRASP.setDisplay(ul,'none');
      }
    };

    // set initial selection (defaultValue)
    if(
        attrs.dropType !== 'icon'
        && typeof(attrs.defaultValue) != 'undefined'
        && this._findSelectBoxItem(attrs.items, attrs.defaultValue)
    ){
      selectBox.selectItem(attrs.defaultValue, true);
    }

    // behaviour: hide menu when clicked outside menu
    document.body.addEventListener('click', function(evt){
      if(attrs.dropType === 'multiple') return;
      if(!GRASP.isChildOf(evt.target, selectBox)){
        GRASP.setDisplay(ul,'none');
      }
    });

    return selectBox;
  },

  _findSelectBoxItem: function(items, needle){
    needle = needle+""; //convert to string
    for(var key in items){
      var item = items[key];
      if(key === needle) return item;
      if(item.items) {
        var r = this._findSelectBoxItem(item.items, needle);
        if(r) return r;
      } 
    }
    return false;
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
    var label = GRASP.createElement('span',{},attrs.label+': ');
    var output = GRASP.createElement('span',{},attrs.value);
    var input = GRASP.createElement('input',{type:'range', name:attrs.name, value:attrs.value, min:attrs.min, max:attrs.max, step:attrs.step, disabled:attrs.disabled},'');
    if(attrs.disabled == true) GRASP.setDisplay(input,'none');
    range.appendChild(label);
    range.appendChild(output);
    range.appendChild(input);

    // if attrs.callback_delay>0 they want us to call callback
    // only after attrs.callback_delay ms after user finished typing
    var CALLBACK_DELAY = typeof(attrs.callback_delay) != 'undefined' ? attrs.callback_delay : 0;
    // internal state variables of element
    var state = {
      timer: null
    };
    var cb = function(name, value){
      if(typeof(attrs.callback) != 'undefined') {
        if(CALLBACK_DELAY>0){
          if(state.timer) clearTimeout(state.timer);
          state.timer = setTimeout(function(){
            attrs.callback(name, value)
          }, CALLBACK_DELAY)
        }else{
          attrs.callback(name, value)
        }
      }
    };

    input.addEventListener('input',function(evt){
      output.innerText = input.value;
      cb(attrs.name,input.value);
    });

    return range;
  },


  /**
   * Create button
   * @param attrs - {name, label, callback, disabled, formname}
   *  {String} name - i.e. "yes"
   *  {String} label? - i.e "I agree!"
   *  {String} type: 'bigButton'|'icon delete'|'icon plusCircle'|'icon edit'
   *  {function(object)=} callback - callback arg is event
   *  {boolean=} disabled
   */
  createButton: function(attrs){
    var uniqId = this.generateId();
    var el = GRASP.createElement(
        'button',
        {
          id:uniqId,
          name:attrs.name,
          class:'ui_button ' + attrs.type,
          disabled:attrs.disabled
        },
        attrs.label ? attrs.label: ''
    );
    if(typeof(attrs.callback) != 'undefined'){
      el.addEventListener('click', function(evt){
        attrs.callback(evt);
      });
    }

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

    return el;
  },

  /**
   *
   * @param attrs - {name:, value:, label:, disabled:, callback:, classname:}
   * @returns {HTMLElement}
   */
  createPasswordBox: function(attrs){
    var uniqId = this.generateId();
    var el = GRASP.createElement('input',{id:uniqId, type:'password', name:attrs.name, value:attrs.value, disabled:attrs.disabled},'',attrs.callback);

    return el;
  },

  /**
   *
   * @param attrs - {
   *    name: string,
   *    value: string,
   *    class: string,
   *    placeholder: string,
   *    disabled: boolean,
   *    callback: function,
   *    formname: string,
   *    callback_delay: int, // in ms
   *    isContentEditable: boolean // if true the result will be <div contenteditable="true">, else will be <textarea>
   * }
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

    var cb = function(name, value){
      if(typeof(attrs.callback) != 'undefined') {
        if(CALLBACK_DELAY>0){
          if(state.timer) clearTimeout(state.timer);
          state.timer = setTimeout(function(){
            attrs.callback(name, value)
          }, CALLBACK_DELAY)
        }else{
          attrs.callback(name, value)
        }
      }
    };

    if(attrs.isContentEditable){
      var el = GRASP.createElement(
          'div',
          {
            contenteditable: !attrs.disabled,
            id:uniqId,
            name:attrs.name,
            class:'ui_textarea '+attrs.class
          },
          attrs.value,
          cb
      );
    } else {
      var el = GRASP.createElement(
        'textarea',
        {
          name:attrs.name,
          placeholder:attrs.placeholder,
          disabled:attrs.disabled,
          class:'ui_textarea '+attrs.class
        },
        attrs.value,
        cb
      );
    }

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
    if(typeof(attrs.addLabel) != 'undefined' && typeof(attrs.addCallback) != 'undefined') {
      div.appendChild(this.createButton({
        name:'',
        label:attrs.addLabel,
        callback: attrs.addCallback,
        disabled: attrs.disabled
      }));
    }
    if(typeof(attrs.items)!='undefined' && GRASP.getObjectKeys(attrs.items).length > 0){
       var HTMLList = this.createList(attrs.items, attrs.itemActions, attrs.disabled);
       div.appendChild(HTMLList);
    }

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
      form.appendChild(this.createFormRow(form, name, fields[name]));
    }

    return form;
  },

  /**
   *
   * @param form
   * @param name
   * @param rowAttrs - element attrs + {rowType, rowLabel, rowClass}
   * @returns {*}
   */
  createFormRow: function(form, name, rowAttrs){
    var fieldDOM;
    if(rowAttrs['rowType'] == 'text') fieldDOM = this.createTextBox({name:name, value:rowAttrs['value'], placeholder:rowAttrs['placeholder'], disabled:rowAttrs['disabled'], callback:rowAttrs['callback']});
    if(rowAttrs['rowType'] == 'password') fieldDOM = this.createPasswordBox({name:name, value:rowAttrs['value'], disabled:rowAttrs['disabled'], callback:rowAttrs['callback']});
    if(rowAttrs['rowType'] == 'textarea') fieldDOM = this.createTextareaBox({name:name, value:rowAttrs['value'], placeholder:rowAttrs['placeholder'], disabled:rowAttrs['disabled'], callback:rowAttrs['callback'], callback_delay:rowAttrs['callback_delay']});
    if(rowAttrs['rowType'] == 'date') fieldDOM = this.createDate({name:name, value:rowAttrs['value'], disabled:rowAttrs['disabled'], callback:rowAttrs['callback']});
    if(rowAttrs['rowType'] == 'select') fieldDOM = this.createSelectBox({name:name, items:rowAttrs['items'], defaultValue:rowAttrs['value'], callback:rowAttrs['callback'], disabled:rowAttrs['disabled'], dropType:rowAttrs['dropType'], withDownArrow:rowAttrs['withDownArrow']});
    if(rowAttrs['rowType'] == 'button'){
      // if button field has callback - use it, if no - use general form submitCallback and pass form data to it
      fieldDOM = this.createButton({
        name: name,
        label: rowAttrs['label'],
        type: rowAttrs['type'],
        callback: rowAttrs['callback'] ? rowAttrs['callback'] : function(evt){
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
        disabled:rowAttrs['disabled'],
        formname:form.id
      });
    }
    if(rowAttrs['rowType'] == 'search') fieldDOM = this.createSearch({name:name, placeholder:rowAttrs['placeholder'], value:rowAttrs['value'], findCallback:rowAttrs['findCallback'], typeCallback:rowAttrs['typeCallback'], selectCallback:rowAttrs['selectCallback'], disabled:rowAttrs['disabled']});
    if(rowAttrs['rowType'] == 'file') fieldDOM = this.createFileBox({name:name, items:rowAttrs['items'], addCallback:rowAttrs['addCallback'], removeCallback:rowAttrs['removeCallback'], disabled:rowAttrs['disabled']});
    if(rowAttrs['rowType'] == 'range') fieldDOM = this.createRange({name:name, value:rowAttrs['value'], min:rowAttrs['min'], max:rowAttrs['max'], step:rowAttrs['step'], callback:rowAttrs['callback'], disabled:rowAttrs['disabled']});
    if(rowAttrs['rowType'] == 'hidden') fieldDOM = this.createHidden({name:name,value:rowAttrs['value'], disabled:rowAttrs['disabled']});
    if(rowAttrs['rowType'] == 'title') fieldDOM = this.createTitle({value:rowAttrs['value']});
    if(rowAttrs['rowType'] == 'string') fieldDOM = GRASP.createElement('div',{class:'string'},rowAttrs['value']);
    if(rowAttrs['rowType'] == 'list') fieldDOM = this.createListBox({name:name,items:rowAttrs['items'], itemActions:rowAttrs['itemActions'], addLabel: rowAttrs['addLabel'], addCallback:rowAttrs['addCallback']});
    if(rowAttrs['rowType'] == 'tabs') fieldDOM = this.createTabs({name:name, items:rowAttrs['items'], defaultItem:rowAttrs['defaultItem']});
    if(rowAttrs['rowType'] == 'checkbox') fieldDOM = this.createSwitch({name:name, value:rowAttrs['value'], callback:rowAttrs['callback'], disabled:rowAttrs['disabled']});
    if(rowAttrs['rowType'] == 'DOMElement') fieldDOM = rowAttrs['element'];

    var uniqId = this.generateId();
    var formRow = GRASP.createElement('div',{
      id:uniqId,
      class:'formRow' + (rowAttrs['rowClass'] ? ' ' + rowAttrs['rowClass'] : ''),
      style:rowAttrs['rowType'] === 'hidden' ? 'display:none;' : ''
    });
    if (
        ['tabs','list','hidden', 'button'].indexOf(rowAttrs['rowType']) === -1
        && typeof rowAttrs.rowLabel != 'undefined'
    ) {
      var label = GRASP.createElement('div', {class:'label'}, rowAttrs.rowLabel);
      formRow.appendChild(label);
    }
    formRow.appendChild(fieldDOM);

    this.formRows.insertRow({id:uniqId, formname:form.id, name:name, type:rowAttrs['rowType'], definition:rowAttrs, dom:formRow});

    return formRow;
  },

  /**
   * Creates checkbox
   * @param attrs - {name:string, value:string, disabled:boolean, callback}
   */
  createSwitch: function (attrs) {
    var c = GRASP.createElement('label',{class:'ui_switch'});
    var checkboxSettings = {
      type:'checkbox',
      name:attrs.name,
      disabled:attrs.disabled
    };
    if(attrs.value) {
      checkboxSettings['checked'] = attrs.value;
    }
    var checkbox = GRASP.createElement('input', checkboxSettings, '');
    var slider = GRASP.createElement('span',{class:'slider round'},'');
    c.appendChild(checkbox);
    c.appendChild(slider);
    checkbox.addEventListener('change',function(evt){
      attrs.callback(attrs.name,checkbox.checked);
    });

    return c;
  },

  /**
   * Updates form field with given name to given attrs
   * If element with this name is absent, create new one
   * @param form
   * @param name
   * @param attrs
   */
  updateForm: function(form,name,attrs){
    var els = this.formRows.getRows({formname:form.id, name:name});

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
    var newDom = this.createFormRow(form, name, attrs);

    // old element was found? remove it and create new one
    if(els.length) {
      var oldDom = el.dom;
      oldDom.parentNode.insertBefore(newDom, oldDom);
      oldDom.parentNode.removeChild(oldDom);

      // remove old version (new one was already inserted in create<ElementName>() above)
      this.formRows.removeRowByIds(this.formRows.getRowIds({id: el.id}));
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
    var els = this.formRows.getRows({formname:form.id, name:fieldname});

    if(els.length){
      var el = els[0];
      var domfield = el.dom.querySelectorAll("[name="+fieldname)[0];
      return domfield.value;
    }
    return false;
  },

  /**
   * Create modal window
   * @param options? - {withCloseButton: boolean, withOverlay: boolean, class: string}
   * @return HTMLElement - can be removed with function closeModal(el)
   */
  createModal: function(options){
    if(typeof options === 'undefined') options = {withCloseButton:true, withOverlay:true};
    if(typeof options['withCloseButton'] === 'undefined') options['withCloseButton'] = true;
    if(typeof options['withOverlay'] === 'undefined') options['withOverlay'] = true;
    var that = this,
      uniqId = this.generateId(),
      modalWindow = GRASP.createElement('div',{
        id:uniqId,
        class:'ui_modal ' + (options.class ? options.class : '')
      },'');

    // we want modal windows that are called from other modal windows to overlay them
    // so track number of all opened modal windows here
    var openedModalCount = document.getElementsByClassName('ui_modal').length;
    modalWindow.style.zIndex = this.MODAL_WINDOW_ZINDEX + 1 + openedModalCount;

    if(options['withOverlay']){
      var overlay = GRASP.createElement('div',{id:'overlay'+uniqId, class:'ui_modal_overlay'},'');
      overlay.style.zIndex = this.MODAL_WINDOW_ZINDEX + openedModalCount;
      document.body.appendChild(overlay);
    }

    document.body.appendChild(modalWindow);

    if(options['withCloseButton']){
      var closeButton = this.createButton({
        name: 'editConditionals',
        type: 'close_button icon close grey',
        callback: function () { that.closeModal(modalWindow); }
      });
      modalWindow.appendChild(closeButton);
    }

    var wrapper = GRASP.createElement('div',{class:'ui_modal_wrapper'});
    modalWindow.appendChild(wrapper);

    GRASP.setDisplay(modalWindow, 'none');

    this._updateModalDimsOnContentChange(modalWindow);

    return modalWindow;
  },

  /**
   * updates modal height on any modal content child add or remove
   * @private
   */
  _updateModalDimsOnContentChange: function(modalWindow){
    var that = this;
    // create an observer instance
    var observer = new MutationObserver(function(mutations) {
      that._updateModalHeight(modalWindow);
    });

    // configuration of the observer:
    var config = {childList: true, subtree: true };

    // pass in the target node, as well as the observer options
    observer.observe(modalWindow, config);
  },

  _updateModalHeight: function(modalWindow){
    /**
     * When modal is mounted adjust its height to content
     */
    var wrapper = modalWindow.getElementsByClassName('ui_modal_wrapper')[0];
    var f = function(timeout) {
      setTimeout(function () {
        // if modal was not mounted yet, then wait and repeat
        if (document.getElementById(modalWindow.id) === null) return f(100);
        // 3 is because of float to int round errors
        modalWindow.style.height = 3
            + wrapper.children[0].clientHeight
            + parseInt(getComputedStyle(modalWindow).paddingTop)
            + parseInt(getComputedStyle(modalWindow).paddingBottom)
            +'px';
      }, timeout);
    };
    f(0);
  },

  closeModal: function(modalWindow){
    if(modalWindow.getAttribute('class').indexOf('ui_modal') === -1) {
      GRASP.errorHandler.throwError('This is not a modal window HTMLElement');
    }

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

  createLoadingIndicator: function(className){
    var el = GRASP.createElement('div',{class:'ui_spinner'},'');
    if(className){
      el.className += ' '+className;
    }
    return el;
  },

  /**
   * Alert user
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showAlert: function(text){
    var that = this, m = this.createModal(), modalContent = GRASP.createElement('div', {class:'ui_confirm'});
    modalContent.appendChild(this.createForm(
        {title:{rowType:'title', value:text}, ok:{rowType:'button',label:'OK'}},
        function(v){
          that.closeModal(m);
        }
    ));
    this.setModalContent(m, modalContent);
  },

  /**
   * Ask user to confirm his action
   * @param text - "Are you sure ...?"
   * @param callback - callback will get 'yes' or 'no'
   */
  showConfirm: function(text, callback){
    var that = this, m = this.createModal(), modalContent = GRASP.createElement('div', {class:'ui_confirm'});
    modalContent.appendChild(this.createForm(
        {
          title:{rowType:'title', value:text},
          yes:{
            rowClass:'twoColumn upMarginMiddle',
            rowType:'button',
            type:'bigButton uppercase',
            label:that.i18n.__('yes')
          },
          no:{
            rowClass:'twoColumn upMarginMiddle',
            rowType:'button',
            type:'bigButton uppercase',
            label:that.i18n.__('no')
          }
        },
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
   * @param disabled: boolean
   */
  createList: function(items, actions, disabled){
    disabled = !!disabled;
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
   * @param actions - {
   *  //  this is this.createButton definition +
   *  // 'show' - callback that determines when button must be showed
   *  buttonParams1,
   *  ..
   * }
   *
   * @returns {HTMLElement}
   */
  createListItem: function(id, label, actions, disabled){
    var disabled = disabled || false;
    var li = GRASP.createElement('li',{});
    if(typeof(label) == 'string'){
      li.appendChild(GRASP.createElement('div', {class:'item'}, label));
    }else{
      li.appendChild(label);
    }

    var buttons = GRASP.createElement('div',{class:'buttons'});
    li.appendChild(buttons);

    for(var i in actions){
      var action = actions[i];
      if (action.show && !action.show(id)) {
        continue;
      }
      var buttonOptions = {
        name: action.name,
        label: action.label,
        type: action.type,
        disabled: disabled
      };
      var button = this.createButton(buttonOptions);
      (function(button, callback, id, li){
        button.addEventListener('click', function(evt){
          callback(id, li);
        });
      })(button, action.callback, id, li);
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
   *    labelButtons?: HTMLElement[],
   *    content: HTMLElement|string
   * }]
   * @param options? - {
   *    firstOpened: boolean // show first tab opened, default false
   *    multiple: boolean // do not hide previously opened tabs, default false
   *    callback: function,
   *    adjustToHeight?: function, // if set, should return height (int in pixels) that accordion must adjust to
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
        name: uniqId,
        class: 'tab_input'
      });
      if(options['firstOpened'] && k === 0) input.checked = 'checked';
      var label = GRASP.createElement('label',{for:uid});
      if(options.callback) {
        label.addEventListener('click', options.callback);
      }
      if (options.adjustToHeight){
        label.addEventListener('click', function(){
          that._setAccordionTabHeight(c, options.adjustToHeight);
        });
      }
      label.appendChild(that.stringToDom(v.label));
      var content = GRASP.createElement('div',{class:'tab-content'});
      content.appendChild(that.stringToDom(v.content));
      var labelButtons = GRASP.createElement('div',{class:'label-buttons'});
      for (var i in v.labelButtons){
        labelButtons.appendChild(v.labelButtons[i]);
      }
      tab.appendChild(input);
      tab.appendChild(label);
      label.appendChild(labelButtons);
      tab.appendChild(content);
      c.appendChild(tab);
    });

    if (options.adjustToHeight){
      this._setAccordionTabHeight(c, options.adjustToHeight);
    }
    return c;
  },

  /**
   * Dynamically set accordion tab height
   * @param accordion
   * @param getHeight - function that return int
   * @private
   */
  _setAccordionTabHeight: function(accordion, getHeight){
    var that = this;
    //GRASP.setDisplay(accordion,'none');
    var f = function(timeout) {
      setTimeout(function () {
        // if accordion was not mounted yet, then wait and repeat
        var accordionDOM = document.getElementById(accordion.id);
        if(accordionDOM === null) return f(100);
        // ok, it was mounted, so calculate tab content max height
        var tabs = document.querySelectorAll('#'+accordion.parentElement.id+' .tab');
        GRASP.setDisplay(accordion,'block'); // we must show it, because getHeight can use calculation of accordion
        var parent = accordion.parentElement;
        var firstLabel = document.querySelectorAll('#'+parent.id+' .tab>label')[0];
        var allAccordionLabelsHeight = parseInt(window.getComputedStyle(firstLabel, null).getPropertyValue("height").match(/\d+/))*tabs.length;
        var tabContentHeight = getHeight() - allAccordionLabelsHeight;
        for (var i=0; i<tabs.length; i++) {
          var tabContent = tabs[i].querySelectorAll('.tab-content')[0];
          if(tabContent.parentNode.querySelectorAll('input')[0].checked){
            tabContent.style.maxHeight = tabContentHeight+'px';
          } else {
            tabContent.style.maxHeight = 0;
          }
        }
      }, timeout);
    };
    f(0);
  },


  stringToDom: function(s){
    return GRASP.typeof(s)=='string' ? GRASP.createElement('div',{class:'label-text'},s): s;
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
    return this.formRows;
  }
};