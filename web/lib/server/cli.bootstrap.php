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
require_once ($path.'/'.'DB.php');
require_once ($path.'/'.'ErrorHandler.php');

// init helper modules
$db = new NestedDB($c->getDbConf());
$eh = new ErrorHandler();