/**
 * Module contains field descriptions for different forms
 * @constructor
 */
GRASP.FormFields = function(UI, publisher){
  this.UI = UI;
  this.publisher = publisher;
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
      'article':'article (peer-reviewed)',
      'meta-article':'meta-article (peer-reviewed)',
      'textbook':'textbook',
      'book':'book',
      'news':'news',
      'personal experience':'personal experience'
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
        rowLabel:'Type',
        callback:selectSourceType,
        items:SOURCE_TYPES,
        value:'article',
        withDownArrow: true
      },
      'name':{
        rowType:'search',
        rowLabel:'Title',
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
      'author':{rowType:'text', rowLabel:'Authors', placeholder: ""},
      'editor':{rowType:'text', rowLabel:'Reviewer', placeholder: ""},
      'publisher':{
        rowType:'search',
        rowLabel:'Publisher',
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
        rowLabel:'Reliability',
        items: {'1':'1', '2':'2', '3':'3', '4':'4', '5':'5', '6':'6', '7':'7', '8':'8', '9':'9', '10':'10'}
      },
      'scopus_title_list_id':{rowType:'hidden'},
      'publish_date':{rowType:'date', rowLabel:'Publish date'},
      'pages':{rowType:'text', rowLabel:'volume, pages', placeholder: ""},
      'comment':{
        rowType:'textarea',
        rowLabel:'Comment',
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
      'source_type', 'url', 'author', 'editor', 'publisher', 'publisher_reliability', 'publish_date'
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