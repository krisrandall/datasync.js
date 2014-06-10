<?php


include 'config.php';



mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if($db->connect_errno > 0){
    die('Unable to connect to database [' . $db->connect_error . ']');
}



$client_tables = array_merge( $fetchable_tables , $storeable_tables );


?>
<pre>
/**
 *
 *  This file is auto generated by datasync-server/generateClientJS.php
 *  (DB: <?php echo DB_NAME; ?>, DTS: <?php echo gmdate('M d Y H:i:s'); ?> GMT)
 *
 *  Save this file with your client app code as datasync-client/mydb.js 
 *
**/


'use strict';



// Assume jQuery - this function is the hook where you start your app after the DB is ready
$(document).ready(function() {
	
	mydb.thedb.onReady( function() { / * stuff to do when the DB is ready * / } );
	
});




// the JayData Database

$data.Entity.extend("control", {
	id: { type: "int", key: true }, /* only one record with id=1 */
	DBVersion: { type: "text" },
	lastUpdatedDTS: { type: Date }
});
<?php

// for each of the server-side tables we need, create JayData client equalivalents


foreach($client_tables as $t) {
	

	// each table in the local DB has it's own local_id also
	
	echo '	
$data.Entity.extend("'.$t.'", {
	local_id: { type: "int", key: true, computed: true }, ';
			
	$sql = "SHOW COLUMNS FROM $t";
	$res = $db->query($sql) or die('mysqli error');
	$first = true;
	while ($rec = $res->fetch_assoc()) {

		$field = $rec['Field'];
		$type = explode('(', $rec['Type']);
		$type = $type[0];
		
		
		if ($first) {
			$first = false;
			// Rename first field to "id"
			$field = "id";
		} else {
			// comma after previous field
			echo ',';
		}
		
		
		switch($type) {
			case 'varchar':		$type = 'text';		break;
			case 'tinyint':		$type = 'bool';		break; // this is the only thing i use tinyints for
			case 'smallint':
			case 'bigint':
			case 'mediumint':	$type = 'int';		break;
			
			// of course there are others !!
			
			default:			$type = $type;		break;
		}
		
		
		
		
		echo "
	$field: { type: \"$type\" $extra1}";
					
	}
	
	echo '
});
	';


}

// records are defined above, now define the DB "MyDB" 

echo '

$data.EntityContext.extend("MyDB", { ';
$first = true;
foreach($client_tables as $t) {
	if ($first) {
		$first = false;
	} else {
		echo ',';
	}
	echo '
	'.$t.': { type: $data.EntitySet, elementType: '.$t.' }';
}
echo '
});
	';
	
?>



var mydb = {
	
	version : '1.0', /* this should come from the API - future enhancement */
	
	app_url : '<?php echo "http://". $_SERVER['SERVER_NAME'] . dirname($_SERVER['REQUEST_URI']); ?>',
	app_key : '<?php echo APP_NAME; ?>',
	app_key_suffix : '<?php echo APP_SECRET_KEY; ?>',
	
	thedb : new MyDB("<?php echo APP_NAME; ?>") 
	
};



</pre>


