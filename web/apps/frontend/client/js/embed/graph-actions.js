var publisher = publisher || new GRASP.Publisher(mediator, promise);

var graphActions = (function($,d3,publisher){
  // constants
  var RIGHT_HALF = 'rightTextBox';
  var LEFT_HALF = 'leftTextBox';
  // global variable for current selected (clicked) node
  var selectedNodeId = null;
  var selectedNodeHalfName = null;

  return {
    addActions: addActions // hang actions on given nodes
  };

  function getHalfName(circle) {
    return isLeftNode(circle) ? RIGHT_HALF : LEFT_HALF;
  }

  function addActions(nodes, nodeContents, condPInfo, nodeContentView){
    createTextBoxes(nodes);

    // graph node actions
    d3.selectAll('circle')
        .on("mouseover", function(){
          var halfName;
          var circle = d3.select(this);
          if(selectedNodeId === null) halfName = getHalfName(circle);
          else halfName = selectedNodeHalfName;

          // hide all other nodes
          var selfNodeId = circle.attr('nodeId');
          publisher.publish(['highlight_nodes',{nodeIds:[selfNodeId]}]);

          // show text box with node content
          showNodeContent(halfName, nodeContents[selfNodeId], condPInfo[selfNodeId], nodeContentView);
        })
        .on("mouseout", function(){
          //if(selectedNodeId !== null) return;
          publisher.publish(['remove_highlights',['edges','nodes','labels']]);

          // hide all textBoxes
          $('.textBox').hide();
          if(selectedNodeId !== null) {
            publisher.publish(['highlight_nodes',{nodeIds:[selectedNodeId]}]);
            // show text box with node content
            var circles = d3.selectAll('circle')[0];
            for(var i in circles){
              var circle = circles[i];
              var nodeId = d3.select(circle).attr('nodeId');
              if(nodeId === selectedNodeId) break;
            }
            showNodeContent(selectedNodeHalfName, nodeContents[selectedNodeId], condPInfo[selectedNodeId], nodeContentView);
          }
        })
        .on("click", function() {
          //if(selectedNodeId != null) return;
          var circle = d3.select(this);
          if(selectedNodeId === null) {
            selectedNodeHalfName = getHalfName(circle);
            // change graph offset
            publisher.publish(['change_options',{'graphAreaSidePadding':isLeftNode(circle) ? -50 : 50}]);
          }
          selectedNodeId = circle.attr('nodeId');
          var halfName = selectedNodeHalfName;

          // show text box with node content
          showNodeContent(halfName, nodeContents[selectedNodeId], condPInfo[selectedNodeId], nodeContentView);

          // stop propagation
          d3.event.stopPropagation();
        });
  }

  function createTextBoxes(nodes){
    var TEXT_BOX_WIDTH_CENTER_MARGIN = 17; // in %
    var TEXT_BOX_WIDTH_BORDER_MARGIN = 13; // in %
    var TEXT_BOX_WIDTH_BOTTOM_MARGIN = 17; // in %

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
      id: LEFT_HALF,
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
      id: RIGHT_HALF,
      class: 'textBox', // TODO: this class is used somewhere to hide all textBoxes, better do it with events
      style: 'display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px'
    });
    document.body.appendChild(rightTextBox);

    // unset selectedNodeId when clicked somewhere on the background
    $(document).click(function(e){
      if(e.target != rightTextBox && e.target != leftTextBox
          && (rightTextBox.contains(e.target) || leftTextBox.contains(e.target))) return;

      selectedNodeId = null;
      selectedNodeHalfName = null;
      publisher.publish(['remove_highlights',['edges','nodes','labels']]);
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

  function showNodeContent(textBoxId, content, condPInfo, nodeContentView){
    // set node content to textBox and show it
    $('#'+textBoxId).html(nodeContentView.getView(content, condPInfo));
    $('#'+textBoxId).show();
  }

})($,d3,publisher);
