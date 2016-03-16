#!/usr/bin/php
<?php
/**
 * Backup DB in /backups
 */
echo date('Y-m-d H:i:s').' ';
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

$c = new Config();
$dbconf = $c->getDbConf();

$command = 'mysqldump -u '.$dbconf->login.' -p'.$dbconf->password.' '.$dbconf->dbName.' > '.$rootpath.'/backups/'.$dbconf->dbName.'.sql';
echo $command."\n";
var_dump(shell_exec($command));

$command = '/usr/sbin/logrotate -f '.$rootpath.'/scripts/logrotate.conf';
echo $command."\n";
var_dump(shell_exec($command));

// external script to copy backup file somewhere
$command = '/root/google/upload.php '.$rootpath.'/backups/'.$dbconf->dbName.'.sql-'.date('Y-m-d').'.gz';
echo $command."\n";
var_dump(shell_exec($command));
