$(function() {

	$("#background-img").animate({"opacity":"1"}, 'slow');

	$("#file-input").change(function() {
		$("#upload-file").submit();
	});

	$("#search").val($("#search")[0].title);

	$("#search").blur(function() {
		if ($(this).val() == '') {
			$(this).addClass('search-default');
			$(this).val($(this)[0].title);
		}
	});

	$("#search").focus(function() {
		if ($(this).val() == $(this)[0].title) {
			$(this).removeClass('search-default');
			$(this).val('');
		}
	});
});