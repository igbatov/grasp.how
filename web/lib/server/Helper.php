<?php
class Helper {
  public function getOS(){
    if (DIRECTORY_SEPARATOR == '/') {
      return 'linux';
    }

    if (DIRECTORY_SEPARATOR == '\\') {
      return 'windows';
    }
  }

  public function getNodeBinary(){
    if ($this->getOS() === 'linux') {
      return '/usr/bin/node';
    }

    if ($this->getOS() === 'windows') {
      return 'node';
    }
  }

  public function getImagick() {
    if ($this->getOS() === 'linux') {
      $imagick = new Imagick();
    }

    if ($this->getOS() === 'windows') {
      $imagick = null;
    }

    return $imagick;
  }

}