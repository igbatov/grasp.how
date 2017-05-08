#!/usr/bin/php
<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/uploadlib.php';

define('APPLICATION_NAME', 'Drive API PHP uploader');
define('CREDENTIALS_PATH', '~/.credentials/drive-php-uploader.json');
define('CLIENT_SECRET_PATH', __DIR__ . '/client_secret.json');
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-php-uploader.json
define('SCOPES', implode(' ', array(
  Google_Service_Drive::DRIVE_FILE)
));
define('GENERAL_UPLOAD_DIR_NAME', 'GRASP_BACKUP');

if (php_sapi_name() != 'cli') {
  throw new Exception('This application must be run on the command line.');
}

// Get the API client and construct the service object.
$client = getClient();
$service = new Google_Service_Drive($client);
$filepath = $argv[1];
$data = file_get_contents($filepath);
$fileName = basename($filepath);

$generalUploadDirId = getFolderExistsCreate($service, GENERAL_UPLOAD_DIR_NAME);

// create and upload a new Google Drive file, including the data
try
{
	//Insert a file
	$file = new Google_Service_Drive_DriveFile($client);

	$file->setName($fileName);

	$createdFile = $service->files->create($file, array(
		'data' => $data,
		'uploadType' => 'media',
    'parents' => array($generalUploadDirId)
	));

//	deleteOldest($service);
}
catch (Exception $e)
{
	print $e->getMessage();
}

echo 'uploaded '.$createdFile['name']."\n";
