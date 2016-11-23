<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRASP.HOW</title>
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/reset.css">
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">

    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."d3.v3.min.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."graph.js" ?>"></script>
  </head>
  <body>
  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>
  <div id="graphContainer"></div>
  <div style="display: none;" id="graphsData"><?php echo $graph ? json_encode($graph) : ""; ?></div>
  </body>
</html>
