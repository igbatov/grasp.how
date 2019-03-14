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
  case 'my.grasp.local':
    // if it is test, then rollback all db queries after script finishes
    if(isset($_REQUEST['TEST_NAME'])){
      $originalDBPrefix = $db->getPrefix();
      $db1 = new EscapeDB(new NestedDB($c->getDbConf()));
      $db1 = new MultiTenantDB($db1, TestableApp::getTestDBNamePrefix($_REQUEST['TEST_NAME']), $c->getDbConf()->dbName);
      $db2 = new EscapeDB(new NestedDB($c->getDbConf()));
      $db2 = new MultiTenantDB($db2, TestableApp::getTestDBNamePrefix($_REQUEST['TEST_NAME']), $c->getDbConf()->dbName);
      $app = new AppUserPkb($c, $s, $db1, $logger, $i18n, $oauth);
      $app = new TestableApp($db2, $app, $_REQUEST['TEST_NAME'], $originalDBPrefix);
    } else {
      $app = new AppUserPkb($c, $s, $db, $logger, $i18n, $oauth);
    }
    break;

  default:
    $app = new AppFrontend($c, $s, $db, $logger, $i18n, $oauth);
    break;
}

$app->preAccessLog();
$app->showView();
$app->postAccessLog();
