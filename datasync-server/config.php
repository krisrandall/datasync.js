<?php

// ** App settings - You determine these when you create your app ** //

define('APP_NAME', '????');  				/** Your name for your app */
define('APP_SECRET_KEY', 'Anything');   	/** A password you make up */


// ** MySQL settings - You can get this info from your web host ** //

define('DB_NAME', '?????');				/** The name of the database */
define('DB_USER', 'root');				/** MySQL database username */
define('DB_PASSWORD', 'root');			/** MySQL database password */
define('DB_HOST', 'localhost');			/** MySQL hostname */



// ** fetchable_tables is a list of all tables that the client is allow to query ** //

$fetchable_tables = array( 'table1', 'table2' );


// ** storeable_tables is a list of all tables that the client is allow to update ** //

$storeable_tables = array( 'table2', 'table3' );




?>