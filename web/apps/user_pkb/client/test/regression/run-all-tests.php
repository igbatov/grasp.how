<?php
require_once ('../../../../../lib/server/bootstrap.php');
$app = new AppUserPkb($c, $s, $db, $logger, $i18n, $oauth);
?>
<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $app->getAppDir('css'); ?>/main.css">
</head>
<body>
<div id="container">
  <div id="horizontalMenu"></div>
  <div id="leftGraphElementEditorContainer" class="graphElementEditorContainer"></div>
  <div id="rightGraphElementEditorContainer" class="graphElementEditorContainer"></div>
  <div id="graphViews">
    <img class="ajax" id="ajaxLoader" src="<?php echo $app->getAppDir('img'); ?>/ajax.gif">
  </div>
  <div id="statusString"></div>
  <img id="miniAjaxLoader" style="display: none;" src="<?php echo $app->getAppDir('img'); ?>/ajax_clock_small.gif">
</div>

<!-- General js libs -->
<script src="<?php echo $app->getDefaultDir('js'); ?>jserrorlog.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>jquery.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>stacktrace-0.4.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>xor4096.min.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Helpers.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>TestHelpers.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Ajax.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>UIElements.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Mediator/iListener.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Mediator/Event.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Mediator/Mediator.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Mediator/Publisher.js"></script>
<script src="<?php echo $app->getDefaultDir('js'); ?>Mediator/Subscriber.js"></script>

<!-- GRASP source -->
<?php foreach($app->getJsIncludeList() as $js_include) : ?>
  <script src="<?php echo $app->getAppDir('js')."/".$js_include; ?>"></script>
<?php endforeach ?>
<script src="<?php echo $app->getAppDir('js'); ?>/init.js"></script>

<!-- tests -->
<script src="<?php echo $app->getAppDir('js'); ?>/../test/regression/testEmptyGraphCreation.js"></script>
<script src="<?php echo $app->getAppDir('js'); ?>/../test/regression/testGraphRemove.js"></script>
<script src="<?php echo $app->getAppDir('js'); ?>/../test/regression/testAddGraphElements.js"></script>
<script src="<?php echo $app->getAppDir('js'); ?>/../test/regression/testBackendData.js"></script>
<script src="<?php echo $app->getAppDir('js'); ?>/../test/regression/testBackend.js"></script>

</body>
</html>
