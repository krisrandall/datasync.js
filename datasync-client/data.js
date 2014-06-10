'use strict';
var dataHolder,
	db_version = '1.7',
	db_vers_file = 'db_version.txt';

function updateDataFromServer() { 
    if (!checkConnection()) {
        App.HasNetworkConnection = false;
        if (!App.HasData) {
            navigator.splashscreen.hide();
            vex.dialog.alert('Soundtrails needs to download data from the server but the phone has no network connection. Please connect to a network and restart the app');
        }
        else {
            loadViews();
        }
        return;
    } 
	// get latest data from the server
	initialiseDataHolder();
	if (App.UsingCordova) {
		checkDBVersion(dbIsSame, clearAllTables);
	} else {
		dbIsSame();
	}
}

function dbIsSame()
{	
	App.DB.sw_control
		.filter('it.id == 1')
		.toArray(function (records) {
			if (records.length === 0) 
				App.LastUpdated = 0;
			else
				App.LastUpdated = getUTC(records[0].lastUpdatedDTS);
			getDataFromServer();
		});
}

function checkDBVersion(isSameCallback, isNewCallback)
{
	// check if this version of the app requires a new version of the DB
	readTextFromFile(db_vers_file, 'none', function(text) { 
		App.DB_version = text; 
		if (text === 'none' || text !== db_version) {
			isNewCallback();
		} else {
			isSameCallback();
		}
	});
}

function getDataFromServer() 
{ 
    _.each(dataHolder, function (holder) {
		getLatestRecsFromServer(holder, gotDataFromServer);
	});	
}

function gotDataFromServer() 
{ 
    // this function gets called whenever we have finished getting data (completed/failed)
	var allFinished = !_.any(dataHolder, function (holder) { return holder.state === 'empty'; });
	if (allFinished) { 
		var allDone = !_.any(dataHolder, function (holder) { return holder.state === 'failed'; });
		if (allDone) { 
		    App.HasData = true;
			loadDataFromHolder();
		}
		else {
		    // failed getting one of the tables so we can't import anything
            if (!App.HasData) { 
                vex.dialog.alert('Soundtrails needs to download data from the server. Please connect to a network and restart the app');
            } 
            loadViews();
		}
	}
}

function loadDataFromHolder() 
{ 
    // all tables have been updated from the server so apply any changes
	_.each(dataHolder, function (holder) { 
		updateTable(holder, dataImported);
	});
}

// save data to local tables
function updateTable(holder, callBack) 
{
	// delete all existing records that are being updated or deleted
	var ids = _.pluck(holder.data, 'id'); 
	if (ids.length === 0) {
	    holder.state = 'completed';
	    callBack();
	}
	else {
        holder.table	
    		.filter(function(record) { return record.id in this; }, ids)
            .toArray(function(records) { 
    			records.forEach( function(record) { 
               		holder.table.remove(record); 
           		});
    			// get a new list without the deleted records        
    			var updatedRecs = _.filter(holder.data, function(record) { return record.del === '0'; } );  
    			_.each(updatedRecs, function (record) {
    				record.del = false;	// convert del to boolean
    				record.updatedDTS = fixDates(record.updatedDTS);
    				if (holder.tableName === 'sw_sponsor')
                    {
                        record.startDate = fixDates(record.startDate);
                        record.endDate = fixDates(record.endDate);   
                    }
    			});
    			holder.table.addMany(updatedRecs);    			 
    			holder.state = 'completed';
    			callBack();
    		});
	}
}

function fixDates(dateFld)
{
    // handle empty dates
    if (dateFld.substr(0,4) === '0000') {
        return new Date();
    }
    else 
        return dateFld.replaceAt(10, 'T');
}

