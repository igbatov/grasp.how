var jquery = jquery || $;
var mediator = mediator || new GRASP.Mediator();
var promise = promise || new GRASP.Promise(jquery);
var publisher = publisher || new GRASP.Publisher(mediator, promise);
var uielements = uielements || new GRASP.UIElements();
var globalState = typeof(globalState) == 'undefined' ? {probabilitiesOpened: true} : globalState;

/**
 * Implements window that appears when mouseover circle
 * @param GRASP
 * @param UI
 * @param extState - type of {probabilitiesOpened: true}
 * @param publisher - instance of GRASP.Publisher
 */
var nodeContentView = (function(GRASP, UI, globalState, publisher){
  // component props
  var _state = {active_alternative_id:null};
  // children components
  var altContentList = [];
  var altLabelList = [];

  return {
    getView: getView
  };

  function setState(newstate){
    _state = newstate;

    var alt_id = _state['active_alternative_id'];

    altContentList.forEach(function(el){ GRASP.setDisplay(el, 'none'); });
    GRASP.setDisplay(altContentList[alt_id],'block');

    altLabelList.forEach(function(el){ el.classList.remove('active') });
    altLabelList[alt_id].className += " active";

  }

  /**
   * Create Node content view block
   * @param content
   * @returns {HTMLElement}
   * @constructor
   */
  function getView(content, condPInfo){
    var view = GRASP.createElement('div',{class:'textBox'});

    // add labels
    for(var alt_id in content['alternatives']){
      // creates alternative's content
      var text = content['alternatives'][alt_id].text.replace(/(?:\r\n|\r|\n)/g, '<br />');
      var list = content['alternatives'][alt_id].list;

      altContentList[alt_id] = new AltContent(alt_id, text, list);
      altLabelList[alt_id] = GRASP.createElement('div',{class:'altLabel'}, content['alternatives'][alt_id].label + ' [probability '+(content['alternatives'][alt_id].reliability/100).toFixed(2)+']');

      // add label actions that shows corresponding alternative text when clicked
      (function(alt_id){
        altLabelList[alt_id].addEventListener('click', function(e){
          e.stopPropagation();
          setState({active_alternative_id:alt_id})
        });
      })(alt_id);

      // add label
      view.appendChild(altLabelList[alt_id]);
    }

    if(condPInfo){
      var condPInfoDOM = createCondPInfoDOM(condPInfo);
      for(var i=0; i<condPInfoDOM.childNodes.length; i++){
        var el = condPInfoDOM.childNodes[i];
        el.addEventListener('mouseover', function(evt){
          // hide el parent
          var clone = cloneToAbsolute(this);
          clone.style.backgroundColor = 'blue';
          view.style.opacity = 0;
          clone.addEventListener('mouseleave', function(evt){
            view.style.opacity = 1;
            this.parentNode.removeChild(this);
          });

          // send event to graph drawer
          publisher.publish(['hide_all_labels',{}]);
          publisher.publish(['show_custom_labels', condPInfo.fieldsObj[this.dataset.condPInfoBlockId]]);
        });


      }
      var toggle = UI.createToggle({
        name: 'cond_prob_toggle',
        label: UI.addToopltip(
            GRASP.createElement('span',{class:'underlyingConditionalProbabilitiesAssumptionsLabel'}, 'Underlying conditional probabilities assumptions'),
            'This numbers are the assumptions of map author'
        ),
        content: condPInfoDOM,
        is_default_hide: !globalState.probabilitiesOpened,
        callback: function(opened){
          globalState.probabilitiesOpened = opened;
        },
        contentClassName: 'underlyingConditionalProbabilitiesAssumptionsContent'
      });
      toggle.addEventListener('click', function(e){ e.stopPropagation(); });
      view.appendChild(toggle);
    }

    // add content
    for(var alt_id in content['alternatives']){
      view.appendChild(altContentList[alt_id]);
    }

    // set initial state
    setState({active_alternative_id:content['active_alternative_id']});

    return view;
  }

  /**
   * Clone element and make its position absolute with coordinates of cloned one
   * Similar to https://www.impressivewebs.com/fixing-parent-child-opacity/
   * @param el
   */
  function cloneToAbsolute(el){
    var x, y, w, newParent, clonedChild;

    clonedChild = el.cloneNode(true);
    copyComputedStyle(el, clonedChild);
    newParent = document.documentElement;

    newParent.appendChild(clonedChild);

    function doCoords () {
      x = el.getBoundingClientRect().left;
      y = el.getBoundingClientRect().top;
      if (el.getBoundingClientRect().width) {
        w = el.getBoundingClientRect().width; // for modern browsers
      } else {
        w = el.offsetWidth; // for oldIE
      }

      clonedChild.style.position = 'absolute';
      clonedChild.style.left = x + 'px';
      clonedChild.style.top = y + 'px';
      clonedChild.style.width = w + 'px';
    }

    window.onresize = function () {
      doCoords();
    };

    doCoords();

    function realStyle(_elem, _style) {
      var computedStyle;
      if ( typeof _elem.currentStyle != 'undefined' ) {
        computedStyle = _elem.currentStyle;
      } else {
        computedStyle = document.defaultView.getComputedStyle(_elem, null);
      }

      return _style ? computedStyle[_style] : computedStyle;
    };

    function copyComputedStyle(src, dest) {
      var s = realStyle(src);
      for ( var i in s ) {
        // Do not use `hasOwnProperty`, nothing will get copied
        if ( typeof i == "string" && i != "cssText" && !/\d/.test(i) ) {
          // The try is for setter only properties
          try {
            dest.style[i] = s[i];
            // `fontSize` comes before `font` If `font` is empty, `fontSize` gets
            // overwritten.  So make sure to reset this property. (hackyhackhack)
            // Other properties may need similar treatment
            if ( i == "font" ) {
              dest.style.fontSize = s.fontSize;
            }
          } catch (e) {}
        }
      }
    };

    return clonedChild;
  }

  function createCondPInfoDOM(condPInfo){
    var cont = GRASP.createElement('div',{},'');
    // create decorated text string for each f.fields[i]
    for(var j in condPInfo.fieldsObj){
      var text = '';
      var b = condPInfo.fieldsObj[j];
      text += 'IF: <br>';
      for(var parentId in b['IF']){
        text += b['IF'][parentId].alternativeLabel + '<br>';
      }
      text += 'THEN: <br>';
      for(var alternativeId in b['THEN']){
        text += 'PROBABILITY THAT "'+b['THEN'][alternativeId].alternativeLabel + '" IS '+b['THEN'][alternativeId].probability+'<br>';
      }
      var el = GRASP.createElement('div',{},text);
      el.dataset.condPInfoBlockId = j;
      cont.appendChild(el);
    }
    return cont;
  }

  /**
   * Creates text and source list
   * @param id
   * @param text
   * @param list
   */
  function AltContent(id, text, list){
    var c = GRASP.createElement('div',{class:'alt_content', id:'alt_content_'+id});

    // text
    c.appendChild(GRASP.createElement('div',{},text));

    // source list
    if(GRASP.getObjectLength(list)>0){
      c.appendChild(GRASP.createElement('div',{},'<br>Sources:<br>'));
      for(var i in list){
        c.appendChild(
            UI.addToopltip(
                GRASP.createElement('span',{class:'nodeListItemReliability'},'[Reliability - '+list[i].publisher_reliability+'/10]')
                , 'This numbers are the assumptions of map author'
            )
        );
        c.appendChild(GRASP.createElement('a',{class:'nodeListItem', href:list[i].url, target:'_blank'}, list[i].author+' // '+list[i].name+' // '+list[i].publisher));
      }
    }
    return c;
  }
})(GRASP, uielements, globalState, publisher);
