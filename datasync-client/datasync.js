'use strict';




var datasync = {


	/*
	 * The server to client part of data sync flows like this :
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
		
		var params = {'table':table,
					 'udid':udid,
					 'application_key':mydb['app_key'],
					 'application_password':password,
					 'where':encodeURIComponent(where) };
			
		$.getJSON(mydb['app_url']+'/fetch.php?callback=?', params)
			.done( function ( data ) {
				if (data.error!==false) {
					// the server API returned an error
					func_fail({code:40,text:'error from cloud',details:data});
				} else if (data.results.length===0){
					// successful call to server, but no records returned
					func_success(0);
				} else {
					// get from the DB all the records with the id's we have been sent
					var fetched_ids = _.pluck(data.results, "id");
					var allRecs = mydb.thedb[table].filter(function(record) { return record.id in this; }, fetched_ids).toArray();
					allRecs.then(function(the_records) {				
						// first REMOVE ALL records that we have been sent (if they already exist)
						the_records.forEach( function(record) { 
		               		mydb.thedb[table].remove(record); 
		           		});
						// now add them all back in, unless they have the del flag set 
						var updatedRecs = _.filter(data.results, function(record) { return record.del === '0'; } );
				    	_.each(updatedRecs, function (record) { record.del = false;	/* convert del to boolean */ });
	    				mydb.thedb[table].addMany(updatedRecs);    			 
						// save the changes and call the success function
						mydb.thedb.saveChanges().then(func_success(fetched_ids.length));
					});			
				}
			})
			.fail ( function (jqXHR, textStatus, errorThrown) {
				// json call failed
				func_fail({code:10,text:'JSON error on fetch',details:[jqXHR, textStatus, errorThrown]});
			});
	},
	

	/*
	 * The client to server part of data sync flows like this :
	 * 
	 * 		storeToServer()
	 * 			|			------> errors [func_fail]
	 * 			v
	 * 		(user defined success function) [func_success]
	 * 
	 */
	
	storeToServer : function ( table, where, func_success, func_fail ) {

		if (where=='') where = '1';
		
		// first fetch the records
		var found_recs = mydb.thedb[table].filter(where).toArray();
		found_recs.then(function(matching_data) {
			
			// remove "id" and "local_id" fields from matching_data
			$.each(matching_data, function(i, obj) {
				
				//obj = {"local_id":8,"id":null,"review_name":"One","checklist_id":null,"account_id":null,"checklist_name":null,"t5code":null,"checklist_type":null,"checklist_createdDTS":null,"checklist_updatedDTS":null,"hazard_reporting_type":null,"submittedDTS":null,"submittedUDID":null,"submittedIP":null,"submittedName":null,"submittedPhoneKey":null};
				obj = $.parseJSON(JSON.stringify(obj));
							
			    delete obj.local_id;
			    delete obj.id;
			    
				matching_data[i] = obj;
			    
			});

			var udid = '999999999'; // replace this with the UDID of the device
			
			var password = MD5(mydb['app_key']+udid+table+mydb['app_key_suffix']);
			
			var params = {'table':table,
						 'udid':udid,
						 'application_key':mydb['app_key'],
						 'application_password':password,
						 'data':JSON.stringify(matching_data),
						  };

				
			$.getJSON(mydb['app_url']+'/store.php?callback=?', params)
				.done(function( response ) {
					
					if (response.error!==false) {
						// the server API returned an error
						func_fail({code:240,text:'error from cloud',details:response});
					} else {
						func_success(response.num_saved);
					}
					
				})
				.fail ( function (jqXHR, textStatus, errorThrown) {
					// json call failed
					func_fail({code:210,text:'JSON error on store',details:[jqXHR, textStatus, errorThrown]});
				});

							
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






