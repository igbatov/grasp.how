<!doctype html>
<html>
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/reset.css">
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/ui.css">
  </head>
  <body>
  <div id="container">
    <div id="horizontalMenu"></div>
    <div id="leftGraphElementEditorContainer"></div>
    <div id="rightGraphElementEditorContainer"></div>
    <div id="graphViews">
      <img class="ajax" id="ajaxLoader" src="<?php echo $this->getAppDir('img'); ?>/ajax.png">
    </div>
    <div id="serverStatus"></div>
  </div>

  <!-- General js libs -->
  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>stacktrace-0.4.js"></script>

  <!-- YOVALUE source -->
  <?php foreach($this->getJsIncludeList() as $js_include) : ?>
      <script src="<?php echo $this->getAppDir('js')."/".$js_include; ?>"></script>
  <?php endforeach ?>
  <script src="<?php echo $this->getAppDir('js'); ?>/main.js"></script>

  </body>
</html>
