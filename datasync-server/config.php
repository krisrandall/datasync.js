<?php
// NB - DO NOT COMMIT - this is my own WIP config ...

// ** App settings - You determine these when you create your app ** //

define('APP_NAME', 'take5app');  				/** Your name for your app */
define('APP_SECRET_KEY', 'beyond comfort');   	/** A password you make up */


// ** MySQL settings - You can get this info from your web host ** //

define('DB_NAME', 'drawonth_take5app');				/** The name of the database */
define('DB_USER', 'root');				/** MySQL database username */
define('DB_PASSWORD', 'root');			/** MySQL database password */
define('DB_HOST', 'localhost');			/** MySQL hostname */



// ** fetchable_tables is a list of all tables that the client is allow to query ** //

$fetchable_tables = array( 't5_checklists', 't5_questions' );


// ** storeable_tables is a list of all tables that the client is allow to update ** //

$storeable_tables = array( 't5_reviews', 't5_answers' );




?>