/**
 * Implements window that appears when mouseover circle
 */
var NodeContentView = (function(GRASP){
  return NodeContentView;

  /**
   * Create Node content view block
   * @param content
   * @returns {HTMLElement}
   * @constructor
   */
  function NodeContentView(content){
    var view = GRASP.createElement('div',{class:'lalal'});

    // add labels
    var altContentList = [];
    for(var alt_id in content['alternatives']){
      // creates alternative content
      var text = content['alternatives'][alt_id].text.replace(/(?:\r\n|\r|\n)/g, '<br />');
      var list = content['alternatives'][alt_id].list;
      altContentList[alt_id] = new AltContent(alt_id, text, list);

      // creates label that shows corresponding alternative text when clicked
      var alt_label = GRASP.createElement('div',{class:'alt_label', id:alt_id}, content['alternatives'][alt_id].label);
      (function(altContent){
        alt_label.addEventListener('click', function(e){
          e.stopPropagation();
          Array.prototype.forEach.call(document.getElementsByClassName('alt_content'),function(el){
            GRASP.setDisplay(el, 'none');
          });
          GRASP.setDisplay(altContent,'block');
        });
      })(altContentList[alt_id]);

      // add label
      view.appendChild(alt_label);
    }

    var toggle = new Toggle('probabilities','ssssss', true);
    toggle.addEventListener('click', function(e){
      e.stopPropagation();
    });
    view.appendChild(toggle);

    // add content
    for(var alt_id in content['alternatives']){
      view.appendChild(altContentList[alt_id]);
    }

    return view;
  }

  /**
   * Creates text and source list
   * @param id
   * @param text
   * @param list
   */
  function AltContent(id, text, list){
    var c = GRASP.createElement('div',{class:'alt_content', id:'alt_content_'+id});
    c.appendChild(GRASP.createElement('div',{},text));
    for(var i in list){
      c.appendChild(GRASP.createElement('a',{href:list[i].url, target:'_blank'},list[i].name));
    }
    return c;
  }

  /**
   * Create Toggle element - content will be toggle upon label click
   * @param label
   * @param content
   * @param is_default_hide
   * @returns {HTMLElement}
   * @constructor
   */
  function Toggle(label, content, is_default_hide){
    if(GRASP.typeof(label) == 'string') label = GRASP.createElement('div',{}, label);
    if(GRASP.typeof(content) == 'string') content = GRASP.createElement('div',{}, content);

    var c = GRASP.createElement('div',{});
    label.addEventListener('click', function(){
      if(content.style.display == 'block')
        content.style.display = 'none';
      else
        content.style.display = 'block';
    });
    c.appendChild(label);
    GRASP.setDisplay(content, is_default_hide === false ? 'block' : 'none');
    c.appendChild(content);
    return c;
  }
})(GRASP);
