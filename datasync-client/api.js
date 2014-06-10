'use strict';
var	api_url = 'soundwalks/api/fetch.php?callback=?';
var app_key = 'soundwalks';
var app_key_suffix = 'rosetta';
var udid = 'nasldkn90usdflslkflknldsf90';

function getLatestRecsFromServer(dataHolder, callback) {
	// do the API call
	var params = {
		table: dataHolder.tableName,
		udid: udid,
		application_key: app_key,
		application_password: MD5(app_key+udid+dataHolder.tableName+app_key_suffix),
		dts: encodeURIComponent(App.LastUpdated)
	};
			
	$.getJSON(App.Domain + api_url, params)
     .done( function( data ) { 
		dataHolder.data = data.results;
		dataHolder.state = 'downloaded';	     
     	callback();
     })
     .fail( function() {
     	dataHolder.state = 'failed';
     	callback();
     });		 
}
