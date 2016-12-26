(function($){
  // main menu

  // subscribe button
  $( document ).ready(function(){
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