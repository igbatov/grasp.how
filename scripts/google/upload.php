#!/usr/bin/php
<?php
require __DIR__ . '/bootstrap.php';
if (!isset($argv[1]) || !isset($argv[2])) exit("Argument #1 must be path to file that must be uploaded.\nArgument #2 is the remote directory nam\n");
$filepath = $argv[1];
$dir = $argv[2];
$data = file_get_contents($filepath);
$fileName = basename($filepath);

$generalUploadDirId = getFolderExistsCreate($service, $dir);

// create and upload a new Google Drive file, including the data
try
{
	//Insert a file
	$file = new Google_Service_Drive_DriveFile($client);
	$file->setName($fileName);
        $file->setParents(array($generalUploadDirId));
	$createdFile = $service->files->create($file, array(
		'data' => $data,
		'uploadType' => 'media'
	));
}
catch (Exception $e)
{
	print $e->getMessage();
}

echo 'uploaded '.$createdFile['name']."\n";
