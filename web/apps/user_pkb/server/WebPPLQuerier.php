<?php
class WebPPLQuerier
{
  private $exec_path;
  private $tmp_dir;

  private $inbound;
  private $traversedRoots;
  private $inboundWT;  // inbound without already traversed nodes (roots)
  private $outbound;

  const TAB = "  ";

  public function __construct($exec_path, $tmp_dir)
  {
    $this->exec_path = $exec_path;
    $this->tmp_dir = $tmp_dir;
  }

  /**
   * Create webppl script and execute it
   * @param $graph
   * @param $probabilities
   *
   * Example for graph e2 --> h1 --> e1
   * $graph = {
   *   nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']}, // every node contains array of its alternatives
   *   edges:[['h1','e1'],['e2','h1']]
   * };
   * $probabilities = {
   *  e1: {
   *    soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
   *    '{"h1":"1"}':{1:0.001, 2:0.999}, // sum must be equal to 1
   *    '{"h1":"2"}':{1:0.999, 2:0.001}  // sum must be equal to 1
   *  },
   *  e2: {
   *    soft:{1:1, 2:0} // soft evidence for e2 and ^e2
   *  },
   *  h1: {
   *    'formula':'
   *       if (e1 === 1) {
   *         return categorical({vs:[1, 2], ps:[0.9999, 0.0001]})
   *       }
   *       if (e1 === 2) {
   *         return categorical({vs:[1, 2], ps:[0.99, 0.01]})
   *       }
   *    ',
   *   }
   * }
   *
   * Example of the WebPPL script
   *
      var softEvidence = function(s_value, value, p) {
        if (s_value === value) {
          return Bernoulli({p: p})
        }
        return Bernoulli({p: 1-p})
      }

      var e2 = function() {
        return categorical({vs:[1, 2], ps:[0.5, 0.5]})
      }
   *
   *  var h1 = function() {
   *
   *  }
      var model = function() {
        var se2 = e2()
        condition(se2 === 1)



      }
   *
   */

}