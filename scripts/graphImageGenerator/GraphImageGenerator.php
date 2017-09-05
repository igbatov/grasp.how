<?php

/**
 * This class generates image of graph snap ({"graphId":graphId,"step":step,"ts":Date.now()})
 * Class GraphImageGenerator
 */
class GraphImageGenerator {
  private $embGraph;
  private $imagick;
  private $node;
  private $tmpDir;
  private $currentDir;
  private $rootDir;
  private $helper;

  public function __construct(EmbGraph $embGraph, Helper $helper)
  {
    $this->embGraph = $embGraph;
    $this->imagick = $helper->getImagick();
    $this->node = $helper->getNodeBinary();
    $this->currentDir = dirname(__FILE__);
    $this->rootDir = $this->currentDir.'/../..';
    $this->tmpDir = $this->rootDir."/tmp";
    $this->helper = $helper;
  }

  public function snapToFilename($snap)
  {
    // arrays are assigned by copy, objects by reference
    $preparedSnap = $snap;
    if (!$preparedSnap['step']){
      $preparedSnap['step'] = 'null';
    }
    return implode('_', array_values($preparedSnap));
  }

  public function filenameToSnap($snap)
  {
    $a = explode('_', array_values($snap));
    return $snap = [
        'graphId'=>$a[0],
        'step'=>$a[1] === 'null' ? null : $a[1],
        'ts'=>$a[2],
    ];
  }

  public function getImage($snap)
  {
    file_put_contents($this->tmpDir.'/'.$this->snapToFilename($snap).'.json', json_encode(
        $this->embGraph->getGraphsData([$snap])
    ));
    $cmd = $this->node
        .' '.$this->currentDir.'/converter.js '
        .$this->tmpDir.'/'.$this->snapToFilename($snap).'.json '
        .$this->tmpDir.'/'.$this->snapToFilename($snap);
    error_log($cmd);
    exec($cmd);


    $svg = file_get_contents($this->tmpDir.'/'.$this->snapToFilename($snap).'.svg');
    $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;

    if ($this->imagick) {
      $this->imagick->readImageBlob($svg);
      $this->imagick->setImageFormat('jpg');
      $this->imagick->setImageCompressionQuality(90);
      $this->imagick->writeImage($this->tmpDir.'/'.$this->snapToFilename($snap).".jpg");
      // mv jpeg to its directory
      exec('mv '.$this->tmpDir.'/'.$this->snapToFilename($snap).".jpg"
          ." ".$this->rootDir."/web/img/graph_shots");
    }

    // remove tmp files
    unlink($this->tmpDir.'/'.$this->snapToFilename($snap).".jpg");
    unlink($this->tmpDir.'/'.$this->snapToFilename($snap).'.json');

    return $this->rootDir."/web/img/graph_shots/".$this->snapToFilename($snap).".jpg";
  }
}

?>
