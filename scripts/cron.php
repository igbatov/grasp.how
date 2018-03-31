#!/usr/bin/php
<?php
/**
 * Run all apps/<appname>/server/cron.[minute,hourly,daily,monthly].php
 */

$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

if(!in_array($argv[1], array('minute','hourly','daily','monthly'))) {
  exit('wrong args');
}
$type = $argv[1];

/**
 * Include cron.* script from every app
 */
foreach(scandir($rootpath."/web/apps") as $app_dir){
  if($app_dir == '.' || $app_dir == '..') continue;
  foreach(scandir($rootpath."/web/apps/".$app_dir.'/server/') as $script){
    if(substr($script,0,strlen('cron.'.$type)) == 'cron.'.$type) {
      include($rootpath."/web/apps/".$app_dir.'/server/'.$script);
    }
  }
}

/**
 * Run general tasks here
 */

if($type == 'daily'){
  // clear old rows from request_log
  $q = 'DELETE FROM request_log WHERE created_at < "'.date('Y-m-d H:i:s', strtotime(' -7 day')).'" ';
  $db->exec(null, $q);

  // clear old files from /tmp
  /*** cycle through all files in the directory ***/
  foreach (glob($rootpath."/tmp/*") as $file) {
    /*** if file is 24 hours (86400 seconds) old then delete it ***/
    if(time() - filectime($file) > 86400){
      unlink($file);
    }
  }
}
