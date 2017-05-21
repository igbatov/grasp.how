<?php

/**
 * This class produce data that is used in embedded graph
 * TODO This can be implemented by means of Graphs methods only, without direct call to db
 * Class EmbGraph
 */
class EmbGraph{
  private  $db;
  private  $graphs;

  function __construct(MultiTenantDB $db, ContentIdConverter $contentIdConverter, GraphIdConverter $graphIdConverter, Graphs $graphs) {
    $this->db = $db;
    $this->contentIdConverter = $contentIdConverter;
    $this->graphIdConverter = $graphIdConverter;
    $this->graphs = $graphs;
  }

  /**
   * Select graphs data from db
   * @param $graph_ids
   * @return array
   */
  public function getGraphsData($graph_ids){
    $graph = array();
    foreach ($graph_ids as $graph_id) {
      $this->graphIdConverter->throwIfNowGlobal($graph_id);
      $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
      $authId = $this->graphIdConverter->getAuthId($graph_id);
      $graph_settings_row = $this->db->exec($authId, "SELECT * FROM graph_settings WHERE graph_id = '".$localGraphId."'")[0];

      // get node types
      $graph_settings = json_decode($graph_settings_row['settings'], true);
      foreach($graph_settings['skin']['node']['attr']['typeColors'] as $type => $color){
        $nodeDecoration[$graph_settings_row['graph_id']][$type] = $color;
        $nodeTypes[$graph_settings_row['graph_id']][$type] = $type;
      }

      // get edge types
      $graph_settings = json_decode($graph_settings_row['settings'], true);
      foreach($graph_settings['skin']['edge']['attr']['typeColors'] as $type => $color){
        $edgeDecoration[$graph_settings_row['graph_id']][$type] = $color;
        $edgeTypes[$graph_settings_row['graph_id']][$type] = $type;
      }

      // get names and node types
      $graph_row = $this->db->exec($authId, "SELECT * FROM graph WHERE id = '".$localGraphId."'")[0];
      $graph_settings = json_decode($graph_row['graph'], true);
      $graph[$graph_id] = array("name"=>$graph_settings["name"], "nodeTypes"=>$graph_settings["nodeTypes"], "edgeTypes"=>$graph_settings["edgeTypes"]);

      // get nodes and edges
      $local_content_ids = array();
      $rows = $this->db->exec($authId, "SELECT * FROM graph_history WHERE graph_id = '".$graph_row['id']."' ORDER BY step DESC LIMIT 1");
      foreach($rows as $row){
        $elements = json_decode($row['elements'], true);
        $mapping = json_decode($row['node_mapping'], true);

        if(!$elements){ error_log("EmbGraph:: No elements in graph history, graph_id=".$graph_id); return false;}
        if(!$mapping){ error_log("EmbGraph:: No mapping in graph history, graph_id=".$graph_id); return false;}

        $graph[$graph_id]["nodes"] = $elements['nodes'];
        $graph[$graph_id]["edges"] = $elements['edges'];
        $graph[$graph_id]["area"] = $mapping["area"];

        foreach($elements['nodes'] as $node){
          $local_content_id = $this->contentIdConverter->decodeContentId($node['nodeContentId'])['local_content_id'];
          $local_content_ids[$local_content_id] = $node['id'];
        }
      }
     
      if(!count($local_content_ids)) continue; 
     
      // get nodes contents
      $graph[$graph_id]["nodeContents"] = array();
      foreach(array_keys($local_content_ids) as $local_content_id){
        $global_content_ids[] = $this->contentIdConverter->createGlobalContentId(
          $this->graphIdConverter->createGlobalGraphId($authId, $graph_row['id']),
          $local_content_id
        );
      }

      foreach($this->graphs->getGraphNodeContent($global_content_ids) as $global_content_id => $content){
        $local_content_id = $this->contentIdConverter->decodeContentId($global_content_id)['local_content_id'];
        $content['nodeId'] = $global_content_id;
        $graph[$graph_id]["nodeContents"][$local_content_ids[$local_content_id]] = $content;
      }

      // set active_alternative_id of alternative with max reliability
      foreach($graph[$graph_id]["nodeContents"] as $node_id => $content){
        $max_reliability = 0;
        foreach($content['alternatives'] as $alternative_id => $alternative){
          if($alternative['reliability'] > $max_reliability){
            $max_reliability = $alternative['reliability'];
            $graph[$graph_id]["nodeContents"][$node_id]['active_alternative_id'] = $alternative_id;
          }
        }

      }

      // convert data to the appropriate format
      $base_size = min(min($mapping["area"]["width"], $mapping["area"]["height"])/(2*count($elements['nodes'])), 5);
      $graph[$graph_id]["nodes"] = $this->convertNodes($graph[$graph_id]["nodes"], $mapping["mapping"], $graph[$graph_id]["nodeContents"], $nodeDecoration[$graph_row['id']], $base_size);
      $graph[$graph_id]["nodeTypes"] = $this->convertNodeTypes($graph[$graph_id]["nodeTypes"], $nodeTypes[$graph_row['id']], $nodeDecoration[$graph_row['id']]);
      $graph[$graph_id]["edgeTypes"] = $this->convertEdgeTypes($graph[$graph_id]["edgeTypes"], $edgeDecoration[$graph_row['id']]);

      // add edge types
      $edgeContentIds = array();
      foreach($graph[$graph_id]["edges"] as $edge) $edgeContentIds[] = $edge['edgeContentId'];
      foreach($this->graphs->getEdgeAttributes($edgeContentIds) as $global_content_id => $attr){
        foreach($graph[$graph_id]["edges"] as $k => $edge){
          if($edge['edgeContentId'] == $global_content_id) $graph[$graph_id]["edges"][$k]['type'] = $attr['type'];
        }
      }

      // add nodeId - globalContentId correspondence (for js getCondPsInfo function)
      $node_id_global_content_id_map = array();
      foreach($local_content_ids as $local_content_id=>$node_id){
        $node_id_global_content_id_map[$node_id] = $this->contentIdConverter->createGlobalContentId(
            $this->graphIdConverter->createGlobalGraphId($authId, $graph_row['id']),
            $local_content_id
        );
      }
      $graph[$graph_id]["node_id_global_content_id_map"] = $node_id_global_content_id_map;
    }
    return $graph;
  }

