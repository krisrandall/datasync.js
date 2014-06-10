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
				} else if (data.results.length>0){
					// successful call to server, but no records returned
					func_success();
				} else {
					// loop through all records and write to the DB - func_success called once all written
					data['toSave']=data.results.length;
					data['saved']=0;
					_.each(data.results, function(value, key, list) {
						writeToDB( mydb.thedb[table], value, data, func_success, func_fail ); 
					});					
				}
			})
			.fail ( function (jqXHR, textStatus, errorThrown) {
				dataHolder.state = 'failed';
				func_fail({code:10,text:'JSON error on fetch',details:[jqXHR, textStatus, errorThrown]});
			});
	},
	
	writeToDB : function ( table, record, dataStruct, func_success, func_fail ) {
	
		
	},
	
	writeToDBSuccess : function ( dataStruct, func_success, func_fail ) {
		
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

/*
 * first good example : http://jaydata.org/forum/viewtopic.php?f=3&t=325
 
 	fucking jayData !
 	
  $("#syncAppbtn").click(function () {
        var rowsToProcess = 0, rowsProcessed = 0;
        $.getJSON("http://www.json-generator.com/j/bMeLdrhCGa?indent=4", function (result) { //
            rowsToProcess = result.length;
            $.each(result, function (i, field) {
                var existingPatients = Database.Test.filter("Id", "==", field.Id).toArray();
                existingPatients.then(function (result) {
                    var patientToUpdate = Database.Test.attachOrGet({ Id: field.Id });
                    if (result.length == 0) // not found. Let's add it
                    {
                        patientToUpdate.name = field.name;
                        Database.Test.add(patientToUpdate);
                    }
                    else
                    {
                        //update
                    }
                    rowsProcessed++;
                    if (rowsProcessed == rowsToProcess) {
                        Database.saveChanges({
                            success: function (db) {
                                alert("Sync Complete");
                            }
                        });
                    }
                })
            });
        });
    });
    
 */
};






