<?php
/**
 * GRAPH:
 *    e2 --> h1 --> e1
 */
$graph = [
    'nodes'=>[
        'e1'=>[1,2], 'e2'=>[1,2], 'h1'=>[1,2]
    ],
    'edges'=>
        [
            ["e2","h1"],
            ["h1","e1"]
        ]
];

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

$expectedProbScript = <<<EOT
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

$expectedMainScript = <<<EOT
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

return [
    'graph' => $graph,
    'probabilities' => $probabilities,
    'expectedProbScript' => $expectedProbScript,
    'expectedMainScript' => $expectedMainScript,
];
