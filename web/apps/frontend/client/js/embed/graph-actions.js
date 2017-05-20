var publisher = publisher || new GRASP.Publisher(mediator, promise);

var graphActions = (function($,d3,publisher){
  // global variable for current selected (clicked) node
  var selectedNodeId = null;

  return {
    addActions: addActions // hang actions on given nodes
  };

  function addActions(nodes, nodeContents, condPInfo, nodeContentView){
    createTextBoxes(nodes);

    // graph node actions
    d3.selectAll('circle').filter(function (x) { return d3.select(this).attr('nodeType') != 'nodeType'; })
        .on("mouseover", function(){
          if(selectedNodeId !== null) return;

          var circle = d3.select(this);
          // hide all other nodes
          var selfNodeId = circle.attr('nodeId');
          publisher.publish(['pick_out_nodes',{nodeIds:[selfNodeId]}]);

          // show text box with node content
          showNodeContent(circle, nodeContents[selfNodeId], condPInfo[selfNodeId], nodeContentView);
        })
        .on("mouseout", function(){
          if(selectedNodeId !== null) return;
          publisher.publish(['remove_pick_outs',{}]);

          // hide all textBoxes
          $('.textBox').hide();
        })
        .on("click", function() {
          if(selectedNodeId != null) return;
          selectedNodeId = d3.select(this).attr('nodeId');
          var circle = d3.select(this);

          // change graph offset
          publisher.publish(['change_options',{'graphAreaSidePadding':isLeftNode(circle) ? -50 : 50}]);

          // show text box with node content
          showNodeContent(circle, nodeContents[selectedNodeId], condPInfo[selectedNodeId], nodeContentView);

          // stop propagation
          d3.event.stopPropagation();
        });
  }

  function createTextBoxes(nodes){
    var TEXT_BOX_WIDTH_CENTER_MARGIN = 17; // in %
    var TEXT_BOX_WIDTH_BORDER_MARGIN = 13; // in %
    var TEXT_BOX_WIDTH_BOTTOM_MARGIN = 5; // in %

    // create div (textBox) where node content will be shown
    var offset = $("#graphContainer").offset();
    var graphContainerWidth = $("#graphContainer").width();
    var graphContainerHeight = $("#graphContainer").height();
    var pos = {
      top:offset.top,
      left:offset.left + TEXT_BOX_WIDTH_BORDER_MARGIN*(graphContainerWidth/2)/100,
      width:graphContainerWidth/2 - TEXT_BOX_WIDTH_CENTER_MARGIN*(graphContainerWidth/2)/100,
      height:graphContainerHeight - TEXT_BOX_WIDTH_BOTTOM_MARGIN*graphContainerHeight/100
    };

    var leftTextBox = GRASP.createElement('div',{
      id: 'leftTextBox',
      class: 'textBox', // TODO: this class is used somewhere to hide all textBoxes, better do it with events
      style: 'display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px'
    });
    document.body.appendChild(leftTextBox);

    var pos = {
      top:offset.top,
      left:offset.left + graphContainerWidth/2 + (TEXT_BOX_WIDTH_CENTER_MARGIN - TEXT_BOX_WIDTH_BORDER_MARGIN)*(graphContainerWidth/2)/100,
      width:graphContainerWidth/2 - TEXT_BOX_WIDTH_CENTER_MARGIN*(graphContainerWidth/2)/100,
      height:graphContainerHeight - TEXT_BOX_WIDTH_BOTTOM_MARGIN*graphContainerHeight/100
    };
    var rightTextBox = GRASP.createElement('div',{
      id: 'rightTextBox',
      class: 'textBox', // TODO: this class is used somewhere to hide all textBoxes, better do it with events
      style: 'display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px'
    });
    document.body.appendChild(rightTextBox);

    // unset selectedNodeId when clicked somewhere on the background
    $(document).click(function(e){
      if(e.target != rightTextBox && e.target != leftTextBox
          && (rightTextBox.contains(e.target) || leftTextBox.contains(e.target))) return;

      selectedNodeId = null;
      publisher.publish(['remove_pick_outs',{}]);
      // change graph offset
      publisher.publish(['change_options',{'graphAreaSidePadding':0}]);

      // hide all textBoxes
      $(rightTextBox).hide();
      $(leftTextBox).hide();
    });
  }

  /**
   * Determine where node is - on the left part or on the right
   * @param circle
   * @returns boolean
   */
  function isLeftNode(circle){
    var w = $("#graphContainer").width();

    return circle.attr('cx') < w/2;
  }

  function showNodeContent(circle, content, condPInfo, nodeContentView){
    var textBoxId = isLeftNode(circle) ? 'rightTextBox' : 'leftTextBox';

    // set node content to textBox and show it
    $('#'+textBoxId).html(nodeContentView.getView(content, condPInfo));
    $('#'+textBoxId).show();
  }

})($,d3,publisher);