var callLoadViews = true;
function dataImported() 
{ 
	// this function gets called whenever we have finished importing data into the local tables
	var allFinished = !_.any(dataHolder, function (holder) { return holder.state === 'downloaded'; });
	if (allFinished) { 
		App.DB
			.saveChanges()	// save all new/updated/delete records
			.then( function () { 
				// NOW update the lastUpdatedDTS
				App.DB.sw_control
					.filter('it.id===1')
					.toArray(function (record) { 
						var rec = App.DB.sw_control.attachOrGet({ id: 1 });
						rec.lastUpdatedDTS = new Date();
						if (record.length === 0) 
							App.DB.sw_control.add(rec);
						App.DB.sw_control.saveChanges(); 
					});
				// if we don't have a main spaonsor then we need to call loadViews after loading the data
				// otherwise loadViews() will be called from showSponsor
				showSponsor(1, getAnyNewImages, loadViews);
			});
	}
}

function finishedUpdatingData() 
{
    writeTextToFile(db_version, db_vers_file, function() {
        if (callLoadViews) {
            loadViews();
        }    
    });
}

var imagesToGet = [],
	mapsToGet = [];

function getAnyNewImages(hasSponsor) 
{ 
    // if there is not a sponsor ad being shown then we need to loadViews from here
    callLoadViews = !hasSponsor;
	// download all the updated images and update DOM elements for carousel images when downloaded
	// if this is the initial load of the data after an install then we can't load views until 
	// the area icons have downloaded ("sw_area" images)
	getRequiredImages();
	
	// now check if any other images need updating - "finishedUpdatingData()" is called from getAreaIcons 
	// imagesToGet is used to check if images have finished downloading - mainly useful on the first load after an install
	imagesToGet = [];
	_.each(dataHolder, function (holder) { 
	    // sw_area images are icons which must be downloaded before views are shown
        // sw_sound_walk images are the maps - in testing these were slow so we'll download them separately
	    if (holder.tableName !== 'sw_sound_walk' && holder.tableName !== 'sw_area')
	    {
	        // get all the image records and check we have the latest versions
	        holder.table.toArray(function(records) {
        		_.each(records, function (record) { 
        			if (record[holder.imageField] !== '') {
                        getFileDate(App.LocalImagesPath + record[holder.imageField], 
                            function(imgDate)
                            {
                                if (!imgDate || imgDate < record.updatedDTS) 
                                {
                                    var image = { id: record.id, fileName: record[holder.imageField], state: 'get', tableName: holder.tableName };
                                    imagesToGet.push(image);
                                    getImageFromServer(image, function (image) 
                                        { 
                                            // check if this is a carousel image and if so then replace any placeholder src with the valid file name
                                            // is this an area or walk image
                                            if (image.tableName === 'sw_area_image') {
                                                $('#carousel_area_img-'+image.id).attr('src', App.LocalImagesPath + image.fileName);        
                                            } 
                                            else if (image.tableName === 'sw_sound_walk_image') {
                                                $('#carousel_walk_img-'+image.id).attr('src', App.LocalImagesPath + image.fileName);
                                            }
                                            else if (image.tableName === 'sw_info_image') {
                                                $('#carousel_info_img-'+image.id).attr('src', App.LocalImagesPath + image.fileName);
                                            }
                                        }
                                    );
                                }
                			}
                		);
                	}
        		});
        	});
		}
	});
}

var areaIcons = [];
function getRequiredImages()
{	
    // if this is a load after an install then we can't show views until all icons have downloaded
    areaIcons = []; 
    App.DB.sw_areas.toArray(function(areas) {
        _.each(areas, function(area) { 
            if (area.area_icon_image_id !== '')
            {
                var icon = { id: area.id, fileName: area.area_icon_image_id, state: 'get', tableName: 'sw_area', updatedDTS: area.updatedDTS };
                areaIcons.push(icon);
            } 
        });
        if (areaIcons.length > 0) 
        { 
            _.each(areaIcons, function(icon) { 
                getFileDate(App.LocalImagesPath + icon.fileName, 
                    function(imgDate)
                    {
                        if (!imgDate || imgDate < icon.updatedDTS) { 
                            getImageFromServer(icon, gotIcon);
                        }
                        else {
                            icon.state = 'completed';
                            gotIcon();
                        }
                    }
                );               
            });
        }
        else {
            finishedUpdatingData();
        }
    });
}

