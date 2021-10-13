window.wp = window.wp || {};

(function( window, undefined ){

	window.wp = window.wp || {};
	var document = window.document;
	var $ = window.jQuery;

    var api = wp.listifyResults || {};

    // load extra markers
    if ( 1 == api.settings.displayMap ) {
        $.when( api.controllers.mapService.activeCanvas, api.controllers.dataService.activeResponse ).done(function() {
            // not sure why 2 events doesn't work on Google Map and Mapbox so tripe one based on condition
            var multiLocationLoadMarkers = api.settings.mapService.service == 'mapbox' ? 'listifyDataServiceLoaded' : 'listifyMapServiceLoaded';
            $(document).on( multiLocationLoadMarkers, function() {
                var mainListings = api.controllers.dataService.response.listings,
                per_page     = FWP_JSON.preload_data.settings.pager.per_page;
                mainListings.forEach(function(ml){
                    expPgAddiLoc.forEach(exl => {
                        var newMl = $.extend(true, {}, ml);
                        if( ( exl.id === ml.id ) && exl.location ){
                            newMl.location.lat = exl.location.lat;
                            newMl.location.lng = exl.location.lng;
                            newMl.location.address = exl.location.address || exl.location.name;
                            newMl.location.raw = exl.location.address || exl.location.name;
                            mainListings.push(newMl); // push new markers to existing markers
                        }
                    });
                });
                // api.controllers.mapService.resetView();
                api.controllers.mapService.addMarkers(mainListings);
            });
        });
    }

})(window);

