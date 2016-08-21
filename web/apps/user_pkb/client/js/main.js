var DEBUG_MODE = !true;

/**
 * List of modules
 * @type {Object}
 */
var Modules = {
  Mediator: YOVALUE.Mediator,
  Publisher: YOVALUE.Publisher,

  GraphModelFactory: YOVALUE.GraphModelFactory,
  GraphElementsContent: YOVALUE.GraphElementsContent,
  GraphModelsPubSub: YOVALUE.GraphModelsPubSub,

  GraphHistory: YOVALUE.GraphHistory,

  kinetic:Kinetic,
  CanvasDrawer: YOVALUE.CanvasDrawer,
  CanvasDrawerFactory: YOVALUE.CanvasDrawerFactory,

  SVGDrawer: YOVALUE.SVGDrawer,
  SVGDrawerFactory: YOVALUE.SVGDrawerFactory,

  GraphViewFactory: YOVALUE.GraphViewFactory,
  GraphViewsPubSub: YOVALUE.GraphViewsPubSub,

  HistoryController: YOVALUE.HistoryController,
  AddRemoveElementController: YOVALUE.AddRemoveElementController,
  ModelChangeController: YOVALUE.ModelChangeController,
  MappingChangeController: YOVALUE.MappingChangeController,
  SelectElementController: YOVALUE.SelectElementController,
  ShowEditorController: YOVALUE.ShowEditorController,
  DragModeChangeController: YOVALUE.DragModeChangeController,
  GraphControllerPubSub: YOVALUE.GraphControllerPubSub,
  GraphControllerModules: Array,

  Repository: YOVALUE.Repository,

  KeyManager: YOVALUE.KeyManager,
  StatusString: YOVALUE.StatusString,

  GraphLayoutNamesConfig: YOVALUE.GraphLayoutNamesConfig,
  GraphSkinNamesConfig: YOVALUE.GraphSkinNamesConfig,

  GraphMenu: YOVALUE.GraphMenu,
  SelectGraphLayoutModel: YOVALUE.SelectGraphLayoutModel,
  SelectGraphSkinModel: YOVALUE.SelectGraphSkinModel,

  GraphNodeMappingsPubSub: YOVALUE.GraphNodeMappingsPubSub,
  GraphNodeLabelMappingsPubSub: YOVALUE.GraphNodeLabelMappingsPubSub,

  GraphDecoration: YOVALUE.GraphDecorationByType,
  GraphDecorationsPubSub: YOVALUE.GraphDecorationsPubSub,

  ViewManager: YOVALUE.ViewManager,
  UIElements: YOVALUE.UIElements,
  GraphElementEditor: YOVALUE.GraphElementEditor,

  jQuery: jQuery,
  Ajax: YOVALUE.Ajax,
  Promise: YOVALUE.Promise,

  imageLoader: YOVALUE.imageLoader,

  NodeListCache: YOVALUE.NodeListCache,

  BayesPubSub: YOVALUE.BayesPubSub,
  BayesCalculator: YOVALUE.BayesCalculatorGRain
};

/**
 * Dependency injection array - provides arguments for constructor of every module that is instantiated at the very beginning
 * Modules that are not instantiated are not represented in DI:  kinetic, jQuery
 * @type {Object}
 */
