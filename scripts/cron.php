#!/usr/bin/php
<?php
/**
 * Run all apps/<appname>/server/cron.[minute,hourly,daily,monthly].php
 */
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

if(!in_array($argv[1], array('minute','hourly','daily','monthly'))) exit('wrong args');
$type = $argv[1];

// get cron.* script from every app
foreach(scandir($rootpath."/web/apps") as $app_dir){
  if($app_dir == '.' || $app_dir == '..') continue;
  foreach(scandir($rootpath."/web/apps/".$app_dir.'/server/') as $script){
    if(substr($script,0,strlen('cron.'.$type)) == 'cron.'.$type) include($rootpath."/web/apps/".$app_dir.'/server/'.$script);
  }
}
