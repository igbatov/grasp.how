<!doctype html>
<html>
  <head>
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/reset.css">
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">
  <!--- <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/showGraph.css"> -->
  </head>
  <body>


    <div id="graphElementEditorContainer"></div>
    <div id="graphViews">
        <img class="ajax" src="<?php echo $_REQUEST['SERVER_NAME'] ?>/img/ajax.gif">
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