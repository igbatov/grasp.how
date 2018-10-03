#!/usr/bin/php
<?php
/**
 * Backup DB in /backups
 */
define('BACKUP_DIR_NAME', 'GRASP_BACKUP');
echo date('Y-m-d H:i:s').' ';
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

$c = new Config();
$dbconf = $c->getDbConf();

$path = $rootpath.'/backups/';
$files = glob($path."*.sql");
foreach($files as $file){
  $dbname = substr(basename($file), 0, -4);	
  $command = 'echo "create database '.$dbname.'" | mysql -u '.$dbconf->login.' -p'.$dbconf->password;
  echo $command."\n";
  var_dump(shell_exec($command));

  $command = 'mysql -u '.$dbconf->login.' -p'.$dbconf->password.' '.$dbname.' < '.$path.$dbname.'.sql';
  echo $command."\n";
  var_dump(shell_exec($command));
}

