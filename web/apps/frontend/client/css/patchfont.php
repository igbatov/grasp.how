<?php

convertRestrictedFont('SFNSDisplay.ttf');

function convertRestrictedFont($filename) {
  $font = fopen($filename,'r+');
  if ($font === false) {
    throw new Exception('Could not open font file.');
  }

  fseek($font, 12, 0);

  while (!feof($font)) {
    $type = '';
    for ($i = 0; $i < 4; $i++) {
      $type .= fgetc($font);
      if (feof($font)) {
        fclose($font);
        throw new Exception('Could not read the table definitions of the font.');
      }
    }
    if ($type == 'OS/2') {
      // Save the location of the table definition
      // containing the checksum and pointer to the data
      $os2TableDefinition = ftell($font);
      $checksum = 0;

      for ($i = 0; $i < 4; $i++) {
        fgetc($font);
        if (feof($font)) {
          fclose($font);
          throw new Exception('Could not read the OS/2 table header of the font.');
        }
      }

      // Get the pointer to the OS/2 table data
      $os2TablePointer = ord(fgetc($font)) << 24;
      $os2TablePointer |= ord(fgetc($font)) << 16;
      $os2TablePointer |= ord(fgetc($font)) << 8;
      $os2TablePointer |= ord(fgetc($font));

      $length = ord(fgetc($font)) << 24;
      $length |= ord(fgetc($font)) << 16;
      $length |= ord(fgetc($font)) << 8;
      $length |= ord(fgetc($font));

      if (fseek($font, $os2TablePointer + 8, 0) !== 0) {
        fclose($font);
        throw new Exception('Could not read the embeddable type of the font.');
      }

      // Read the fsType before overriding it
      $fsType = ord(fgetc($font)) << 8;
      $fsType |= ord(fgetc($font));

      error_log('Installable Embedding: ' . ($fsType == 0));
      error_log('Reserved: ' . ($fsType & 1));
      error_log('Restricted License: ' . ($fsType & 2));
      error_log('Preview & Print: ' . ($fsType & 4));
      error_log('Editable Embedding: ' . ($fsType & 8));
      error_log('Reserved: ' . ($fsType & 16));
      error_log('Reserved: ' . ($fsType & 32));
      error_log('Reserved: ' . ($fsType & 64));
      error_log('Reserved: ' . ($fsType & 128));
      error_log('No subsetting: ' . ($fsType & 256));
      error_log('Bitmap embedding only: ' . ($fsType & 512));
      error_log('Reserved: ' . ($fsType & 1024));
      error_log('Reserved: ' . ($fsType & 2048));
      error_log('Reserved: ' . ($fsType & 4096));
      error_log('Reserved: ' . ($fsType & 8192));
      error_log('Reserved: ' . ($fsType & 16384));
      error_log('Reserved: ' . ($fsType & 32768));

      fseek($font, ftell($font) - 2);

      // Set the two bytes of fsType to 0
      fputs($font, chr(0), 1);
      fputs($font, chr(0), 1);

      // Go to the beginning of the OS/2 table data
      fseek($font, $os2TablePointer, 0);

      // Generate a new checksum based on the changed
      for ($i = 0; $i < $length; $i++) {
        $checksum += ord(fgetc($font));
      }
      fseek($font, $os2TableDefinition, 0);
      fputs($font, chr($checksum >> 24), 1);
      fputs($font, chr(255 & ($checksum >> 16)), 1);
      fputs($font, chr(255 & ($checksum >> 8)), 1);
      fputs($font, chr(255 & $checksum), 1);

      fclose($font);

      return true;
    }
    for ($i = 0; $i < 12; $i++) {
      fgetc($font);
      if (feof($font)) {
        fclose($font);
        throw new Exception('Could not skip a table definition of the font.');
      }
    }
  }

  fclose($font);

  return false;
}