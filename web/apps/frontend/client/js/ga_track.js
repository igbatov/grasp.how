
  $( document ).ready(function(){
    // track facebook share button
    traceFBShare();

    // track click on clone-ribbon
    $('#clone-ribbon').click(function(e){
      ga('send', 'event', 'clone-ribbon', 'click');
      var graph_id = $('#clone-ribbon').attr('data-graph_id');
      $.ajax({
        method: "GET",
        url: "/embed_action_track",
        data: { type: 'clone-ribbon', 'from':document.location.href, graph_id: graph_id }
      })
    });
  });

function traceFBShare(){
  // select the target node
  var target = document.getElementById('fb-share-btn');
  // create an observer instance
  var observer = new MutationObserver(function(mutations) {
    var listener = addEventListener('blur', function() {
      if(document.activeElement === $('#fb-share-btn').find('iframe')[0]) {
        ga('send', 'event', 'facebookShare', 'click');
        var graph_id = $('#fb-share-btn-wrap').attr('data-graph_id');
        console.log(document.location.href);
        $.ajax({
          method: "GET",
          url: "/embed_action_track",
          data: { type: 'facebookShare', 'from':document.location.href, graph_id: graph_id }
        })
      }
    });
  });
  // configuration of the observer:
  var config = { attributes: false, childList: true, characterData: false };
  // pass in the target node, as well as the observer options
  observer.observe(target, config);
}