var DI = {
  Ajax: ['jQuery'],
  Promise: ['jQuery'],
  Mediator: [],
  Publisher:['Mediator', 'Promise'],

  GraphModelFactory: [],
  GraphElementsContent: ['Publisher'],
  GraphModelsPubSub: ['Publisher', 'GraphModelFactory'],

  GraphHistory: ['Publisher'],

  ViewManager: ['jQuery', {
    horizontalMenu: {id:'horizontalMenu',padding:[0,0]},
    leftGraphElementEditor: {id:'leftGraphElementEditorContainer',padding:[0,0]},
    rightGraphElementEditor: {id:'rightGraphElementEditorContainer',padding:[0,0]},
    graphViews: {id:'graphViews',padding:[15,0]},
    statusString: {id:'statusString'}
  }],
  UIElements: [],

  KeyManager: ['Publisher'],
  StatusString: ['Publisher', 'ViewManager', 'jQuery'],

  GraphViewNodeFactory:[],
  GraphViewEdgeFactory:[],
  GraphViewNodeLabelFactory:[],
  CanvasDrawerFactory:['kinetic', 'jQuery'],
  SVGDrawerFactory:[],
  GraphViewFactory:[],
  GraphViewsPubSub:['Publisher', 'GraphViewFactory', 'ViewManager', 'SVGDrawerFactory'],

  AddRemoveElementController:['Publisher'],
  HistoryController:['Publisher'],
  ModelChangeController:['Publisher','ViewManager'],
  MappingChangeController:['Publisher'],
  SelectElementController:['Publisher'],
  ShowEditorController:['Publisher'],
  DragModeChangeController:['Publisher'],
  GraphControllerModules:[
    'HistoryController',
    'ModelChangeController',
    'AddRemoveElementController',
    'SelectElementController',
    'ShowEditorController',
    'MappingChangeController',
    'DragModeChangeController'
  ],
  GraphControllerPubSub:['Publisher', 'GraphControllerModules'],

  imageLoader: ['Promise'],
  Repository: ['Publisher', 'Ajax', 'imageLoader'],

  GraphMenu: ['Publisher', 'ViewManager', 'UIElements', 'jQuery'],

  SelectGraphLayoutModel: ['Publisher',{
    basicLayout: {
      node:{
        constructor: YOVALUE.GraphNodeMappingForceDirected,
        attr: {}
      },
      nodeLabel:{
        constructor: YOVALUE.GraphNodeLabelMappingHorizontal,
        attr: {}
      }
    }
  }],

  SelectGraphSkinModel: ['Publisher',
    {
      'GraphViewNode':YOVALUE.GraphViewNode,
      'GraphViewNodeImage':YOVALUE.GraphViewNodeImage,
      'GraphViewEdge':YOVALUE.GraphViewEdge,
      'GraphViewNodeLabel':YOVALUE.GraphViewNodeLabel
    },
    {
      "node":{
        "constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},
        "attr":{"typeColors":{"text":"#00BFFF","question":"#87CEFA","value":"#3CB371","fact":"#8FBC8F","hypothesis":"#FF69B4","belief":"#FF0000"}}
      },
      "edge":{
        "constr":"GraphViewEdge",
        "attr":{"typeColors":{"link":"#00BFFF","in_favour_of":"#87CEFA","contrary_to":"#3CB371"}}
      },
      "nodeLabel":{
        "constr":"GraphViewNodeLabel",
        "attr":{"font":"Calibri","fill":"#BBBBBB","maxSize":24}
      },
      "background":{
        "attr": {"fill":'#2B2B2B'}
      }
    }
  ],

  GraphNodeMappingsPubSub: [],
  GraphNodeLabelMappingsPubSub: [],

  GraphDecoration: [],
  GraphDecorationsPubSub: ['GraphDecoration'],

  GraphElementEditor: ['Publisher', 'ViewManager', 'UIElements', 'jQuery', YOVALUE.createElement('img',{'src':document.getElementById('ajaxLoader').getAttribute('src')})],

  NodeListCache: ['Publisher'],

  BayesCalculator: ['Publisher'],
  BayesPubSub: ['Publisher','BayesCalculator']
};

// Creating and wiring modules according to DI array.
// After wireModules call Modules['moduleName'] = module (i.e. object instantiated from constructor)
YOVALUE.wireModules(Modules, DI);

