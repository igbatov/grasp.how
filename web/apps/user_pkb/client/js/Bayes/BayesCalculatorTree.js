/**
 * This is Bayes calculator for special type of networks - it assumes that facts can be only leafs in graph
 * TODO: Сделать полноценный вариант. Простой алгоритм сэмплинга такой:
 * Предварительные условия.
 * 1. Если факт, то есть поле soft evidence
 (заполняется на основе источников данных, алгоритм вычисления reliability его не может менять).
 Это же называется reliability. У факта может быть только две альтерантивы - факт верен и не верен.
 Соответственно soft evidence задается в виде {"true":0.99, "false":"0.01"}
 2. Если proposition, то есть поле априорная вероятность (человек его не может менять).
 Изначально это поле равно 1/<кол-во альтернатив>. Потом вычисляется исходя из
 soft evidence родителей и условных вероятностей P(proposition|родители)
 3. У каждого следствия CHILD (=ребенка="узла с кружочком"), не важно факт это или proposition, есть условные вероятности
 P(CHILD|родители) для каждой комбинации значений родителя. Заполняется человеком.
 4. Любое proposition должно быть связано хотя бы с одним фактом или другим proposition. В графе должен быть хотя бы один факт.
 5. Факты-причины (=факты-родители) должны быть независимы
 6. Все следствия child1,child2,child3 причин parent1, parent2, ... должны быть независимы при parent1, parent2, ...
 то есть P(child1,child2,child3|parent1, parent2, ... )=P(child1|parent1, parent2, ...)P(s2|parent1, parent2, ...)P(s3|parent1, parent2, ...)
 7. Граф не должен содержать направленных циклов.


 Алгоритм обновления вероятностей работает следующим образом
 1. Берутся все факты, для каждого генерируется его значение в соответствии с soft evidence.
 2. Берутся вершины которые не являются ничьим ребенком (ни одно ребро не входит, все только выходят).
 Если это факт для которого уже есть значение с шага 1. Если нет, то
 генерируется значение альтернативы в соответствии с априорной вероятностью этой альтернативы.
 1 Цикл по всем детям - берется ребенок, всего его родители, для каждого родителя генерируется значение альтернативы
 в соответствии с априорной вероятностью этой альтернативы (если еще не сгенерилось). Для факта эта вероятность берется из soft evidence.
 2 генерируется значение ребенка в соответствии с распределением P(child|parent1,parent2,...).
 Если ребенок это факт, то он имеет сгенеренное значение на шаге 1. Если только что сгенеренное значение совпадает с этим,
 то заносим в таблицу. Если нет, останавливаем цикл и переходим на шаг 1.
 Если ребенок это proposition, то делаем для него шаг 2.1
 3. Если мы находимся на этом шаге, значит мы сгенерили для узлов значения альтернатив, соответствующие soft evidence фактов.
 Заносим этот вектор в таблицу consistentAlternativeValues. Если мы сделали шаг 3 уже 10000 раз
 или consistentAlternativeValues содержит 1000 значений Идем на шаг 4.
 4.Вероятность каждой альтернативы считается как
 "кол-во её вхождений в consistentAlternativeValues"/"кол-во строк в consistentAlternativeValues"

 Всего получается O(10000*(кол-во вершин в графе)) операций

 Другое алгоритмы - Markov Chain Monte Carlo, message passing
 * @param approx_sampling_num
 * @param mloca
 * @param randomGeneratorFactory
 * @param is_debug_on
 * @constructor
 */

YOVALUE.BayesCalculatorTree = function(approx_sampling_num, mloca, randomGeneratorFactory, is_debug_on){
  this.IS_DEBUG_ON = typeof(is_debug_on) == 'undefined' ? false : is_debug_on;
  this.MLOCA = typeof(mloca) == 'undefined' ? 10000 : mloca;  // Maximum Length Of Children Combination Alternatives
  this.APPROX_SAMPLING_NUM = typeof(approx_sampling_num) == 'undefined' ? 10000 : approx_sampling_num;
  // For every layer of graph (i.e. array of parents and their direct children)
  // this will contain this.APPROX_SAMPLING_NUM samples of parents and children values
  // generated according to conditional probabilities (these are stored in children).
  // For every parent prior probabilities of alternatives are equal
  this.jointSamples = {};
  this.randomGenerator = {};
  // this factory must get seed as argument and return random number generator (=this.randomGenerator)
  this.randomGeneratorFactory = randomGeneratorFactory;
  this.setRandomSeed();
  // List of every node conditional DPDs given its child evidences.
  // Key of this.nodeDPD[nodeId] is the vector of concrete child evidences, value id DPD of node Alternatives
  this.nodeDPD = {};

  this.posteriorProbability = {}; // key - nodeId, value - probabilities of node Alternatives

  this.graph = {};
};