function gotIcon()
{
	var areaIconsLoaded = !_.any(areaIcons, function (icon) { return icon.state === 'get'; });	
	
	if (areaIconsLoaded) {
		finishedUpdatingData();
	}
}

function imageHasFinishedDownloading(imageName)
{
    // used when loading views to prevent image "tearing" by the DOM trying to access the file before it has completed downloading
	var image = _.find(imagesToGet, function(img) { return img.fileName === imageName; });
	return !image || image.state === 'completed';
}

function getAnyNewMaps() 
{ 
	// check if there are any maps to download
    initialiseDataHolder(); // this releases unwanted data
    
    // check if any map images need updating 
    // mapsToGet is used to check if images have finished downloading
    mapsToGet = [];
    setTimeout(function() {
        App.DB.sw_sound_walks.toArray(function(maps) 
        {
           // get all the image records and check we have the latest versions
           _.each(maps, function(map) 
           { 
                if (map.map_image_id !== '' && !map.mapDownloadedDTS)
                {
                    var mapImage = { id: map.id, fileName: map.map_image_id, state: 'get', tableName: 'sw_sound_walk' };
                    mapsToGet.push(mapImage);
                    var img = $('#map_image-'+map.id); 
                    if (img.attr('src') === 'img/blank.gif')
                    {
                        // replace img tag with a div to show the map is downloading
                        img.replaceWith('<div id="map_image-'+ map.id +'" class="loading-animation"></div>');
                    }
                    getImageFromServer(mapImage, checkIfMapsAreAllDownloaded);
                }
            });
        });
    },200);
}

/*
 *                     getFileDate(App.LocalImagesPath + map.map_image_id, 
                        function(imgDate)
                        {
                            if (!imgDate || imgDate < map.updatedDTS || mapHasNotFullyDownloaded(map)) 
                            {
                                alert('getting new map: '+map.sw_title+' d: '+imgDate+' map.date: '+map.updatedDTS+' down: '+mapHasNotFullyDownloaded(map));
                                var mapImage = { id: map.id, fileName: map.map_image_id, state: 'get', tableName: 'sw_sound_walk' };
                                mapsToGet.push(mapImage);
                                var img = $('#map_image-'+map.id); 
                                if (img.attr('src') === 'img/blank.gif')
                                {
                                    // replace img tag with a div to show the map is downloading
                                    img.replaceWith('<div id="map_image-'+ map.id +'" class="loading-animation"></div>');
                                }
                                getImageFromServer(mapImage, checkIfMapsAreAllDownloaded);
                            };
                        }
                    );

 

function mapHasNotFullyDownloaded(map)
{
    // if network connection is lost while a map is downloading then it needs to be re-downloaded
    // this can be checked by comparing the size of the map image with the map reference co-ordinates
    if (checkFileExists(App.LocalImagesPath + map.map_image_id))
    {
        var img = $('#map_image-'+map.id)[0]; 
        if (img) {
            var canvas = $('<canvas/>')[0];
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
            var pixelData = canvas.getContext('2d').getImageData(img.naturalWidth-1, img.naturalHeight-1, 1, 1).data;
            if (pixelData[3] === 0)
            {
                $(img).attr('src', 'img/blank.gif'); 
                return true;
            }
        }
    }
    return false;
}*/

function mapImageHasFinishedDownloading(mapImageName)
{
    // used to check if a map image is currently downloading - prevents tearing by the DOM
	var image = _.find(mapsToGet, function(img) { return img.fileName === mapImageName; });
	return !image || image.state === 'completed';
}

function mapImageIsDownloading(mapImageName)
{
    // used to check if a map image is currently downloading - prevents tearing by the DOM
    var image = _.find(mapsToGet, function(img) { return img.fileName === mapImageName; });
    return image && image.state !== 'completed';
}

