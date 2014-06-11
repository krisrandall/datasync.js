'use strict';




var datasync = {
	
	/*
	 * The write part of data sync flows like this :
	 * 
	 * 		fetchFromServer()
	 * 			|			------> errors [func_fail]
	 * 			v
	 * 		(user defined success function) [func_success]
	 * 
	 */
	
	fetchFromServer : function ( table, where, func_success, func_fail ) {
		
		var udid = '999999999'; // replace this with the UDID of the device
		
		var password = MD5(mydb['app_key']+udid+table+mydb['app_key_suffix']);
		
		var params = '?table='+table+
					 '&udid='+udid+
					 '&application_key='+mydb['app_key']+
					 '&application_password='+password+
					 '&dts='+encodeURIComponent($('#dts').val()) +
					 '&where='+where +
					 '&callback=?';
			
		$.getJSON(mydb['app_url']+'/fetch.php'+params)
			.done( function ( data ) {
				if (data.error!==false) {
					// the server API returned an error
					func_fail({code:40,text:'error from cloud',details:data});
				} else if (data.results.length===0){
					// successful call to server, but no records returned
					func_success();
				} else {

					
					var fetched_ids = _.pluck(data.results, "id");

					var allRecs = mydb.thedb[table].filter(function(record) { return record.id in this; }, fetched_ids).toArray();
					
					allRecs.then(function(the_records) {				
						// first REMOVE ALL records that we have been sent
						the_records.forEach( function(record) { 
		               		mydb.thedb[table].remove(record); 
		           		});
						
						// now add them all back in, unless they have the del flag set 
						// KR: experimenting with _underscore
						var updatedRecs = _.filter(data.results, function(record) { return record.del === '0'; } );
				    	_.each(updatedRecs, function (record) { record.del = false;	/* convert del to boolean */ });
	    				mydb.thedb[table].addMany(updatedRecs);    			 
	
						// save the changes and call the success function
						mydb.thedb.saveChanges().then(func_success());
					});
						
								
				}
			})
			.fail ( function (jqXHR, textStatus, errorThrown) {
				dataHolder.state = 'failed';
				func_fail({code:10,text:'JSON error on fetch',details:[jqXHR, textStatus, errorThrown]});
			});
	},
	
		 
		 
	setLastUpdated : function ( dts ) {
		
		if (dts=='now') {
			var d = new Date();
			dts = d.dateStrSQLFormat();
		} else return false; // current must pass 'now' to this function !
		
		var find_control = mydb.thedb['control'].filter("id", "==", 1).toArray();
		find_control.then( function (result) {
			var existing_control = mydb.thedb['control'].attachOrGet({ id: 1 });
			if (result.length==0) { // not found, so add
				var new_control = { lastUpdatedDTS : dts, DBVersion : mydb.thedb.version };
				mydb.thedb['control'].add(new_control);
			} else { // update existing
				existing_control.lastUpdatedDTS = dts;
			}
			mydb.thedb.saveChanges();
			
		});
	}


};






