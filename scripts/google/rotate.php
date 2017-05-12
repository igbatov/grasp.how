#!/usr/bin/php
<?php
/**
 * Argument #1 is the offset (in days) after which all older files will be removed
 * Argument #2 is the remote directory name 
 */
require __DIR__ . '/bootstrap.php';

if (!isset($argv[1]) || !isset($argv[2])) exit("Argument #1 must be offset (in days) after which all older files will be removed.\nArgument #2 is the remote directory name\n");

$offset = $argv[1];
$dir = $argv[2];

$generalUploadDirId = getFolderExistsCreate($service, $dir);

deleteOld($service, $dir, $offset);
