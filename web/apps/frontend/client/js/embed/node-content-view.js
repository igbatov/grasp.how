var jquery = jquery || $;
var mediator = mediator || new GRASP.Mediator();
var promise = promise || new GRASP.Promise(jquery);
var publisher = publisher || new GRASP.Publisher(mediator, promise);
var uielements = uielements || new GRASP.UIElements();
var i18n = i18n || new GRASP.I18n(GRASP.TRANSLATIONS, GRASP.LANGUAGE);
var globalState = typeof(globalState) == 'undefined' ? {probabilitiesOpened: true} : globalState;

/**
 * Implements window (node text box description) that appears when user mouseover circle
 * @param GRASP
 * @param UI
 * @param globalState - {probabilitiesOpened: boolean}
 * @param publisher - instance of GRASP.Publisher
 */
var nodeContentView = (function(GRASP, UI, globalState, publisher, i18n){
  // component props
  var _state = {active_alternative_id:null};
  // children components
  var altLabelList = [];
  var altContentList = [];
  var altConditionalsList = [];

  return {
    getView: getView
  };

  function setState(newstate){
    _state = newstate;

    var alt_id = _state['active_alternative_id'];

    // highlight appropriate alternative label
    altLabelList.forEach(function(el){ el.classList.remove('active') });
    altLabelList[alt_id].className += " active";

    // show appropriate alternative content
    altContentList.forEach(function(el){ GRASP.setDisplay(el, 'none'); });
    GRASP.setDisplay(altContentList[alt_id],'block');

    // show appropriate alternative conditional probabilities
    altConditionalsList.forEach(function(el){ GRASP.setDisplay(el, 'none'); });
    GRASP.setDisplay(altConditionalsList[alt_id],'block');
  }

  function getState(varname){
    return _state[varname];
  }

  /**
   * Create Node content view block
   * @param content
   * @returns {HTMLElement}
   * @constructor
   */
  function getView(content, condPInfo){
    var view = GRASP.createElement('div',{class:'textBoxContent'});

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
      altConditionalsList = createCondPInfoDOMList(condPInfo, GRASP.getObjectKeys(content['alternatives']));
      for(var j in altConditionalsList){
        var condPInfoDOM = altConditionalsList[j];
        for(var i=0; i<condPInfoDOM.childNodes.length; i++){
          var el = condPInfoDOM.childNodes[i];
          el.addEventListener('mouseover', function(evt){
            this.style.backgroundColor = '#b363d2';

            // send event to graph drawer to hide all labels
            publisher.publish(['hide_all_labels',{}]);

            // show custom labels
            var condBlock = condPInfo.fieldsObj[this.dataset.condPInfoBlockId];
            var eventData = createConditionalPInfoNodeLabels(condBlock);
            publisher.publish(['add_labels', eventData]);

            // highlight edges on graph between nodes with labels
            var edges = [];
            for(var k in eventData) {
              edges.push({source:eventData[k].nodeId, target:content.nodeId});
            }
            publisher.publish(['highlight_edges',{edges:edges}]);
          });
          el.addEventListener('mouseleave', function(evt){
            var condBlock = condPInfo.fieldsObj[this.dataset.condPInfoBlockId];
            var eventData = createConditionalPInfoNodeLabels(condBlock);
            publisher.publish(['show_all_labels',{}]);
            publisher.publish(['remove_labels',eventData.map(function(item){
              return item.key;
            })]);
            publisher.publish(['highlight_nodes',{nodeIds:[content.nodeId]}]);
            this.style.backgroundColor = '#FFFFFF';
          });
        }
        view.appendChild(condPInfoDOM);
      }
    }

    // add content
    for(var alt_id in content['alternatives']){
      view.appendChild(altContentList[alt_id]);
    }

    // set initial state
    setState({active_alternative_id:content['active_alternative_id']});

    return view;
  }

  // create labels for conditional info in a form [{key:, nodeId:, label:,}, ...]
  function createConditionalPInfoNodeLabels(condBlock){
    var eventData = [];
    for(var j in condBlock['IF']){
      eventData.push({
        key: 'condLabel',
        nodeId: j,
        label: i18n.__('IF')+':\n"'+condBlock['IF'][j].alternativeLabel+'"'
      });
    }

    // extract nodeId from THEN block
    var thenNodeId = condBlock['THEN'][0]['nodeId'];
    // concat 'then' alternative labels
    var thenLabel = '';
    thenLabel += i18n.__('THEN PROBABILITY OF')+'\n"'+condBlock['THEN'][getState('active_alternative_id')].alternativeLabel+'"\n';
    thenLabel += i18n.__('IS')+' '+condBlock['THEN'][getState('active_alternative_id')].probability+'\n\n';

    eventData.push({
      key: 'condLabel',
      nodeId: thenNodeId,
      label: thenLabel
    });

    return eventData;
  }

  function createCondPInfoDOMList(condPInfo, alternativeIds){
    var conditionalsDOMList = [];
    for(var i in alternativeIds) {
      var alternativeId = alternativeIds[i];
      var cont = GRASP.createElement('div',{},'');
      // create decorated text string for each f.fields[i]
      for(var j in condPInfo.fieldsObj){
        var text = '';
        var b = condPInfo.fieldsObj[j];
        text += ' '+b['THEN'][alternativeId].probability;
        for(var parentId in b['IF']){
          text += '->' + b['IF'][parentId].alternativeLabel + '<br>';
        }
        var el = GRASP.createElement('div',{},text);
        el.dataset.condPInfoBlockId = j;
        cont.appendChild(el);
      }
      conditionalsDOMList[alternativeId] = cont;
    }
    return conditionalsDOMList;
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
})(GRASP, uielements, globalState, publisher, i18n);