  private function convertEdgeTypes($graph_edge_types, $decoration){
    $decorated_edge_types = array();
    foreach($graph_edge_types as $edge_type){
      $decorated_edge_types[$edge_type] = array("color"=>$decoration[$edge_type]);
    }
    return $decorated_edge_types;
  }

  private function convertNodeTypes($graph_node_types, $base_node_types, $decoration){
    $decorated_node_types = array();
    foreach($graph_node_types as $node_type){
      $decorated_node_types[$node_type] = array("label"=>$base_node_types[$node_type], "color"=>$decoration[$node_type]);
    }
    return $decorated_node_types;
  }

  /**
   * Convert nodes to format suited for graph.js
   * @param $nodes
   * @param $mapping
   * @param $node_contents
   * @param $decoration
   * @param $base_size
   * @return array
   */
  private function convertNodes($nodes, $mapping, $node_contents, $decoration, $base_size){
    $decorated_nodes = array();
    foreach($nodes as $node){
      $active_alternative = $node_contents[$node["id"]]['alternatives'][$node_contents[$node["id"]]['active_alternative_id']];

      if($node_contents[$node["id"]]["importance"] == 0) $importance = 99;
      else $importance = $node_contents[$node["id"]]["importance"];

      if($active_alternative["reliability"] == 0) $reliability = 99;
      else $reliability = $active_alternative["reliability"];

      $node_type = $node_contents[$node["id"]]["type"];
      $decorated_nodes[$node["id"]] = array(
        "id"=>$node["id"],
        "x"=>$mapping[$node["id"]]["x"],
        "y"=>$mapping[$node["id"]]["y"],
        "type"=>$node_type,
        "color"=>$decoration[$node_type],
        "size"=>max(1, 1.8*$base_size*$importance/50),
        "opacity"=>$reliability/99
      );
    }

    return $decorated_nodes;
  }
}
