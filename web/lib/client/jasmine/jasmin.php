<?php
require_once ('../../server/bootstrap.php');
$app = new AppUserPkb($c, $s, $db, $eh, $l);
?>
<html>
<head>

  <title>Jasmine Test Runner</title>

  <!-- Jasmine includes -->
  <link rel="stylesheet" type="text/css" href="jasmine.css">
  <script type="text/javascript" src="jasmine.js"></script>
  <script type="text/javascript" src="../jquery.js"></script>
  <script type="text/javascript" src="jquery.simulate.js"></script>
  <script type="text/javascript" src="jasmine-jquery.js">/*http://testdrivenwebsites.com/2010/07/29/html-fixtures-in-jasmine-using-jasmine-jquery/*/</script>
  <script type="text/javascript" src="jasmine-html.js"></script>

  <!-- Vendor files -->
  <script type="text/javascript" src="imagediff.js"></script>
  <script type="text/javascript" src="jasmineCustomMatchers.js"></script>
  <script type="text/javascript" src="jasmineCanvasDrawerExt.js"></script>
  <script type="text/javascript" src="jasmineCanvasDrawerEventSimulation.js"></script>
  <script type="text/javascript" src="../../../lib/client/stacktrace-0.4.js"></script>
  <script type="text/javascript" src="../../../lib/client/xor4096.min.js"></script>

  <!-- GRASP source files -->
  <?php foreach($app->getJsIncludeList() as $js_include) : ?>
    <script src="<?php echo "../../../apps/user_pkb/client/js/".$js_include; ?>"></script>
  <?php endforeach ?>

  <!--- data for spec files (fixtures) of unit tests --->
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/fixtures/GraphFormatConverter.js"></script>
  <!--- data for spec files (fixtures) of integration tests
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/integration/fixtures/CanvasDrawer.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/integration/fixtures/GraphView.js"></script>
--->
  <!-- Spec files of unit tests
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/Helpers.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/Mediator.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/Publisher.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/GraphModel.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/GraphModelTree.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/GraphNodeMappingTree.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/GraphNodeMappingForceDirected.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/GraphNodeMappingTreeNode.js"></script>
  -->
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/unit/BayesCalculator.js"></script>

  <!-- Spec files of integration tests
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/integration/CanvasDrawer.js"></script>
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/integration/GraphView.js"></script>
  -->
<!--
  <script type="text/javascript" src="../../../apps/user_pkb/client/test/LayoutTreeMorph.js"></script>

  <script type="text/javascript" src="../../../apps/user_pkb/client/test/ViewManager.js"></script>

  --->
</head>
<body>
<script type="text/javascript">
  (function() {
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;

    var htmlReporter = new jasmine.HtmlReporter();

    jasmineEnv.addReporter(htmlReporter);

    jasmineEnv.specFilter = function(spec) {
      return htmlReporter.specFilter(spec);
    };

    var currentWindowOnload = window.onload;

    window.onload = function() {
      if (currentWindowOnload) {
        currentWindowOnload();
      }
      execJasmine();
    };

    function execJasmine() {
      jasmineEnv.execute();
    }

  })();
</script>

</body>
</html>