/**
 * Module contains field descriptions for different forms
 * @constructor
 */
GRASP.FormFields = function(UI, publisher, i18n){
  this.UI = UI;
  this.publisher = publisher;
  this.i18n = i18n;
};

GRASP.FormFields.prototype = {
  /**
   * Create fields for node source form
   * Usage:
   *   var form = this.UI.createForm({}, function submitCallback(){});
   *   var fields = this.formFields.getSourceFields(form);
   *   for(var name in fields) this.UI.updateForm(form, name, fields[name]);
   *
   * @param form - this is for fields with callbacks that updates form itself
   * @returns {}
   */
  getSourceFields: function(form){
    var that = this;

    var SOURCE_TYPES = {
      'article':this.i18n.__('article (peer-reviewed)'),
      'meta-article':this.i18n.__('meta-article (peer-reviewed)'),
      'textbook':this.i18n.__('textbook'),
      'book':this.i18n.__('book'),
      'news':this.i18n.__('news'),
      'personal experience':this.i18n.__('personal experience')
    };

    // define which source type has which fields visible
    var typeFields = {
      'personal experience':['source_type', 'name', 'comment', 'publisher_reliability', 'save', 'cancel']
    };

    var selectSourceType = function(name, value){
      var fieldname;

      // show only fields that is valid for 'personal experience'
      if(value === 'personal experience'){
        for(fieldname in formFields){
          if(typeFields['personal experience'].indexOf(fieldname) === -1){
            that.UI.updateForm(form, fieldname, {rowType:'hidden'});
          }
        }
      }
      // show all fields
      else{
        for(fieldname in formFields){
          if(fieldname == 'source_type') continue;
          that.UI.updateForm(form, fieldname, {rowType:formFields[fieldname]['rowType']});
        }
      }
    };

    var formFields = {
      'source_type':{
        rowType:'select',
        rowLabel:that.i18n.__('Type'),
        callback:selectSourceType,
        items:SOURCE_TYPES,
        value:'article',
        withDownArrow: true
      },
      'name':{
        rowType:'search',
        rowLabel:that.i18n.__('Title'),
        placeholder:'Title',
        findCallback:function(str){
          var source_type = that.UI.getFormValue(form, 'source_type');
          return that.publisher.publish(['find_sources',{source_type:source_type, substring:str}]);
        },
        selectCallback:function(name, value){
          // if value didn't come just return
          if(typeof(value.source_id) == 'undefined') {
            return;
          }

          // fill in values from source
          GRASP.getObjectKeys(formFields).forEach(function(v){
            if(typeof(value[v]) != 'undefined'){
              that.UI.updateForm(form,v,{value:value[v]});
            }
          });

          // block source fields (they can be edited from 'Fact Sources' only)
          that.getImmutableSourceFields().forEach(function(v){
            if (v === 'name') {
              // do not block name field, so user can enter another source or create his own
              return;
            }
            that.UI.updateForm(form,v,{disabled:true});
          });
        },
        typeCallback:function(name, value){
          // reset default values if we changing name already existing item
          if (that.UI.getFormRowValue(form, 'source_id')) {
            GRASP.getObjectKeys(formFields).forEach(function(fieldName){
              if (['name', 'source_type'].indexOf(fieldName) !== -1) {
                return;
              }
              that.UI.updateForm(form,fieldName,{value:''});
            });

            // unblock source fields
            that.getImmutableSourceFields().forEach(function(v){
              that.UI.updateForm(form,v,{disabled:false});
            });
          }
        }
      },
      'url':{rowType:'text', rowLabel:'URL', placeholder: ""},
      'author':{rowType:'text', rowLabel:that.i18n.__('Authors'), placeholder: ""},
      'editor':{rowType:'text', rowLabel:that.i18n.__('Editor'), placeholder: ""},
      'publisher':{
        rowType:'search',
        rowLabel:that.i18n.__('Publisher'),
        placeholder: "",
        findCallback:function(str){
          return that.publisher.publish(['find_publishers',{substring:str}]);
        },
        selectCallback:function(name, value){
          that.UI.updateForm(form, 'publisher', {value:value.title});
          that.UI.updateForm(form, 'publisher_reliability', {value:value.reliability});
          that.UI.updateForm(form, 'scopus_title_list_id', {value:value.id});
        },
        typeCallback:function(name, value){
          that.UI.updateForm(form, 'publisher_reliability', {value:0});
          that.UI.updateForm(form, 'scopus_title_list_id', {value:null});
        }
      },
      'publisher_reliability':{
        rowType:'select',
        disabled:false,
        rowLabel:that.i18n.__('Reliability'),
        value: '1',
        items: {'1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9', '10':'10'}
      },
      'scopus_title_list_id':{rowType:'hidden'},
      'publish_date':{rowType:'date', rowLabel:that.i18n.__('Publish date')},
      'pages':{rowType:'text', rowLabel:that.i18n.__('Volume, pages'), placeholder: ""},
      'comment':{
        rowType:'textarea',
        rowLabel:that.i18n.__('Comment'),
        placeholder: ""
      },
      'source_id':{rowType:'hidden'},
      'id':{rowType:'hidden'}
    };

    return formFields;
  },

  /**
   * Define immutable source fields.
   * This fields will be disabled for edit when user selects source that is already exists in 'Fact Sources'.
   * If user wants to edit source itself, he/she should edit it in 'Fact Sources'.
   */
  getImmutableSourceFields: function(){
    var immutableSourceFields = [
      'source_type', 'name', 'url', 'author', 'editor', 'publisher', 'publisher_reliability', 'publish_date'
    ];
    return immutableSourceFields;
  },

  getFalsificationFields: function(){
    var formFields = {
      'name':{rowType:'text', rowLabel:'Name'},
      'comment':{rowType:'textarea', rowLabel:'Description'}
    };
    return formFields;
  }
}