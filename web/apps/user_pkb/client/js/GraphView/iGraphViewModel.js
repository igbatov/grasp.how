/**
 * GraphView may or may not set properties of nodes or edges - it does not affect model.
 * Model can be changed only means of event 'request_for_graph_model_change'
 *
 * @typedef {{
 *  nodes: Object.<number,{id:number, label:string, type:string, icon: Object, nodeContentId: string}>,
 *  edges: Object.<number,{id:number, type:string, source:number, target:number, edgeContentId: string}>
 * }}
 */
GRASP.iGraphViewModel = {
  nodes: {},
  edges: {}
};