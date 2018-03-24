<?php
/**
 * GRAPH:
 *    e2 <-- h1 --> e1
 */
$graph = [
    'nodes'=>[
        'e1'=>[1,2], 'e2'=>[1,2], 'h1'=>[1,2]
    ],
    'edges'=>
    [
        ["h1","e1"],
        ["h1","e2"]
    ]
];

$probabilities = [
    'e1'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>1, 2=>0], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>0, 2=>1]  // sum must be equal to 1
    ],
    'e2'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>0, 2=>1], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>1, 2=>0]  // sum must be equal to 1
    ],
    'h1'=>[]
];

$expectedProbScript = <<<EOT
  e1_prob = np.array([
    [1, 0],
    [0, 1]
  ])
  e2_prob = np.array([
    [0, 1],
    [1, 0]
  ])
  h1_prob = np.array([0.5, 0.5])
EOT;

$expectedMainScript = <<<EOT
  h1 = pm.Categorical('h1', p=h1_prob)
  e1_prob_shared = theano.shared(e1_prob)  # make it global
  e1_prob_final = e1_prob_shared[h1]
  e1 = pm.Categorical('e1', p=e1_prob_final, observed=0)
  e2_prob_shared = theano.shared(e2_prob)  # make it global
  e2_prob_final = e2_prob_shared[h1]
  e2 = pm.Categorical('e2', p=e2_prob_final, observed=0)
EOT;

return [
    'graph' => $graph,
    'probabilities' => $probabilities,
    'expectedProbScript' => $expectedProbScript,
    'expectedMainScript' => $expectedMainScript,
];
