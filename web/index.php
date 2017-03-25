<?php
//header('HTTP/1.1 401 Unauthorized'); exit();
//phpinfo(); exit();
require_once ('lib/server/bootstrap.php');

// log request to db
if($c && $c->isDebugOn()){
  $logger->log('request', $_SERVER["REQUEST_URI"], var_export($_REQUEST, true));
}

// init application
switch($c->getWebDomainName()){
  case 'my.grasp.how':
  case 'grasp.local':
    $app = new AppUserPkb($c, $s, $db, $logger, $i18n, $oauth);
    // if it is test, then rollback all db queries after script finishes
    if(isset($_REQUEST['TEST_NAME'])){
      $app = new TestableApp(new DB($c->getDbConf()), $app, $_REQUEST['TEST_NAME']);
    }
    break;

  default:
    $app = new AppFrontend($c, $s, $db, $logger, $i18n, $oauth);
    break;
}

$app->preAccessLog();
$app->showView();
$app->postAccessLog();
