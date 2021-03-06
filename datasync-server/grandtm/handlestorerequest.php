<?php
/*

	You must pass in these config settings :
		$grandtm_config['table']					the table to fetch
		$grandtm_config['application_key']			the identifier of this applicaiton
		$grandtm_config['application_password']		an encoded password (matching encoding algorythms at phone and server ends)
	You can pass in these config settings :
		$grandtm_config['dont_log_access']			
		$grandtm_config['log_table_prefix']
					    

	
	The database must be connected.
	
*/



function get_client_ip() {
     $ipaddress = '';
     if ($_SERVER['HTTP_CLIENT_IP'])
         $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
     else if($_SERVER['HTTP_X_FORWARDED_FOR'])
         $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
     else if($_SERVER['HTTP_X_FORWARDED'])
         $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
     else if($_SERVER['HTTP_FORWARDED_FOR'])
         $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
     else if($_SERVER['HTTP_FORWARDED'])
         $ipaddress = $_SERVER['HTTP_FORWARDED'];
     else if($_SERVER['REMOTE_ADDR'])
         $ipaddress = $_SERVER['REMOTE_ADDR'];
     else
         $ipaddress = 'UNKNOWN';

     return $ipaddress; 
}



if (!isset($grandtm_config)) die('You must set $grandtm_config prior to handlerequest.php');



// validate that the application key sent is correct and that the password is too

$success = true;

extract($_REQUEST); // but only use these vars for validation, not for DB updates (of log)

if ($grandtm_config['application_key']!=$application_key) {
	$success = false;
	$error_text = 'Invalid Application Key';
}
elseif ( (strlen($udid)<5) || is_nan($udid) ) {
	$success = false;
	$error_text = 'Unrecognised Phone ID';
}
elseif ($grandtm_config['application_password']!=$application_password) {
	$success = false;
	$error_text = 'Invalid Application Password';
}
elseif (!isset($table)) {
	$success = false;
	$error_text = 'Table was not specified';
}
elseif (!isset($data)) {
	$success = false;
	$error_text = 'No store data sent';
}

if ($success) {

	$num_saved = 0;
	$records_to_save = json_decode($data);
	
	
	foreach($records_to_save as $rec_to_save) {
		
		if (!$fail) {
			
			$queryFlds = "";
			foreach($rec_to_save as $field=>$val) {
				
				if ($queryFlds!='') $queryFlds .= ", ";
				$queryFlds .= "`".$db->real_escape_string($field)."` = '".$db->real_escape_string($val)."'";
	
			}
	
			$queryStr = "INSERT INTO $table SET $queryFlds ON DUPLICATE KEY UPDATE $queryFlds ";

			
			try {		
				$res = $db->query($queryStr);	
				if (!$res) {
					$fail = true;
					$json_result = json_encode(array('error'=>true,'error_text'=>'save failed','mysqli error'=>$db->error));
				}
			} catch(Exception $e) {
				$fail = true;
				$json_result = json_encode(array('error'=>true,'error_text'=>'query error','mysqli error'=>$db->error));
			}

			if (!$fail) $num_saved++;
		}
		
	}

	
	if (!$fail)  {
		$json_result = json_encode(array('error'=>false,'num_saved'=>$num_saved));
	} 
}
else {
	$json_result = json_encode(array('error'=>true,'error_text'=>$error_text));
}


if (!$grandtm_config['dont_log_access']) {

	$db->query( "
			CREATE TABLE IF NOT EXISTS  `{$grandtm_config['log_table_prefix']}_store_request` (
			  `id` bigint(20) NOT NULL AUTO_INCREMENT,
			  `udid` varchar(255) NOT NULL,
			  `ip` varchar(120) NOT NULL,
			  `dts` datetime NOT NULL,
			  `application_key` varchar(80) NOT NULL,
			  `application_password` varchar(80) NOT NULL,
			  `table` varchar(80) NOT NULL,
			  `GET` text NOT NULL,
			  `POST` text NOT NULL,
			  `COOKIE` text NOT NULL,
			  `SERVER` text NOT NULL,
			  `success` tinyint(1) NOT NULL,
			  `error_text` varchar(255) NOT NULL,
			  PRIMARY KEY (`id`)
			) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;
			");

	$db->query("
			INSERT INTO `{$grandtm_config['log_table_prefix']}_store_request` 
			SET `udid` = '".mysqli_real_escape_string($db, $_REQUEST['udid'])."',
				`ip` = '".get_client_ip()."',
				`dts` = UTC_TIMESTAMP(),
				`application_key` = '".mysqli_real_escape_string($db, $_REQUEST['application_key'])."',
				`application_password` = '".mysqli_real_escape_string($db, $_REQUEST['application_password'])."',
				`table` = '".mysqli_real_escape_string($db, $_REQUEST['table'])."',
				`GET` = '".mysqli_real_escape_string($db, var_export($_GET, true))."',
				`POST` = '".mysqli_real_escape_string($db, var_export($_POST, true))."',
				`COOKIE` = '".mysqli_real_escape_string($db, var_export($_COOKIE, true))."',
				`SERVER` = '".mysqli_real_escape_string($db, var_export($_SERVER, true))."',
				`success` = '".$success."',
				`error_text` = '".$error_text."'
			");		
				
}



if ($_REQUEST['callback']!='') {
	header('Content-type: application/javascript');
	echo $_REQUEST['callback']."($json_result)";
}
else {	
	header('Content-type: application/json');
	echo $json_result;
}
?>