<!doctype html>
<html>
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">
  </head>
  <body>
  <div id="container">
    <div id="horizontalMenu"></div>
    <div id="leftGraphElementEditorContainer" class="graphElementEditorContainer"></div>
    <div id="rightGraphElementEditorContainer" class="graphElementEditorContainer"></div>
    <div id="graphViews">
      <img class="ajax" id="ajaxLoader" src="<?php echo $this->getAppDir('img'); ?>/ajax.gif">
    </div>
    <div id="statusString"></div>
    <img id="miniAjaxLoader" style="display: none;" src="<?php echo $this->getAppDir('img'); ?>/ajax_clock_small.gif">
  </div>

  <!-- General js libs -->
  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>stacktrace-0.4.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js"></script>

  <!-- GRASP source -->
  <?php foreach($this->getJsIncludeList() as $js_include) : ?>
      <script src="<?php echo $this->getAppDir('js')."/".$js_include; ?>"></script>
  <?php endforeach ?>
  <script src="<?php echo $this->getAppDir('js'); ?>/main.js"></script>

  </body>
</html>