YOVALUE.BayesCalculatorTree.prototype = {
  setApproxSamplingNum: function(approx_sampling_num){
    this.APPROX_SAMPLING_NUM = approx_sampling_num;
  },

  setMLOCA: function(mloca){
    this.MLOCA = mloca;
  },

  setRandomSeed: function(){
    this.randomGenerator = this.randomGeneratorFactory('hello.');
  },

  calculateNodeAlternativeProbabilities: function(graph, probabilities, callback){
    callback(this.getEvidences());
  },

  getEvidences: function (graph, probabilities){
    // we will change it, so clone
    this.graph = YOVALUE.clone(graph);

    this.setRandomSeed();

    // drop previous cached data
    this.jointSamples = {};
    this.nodeDPD = {};
    this.posteriorProbability = {};

    var maxCount = 1000, cnt=0; // emergency break
    while(YOVALUE.getObjectLength(this.graph.nodes)>0){
      cnt++;
      var leafs = this.getGraphLeafs(this.graph);

      // for every parent calculate its soft evidence ( = posterior probabilities for each alternative)
      var parentIds = this.getParents(this.graph, leafs);

      // calculate evidences for parents if the leafs
      var evidences = this.getLayerEvidences(parentIds, this.graph, probabilities);
      for(var i in evidences) this.posteriorProbability[i] = evidences[i];

      // remove leafs from graph
      this.removeNodes(this.graph, this.getGraphLeafs(this.graph));
      if(cnt>maxCount) break;
    }

    return this.posteriorProbability;
  },

  /**
   * Generates value from given Discrete Probability Distribution
   * dpd - discrete probability distribution in a form {v1:p1, v2:p2, ..., vn:pn}
   * return v1 or v2 or ... vn
   */
  generateDPDValue: function(dpd){
    var random = this.randomGenerator();
    var l=0, r=0;
    for(var value in dpd){
      r+=dpd[value];
      if(l<random && random<r) return value;
      l=r;
    }
  },

  /**
   * Generate this.APPROX_SAMPLING_NUM samples of parents and its children values
   * The result is the table with this.APPROX_SAMPLING_NUM rows.
   *
   */
  getJointSamples: function(probabilities, parentIds, childrenIds, graph){
    var layerId = JSON.stringify( parentIds );
    // we already computed it - just return
    if(typeof(this.jointSamples[layerId]) != 'undefined') return this.jointSamples[layerId];

    // we have not yet computed it - do it now
    var jointP = [];
    var row = {};
    // mare sure parentIds sorted
    parentIds.sort();
    for(var i=0; i<this.APPROX_SAMPLING_NUM; i++){
      row = {};

      // generate parents values
      for(var j in parentIds){
        row[parentIds[j]] = this.generateDPDValue(probabilities[parentIds[j]].soft);
      }

      // generate children values based on conditional probabilities of parents
      for(var j in childrenIds){
        // get parents of this child
        var parentIds = this.getParents(graph, [childrenIds[j]]);
        // get values of this child parents from all parents values
        var childConditionalValues = {};
        for(var k in parentIds){
          if(typeof(row[parentIds[k]]) == 'undefined') throw new Error('There is no '+parentIds[k]+' in the all parents sample '+row);
          childConditionalValues[parentIds[k]] = row[parentIds[k]];
        }

        var key = JSON.stringify(childConditionalValues);
        var childProbabilities = probabilities[childrenIds[j]][key];
        row[childrenIds[j]] = this.generateDPDValue(childProbabilities);
      }
      jointP.push(row);
    }

    this.jointSamples[layerId] = jointP;
    return this.jointSamples[layerId];
  },

  /**
   * Choose between exact or approximate methods
   */
  getMethod: function(graph, nodesIds){
    // check that number children alternatives are not too much
    var locaChildren = this.getLengthOfNodeAlternativeCombinations(graph, nodesIds);
    // if there are too much of them use approximate calculation
    return locaChildren>this.MLOCA ? 'approximate' : 'exact';
  },

  /**
   * Get posterior DPD for every node of a layer (=parentIds)
   */
  getLayerEvidences: function (parentIds, graph, probabilities){
    // container for new soft evidences ( = posterior probabilities)
    // key - parentId, value - parent values probabilities
    var softEvidences = {};

    parentIds.sort();
    for(var i in parentIds){
      var parentId = parentIds[i];
      var parent = graph.nodes[parentId];

      // init posterior probability of parent
      softEvidences[parentId] = {};

      softEvidences[parentId] = this.getNodeEvidences(parentId, parent, graph, probabilities);
    }

    return softEvidences;
  },

  /**
   * Get posterior DPD for a node
   *
   */
  getNodeEvidences: function(parentId, parent, graph, probabilities){
    // all parentId children
    var childrenIds = this.getChildren(graph, [parentId]);
    // all parents of parentId children (including parentId)
    var parentIds = this.getParents(graph, childrenIds);

    // init posteriorDPD
    var posteriorDPD = {}; for(var j in parent) posteriorDPD[parent[j]] = 0;
    if(this.getMethod(childrenIds) == 'approximate'){
      if(this.IS_DEBUG_ON) console.info('Node '+parentId+'. Method: approximate.');

      // CACHE: init container to save already computed DPDs
      if(typeof(this.nodeDPD[parentId]) == 'undefined') this.nodeDPD[parentId] = {};

      // initialize container for parentId samples (= samples of P(parent|evidenceValues)
      // key - parent value (= parent alternative), value - number of events with this alternative
      var parentIdSamples = {};
      for(var i in parent) parentIdSamples[parent[i]] = 0;

      // main sampling loop
      for(var c = 0; c<this.APPROX_SAMPLING_NUM; c++){
        // every child has its own soft evidence - generate hard evidence (v1, v2, ...) based on soft evidence DPD
        var evidenceValues = {};
        for(var i in childrenIds) evidenceValues[childrenIds[i]] = this.generateDPDValue(probabilities[childrenIds[i]].soft);

        // CACHE: If we already calculated DPD for this evidence, just generate parentIdAlternative according to it
        if(typeof(this.nodeDPD[parentId][JSON.stringify(evidenceValues)]) != 'undefined'){
          parentIdSamples[this.generateDPDValue(this.nodeDPD[parentId][JSON.stringify(evidenceValues)])]++;
          continue;
        }

        // now we want P(parentId=Alternative|evidenceValues) for every Alternative of parentId
        // I.e. parentId DPD given its children hard evidence
        var childEvidenceDPD = {}; // key is Alternative, value its probability

        if(this.getMethod(this.getParents(graph,childrenIds)) == 'approximate'){
          if(this.IS_DEBUG_ON) console.info('Node '+parentId+', number of other parents is '+this.getParents(graph,childrenIds).length+'. Method: approximate.');
          var jointSamples = this.getJointSamples(probabilities, parentIds, this.getChildren(graph, parentIds), graph);
          //console.info('jointSamples = ', jointSamples);
          childEvidenceDPD = this.getApproxDPD(parentId, parent, evidenceValues, jointSamples);
          if(this.IS_DEBUG_ON) console.info('P('+parentId+'|', evidenceValues, ') = ', childEvidenceDPD);
        }
        // there are not so much parents for parentId children - use exact calculation
        else{
          childEvidenceDPD = this.getExactDPD(graph, probabilities, parent, parentId, evidenceValues, parentIds, childrenIds);
        }

        this.nodeDPD[parentId][JSON.stringify(evidenceValues)] = childEvidenceDPD;
        // now generate parentIdAlternative according to just calculated childEvidenceDPD
        parentIdSamples[this.generateDPDValue(childEvidenceDPD)]++;
      }

      // divide by overall number of events to get probability from event counts
      for(var i in parent) parentIdSamples[parent[i]] /= this.APPROX_SAMPLING_NUM;
      posteriorDPD = parentIdSamples;
    }
    // else use exact calculation
    else{
      if(this.IS_DEBUG_ON) console.info('Node '+parentId+'. Method: exact.');

      var childEvidenceDPD = {};

      // get all combinations of children alternatives as array of objects [{e1:1, e2:1, ..., en:1},...]
      var evidenceValues = this.getValuesTable(this.getNodes(graph, childrenIds));
      for(var i in evidenceValues){
        childEvidenceDPD[JSON.stringify(evidenceValues[i])] = this.getExactDPD(graph, probabilities, parent, parentId, evidenceValues[i], parentIds, childrenIds);
      }
      for(var i in parent){
        for(var j in evidenceValues){
          var softP = 1;
          for(var k in evidenceValues[j]) softP *= probabilities[k].soft[evidenceValues[j][k]];
          if(this.IS_DEBUG_ON) console.info('evidenceValues='+JSON.stringify(evidenceValues[j]), 'softP='+softP, 'P('+parentId+'='+parent[i]+'|',evidenceValues[j],')='+childEvidenceDPD[JSON.stringify(evidenceValues[j])][parent[i]]);
          posteriorDPD[parent[i]] += softP*childEvidenceDPD[JSON.stringify(evidenceValues[j])][parent[i]];
        }
      }
    }

    if(this.IS_DEBUG_ON) console.info('Node '+parentId+' posteriorDPD = ', posteriorDPD);
    return posteriorDPD;
  },

  /**
   * For given combination of children values (=evidenceValues) get P(parent|evidenceValues)
   * Computed according to bayes formula P(H|E) = P(E|H)*P(H)/(P(E|H)*P(H)+P(E|~H)*P(~H))
   * This formula then generalized to sum over common parents:
   * P(H|E) = SUM_{all 'childrenIds' parents except 'parent'}(P(E|H)*P(H))/SUM_{all 'childrenIds' parents except 'parent'}(P(E|H)*P(H)+P(E|~H)*P(~H))
   */
  getExactDPD: function(graph, probabilities, parent, parentId, evidenceValues, parentIds, childrenIds){
    // get all combinations of parent alternatives as array of objects [{h1:1, h2:1, ..., hn:1},...]
    var parentsValues = this.getValuesTable(this.getNodes(graph, parentIds));

    // joinP is a table of joint probabilities for parentsValues given current (fixed) evidenceValues
    // For example for evidenceValues = {e1:2,e2:2}
    // jointP = {
    //    '{h1:1,h2:1, e1:2,e2:2}':0.15  // = P(e1=2,e2=2|h1=1,h2=1) = P(e1=2|h1=1)P(e2=2|h1=1,h2=1)
    //    '{h1:1,h2:2, e1:2,e2:2}':0.1
    //    '{h1:2,h2:1, e1:2,e2:2}':0.35
    //    '{h1:2,h2:2, e1:2,e2:2}':0.004
    //  }
    var jointP = {};
    var denominator = 0;
    var numerator = {};
    // init
    for(var j in parent) numerator[parent[j]] = 0;

    // calculate P(parent=i|evidenceValues) for every i
    for(var j in parentsValues){
      // initialize
      jointP[JSON.stringify(parentsValues[j])] = 1;

      // get P(childrenIds[1]=evidenceValues[childrenIds[1]]|parentsValues)*P(childrenIds[2]=evidenceValues[childrenIds[2]]|parentsValues)*...
      for(var k in childrenIds){
        var childId = childrenIds[k];
        var childParentIds = this.getParents(graph, childId);
        childParentIds.sort();

        // get key="{parent_j1:parentsValues[j1], parent_j2:parentsValues[j2], ...}" where j1, j2 are parents of childId
        var key = {};  for(var l in childParentIds) key[childParentIds[l]]=parentsValues[j][childParentIds[l]]; key = JSON.stringify(key);
        if(typeof(probabilities[childId][key]) == 'undefined') throw new Error('There is no conditional probability '+key+' for node '+childrenIds[k]);
        jointP[JSON.stringify(parentsValues[j])] *= probabilities[childId][key][evidenceValues[childId]];
      }

      denominator += jointP[JSON.stringify(parentsValues[j])];
      numerator[parentsValues[j][parentId]] += jointP[JSON.stringify(parentsValues[j])];
    }

    for(var j in parent) numerator[parent[j]] = numerator[parent[j]]/denominator;
    return numerator;
  },

  /**
   * Create cartesian product of variable values
   * @param varValues - in a form {e1:[v11, v12], e2:[v21, v22]}
   * @return object in a form [{e1:v11, e2:v21}, {e1:v11, e2:v22}, ...]
   */
  getValuesTable: function(varValues){
    var table = [{}];
    for(var i in varValues){
      for(var j in table){
        if(typeof(table[j]) == 'undefined') continue;
        for(var k in varValues[i]){
          table.push(YOVALUE.clone(table[j]));
          table[table.length-1][i] = varValues[i][k];
        }
        delete table[j];
      }
    }
    // renumerate array indexes from 0
    var finalTable = [];
    for(var i in table){
      finalTable.push(table[i]);
    }
    return finalTable;
  },

  /**
   * Calculate approx DPD given node, its children hard evidences and table of samples
   */
  getApproxDPD: function(parentId, parent, evidenceValues, jointP){
    var childEvidenceDPD = {};
    // sum of jointP rows with childrenIds = evidenceValues
    var allEventsCount = this.getRowsNum(jointP, evidenceValues);
    for(var j in parent){
      var parentIdAlternative = parent[j];
      // get sum of jointP rows with parentId = parentIdAlternative and childrenIds = evidenceValues
      var fixedColumns = YOVALUE.clone(evidenceValues);
      fixedColumns[parentId] = parentIdAlternative;
      var parentIdAlternativeSUM = this.getRowsNum(jointP, fixedColumns);

      // divide by allEventsCount to get probability of P(parentId=Alternative|Child1=v1,Child2=v1,...)
      childEvidenceDPD[parentIdAlternative] = parentIdAlternativeSUM/allEventsCount;
    }
    return childEvidenceDPD;
  },

  getRowsNum: function(table, fixedColumns){
    var count = 0;
    for(var i in table){
      var match = true;
      for(var j in fixedColumns){
        if(table[i][j] != fixedColumns[j]){
          match = false;
          break;
        }
      }
      if(match == true) count++;
    }
    return count;
  },

  getLengthOfNodeAlternativeCombinations: function(graph, nodeIds){
    var loca = 1;
    for(var i in nodeIds) loca *= graph.nodes[nodeIds[i]].length;
    return loca;
  },

  getNodes: function(graph, nodeIds){
    var nodes = {};
    for(var i in graph.nodes){
      if(nodeIds.indexOf(i) != -1) nodes[i] = graph.nodes[i];
    }
    return nodes;
  },

  getParents: function(graph, nodeIds){
    var parents = {};
    for(var i in graph.edges){
      if(nodeIds.indexOf(graph.edges[i][1]) != -1) parents[graph.edges[i][0]] = 1;
    }
    return YOVALUE.getObjectKeys(parents);
  },

  getChildren: function(graph, nodeIds){
    var children = {};
    for(var i in graph.edges){
      if(nodeIds.indexOf(graph.edges[i][0]) != -1) children[graph.edges[i][1]] = 1;
    }
    return YOVALUE.getObjectKeys(children);
  },

  getGraphLeafs: function(graph){
    var leafs = [];
    var nodeIds = YOVALUE.getObjectKeys(graph.nodes);
    for(var i in nodeIds){
      var hasOutcomeEdge = false;
      for(var j in graph.edges){
        if(graph.edges[j][0] == nodeIds[i]){
          hasOutcomeEdge = true;
          break;
        }
      }
      if(!hasOutcomeEdge) leafs.push(nodeIds[i]);
    }
    return leafs;
  },

  removeNodes: function(graph, nodeIds){
    for(var i in nodeIds){
      delete graph.nodes[nodeIds[i]];
      for(var j in graph.edges) if(graph.edges[j][0] == nodeIds[i] || graph.edges[j][1] == nodeIds[i]) delete graph.edges[j]
    }
  }
};