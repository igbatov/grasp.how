<?php
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

function deleteOld(Google_Service_Drive $service, $dir, $offset){
  $parentId = getFolderExistsCreate($service, $dir);
  $files = $service->files->listFiles(array('q' => "'".$parentId."' in parents"));
  $days = [];
  foreach($files->getFiles() as $file) {
    $day = substr($file->getName(), -13, 10);
    if(!preg_match("/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/",$day)) {
     throw new Exception('File name must be in a format filename.sql-YYYY-MM-DD.gz, but got '.$file->getName());
    }
    $days[] = $day;
  }
  $days = array_unique($days);
  sort($days);
  if(count($days)<$offset) return true;
  for($i=0; $i<count($days)-$offset; $i++) {
    foreach($files->getFiles() as $file) {
      if(substr($file->getName(), -13, 10) === $days[$i]){
        $service->files->delete($file->getId());
        echo 'removed '.$file->getName().' (id='.$file->getId().")\n";
      }
    }
  }
}

/**
 * Get the folder ID if it exists, if it doesnt exist, create it and return the ID
 *
 * @param Google_Service_Drive $service Drive API service instance.
 * @param String $folderName Name of the folder you want to search or create
 * @param String $parentFolderId
 * @return string id that was created or got. Returns NULL if an API error occured
 */
function getFolderExistsCreate($service, $folderName, $parentFolderId=null) {
  $folderDesc = $folderName;
  // List all user files (and folders) at Drive root
  $files = $service->files->listFiles()->getFiles();  
  $found = false;
  // Go through each one to see if there is already a folder with the specified name
  foreach ($files as $item) {
    if ($item['name'] == $folderName) {
      $found = true;
      return $item['id'];
      break;
    }
  }
  // If not, create one
  if ($found == false) {
    $folder = new Google_Service_Drive_DriveFile();
    //Setup the folder to create
    $folder->setName($folderName);
    if(!empty($folderDesc)) $folder->setDescription($folderDesc);
    $folder->setMimeType('application/vnd.google-apps.folder');
    if($parentFolderId !== null) {
      $folder->setParents(array($parentFolderId));
    }
    //Create the Folder
    try {
      $createdFile = $service->files->create($folder, $params);
      // Return the created folder's id
      return $createdFile->id;
    } catch (Exception $e) {
      print "An error occurred: " . $e->getMessage();
    }
  }
}
/**
 * Insert new file in the Application Data folder.
 *
 * @param Google_Service_Drive $service Drive API service instance.
 * @param string $title Title of the file to insert, including the extension.
 * @param string $description Description of the file to insert.
 * @param string $mimeType MIME type of the file to insert.
 * @param string $filename Filename of the file to insert.
 * @return Google_Service_Drive_DriveFile The file that was inserted. NULL is returned if an API error occurred.
 */
function insertFile($service, $title, $description, $mimeType, $filename, $folderName, $folderDesc) {
  $file = new Google_Service_Drive_DriveFile();
  // Set the metadata
  $file->setName($title);
  $file->setDescription($description);
  $file->setMimeType($mimeType);
  // Setup the folder you want the file in, if it is wanted in a folder
  if(isset($folderName)) {
    if(!empty($folderName)) {
      $parent = new Google_Service_Drive_DriveFile();
      $parent->setId(getFolderExistsCreate($service, $folderName));
      $file->setParents(array($parent));
    }
  }
  try {
    // Get the contents of the file uploaded
    $data = file_get_contents($filename);
    // Try to upload the file, you can add the parameters e.g. if you want to convert a .doc to editable google format, add 'convert' = 'true'
    $createdFile = $service->files->create($file, array(
        'data' => $data,
        'mimeType' => $mimeType,
        'uploadType'=> 'multipart'
    ));
    // Return a bunch of data including the link to the file we just uploaded
    return $createdFile;
  } catch (Exception $e) {
    print "An error occurred: " . $e->getMessage();
  }
}

?>
