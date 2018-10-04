#!/usr/bin/php
<?php
/**
 * Restore DB in /backups
 */
define('BACKUP_DIR_NAME', 'GRASP_BACKUP');
echo date('Y-m-d H:i:s').' ';
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

if (!isset($argv[1]) || !preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/", $argv[1])){
  echo "usage: restore.php '2018-10-04'\n";
}

$date = $argv[1];

$c = new Config();
$dbconf = $c->getDbConf();

$path = $rootpath.'/backups/';
$files = glob($path."*.sql-".$date.".gz");
foreach($files as $file){
  $dbname = substr(basename($file), 0, -strlen('.sql-2018-10-04.gz'));	
  $command = 'echo "create database '.$dbname.'" | mysql -u '.$dbconf->login.' -p'.$dbconf->password;
  echo $command."\n";
  var_dump(shell_exec($command));

  $command = 'zcat '.$file.' | mysql -u '.$dbconf->login.' -p'.$dbconf->password.' '.$dbname;
  echo $command."\n";
  var_dump(shell_exec($command));
}

