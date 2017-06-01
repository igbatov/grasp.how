var UI = UI || new GRASP.UIElements();
var i18n = i18n || new GRASP.I18n(GRASP.TRANSLATIONS, GRASP.LANGUAGE);
(function($){
  $( document ).ready(function(){
    // send link button
    $('.requestMap button').click(function(){
      var siteLink = $('#contacts #siteLink').val();
      if(!siteLink.length){
        $('#requestMap.siteLink_msg_error').show();
        return;
      }
      var email = $('#contacts #email').val();
      if(!email.length){
        $('#requestMap.email_msg_error').show();
        return;
      }
      var m = UI.createModal({"withCloseButton":false, "withOverlay":true});
      var content = UI.createLoadingIndicator();
      UI.setModalContent(m, content);
      $.ajax({
        method: "GET",
        url: "subscribe",
        data: { email: email, siteLink: siteLink }
      })
      .done(function( msg ) {
      })
      .fail(function() {
        // report error
      })
      .always(function() {
        content.parentNode.removeChild(content);
        content = GRASP.createElement('h5',{style:'margin:auto;'},i18n.__('THANK YOU!'));
        UI.setModalContent(m, content);

        setTimeout(function(){
          UI.closeModal(m);
        }, 1000);
      });
    });

    // subscribe button
    $('.subscribe input[type="submit"]').click(function(){
      var email = $('.subscribe input[type="text"]').val();
      if(!email.length){
        $('#subscribe_msg_error').show();
        return;
      }
      $.ajax({
        method: "GET",
        url: "subscribe",
        data: { email: email }
      })
      .done(function( msg ) {
        $('#subscribe_msg_ok').show();
      });
    });
  });
})($);