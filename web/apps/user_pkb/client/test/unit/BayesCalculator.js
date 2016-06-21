describe("BayesCalculator", function(){
  beforeEach(function(){
    /**
     * GRAPH 1:
     *   h1 --> e1
     */
    this.probabilities1 = {
      e1: {
        soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
        '{"h1":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
        '{"h1":"2"}':{1:0.5, 2:0.5}  // sum must be equal to 1
      },
      h1: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      }
    };

    this.graph1 = {
      // every node contains array of its alternatives
      nodes:{'e1':['1','2'], 'h1':['1','2']},
      edges:[['h1','e1']]
    };

    /**
     * GRAPH 2:
     *   h1 --> e1
     *    \---> e2
     */
    this.probabilities2 = {
      e1: {
        soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
        '{"h1":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
        '{"h1":"2"}':{1:0.5, 2:0.5}  // sum must be equal to 1
      },
      e2: {
        soft:{1:0.8, 2:0.2}, // soft evidence for e2 and ^e2
        '{"h1":"1"}':{1:0.95, 2:0.05}, // sum must be equal to 1
        '{"h1":"2"}':{1:0.05, 2:0.95}  // sum must be equal to 1
      },
      h1: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      }
    };

    this.graph2 = {
      // every node contains array of its alternatives
      nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']},
      edges:[['h1','e1'],['h1','e2']]
    };

    /**
     * GRAPH 3:
     *   h1 ---> e1 <--- h2
     */
    this.probabilities3 = {
      e1: {
        soft:{1:0.85, 2:0.15}, // soft evidence for e2 and ^e2
        '{"h1":"1","h2":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
        '{"h1":"1","h2":"2"}':{1:0.1, 2:0.9}, // sum must be equal to 1
        '{"h1":"2","h2":"1"}':{1:0.1, 2:0.9}, // sum must be equal to 1
        '{"h1":"2","h2":"2"}':{1:0.1, 2:0.9}  // sum must be equal to 1
      },
      h1: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      },
      h2: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      }
    };

    this.graph3 = {
      // every node contains array of its alternatives
      nodes:{'e1':['1','2'], 'h1':['1','2'], 'h2':['1','2']},
      edges:[['h1','e1'],['h2','e1']]
    };

    /**
     * GRAPH 4:
     *   h1 --> e1
     *    \---> e2 <--- h2
     */
    this.probabilities4 = {
      e1: {
        soft:{1:0.75, 2:0.25}, // soft evidence for e1 and ^e1
        '{"h1":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
        '{"h1":"2"}':{1:0.2, 2:0.8}  // sum must be equal to 1
      },
      e2: {
        soft:{1:0.85, 2:0.15}, // soft evidence for e2 and ^e2
        '{"h1":"1","h2":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
        '{"h1":"1","h2":"2"}':{1:0.1, 2:0.9}, // sum must be equal to 1
        '{"h1":"2","h2":"1"}':{1:0.1, 2:0.9}, // sum must be equal to 1
        '{"h1":"2","h2":"2"}':{1:0.1, 2:0.9}  // sum must be equal to 1
      },
      h1: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      },
      h2: {
        soft:{1:0.5, 2:0.5} // soft evidence == prior probability
      }
    };

    this.graph4 = {
      // every node contains array of its alternatives
      nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2'], 'h2':['1','2']},
      edges:[['h1','e1'],['h1','e2'],['h2','e2']]
    };

    this.bc = new YOVALUE.BayesCalculator(2, 1000, YOVALUE.randomGeneratorFactory, false);
  });

  it("getGraphLeafs", function () {
    expect(this.bc.getGraphLeafs(this.graph4)).toBeJsonEqual(['e1', 'e2']);
  });

  it("getParents", function () {
    expect(this.bc.getParents(this.graph4,['e2'])).toBeJsonEqual(['h1','h2']);
  });

  it("getChildren", function () {
    expect(this.bc.getChildren(this.graph4,['h1'])).toBeJsonEqual(['e1','e2']);
  });

  it("getLengthOfChildrenAlternativeCombinations", function () {
    expect(this.bc.getLengthOfNodeAlternativeCombinations(this.graph4,['e1','e2'])).toEqual(4);
  });

  it("generateDPDValue", function () {
    this.bc.setRandomSeed();
    expect(this.bc.generateDPDValue({1:0.2, 2:0.8})).toEqual('2');
    expect(this.bc.generateDPDValue({1:0.2, 2:0.8})).toEqual('1');
  });

  it("getJointSamples", function () {
    this.bc.setRandomSeed();
    expect(this.bc.getJointSamples(this.probabilities4, ['h1', 'h2'], ['e1', 'e2'], this.graph4)).toBeJsonEqual([ { h1 : '2', h2 : '1', e1 : '2', e2 : '2' }, { h1 : '2', h2 : '1', e1 : '2', e2 : '2' } ]);
  });

  it("getRowsNum", function () {
    expect(this.bc.getRowsNum([{c1:1, c2:1, c3:1},{c1:2, c2:1, c3:1},{c1:1, c2:2, c3:1}], {c2:1,c3:1})).toEqual(2);
  });

  it("getValuesTable", function () {
    expect(this.bc.getValuesTable({e1:[11, 12], e2:[21,22], e3:[31, 32]})).toBeJsonEqual([
      {e1:11,e2:21,e3:31},
      {e1:11,e2:21,e3:32},
      {e1:11,e2:22,e3:31},
      {e1:11,e2:22,e3:32},
      {e1:12,e2:21,e3:31},
      {e1:12,e2:21,e3:32},
      {e1:12,e2:22,e3:31},
      {e1:12,e2:22,e3:32},
    ]);
  });

  it("getEvidences: exact method", function () {
    expect(this.bc.getEvidences(this.graph1, this.probabilities1)).toEqual({h1:{1:0.5952380952380953,2:0.40476190476190477}});
    expect(this.bc.getEvidences(this.graph2, this.probabilities2)).toEqual({h1:{1: 0.7786640442890443, 2: 0.22133595571095574}});
    expect(this.bc.getEvidences(this.graph3, this.probabilities3)).toEqual({h1:{1: 0.7619047619047619, 2: 0.23809523809523808}, h2:{1: 0.7619047619047619, 2: 0.23809523809523808}});
    expect(this.bc.getEvidences(this.graph4, this.probabilities4)).toEqual({h1:{1:0.7748953174485089, 2:0.22510468255149113}, h2:{1:0.7619047619047619, 2:0.23809523809523808}});
  });


  it("getEvidences: approximate method", function () {
    this.bc.setApproxSamplingNum(10000);
    this.bc.setMLOCA(-1);
    expect(this.bc.getEvidences(this.graph1, this.probabilities1)).toEqual({h1:{1:0.5931,2:0.4069}});
    expect(this.bc.getEvidences(this.graph2, this.probabilities2)).toEqual({h1:{1: 0.7749, 2: 0.2251}});
    expect(this.bc.getEvidences(this.graph3, this.probabilities3)).toEqual({h1:{1: 0.7498, 2: 0.2502},h2:{1: 0.7581, 2: 0.2419}});
    expect(this.bc.getEvidences(this.graph4, this.probabilities4)).toEqual({h1:{1: 0.7631, 2: 0.2369},h2:{1: 0.7588, 2: 0.2412}});
  });
});
