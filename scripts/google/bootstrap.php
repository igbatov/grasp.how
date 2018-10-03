<?php

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/lib.php';

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

// Get the API client and construct the service object.
$client = getClient();
$service = new Google_Service_Drive($client);

