<?php

/**
 * This class produce data that is used in embedded graph
 * TODO This can be implemented by means of Graphs methods only, without direct call to db
 * Class EmbGraph
 */
class EmbGraph{
  private  $db;
  private  $graphs;

  function __construct(DB $db, ContentIdConverter $contentIdConverter, Graphs $graphs) {
    $this->db = $db;
    $this->contentIdConverter = $contentIdConverter;
    $this->graphs = $graphs;
  }

  /**
   * Select graphs data from db
   * @param $graph_ids
   * @return array
   */
  public function getGraphsData($graph_ids){
    $graph_settings_rows = $this->db->execute("SELECT * FROM graph_settings WHERE graph_id IN ('".implode("','", $graph_ids)."')");

    // get node types
    foreach($graph_settings_rows as $graph_settings_row){
      $graph_settings = json_decode($graph_settings_row['settings'], true);
      foreach($graph_settings['skin']['node']['attr']['typeColors'] as $type => $color){
        $nodeDecoration[$graph_settings_row['graph_id']][$type] = $color;
        $nodeTypes[$graph_settings_row['graph_id']][$type] = $type;
      }
    }

    // get edge types
    foreach($graph_settings_rows as $graph_settings_row){
      $graph_settings = json_decode($graph_settings_row['settings'], true);
      foreach($graph_settings['skin']['edge']['attr']['typeColors'] as $type => $color){
        $edgeDecoration[$graph_settings_row['graph_id']][$type] = $color;
        $edgeTypes[$graph_settings_row['graph_id']][$type] = $type;
      }
    }


    $graph = array();

    // get names and node types
    $graph_rows = $this->db->execute("SELECT * FROM graph WHERE id IN ('".implode("','", $graph_ids)."')");
    foreach($graph_rows as $graph_row){
      $graph_settings = json_decode($graph_row['graph'], true);
      $graph[$graph_row['id']] = array("name"=>$graph_settings["name"], "nodeTypes"=>$graph_settings["nodeTypes"], "edgeTypes"=>$graph_settings["edgeTypes"]);

      // get nodes and edges
      $local_content_ids = array();
      $rows = $this->db->execute("SELECT * FROM graph_history WHERE graph_id = '".$graph_row['id']."' ORDER BY step DESC LIMIT 1");
      foreach($rows as $row){
        $elements = json_decode($row['elements'], true);
        $mapping = json_decode($row['node_mapping'], true);

        if(!$elements){ error_log("EmbGraph:: No elements in graph history, graph_id=".$graph_row['id']); return false;}
        if(!$mapping){ error_log("EmbGraph:: No mapping in graph history, graph_id=".$graph_row['id']); return false;}

        $graph[$graph_row['id']]["nodes"] = $elements['nodes'];
        $graph[$graph_row['id']]["edges"] = $elements['edges'];
        $graph[$graph_row['id']]["area"] = $mapping["area"];

        foreach($elements['nodes'] as $node){
          $local_content_id = $this->contentIdConverter->decodeContentId($node['nodeContentId'])['local_content_id'];
          $local_content_ids[$local_content_id] = $node['id'];
        }
      }

      // get nodes contents
      $graph[$graph_row['id']]["nodeContents"] = array();
      foreach(array_keys($local_content_ids) as $local_content_id){
        $global_content_ids[] = $this->contentIdConverter->createGlobalContentId($graph_row['id'], $local_content_id);
      }
      foreach($this->graphs->getGraphNodeContent($global_content_ids) as $global_content_id => $content){
        $local_content_id = $this->contentIdConverter->decodeContentId($global_content_id)['local_content_id'];
        $graph[$graph_row['id']]["nodeContents"][$local_content_ids[$local_content_id]] = $content;
      }
/*
      $rows = $this->db->execute("SELECT * FROM node_content WHERE graph_id = '".$graph_row['id']."' AND local_content_id IN ('".implode("','", array_keys($local_content_ids))."')");
      foreach($rows as $row){
        $graph[$graph_row['id']]["nodeContents"][$local_content_ids[$row['local_content_id']]] = array("label"=>$row['label'], "text"=>$row['text'], "type"=>$row['type'], "importance"=>$row['importance'], "reliability"=>$row['reliability']);
      }
*/
      // convert data to the appropriate format
      $base_size = min(min($mapping["area"]["width"], $mapping["area"]["height"])/(2*count($elements['nodes'])), 5);
      $graph[$graph_row['id']]["nodes"] = $this->convertNodes($graph[$graph_row['id']]["nodes"], $mapping["mapping"], $graph[$graph_row['id']]["nodeContents"], $nodeDecoration[$graph_row['id']], $base_size);
      $graph[$graph_row['id']]["nodeTypes"] = $this->convertNodeTypes($graph[$graph_row['id']]["nodeTypes"], $nodeTypes[$graph_row['id']], $nodeDecoration[$graph_row['id']]);
      $graph[$graph_row['id']]["edgeTypes"] = $this->convertEdgeTypes($graph[$graph_row['id']]["edgeTypes"], $edgeDecoration[$graph_row['id']]);

      // remove root node with its edges
      foreach($graph[$graph_row['id']]["nodes"] as $node){
        if($graph[$graph_row['id']]["nodeContents"][$node["id"]]["label"] == "root"){
          unset($graph[$graph_row['id']]["nodeContents"][$node["id"]]);
          unset($graph[$graph_row['id']]["nodes"][$node["id"]]);
          foreach($graph[$graph_row['id']]["edges"] as $edge){
            if($edge["source"] == $node["id"]) unset($graph[$graph_row['id']]["edges"][$edge["id"]]);
          }
        }
      }

      // add edge types
      $edgeContentIds = array();
      foreach($graph[$graph_row['id']]["edges"] as $edge) $edgeContentIds[] = $edge['edgeContentId'];
      foreach($this->graphs->getEdgeAttributes($edgeContentIds) as $global_content_id => $attr){
        foreach($graph[$graph_row['id']]["edges"] as $k => $edge){
          if($edge['edgeContentId'] == $global_content_id) $graph[$graph_row['id']]["edges"][$k]['type'] = $attr['type'];
        }
      }

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

  private function convertNodes($nodes, $mapping, $node_contents, $decoration, $base_size){
    $decorated_nodes = array();
    foreach($nodes as $node){
      if($node_contents[$node["id"]]["importance"] == 0) $importance = 99;
      else $importance = $node_contents[$node["id"]]["importance"];

      if($node_contents[$node["id"]]["reliability"] == 0) $reliability = 99;
      else $reliability = $node_contents[$node["id"]]["reliability"];

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
