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

  public function testOneParent()
  {
    /**
     * GRAPH 1:
     *    e2 --> h1 --> e1
     */
    $nodes = [
        'e1'=>[1,2],
        'e2'=>[1,2],
        'h1'=>[1,2]
    ];
    $edges = [
        ["e2","h1"],
        ["h1","e1"]
    ];

    $graph = ['nodes'=>$nodes, 'edges'=>$edges];

    $probabilities = [
        'e1'=>[
            'soft'=>['1'=>0.9, '2'=>0.1], // soft evidence for e1 and ^e1
            '{"h1":"1"}'=>[1=>0.001, 2=>0.999], // sum must be equal to 1
            '{"h1":"2"}'=>[1=>0.999, 2=>0.001]  // sum must be equal to 1
        ],
        'e2'=>[
            'soft'=>['1'=>1, '2'=>0], // soft evidence for e2 and ^e2
        ],
        'h1'=>[
            '{"e2":"1"}'=>[1=>0.9999, 2=>0.0001],
            '{"e2":"2"}'=>[1=>0.5, 2=>0.5]
        ]
    ];

    $this->pymc3_querier->initEdgeHashes($graph);
    $probs = $this->pymc3_querier->createProbabilitiesPart($graph, $probabilities);
    $mustBe = <<<EOT
  e1_virtual_prob = np.array([
    [0.9, 0.1],
    [0.1, 0.9]
  ])
  e1_prob = np.array([
    [0.001, 0.999],
    [0.999, 0.001]
  ])
  e2_prob = np.array([0.5, 0.5])
  h1_prob = np.array([
    [0.9999, 0.0001],
    [0.5, 0.5]
  ])
EOT;

    $this->assertMultiLineEquals($mustBe, $probs);

    $mainPart = $this->pymc3_querier->createMainPart($graph, $probabilities);
    $mustBe = <<<EOT
  e2 = pm.Categorical('e2', p=e2_prob, observed=0)
  h1_prob_shared = theano.shared(h1_prob)  # make it global
  h1_prob_final = h1_prob_shared[e2]
  h1 = pm.Categorical('h1', p=h1_prob_final)
  e1_prob_shared = theano.shared(e1_prob)  # make it global
  e1_prob_final = e1_prob_shared[h1]
  e1 = pm.Categorical('e1', p=e1_prob_final)
  e1_virtual_prob_shared = theano.shared(e1_virtual_prob)
  e1_virtual_prob_final = e1_virtual_prob_shared[e1]
  e1_virtual = pm.Categorical('e1_virtual', p=e1_virtual_prob_final, observed=0)
EOT;
    $this->assertMultiLineEquals($mustBe, $mainPart);
  }

  public function testTwoParents()
  {
    /**
     * GRAPH 1:
     *  e2 --> h1 <-- e1
     */
    $nodes = [
        'e1'=>[1,2],
        'e2'=>[1,2],
        'h1'=>[1,2]
    ];
    $edges = [
        ["e2","h1"],
        ["e1","h1"]
    ];

    $graph = ['nodes'=>$nodes, 'edges'=>$edges];

    $probabilities = [
        'e1'=>[
            'soft'=>['1'=>0.9, '2'=>0.1], // soft evidence for e1 and ^e1
        ],
        'e2'=>[
            'soft'=>['1'=>1, '2'=>0], // soft evidence for e2 and ^e2
        ],
        'h1'=>[
            '{"e2":"1", "e1":"1"}'=>[1=>0.9, 2=>0.1],
            '{"e2":"1", "e1":"2"}'=>[1=>0.99, 2=>0.01],
            '{"e2":"2", "e1":"1"}'=>[1=>0.999, 2=>0.001],
            '{"e2":"2", "e1":"2"}'=>[1=>0.9999, 2=>0.0001],
        ]
    ];

    $this->pymc3_querier->initEdgeHashes($graph);
    $probs = $this->pymc3_querier->createProbabilitiesPart($graph, $probabilities);
    $mustBe = <<<EOT
  e1_virtual_prob = np.array([
    [0.9, 0.1],
    [0.1, 0.9]
  ])
  e1_prob = np.array([0.5, 0.5])
  e2_prob = np.array([0.5, 0.5])
  h1_prob = np.array([
    [
        [0.9, 0.1],
        [0.999, 0.001]
    ],
    [
        [0.99, 0.01],
        [0.9999, 0.0001]
    ]
  ])
EOT;

    $this->assertMultiLineEquals($mustBe, $probs);

    $mainPart = $this->pymc3_querier->createMainPart($graph, $probabilities);
    $mustBe = <<<EOT
  e1 = pm.Categorical('e1', p=e1_prob)
  e1_virtual_prob_shared = theano.shared(e1_virtual_prob)
  e1_virtual_prob_final = e1_virtual_prob_shared[e1]
  e1_virtual = pm.Categorical('e1_virtual', p=e1_virtual_prob_final, observed=0)
  e2 = pm.Categorical('e2', p=e2_prob, observed=0)
  h1_prob_shared = theano.shared(h1_prob)  # make it global
  h1_prob_final = h1_prob_shared[e1, e2]
  h1 = pm.Categorical('h1', p=h1_prob_final)
EOT;
    $this->assertMultiLineEquals($mustBe, $mainPart);
  }


  private function assertMultiLineEquals($mustBe, $result){
    $mustBeLines = explode("\n", $mustBe);
    $resultLines = explode("\n",$result);
    foreach ($mustBeLines as $i => $mustBeLine) {
      $this->assertEquals(trim($mustBeLine, "\n\r"), trim($resultLines[$i],"\n\r"));
    }
  }
}
