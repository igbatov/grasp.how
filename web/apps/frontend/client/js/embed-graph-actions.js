var addGraphActions = (function($,d3){
  // global variable for current selected (clicked) node
  var selectedNodeId = null;

  return addGraphActions;

  function addGraphActions(nodes, nodeContents, condPInfo){
    createTextBoxes(nodes);

    // typeNodes actions
    d3.selectAll('circle').filter(function (x) { return d3.select(this).attr('nodeType') == 'nodeType'; })
        .on("mouseover", function(){
          if(selectedNodeId !== null) return;
          hideAllTypesExcept(d3.select(this).attr('nodeId'));
        })
        .on("click", function(){
          if(selectedNodeId != null) return;
          selectedNodeId = d3.select(this).attr('nodeId');
          hideAllTypesExcept(d3.select(this).attr('nodeId'));
          // stop propagation
          d3.event.stopPropagation();
        })
        .on("mouseout", function(){
          if(selectedNodeId !== null) return;
          restoreOpacity(nodes);
        });

    // graph node actions
    d3.selectAll('circle').filter(function (x) { return d3.select(this).attr('nodeType') != 'nodeType'; })
        .on("mouseover", function(){
          if(selectedNodeId !== null) return;

          // hide all other nodes
          var selfNodeId = d3.select(this).attr('nodeId');
          d3.selectAll('circle').filter(function (x) { return selfNodeId != d3.select(this).attr('nodeId') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
          d3.selectAll('text').filter(function (x) { return selfNodeId != d3.select(this).attr('nodeId') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
          d3.selectAll('path').attr('fill-opacity', 0.2);

          // show text box with node content
          var circle = d3.select(this);
          showNodeContent(circle, nodeContents[selfNodeId], condPInfo[selfNodeId]);
        })
        .on("mouseout", function(){
          if(selectedNodeId !== null) return;
          restoreOpacity(nodes);

          // hide all textBoxes
          $('.textBox').hide();
        })
        .on("click", function() {
          if(selectedNodeId != null) return;
          selectedNodeId = d3.select(this).attr('nodeId');

          // show text box with node content
          var circle = d3.select(this);
          showNodeContent(circle, nodeContents[selectedNodeId], condPInfo[selectedNodeId]);

          // stop propagation
          d3.event.stopPropagation();
        });


  }

  function createTextBoxes(nodes){
    var TEXT_BOX_WIDTH_CENTER_MARGIN = 20; // in %
    var TEXT_BOX_WIDTH_BORDER_MARGIN = 5; // in %
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
    $('body').append('<div id="leftTextBox" class="textBox" style="display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px"></div>');
    var pos = {
      top:offset.top,
      left:offset.left + graphContainerWidth/2 + (TEXT_BOX_WIDTH_CENTER_MARGIN - TEXT_BOX_WIDTH_BORDER_MARGIN)*(graphContainerWidth/2)/100,
      width:graphContainerWidth/2 - TEXT_BOX_WIDTH_CENTER_MARGIN*(graphContainerWidth/2)/100,
      height:graphContainerHeight - TEXT_BOX_WIDTH_BOTTOM_MARGIN*graphContainerHeight/100
    };
    $('body').append('<div id="rightTextBox" class="textBox" style="display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px"></div>');

    // unset selectedNodeId when clicked somewhere
    $(document).click(function(e){
      if(e.target.id == 'leftTextBox' || e.target.id == 'rightTextBox') return;
      selectedNodeId = null;
      restoreOpacity(nodes);

      // hide all textBoxes
      $('.textBox').hide();
    });
  }

  function hideAllTypesExcept(type){
    d3.selectAll('circle').filter(function (x) { return type != d3.select(this).attr('nodeType') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
    d3.selectAll('text').filter(function (x) { return type != d3.select(this).attr('nodeType') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
    d3.selectAll('path').attr('fill-opacity', 0.2);
  }

  function showNodeContent(circle, content, condPInfo){
    var w = $("#graphContainer").width(),
        textBoxId;

    // determine where node is - on the left part or on the right
    if(circle.attr('cx') > w/2) textBoxId = 'leftTextBox';
    else  textBoxId = 'rightTextBox';

    // set node content to textBox and show it
    $('#'+textBoxId).html(new NodeContentView(content, condPInfo));
    $('#'+textBoxId).show();
  }

  function restoreOpacity(nodes){
    // nodes
    var circles = d3.selectAll('circle')[0];
    for(var i in circles){
      var circle = circles[i];
      var nodeId = d3.select(circle).attr('nodeId');
      var nodeType = d3.select(circle).attr('nodeType');
      if(nodeId && nodes[nodeId] && nodeType != "nodeType") d3.select(circle).attr('fill-opacity', nodes[nodeId].opacity);
    }

    // edges
    //d3.selectAll('path').attr('fill-opacity', 1);

    // labels
    d3.selectAll('text').filter(function (x) { return d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 1);
  }
})($,d3);
