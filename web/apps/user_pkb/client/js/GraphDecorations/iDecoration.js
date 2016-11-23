/**
 *
 * @typedef {{
 *  scale: number,
 *  nodes:Object.<number,{color:number, borderColor:number, opacity:number, size:number}>,
 *  edges:Object.<number,{color:number, borderColor:number, opacity:number, width:number}>
 * }}
 */
GRASP.iDecoration = {
  scale: Number(),  // An absolute number according to witch all the node size is computed. It is used as reference when somewhere we want to rescale node sizes.
  nodes: {},
  edges: {},
  nodeLabels: {}
};