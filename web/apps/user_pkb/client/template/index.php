<!doctype html>
<html>
  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">
  <link href="/favicon.ico?3" rel="icon">
  </head>
  <body>
  <div id="container">
    <div id="horizontalMenu"></div>
    <div id="graphViews">
      <div id="leftGraphElementEditorContainer" class="graphElementEditorContainer"></div>
      <div id="rightGraphElementEditorContainer" class="graphElementEditorContainer"></div>
      <div id="frontalLoader">
        <?php  include($this->getAppDir('template', false).'/_frontalLoader.php'); ?>
      </div>
    </div>
    <div id="statusString"></div>
  </div>

  <!-- General js libs -->
  <script src="<?php echo $this->getDefaultDir('js'); ?>md5.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Chart.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>jserrorlog.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>stacktrace-0.4.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js"></script>
  <script src='<?php echo $this->getDefaultDir('js'); ?>decimal.min.js'></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>CommonHelpers.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>I18n.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Ajax.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/iListener.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Event.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Mediator.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Publisher.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Subscriber.js"></script>

  <!-- GRASP source -->
  <?php foreach($this->getJsIncludeList() as $js_include) : ?>
      <script src="<?php echo $this->getAppDir('js')."/".$js_include; ?>"></script>
  <?php endforeach ?>
  <script src="<?php echo $this->getAppDir('js'); ?>/init.js"></script>
  <script src="<?php echo $this->getAppDir('js'); ?>/main.js"></script>

  </body>
</html>
