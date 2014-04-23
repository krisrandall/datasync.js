<?php
header('Access-Control-Allow-Origin: *');

require ('config.php');


// ** 1 ** 
// Connect to DB


mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if($db->connect_errno > 0){
    die('Unable to connect to database [' . $db->connect_error . ']');
}


// ** 2 ** 
// Validate for your API what is valid and allowed,
// and set/apply your application_password

extract($_GET);
if ( !in_array($table, $fetchable_tables) ) {

	if ($_REQUEST['callback']!='') {
		header('Content-type: application/json');
		die($_REQUEST['callback']."(".json_encode(array('error'=>true,'error_text'=>$table.' not allowed by API')).")");
	}
	else {	
		header('Content-type: application/json');
		die(json_encode(array('error'=>true,'error_text'=>$table.' not allowed by API')));
	}
 	
}
$app_name = APP_NAME;
$app_pass = md5($app_name.$udid.$table.APP_SECRET_KEY); // this is the same in your app client code



// ** 3 ** 
// setup the $grandtm_config array

$grandtm_config['table'] 				= $table;
$grandtm_config['application_key']		= $app_name;
$grandtm_config['application_password']	= $app_pass;
//$grandtm_config['where_condition']		= " updatedDTS >= '".mysql_real_escape_string(urldecode($dts))."' ";

$grandtm_config['log_table_prefix']		= "datasync"; // 


// ** 4 **
// and the rest is magic

require ('grandtm/handlestorerequest.php');


?>