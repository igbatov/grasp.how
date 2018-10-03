<?php

	$targetFile = "/tmp/apitest.log";
	file_put_contents(
		$targetFile,
		file_get_contents('php://input') . "\n"
	);

?>
