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
    $cmd = 'whoami';
    exec($cmd." 2>&1", $output);
    error_log(var_export($output, true));
    $cmd = $this->node
        .' '.$this->currentDir.'/converter.js '
        .$this->tmpDir.'/'.$this->snapToFilename($snap).'.json '
        .$this->tmpDir.'/'.$this->snapToFilename($snap);
    error_log($cmd);
    exec($cmd." 2>&1", $output);
    error_log(var_export($output, true));


    $svg = file_get_contents($this->tmpDir.'/'.$this->snapToFilename($snap).'.svg');
    $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;

    if ($this->imagick) {
      $this->imagick->readImageBlob($svg);
      $this->imagick->setImageFormat('jpg');
      $this->imagick->setImageCompressionQuality(90);
      $this->imagick->writeImage($this->tmpDir.'/'.$this->snapToFilename($snap).".jpg");
      // mv jpeg to its directory
      rename(
        $this->tmpDir.'/'.$this->snapToFilename($snap).".jpg",
        $this->rootDir."/web/img/graph_shots".'/'.$this->snapToFilename($snap).".jpg"
      );
    }
    rename(
      $this->tmpDir.'/'.$this->snapToFilename($snap).".svg",
      $this->rootDir."/web/img/graph_shots".'/'.$this->snapToFilename($snap).".svg"
    );

    // remove tmp files
    unlink($this->tmpDir.'/'.$this->snapToFilename($snap).'.json');

    return $this->rootDir."/web/img/graph_shots/".$this->snapToFilename($snap).".jpg";
  }
}

?>
