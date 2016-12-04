<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRASP.HOW</title>
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/reset.css">
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">

    <!-- fork ribbon -->
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.css">
    <!--[if lt IE 9]>
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.ie.css">
    <![endif]-->
    <!-- end fork ribbon -->

    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."d3.v3.min.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."graph.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."googleanalytics.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."ga_track.js" ?>"></script>
  </head>
  <body>

  <?php  include($this->getAppDir('template', false).'/_facebook_sdk.php'); ?>

  <a id="clone-ribbon" class="github-fork-ribbon right-top" target="_blank" href='http://my.grasp.how/cloneGraph/<?php echo $graph_ids[0]; ?>' title="Clone me on grasp.how" data-graph_id="<?php echo $graph_ids[0]; ?>">Edit me on grasp.how</a>
  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>

  <div id="graphContainer"></div>

  <div style="float: right; margin-right: 7%;"  id="fb-share-btn-wrap" data-graph_id="<?php echo $graph_ids[0]; ?>">
    <div id="fb-share-btn" class="fb-share-button" data-href="https://developers.facebook.com/docs/plugins/" data-layout="button_count" data-size="small" data-mobile-iframe="true"><a class="fb-xfbml-parse-ignore" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&amp;src=sdkpreparse">Поделиться</a></div>
  </div>

  <div style="display: none;" id="graphsData"><?php echo $graph ? json_encode($graph) : ""; ?></div>

<script>
window.addEventListener("message", receiveMessage, false);

function receiveMessage(event)
{
   if(typeof(event.data.from) != 'undefined') console.log(event.data.from);
  var origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.
//  console.log(origin);
} 
</script>

  </body>
</html>
