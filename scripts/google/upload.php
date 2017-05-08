#!/usr/bin/php
<?php
//var_dump($argv); exit();
require __DIR__ . '/vendor/autoload.php';

define('APPLICATION_NAME', 'Drive API PHP uploader');
define('CREDENTIALS_PATH', '~/.credentials/drive-php-uploader.json');
define('CLIENT_SECRET_PATH', __DIR__ . '/client_secret.json');
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-php-uploader.json
define('SCOPES', implode(' ', array(
  Google_Service_Drive::DRIVE_FILE)
));

if (php_sapi_name() != 'cli') {
  throw new Exception('This application must be run on the command line.');
}

/**
 * Returns an authorized API client.
 * @return Google_Client the authorized client object
 */
function getClient() {
  $client = new Google_Client();
  $client->setApplicationName(APPLICATION_NAME);
  $client->setScopes(SCOPES);
  $client->setAuthConfigFile(CLIENT_SECRET_PATH);
  $client->setAccessType('offline');
  $client->setRedirectUri('http://grasp.how/oauth2callback');

  // Load previously authorized credentials from a file.
  $credentialsPath = expandHomeDirectory(CREDENTIALS_PATH);
  if (file_exists($credentialsPath)) {
    $accessToken = file_get_contents($credentialsPath);
  } else {
    // Request authorization from the user.
    $authUrl = $client->createAuthUrl();
    printf("Open the following link in your browser:\n%s\n", $authUrl);
    print 'Enter verification code: ';
    $authCode = trim(fgets(STDIN));

    // Exchange authorization code for an access token.
    $accessToken = $client->authenticate($authCode);

    // Store the credentials to disk.
    if(!file_exists(dirname($credentialsPath))) {
      mkdir(dirname($credentialsPath), 0700, true);
    }
    file_put_contents($credentialsPath, $accessToken);
    printf("Credentials saved to %s\n", $credentialsPath);
  }
  $client->setAccessToken($accessToken);

  // Refresh the token if it's expired.
  if ($client->isAccessTokenExpired()) {
    $client->refreshToken($client->getRefreshToken());
    file_put_contents($credentialsPath, $client->getAccessToken());
  }
  return $client;
}

/**
 * Expands the home directory alias '~' to the full path.
 * @param string $path the path to expand.
 * @return string the expanded path.
 */
function expandHomeDirectory($path) {
  $homeDirectory = getenv('HOME');
  if (empty($homeDirectory)) {
    $homeDirectory = getenv("HOMEDRIVE") . getenv("HOMEPATH");
  }
  return str_replace('~', realpath($homeDirectory), $path);
}

function deleteOldest($service){
 $files = $service->files->listFiles(array('orderBy'=>'createdTime asc'));
 echo 'removed '.$files->getFiles()[0]['name'].' (id='.$files->getFiles()[0]['id'].")\n";
 $service->files->delete($files->getFiles()[0]['id']);
}

// Get the API client and construct the service object.
$client = getClient();
$service = new Google_Service_Drive($client);
$filepath = $argv[1];
$data = file_get_contents($filepath);

// create and upload a new Google Drive file, including the data
try
{
	//Insert a file
	$file = new Google_Service_Drive_DriveFile($client);

	$file->setName(basename($filepath));

	$createdFile = $service->files->create($file, array(
		'data' => $data,
		'uploadType' => 'media',
	));

//	deleteOldest($service);
}
catch (Exception $e)
{
	print $e->getMessage();
}

echo 'uploaded '.$createdFile['name']."\n";
