var DEBUG_MODE = !true;
var TEST_NAME = GRASP.getURLParameters(window.location.href)['TEST_NAME'];
/**
 * List of modules
 * @type {Object}
 */
var Modules = {
  Mediator: GRASP.Mediator,
  Publisher: GRASP.Publisher,

  GraphModelFactory: GRASP.GraphModelFactory,
  GraphElementsContent: GRASP.GraphElementsContent,
  GraphModelsPubSub: GRASP.GraphModelsPubSub,

  GraphHistory: GRASP.GraphHistory,

  kinetic:Kinetic,
  CanvasDrawer: GRASP.CanvasDrawer,
  CanvasDrawerFactory: GRASP.CanvasDrawerFactory,

  SVGDrawer: GRASP.SVGDrawer,
  SVGDrawerFactory: GRASP.SVGDrawerFactory,

  GraphViewFactory: GRASP.GraphViewFactory,
  GraphViewsPubSub: GRASP.GraphViewsPubSub,

  HistoryController: GRASP.HistoryController,
  AddRemoveElementController: GRASP.AddRemoveElementController,
  ModelChangeController: GRASP.ModelChangeController,
  MappingChangeController: GRASP.MappingChangeController,
  SelectElementController: GRASP.SelectElementController,
  ShowEditorController: GRASP.ShowEditorController,
  DragModeChangeController: GRASP.DragModeChangeController,
  GraphControllerPubSub: GRASP.GraphControllerPubSub,
  GraphControllerModules: Array,

  Repository: GRASP.Repository,

  KeyManager: GRASP.KeyManager,
  StatusString: GRASP.StatusString,

  GraphLayoutNamesConfig: GRASP.GraphLayoutNamesConfig,
  GraphSkinNamesConfig: GRASP.GraphSkinNamesConfig,

  GraphMenu: GRASP.GraphMenu,
  SelectGraphLayoutModel: GRASP.SelectGraphLayoutModel,
  SelectGraphSkinModel: GRASP.SelectGraphSkinModel,

  GraphNodeMappingsPubSub: GRASP.GraphNodeMappingsPubSub,
  GraphNodeLabelMappingsPubSub: GRASP.GraphNodeLabelMappingsPubSub,

  GraphDecoration: GRASP.GraphDecorationByType,
  GraphDecorationsPubSub: GRASP.GraphDecorationsPubSub,

  ViewManager: GRASP.ViewManager,
  UIElements: GRASP.UIElements,
  FormFields: GRASP.FormFields,
  GraphElementEditor: GRASP.GraphElementEditor,

  jQuery: jQuery,
  Ajax: GRASP.Ajax,
  Promise: GRASP.Promise,

  imageLoader: GRASP.imageLoader,

  NodeListCache: GRASP.NodeListCache,

  BayesPubSub: GRASP.BayesPubSub,
  BayesCalculator: GRASP.BayesCalculatorGRain
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
  StatusString: ['Publisher', 'ViewManager', 'jQuery', 'miniAjaxLoader'],

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

  FormFields: ['UIElements', 'Publisher'],
  GraphMenu: ['Publisher', 'ViewManager', 'UIElements', 'FormFields', 'jQuery'],

  SelectGraphLayoutModel: ['Publisher',{
    basicLayout: {
      node:{
        constructor: GRASP.GraphNodeMappingForceDirected,
        attr: {}
      },
      nodeLabel:{
        constructor: GRASP.GraphNodeLabelMappingHorizontal,
        attr: {}
      }
    }
  }],

  SelectGraphSkinModel: ['Publisher',
    {
      'GraphViewNode':GRASP.GraphViewNode,
      'GraphViewNodeImage':GRASP.GraphViewNodeImage,
      'GraphViewEdge':GRASP.GraphViewEdge,
      'GraphViewNodeLabel':GRASP.GraphViewNodeLabel
    },
    {
      "node":{
        "constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},
        "attr":{"typeColors":{"text":"#00BFFF","question":"#87CEFA","value":"#3CB371","fact":"#8FBC8F","hypothesis":"#FF69B4","belief":"#FF0000"}}
      },
      "edge":{
        "constr":"GraphViewEdge",
        "attr":{"typeColors":{"link":"#00BFFF","causal":"#87CEFA","conditional":"#3CB371"},"typeDirection":{"link":"bi","causal":"uni","conditional":"uni"}}
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

  GraphElementEditor: ['Publisher', 'ViewManager', 'UIElements', 'FormFields', 'jQuery', GRASP.createElement('img',{'src':document.getElementById('ajaxLoader').getAttribute('src')})],

  NodeListCache: ['Publisher'],

  BayesCalculator: ['Publisher'],
  BayesPubSub: ['Publisher','BayesCalculator']
};

// Creating and wiring modules according to DI array.
// After wireModules call Modules['moduleName'] = module (i.e. object instantiated from constructor)
GRASP.wireModules(Modules, DI);

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
        Modules['GraphElementEditor']
      ],
      'calculate_bayes_probabilities':[
        Modules['BayesPubSub']
      ],
      'repository_request_for_graph_element_content_change':[Modules['Repository']],
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
      'draw_graph_view':[Modules['GraphControllerPubSub'],Modules['GraphViewsPubSub']],
      'update_graph_view_decoration':[Modules['GraphViewsPubSub']],
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
      'repository_update_source':[Modules['Repository']],
      'repository_get_user_sources':[Modules['Repository']],
      'repository_remove_user_sources':[Modules['Repository']],
      'repository_update_node_mapping':[Modules['Repository']],
      'get_graph_diff':[Modules['Repository']],
      'find_publishers':[Modules['Repository']],
      'find_sources':[Modules['Repository']],
      'query_grain':[Modules['Repository']],
      'get_username':[Modules['Repository']],

      'get_selected_layout':[Modules['SelectGraphLayoutModel']],
      'get_layout_by_name':[Modules['SelectGraphLayoutModel']],

      'get_selected_skin':[Modules['SelectGraphSkinModel']],
      'get_skin_by_skin_settings':[Modules['SelectGraphSkinModel']],

      'repository_error':[Modules['StatusString']],
      'repository_requests_send':[Modules['StatusString']],

      'repository_processing':[Modules['StatusString']]
    }
);