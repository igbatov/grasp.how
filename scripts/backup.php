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

// array of databases to dump
$dbnames = [$dbconf->dbName, $c->get('db_template')];
$q = "SELECT id FROM auth";
$auths = $db->exec(null, $q);
foreach ($auths as $auth) {
  $dbnames[] = $c->get('userDBPrefix').$auth['id'];
}

foreach ($dbnames as $dbname) {
  $command = 'mysqldump -u '.$dbconf->login.' -p'.$dbconf->password.' '.$dbname.' > '.$rootpath.'/backups/'.$dbname.'.sql';
  echo $command."\n";
  var_dump(shell_exec($command));
}

$command = '/usr/sbin/logrotate -f '.$rootpath.'/scripts/logrotate.conf';
echo $command."\n";
var_dump(shell_exec($command));

// external script to copy backup file somewhere
foreach ($dbnames as $dbname) {
  $command = $rootpath.'/scripts/google/upload.php '.$rootpath.'/backups/'.$dbname.'.sql-'.date('Y-m-d').'.gz '.BACKUP_DIR_NAME;
  echo $command."\n";
  var_dump(shell_exec($command));
}

$command = $rootpath.'/scripts/google/rotate.php 7 '.BACKUP_DIR_NAME;
echo $command."\n";
var_dump(shell_exec($command));
