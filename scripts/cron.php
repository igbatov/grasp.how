<?php
include("../web/lib/server/cli.bootstrap.php");

if(!in_array($argv[1], array('minute','hourly','daily','monthly'))) exit('wrong args');
$type = $argv[1];

// get cron.* script from every app
foreach(scandir("../web/apps") as $app_dir){
  if($app_dir == '.' || $app_dir == '..') continue;
  foreach(scandir("../web/apps/".$app_dir.'/server/') as $script){
    if(substr($script,0,strlen('cron.'.$type)) == 'cron.'.$type) include("../web/apps/".$app_dir.'/server/'.$script);
  }
}