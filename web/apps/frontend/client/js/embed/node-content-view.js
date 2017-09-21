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
  var _state = {nodeId:null, active_alternative_id:null};
  // children components
  var altContentList = {}; // {[index: nodeId]: DOMElement[]}
  // cache of generated views
  var cache = {};

  return {
    getView: getView
  };

  function setState(nodeId, alt_id){
    _state = {nodeId:nodeId, active_alternative_id:alt_id};
    // show appropriate alternative content
    altContentList[nodeId].forEach(function(el){ GRASP.setDisplay(el, 'none'); });
    GRASP.setDisplay(altContentList[nodeId][alt_id],'block');
  }

  function getState(){
    return _state;
  }

  /**
   *
   * @param item - {
   *    alternative: {label:string, reliability: number}
   *    type: string
   * }
   * @param withoutProbability - show probability or not
   * @returns {HTMLElement}
   */
  function createLabelHTML(item, withoutProbability){
    var alternative = item['alternative'], type = item['type'];
    var label =  GRASP.createElement('div', {class:'altLabel ' + type});
    var title = GRASP.createElement('div', {class:'alternativeLabel'}, alternative.label);
    if (!withoutProbability) {
      var pr = GRASP.createElement('div', {class:'alternativePr'}, (alternative.reliability/100).toFixed(2));
      label.appendChild(pr);
    }
    label.appendChild(title);
    return label;

  }

  function createLabels(content){
    if (content.type === 'proposition') {
      // create menu from labels
      var items = {}
      for(var i in content['alternatives']){
        var alternative = content['alternatives'][i];
        items[i] = {alternative:alternative, type:content.type};
      }
      var selectBox = UI.createSelectBox({
        name:'labels',
        withDownArrow: true,
        items:items,
        defaultValue:"0",
        map:createLabelHTML,
        callback:function(name, alt_id){
          setState(content.nodeId, alt_id);
        }
      });
      var c = GRASP.createElement('div',{});
      c.appendChild(selectBox);
      return c;
    } else {
      // create one label
      return createLabelHTML({
        alternative: content['alternatives'][0],
        type: content.type
      }, content.type !== 'fact');
    }
  }

  /**
   * Create Node content view block
   * @param content
   * @param condPInfo
   * @returns {HTMLElement}
   * @constructor
   */
  function getView(content, condPInfo){
    // check if we have view in cache
    if(cache[content.nodeId]) return cache[content.nodeId];

    var view = GRASP.createElement('div',{class:'textBoxContent', id:UI.generateId()});

    // add header with node type
    var h = GRASP.createElement('div', {class:'header'}, i18n.__(content.type));
    view.appendChild(h);

    // add labels
    var labels = createLabels(content);
    view.appendChild(labels);

    // add container for main content
    var mainC = GRASP.createElement('div', {class:'mainC'});
    view.appendChild(mainC);

    // add alternative text and source list
    for (var alt_id in content['alternatives']) {
      var accordionItems = [];

      // creates alternative's content
      var text = content['alternatives'][alt_id].text.replace(/(?:\r\n|\r|\n)/g, '<br />');
      if(text && text.length){
        var altContentLabel = GRASP.createElement('div',{class:'titleH2'},i18n.__('Description'));
        var altContentContent = GRASP.createElement('div',{},text);
        accordionItems.push({
          label: altContentLabel,
          content: altContentContent
        });
      }

      // source list
      var list = content['alternatives'][alt_id].list;
      if(GRASP.getObjectLength(list)>0) {
        // title
        var altContentLabel = GRASP.createElement('div', {class: 'titleH2'}, i18n.__('Sources'));
        // create source list
        var altContentContent = GRASP.createElement('div', {});
        for (var i in list) {
          altContentContent.appendChild(
            GRASP.createElement(
                'span',
                {class: 'nodeListItemReliability'},
                (list[i].publisher_reliability/10).toFixed(2)+''
            )
          );
          altContentContent.appendChild(GRASP.createElement('a', {
            class: 'nodeListItem',
            href: list[i].url,
            target: '_blank'
          }, list[i].author + ' // ' + list[i].name + ' // ' + list[i].publisher));
        }
        accordionItems.push({
          label: altContentLabel,
          content: altContentContent
        });
      }

      if(condPInfo){
        // title
        var title = (content.type == 'fact' ? 'This fact' : 'This proposition') + ' is truthful with probability P in case:';
        var altContentLabel = GRASP.createElement('div', {class: 'titleH2'}, i18n.__(title));
        var altContentContent = GRASP.createElement('div',{},'');
        // create decorated text string for each f.fields[i]
        for(var j in condPInfo.fieldsObj){
          var b = condPInfo.fieldsObj[j];
          var el = GRASP.createElement('div',{class:'condPInfo'});
          var probabilityDOM = GRASP.createElement('div',{class:'conditionalProbability'},b['THEN'][alt_id].probability);
          el.appendChild(probabilityDOM);
          for(var parentId in b['IF']){
            var conditionalArrow = GRASP.createElement('span',{class:'conditionalArrow'},'&rarr;');
            var ifCondition = GRASP.createElement('div',{class:'ifCondition'},b['IF'][parentId].alternativeLabel);
            var newLine = GRASP.createElement('BR',{});
            el.appendChild(conditionalArrow);
            el.appendChild(ifCondition);
            el.appendChild(newLine);
          }

          el.dataset.condPInfoBlockId = j;
          altContentContent.appendChild(el);

          // hang listeners
          el.addEventListener('mouseover', function (evt) {
            // send event to graph drawer to hide all labels
            publisher.publish(['hide_all_labels', {}]);

            // show custom labels
            var condBlock = condPInfo.fieldsObj[this.dataset.condPInfoBlockId];
            var eventData = createConditionalPInfoNodeLabels(condBlock);
            publisher.publish(['add_labels', eventData]);

            // highlight edges on graph between nodes with labels
            var edges = [];
            for (var k in eventData) {
              edges.push({source: eventData[k].nodeId, target: content.nodeId});
            }
            publisher.publish(['highlight_edges', {edges: edges}]);
          });
          el.addEventListener('mouseleave', function (evt) {
            var condBlock = condPInfo.fieldsObj[this.dataset.condPInfoBlockId];
            var eventData = createConditionalPInfoNodeLabels(condBlock);
            publisher.publish(['show_all_labels', {}]);
            publisher.publish(['remove_labels', eventData.map(function (item) {
              return item.key;
            })]);
            publisher.publish(['highlight_nodes', {nodeIds: [content.nodeId]}]);
          });
        }

        accordionItems.push({
          label: altContentLabel,
          content: altContentContent
        });
      }
      var altAccordion = UI.createAccordion(accordionItems,{firstOpened:true});
      mainC.appendChild(altAccordion);
      if(!altContentList[content.nodeId]) altContentList[content.nodeId] = [];
      altContentList[content.nodeId][alt_id] = altAccordion;
      updateAccordionMaxLength(altAccordion, view, h, labels, altContentLabel, accordionItems.length);
    }

    // set initial state
    setState(content.nodeId, content['active_alternative_id']);
    cache[content.nodeId] = view;
    return view;
  }

  /**
   * Adjust accordion tab contents to fit whole view.parentNode height
   * @param altAccordion
   * @param view
   * @param h
   * @param labels
   * @param altContentLabel
   * @param labelsNum
   */
  function updateAccordionMaxLength(altAccordion, view, h, labels, altContentLabel, labelsNum){
    var f = function(timeout){
      setTimeout(function(){
        var accordion = document.getElementById(altAccordion.id);
        // if accordion was not mounted yet, then wait and repeat
        if(accordion === null) return f(100);
        // ok, it was mounted, so calculate tab content max height
        // based on view, h, labels and number of labels
        var textBoxPadding = parseInt(
            window.getComputedStyle(view,null).getPropertyValue("padding-bottom").match(/\d+/)
        );
        var maxHeight = $(view.parentNode).height()
        - $(h).outerHeight()
        - $(labels).outerHeight()
        - (altContentLabel ? $(altContentLabel.parentNode).outerHeight()*labelsNum : 0)
        - textBoxPadding;
        var applyMaxHeight = function(v){
          if(v.parentNode.querySelectorAll('input')[0].checked){
            v.style.maxHeight = maxHeight+'px';
          } else {
            v.style.maxHeight = 0;
          }
        };
        [].forEach.call(altAccordion.querySelectorAll('label'), function(v){
          v.addEventListener('click', function(){
            this.parentNode.parentNode.querySelectorAll('input').forEach(function(input){
              input.checked = false;
            });
            this.parentNode.querySelectorAll('input').forEach(function(input){
              input.checked = 'checked';
            });
            [].forEach.call(altAccordion.querySelectorAll('.tab-content'), function(v){
              applyMaxHeight(v);
            });
          });
        });
        [].forEach.call(altAccordion.querySelectorAll('.tab-content'), function(v){
          applyMaxHeight(v);
        });
      },timeout);
    }
    f(0);
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
    thenLabel += i18n.__('THEN PROBABILITY OF')+'\n"'+condBlock['THEN'][getState()['active_alternative_id']].alternativeLabel+'"\n';
    thenLabel += i18n.__('IS')+' '+condBlock['THEN'][getState()['active_alternative_id']].probability+'\n\n';

    eventData.push({
      key: 'condLabel',
      nodeId: thenNodeId,
      label: thenLabel
    });

    return eventData;
  }
})(GRASP, uielements, globalState, publisher, i18n);
