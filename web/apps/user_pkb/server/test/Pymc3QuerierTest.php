<?php
/**
 * Created by PhpStorm.
 * User: igbatov
 * Date: 16-Mar-18
 * Time: 8:22 AM
 * Install by downloading phpunit.phar https://phpunit.de/manual/4.8/en/installation.html
 * Run by
 * #phpunit Pymc3QuerierTest.php
 * or to debug
 * #php -dxdebug.remote_autostart=On bin/phpunit Pymc3QuerierTest.php
 */
$path = dirname(__FILE__);
require_once ($path.'/../../../../../web/lib/server/Config.php');
include_once('../Pymc3Querier.php');

class Pymc3QuerierTest extends PHPUnit_Framework_TestCase
{
  /** @var  Pymc3Querier */
  private $pymc3_querier;

  protected function setUp()
  {
    $c = new Config();
    $this->pymc3_querier = new Pymc3Querier($c->getPymc3Path(), $c->getDefaultPath('tmp'));
  }

  /**
   * @dataProvider dataProvider
   */
  public function testPymc3($graph, $probabilities, $expectProb, $expectMain)
  {
    $this->pymc3_querier->initEdgeHashes($graph);

    $probs = $this->pymc3_querier->createProbabilitiesPart($graph, $probabilities);
    $this->assertMultiLineEquals($expectProb, $probs);

    $mainPart = $this->pymc3_querier->createMainPart($graph, $probabilities);
    $this->assertMultiLineEquals($expectMain, $mainPart);
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
    $graph1 = include 'data/factWithParent.php';
    $graph2 = include 'data/twoParents.php';
    $graph3 = include 'data/inconsistentEvidences.php';
    return [
        $graph1,
        $graph2,
        $graph3,
    ];
  }
}
