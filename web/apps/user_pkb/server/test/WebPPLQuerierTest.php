<?php
/**
 * Install phpunit by downloading phpunit.phar from https://phpunit.de/manual/4.8/en/installation.html
 * Run by
 * #phpunit WebPPLQuerierTest.php
 * or to debug
 * On ubuntu:
 * #php -dxdebug.remote_autostart=On bin/phpunit WebPPLQuerierTest.php
 * On Windows:
 * php -dxdebug.remote_autostart=On \path\to\phpunit.phar WebPPLQuerierTest.php
 *
 * Before debug activate "listening Debug Connections" button in PHPStorm
 */
$path = dirname(__FILE__);
require_once ($path.'/../../../../../web/lib/server/Config.php');
include_once('../AbstractQuerier.php');
include_once('../WebPPLQuerier.php');

class WebPPLQuerierTest extends PHPUnit_Framework_TestCase
{
  /** @var  WebPPLQuerier */
  private $querier;

  protected function setUp()
  {
    $c = new Config();
    $this->querier = new WebPPLQuerier($c->getWebPPLPath(), $c->getDefaultPath('tmp'));
  }

  /**
   * @dataProvider dataProvider
   */
  public function testQuerier($graph, $probabilities, $expected)
  {
    $this->querier->initEdgeHashes($graph);

    $probs = $this->querier->getNodeMethods($graph, $probabilities);
    $this->assertMultiLineEquals($expected['probScript'], $probs);

    $mainPart = $this->querier->getMain($graph, $probabilities);
    $this->assertMultiLineEquals($expected['mainScript'], $mainPart);
  }

  /**
   * @dataProvider dataProvider
   */
  public function testQuerierResults($graph, $probabilities, $expected)
  {
    $res = $this->querier->query($graph, $probabilities);
    $this->assertEquals($expected['result'], json_encode($res));
  }

  private function assertMultiLineEquals($mustBe, $result){
    $mustBeLines = explode("\n", $mustBe);
    $resultLines = explode("\n",$result);
    foreach ($mustBeLines as $i => $mustBeLine) {
      $this->assertEquals(trim($mustBeLine, "\n\r"), trim($resultLines[$i],"\n\r"));
    }
  }

  public function dataProvider()
  {
    $graph1 = include 'data/WebPPL/factWithParent.php';
    $graph2 = include 'data/WebPPL/twoParents.php';
    $graph3 = include 'data/WebPPL/inconsistentEvidences.php';
    return [
        $graph1,
        $graph2,
//        $graph3,
    ];
  }
}
