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
    $filename = implode('_', array_values($preparedSnap));
    if (isset($preparedSnap['dims']) && $preparedSnap['dims']) {
      $filename .= '('.$preparedSnap['dims']['width'].'x'.$preparedSnap['dims']['height'].')';
    }
    return $filename;
  }

  /**
   * @param  string $filename - filename without extension
   * @return array
   */
  public function filenameToSnap($filename)
  {
    // extract image size info
    preg_match('/\((.+)\)/', $filename, $match);
    if (!empty($match)) {
      $m = explode('x',$match[1]);
      $imageDims = [
          'width'=>$m[0],
          'height'=>$m[1]
      ];
    } else {
      $imageDims = null;
    }

    $a = explode('_', $filename);
    $snap = [
        'graphId'=>$a[0],
        'step'=>$a[1] === 'null' ? null : $a[1],
        'ts'=>$a[2],
        'dims'=>$imageDims
    ];
    return $snap;
  }
  /**
   * @param $snap ['graphId'=>, 'step'=>, 'ts'=>, 'dims'=>]
   * @return string
   */
  public function getImage($snap)
  {
    file_put_contents($this->tmpDir.'/'.$this->snapToFilename($snap).'.json', json_encode(
        $this->embGraph->getGraphsData([$snap])
    ));
    $cmd = $this->node
        .' '.$this->currentDir.'/converter.js '
        .$this->tmpDir.'/'.$this->snapToFilename($snap).'.json '
        .$this->tmpDir.'/'.$this->snapToFilename($snap).
        isset($snap['dims']) ? $snap['dims']['width'].'x'.$snap['dims']['height'] : '';
    exec($cmd." 2>&1", $output);

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
