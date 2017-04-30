<?php

// path to this file
$path = dirname(__FILE__);

// init config
require_once ($path.'/'.'Config.php');
$c = new Config();

// set default log file
ini_set('error_log', $c->getDefaultPath('log')."/error_log.log");
/**
 * Include all our classes
 */
require_once ($path.'/'.'StopWatch.php');
require_once ($path.'/'.'GraphDiffCreator.php');
require_once ($path.'/'.'DB.php');
require_once ($path.'/'.'NestedDB.php');
require_once ($path.'/'.'EscapeDB.php');
require_once ($path.'/'.'MultiTenantDB.php');
require_once ($path.'/'.'ErrorHandler.php');
require_once ($path.'/'.'Logger.php');
require_once ($path.'/'.'GraphIdConverter.php');
require_once ($path.'/'.'ContentIdConverter.php');

// init helper modules
$db = new MultiTenantDB(
    new EscapeDB(
        new NestedDB($c->getDbConf())
    ),
    $c->get('userDBPrefix'),
    $c->getDbConf()->dbName
);
$eh = new ErrorHandler();
$logger = new Logger($db, $eh, dirname(__FILE__)."/../../../logs", "cli.bootstrap.php");