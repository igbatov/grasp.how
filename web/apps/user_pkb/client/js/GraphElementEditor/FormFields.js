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
      'personal experience':['source_type', 'name', 'comment', 'publisher_reliability', 'button']
    };

    var selectSourceType = function(name, value){
      var fieldname;

      // show only fields that is valid for 'personal experience'
      if(value == 'personal experience'){
        for(fieldname in formFields){
          if(typeFields['personal experience'].indexOf(fieldname) == -1){
            that.UI.updateForm(form, fieldname, {type:'hidden'});
          }
        }
      }
      // show all fields
      else{
        for(fieldname in formFields){
          if(fieldname == 'source_type') continue;
          that.UI.updateForm(form, fieldname, {type:formFields[fieldname]['type']});
        }
      }
    };

    var formFields = {
      'source_type':{'type':'select', 'label':'Тип',
        callback:selectSourceType,
        'items':SOURCE_TYPES,
        'value':'article'
      },
      'name':{'type':'search', label:'Title',
        findCallback:function(str){
          var source_type = that.UI.getFormValue(form, 'source_type');
          return that.publisher.publish(['find_sources',{source_type:source_type, substring:str}]);
        },
        selectCallback:function(name, value){
          // if value didn't come just return
          if(typeof(value.source_id) == 'undefined') return;

          GRASP.getObjectKeys(formFields).forEach(function(v){
            if(typeof(value[v]) != 'undefined'){
              that.UI.updateForm(form,v,{value:value[v]});
            }
          });
        },
        typeCallback:function(name, value){
          // reset default values
          that.UI.updateForm(form,'source_id',{value:''});
        }
      },
      'url':{'type':'text', label:'URL'},
      'author':{'type':'text', label:'Authors'},
      'editor':{'type':'text', label:'Reviewer'},
      'publisher':{
        type:'search',
        label:'Publisher',
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
        type:'text',
        disabled:false,
        label:'reliability'
      },
      'scopus_title_list_id':{type:'hidden'},
      'publish_date':{type:'date', label:'Publish date'},
      'pages':{type:'text', label:'volume, pages'},
      'comment':{type:'textarea', label:'Comment'},
      'source_id':{type:'hidden'},
      'id':{type:'hidden'},
      'button':{type:'button', label:'Save'}
    };

    return formFields;
  },

  getFalsificationFields: function(){
    var formFields = {
      'name':{type:'text', label:'Name'},
      'comment':{type:'textarea', label:'Description'},
      'button':{type:'button', label:'Save'}
    };
    return formFields;
  }
}