function checkIfMapsAreAllDownloaded(file) 
{ 
	// got a map so replace the map holder image
	if (file.state === 'completed') {
    	$('#map_image-'+file.id).replaceWith('<img id="map_image-'+ file.id +'" src="' + App.LocalImagesPath + file.fileName +'?'+Math.random()+'">');
    	if (App.MapShowing && App.SoundWalk.id == file.id) {
    		// this will fix up the map after loading the correct image
    		setTimeout(function() { 
        		startTracking();
        	}, 500); 
    	}
	}
	else {
        $('#map_image-'+file.id).replaceWith('<img id="map_image-'+ file.id +'" src="img/blank.gif">');
    }
    // when all maps are downloaded then record timestamp
    var mapsLoaded = !_.any(mapsToGet, function (map) { return map.state === 'get'; });  
    if (mapsLoaded) { 
        var ids = _.pluck(mapsToGet, 'id'); 
        App.DB.sw_sound_walks
            .filter(function(record) { return record.id in this; }, ids)
            .toArray(function (walks) { 
                _.each(walks, function(walk) {
                    var imgFile = _.find(mapsToGet, function(mapFile) { return mapFile.id === walk.id; });
                    if (imgFile.state === 'completed') {
                        var rec = App.DB.sw_sound_walks.attachOrGet({ id: walk.id });
                        rec.mapDownloadedDTS = new Date();
                    }
                });
                App.DB.sw_sound_walks.saveChanges();
            });
    }
}

// used to upgrade db
function clearAllTables() 
{
	if (App.DB_version === 'none')
	{
		clearEachTable();
	} 
	else { 
        if (App.UsingCordova) {
            navigator.splashscreen.hide();
        } 
		vex.dialog.confirm({
			message: 'This version of Soundtrails requires a new data format so you may have to download your soundtrails again.',
            buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Continue'
                })
            ],
			callback: function(value) {
                if (App.UsingCordova) {
                    navigator.splashscreen.show();
                } 
				clearEachTable();
			}
		});
    }
}

function clearEachTable()
{
	App.LastUpdated = 0;
	_.each(dataHolder, function (holder) { 
		holder.state = 'full'; 
		deleteAllRecs(holder, tableCleared); 
	});	
}

function tableCleared() 
{ 
	// this function gets called whenever we have finished clearing a table
	var allFinished = !_.any(dataHolder, function (holder) { return holder.state === 'full'; });
	if (allFinished) { 
		// update the lastUpdatedDTS
		App.DB.sw_control
			.filter('it.id===1')
			.toArray(function (record) { 
				var rec = App.DB.sw_control.attachOrGet({ id: 1 });
				rec.lastUpdatedDTS = 0;
				if (record.length === 0) 
					App.DB.sw_control.add(rec);
				App.DB.sw_control.saveChanges().then(getDataFromServer); 
			});
	}
}

function deleteAllRecs(holder, callback) 
{
	holder.table.toArray(function (recs) {

	    recs.forEach(function (rec) {
			holder.table.remove(rec);
		});

        holder.table
        	.saveChanges()
        	.then( function () {
		    	holder.state = 'empty';
				callback();
			});
	});
}

function initialiseDataHolder() 
{
    dataHolder = [
        {
            tableName:  'sw_area',
            imageField: 'area_icon_image_id',
            table:      App.DB.sw_areas,
            data:       null,
            state:      'empty'     // empty, downloaded, failed, completed
        },
        {
            tableName:  'sw_area_image',
            imageField: 'image_id',
            table:      App.DB.sw_area_images,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_sound_walk_image',
            imageField: 'image_id',
            table:      App.DB.sw_sound_walk_images,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_hot_spot',
            imageField: 'image_id',
            table:      App.DB.sw_hot_spots,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_sound_walk',
            imageField: 'map_image_id',
            table:      App.DB.sw_sound_walks,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_info',
            imageField: '',
            table:      App.DB.sw_infos,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_info_image',
            imageField: 'image_id',
            table:      App.DB.sw_info_images,
            data:       null,
            state:      'empty'
        },
        {
            tableName:  'sw_sponsor',
            imageField: 'image_file_id',
            table:      App.DB.sw_sponsors,
            data:       null,
            state:      'empty'
        }
    ];
}
