<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!--  Customize snippet with https://developers.facebook.com/tools/debug/sharing  -->
    <meta property="og:url"           content="<?php echo $url ?>" />
    <meta property="og:type"          content="website" />
    <meta property="og:title"         content="<?php echo $graph[$graph_ids[0]]['name']; ?>" />
    <meta property="og:description"   content="Grasp foundations of '<?php echo $graph[$graph_ids[0]]['name']; ?>' at grasp.how" />
    <meta property="og:image"         content="http://www.grasp.how/img/reasoning.jpg" />

    <title><?php echo $graph[$graph_ids[0]]['name']; ?></title>

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
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."share_track.js" ?>"></script>
  </head>
  <body>

  <?php  include($this->getAppDir('template', false).'/_facebook_sdk.php'); ?>

  <a id="clone-ribbon" class="github-fork-ribbon right-top" target="_blank" href='http://my.grasp.how/cloneGraph/<?php echo $graph_ids[0]; ?>' title="Clone me on grasp.how" data-graph_id="<?php echo $graph_ids[0]; ?>">Edit me on grasp.how</a>
  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>

  <div id="graphContainer"></div>

  <div style="float: right; margin-right: 7%;"  id="fb-share-btn-wrap" data-graph_id="<?php echo $graph_ids[0]; ?>">
    <div id="fb-share-btn" class="fb-share-button" data-href="<?php echo $url; ?>" data-layout="button_count" data-size="small" data-mobile-iframe="true"><a class="fb-xfbml-parse-ignore" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=<?php echo urlencode($url) ?>">Share</a></div>
  </div>

  <div style="display: none;" id="graphsData"><?php echo $graph ? json_encode($graph) : ""; ?></div>

  </body>
</html>
