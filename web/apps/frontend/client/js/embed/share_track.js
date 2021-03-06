
$( document ).ready(function(){
  // track facebook share button
  tracker.traceFBShare();

  // track click on clone-ribbon
  tracker.trackCloneRibbon();
});

var tracker = {
  parentURI: null,
  
  trackCloneRibbon: function(){
    $('#clone-ribbon').click(function(e){
      ga('send', 'event', 'clone-ribbon', 'click');
      var graph_id = $('#clone-ribbon').attr('data-graph_id');
      $.ajax({
        method: "GET",
        url: "/share_track",
        data: { type: 'clone-ribbon', from:tracker.parentURI, graph_id: graph_id }
      })
    });
  },

  traceFBShare: function(){
    // select the target node
    var target = document.getElementById('fb-share-btn');
    if(!target) return;
    // create an observer instance
    var observer = new MutationObserver(function(mutations) {
      var listener = addEventListener('blur', function() {
        if(document.activeElement === $('#fb-share-btn').find('iframe')[0]) {
          var graph_id = $('#fb-share-btn').attr('data-graph_id');
          ga('send', 'event', 'facebookShare', 'click', graph_id);
          $.ajax({
            method: "GET",
            url: "/share_track",
            data: { type: 'facebookShare', from:tracker.parentURI, graph_id: graph_id }
          })
        }
      });
    });
    // configuration of the observer:
    var config = { attributes: false, childList: true, characterData: false };
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
  }
};

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event)
{
  if(typeof(event.data.from) != 'undefined'){
   tracker.parentURI = event.data.from;
  }
}
