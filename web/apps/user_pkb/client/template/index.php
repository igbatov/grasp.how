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
  <script src="<?php echo $this->getDefaultDir('js'); ?>md5.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Chart.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>jserrorlog.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>stacktrace-0.4.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src='<?php echo $this->getDefaultDir('js'); ?>decimal.min.js?v=<?php echo $this->getRevision(); ?>'></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>I18n.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Ajax.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/iListener.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Event.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Mediator.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Publisher.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Subscriber.js?v=<?php echo $this->getRevision(); ?>"></script>

  <!-- GRASP source -->
  <?php foreach($this->getJsIncludeList() as $js_include) : ?>
      <script src="<?php echo $this->getAppDir('js')."/".$js_include; ?>?v=<?php echo $this->getRevision(); ?>"></script>
  <?php endforeach ?>
  <script src="<?php echo $this->getAppDir('js'); ?>/init.js?v=<?php echo $this->getRevision(); ?>"></script>
  <script src="<?php echo $this->getAppDir('js'); ?>/main.js?v=<?php echo $this->getRevision(); ?>"></script>

  <!-- mouseflow session replay -->
  <script type="text/javascript">
    window._mfq = window._mfq || [];
    (function() {
      var mf = document.createElement("script");
      mf.type = "text/javascript"; mf.async = true;
      mf.src = "//cdn.mouseflow.com/projects/8f374802-70db-4c74-8593-3d0b319da01d.js";
      document.getElementsByTagName("head")[0].appendChild(mf);
    })();
    window._mfq.push(["setVariable", "auth_id", "<?php echo $this->getAuthId(); ?>"]);
    window._mfq.push(["setVariable", "username", "<?php echo $this->getUsername(); ?>"]);
  </script>
  </body>
</html>