// Link modules with event subscriptions
Modules['Mediator'].setSubscriptions(
  {
    'show_graphs':[Modules['GraphControllerPubSub']],

    // model events
    'graph_model_changed':[
      Modules['GraphControllerPubSub'],
      Modules['GraphHistory'],
      Modules['BayesPubSub']
    ],
    'graph_history_item_added':[
      Modules['GraphControllerPubSub'],
      Modules['Repository']
    ],
    'graph_element_content_changed':[
      Modules['GraphControllerPubSub'],
      Modules['Repository'],
      Modules['BayesPubSub']
    ],
    'graph_position_changed':[
      Modules['GraphControllerPubSub'],
      Modules['Repository']
    ],
    'graph_layout_changed':[Modules['GraphControllerPubSub']],

    // graph events
    'mousemove':[Modules['GraphControllerPubSub']],
    'mouseenternode':[Modules['GraphControllerPubSub']],
    'mouseleavenode':[Modules['GraphControllerPubSub']],
    'clicknode':[Modules['GraphControllerPubSub']],
    'dragstartnode':[Modules['GraphControllerPubSub']],
    'draggingnode':[Modules['GraphControllerPubSub']],
    'dragendnode':[Modules['GraphControllerPubSub']],
    'clickedge':[Modules['GraphControllerPubSub']],
    'clickbackground':[Modules['GraphControllerPubSub']],
    'mouseenteredge':[Modules['GraphControllerPubSub']],
    'mouseleaveedge':[Modules['GraphControllerPubSub']],
    'element_editor_focusin':[Modules['GraphControllerPubSub']],
    'element_editor_focusout':[Modules['GraphControllerPubSub']],
    'dblclickbackground':[Modules['GraphControllerPubSub']],

    // keyboard events
    'delete_pressed':[Modules['GraphControllerPubSub']],
    'undo_pressed':[Modules['GraphControllerPubSub']],
    'redo_pressed':[Modules['GraphControllerPubSub']],
    'ctrl_on':[Modules['GraphControllerPubSub']],
    'ctrl_off':[Modules['GraphControllerPubSub']],

    'get_graph_decoration':[Modules['GraphDecorationsPubSub']],

    'get_elements_attributes':[Modules['GraphElementsContent']],
    'get_graph_node_content':[Modules['GraphElementsContent']],
    'request_for_graph_element_content_change':[Modules['GraphElementsContent']],

    'load_graph_models':[Modules['GraphModelsPubSub']],
    'add_graph_model':[Modules['GraphModelsPubSub']],
    'get_graph_models':[Modules['GraphModelsPubSub']],
    'graph_name_changed':[
      Modules['GraphModelsPubSub'],
      Modules['Repository']
    ],
    'set_graph_attributes':[
      Modules['GraphModelsPubSub'],
      Modules['Repository']
    ],
    'request_for_graph_model_change':[Modules['GraphModelsPubSub']],
    'set_graph_model_elements':[Modules['GraphModelsPubSub']],
    'get_node_by_nodeContentId':[Modules['GraphModelsPubSub']],

    'get_node_label_mapping':[Modules['GraphNodeLabelMappingsPubSub']],
    'get_node_mapping':[Modules['GraphNodeMappingsPubSub']],

    'hide_all_graphs':[Modules['GraphViewsPubSub']],
    'draw_graph_view':[Modules['GraphViewsPubSub']],
    'get_graph_view_label_area':[Modules['GraphViewsPubSub']],
    'get_graph_view_node_mapping':[Modules['GraphViewsPubSub']],
    'get_graph_view_node_label_mapping':[Modules['GraphViewsPubSub']],
    'get_graph_view_decoration':[Modules['GraphViewsPubSub']],
    'set_graph_view_drag_mode':[Modules['GraphViewsPubSub']],
    'get_graph_view_drag_mode':[Modules['GraphViewsPubSub']],
    'set_drag_mode':[
      Modules['GraphViewsPubSub'],
      Modules['StatusString']
    ],

    'show_graph_element_editor':[Modules['GraphElementEditor']],
    'hide_graph_element_editor':[Modules['GraphElementEditor']],

    'node_mapping_changed':[Modules['GraphHistory']],
    'graph_history_get_model_elements':[Modules['GraphHistory']],
    'graph_history_get_node_mapping':[Modules['GraphHistory']],
    'get_current_graph_step':[Modules['GraphHistory']],
    'get_previous_graph_step':[Modules['GraphHistory']],
    'get_next_graph_step':[Modules['GraphHistory']],
    'graph_history_set_current_step':[Modules['GraphHistory']],
    'get_graphs_history_timeline':[Modules['GraphHistory']],

    'get_selected_positions':[Modules['GraphMenu']],

    'create_new_graph':[Modules['Repository']],
    'send_pending_requests':[Modules['Repository']],
    'repository_get_selected_positions':[Modules['Repository']],
    'repository_get_selected_layouts':[Modules['Repository']],
    'repository_get_selected_skins':[Modules['Repository']],
    'repository_get_graphs_model_settings':[Modules['Repository']],
    'repository_get_graphs_model_elements':[Modules['Repository']],
    'repository_get_graph_elements_attributes':[Modules['Repository']],
    'repository_get_graph_node_content':[Modules['Repository']],
    'repository_get_graphs_history_timeline':[Modules['Repository']],
    'repository_get_graphs_clone_list':[Modules['Repository']],
    'repository_update_node_mapping':[Modules['Repository']],
    'get_graph_diff':[Modules['Repository']],
    'repository_get_graph_node_list':[Modules['Repository']],
    'find_publishers':[Modules['Repository']],
    'find_sources':[Modules['Repository']],
    'query_grain':[Modules['Repository']],

    'get_selected_layout':[Modules['SelectGraphLayoutModel']],
    'get_layout_by_name':[Modules['SelectGraphLayoutModel']],

    'get_selected_skin':[Modules['SelectGraphSkinModel']],
    'get_skin_by_skin_settings':[Modules['SelectGraphSkinModel']],

    'repository_error':[Modules['StatusString']],
    'repository_requests_send':[Modules['StatusString']],

    'repository_processing':[Modules['StatusString']]
  }
);

var p = Modules['Publisher'];
// init models
p.publish('load_graph_models').then(function(){
  // and then show them
  p.publish('show_graphs');
});
