// Overridding this js script from wp job manager geo location
// global maps object
var GJM_Maps = {};

/**
 * Map generator function
 *
 * @param {[type]} map_id [description]
 * @param {[type]} vars  [description]
 */
var GJM_Map = function (map_id, prefix) {
    /**
     * Map ID
     *
     * @type {[type]}
     */
    this.id = map_id;

    /**
     * Prefix
     *
     * @type {[type]}
     */
    this.prefix = prefix;

    /**
     * Map's DIV element
     *
     * @type {[type]}
     */
    this.map_element = prefix + "-map-" + map_id;

    /**
     *
     */
    this.main_container = jQuery('.gjm-enabled[data-id="' + map_id + '"]').closest(
        "div.resumes, div.job_listings"
    );

    /**
     * Map object
     *
     * @type {Boolean}
     */
    this.map = false;

    /**
     * Map options
     *
     * @type {[type]}
     */
    this.map_options = {};

    /**
     * Map type - will be appended into the map options
     * @type {String}
     */
    this.map_type = "ROADMAP";

    /**
     * Locations array
     *
     * @type {Array}
     */
    this.locations = [];

    /**
     * Previous locations - when using paginations
     *
     * @type {Array}
     */
    this.previous_locations = [];

    /**
     * Map markers array
     *
     * @type {Array}
     */
    this.markers = [];

    /**
     * Location info-window
     *
     * @type {Boolean}
     */
    this.active_info_window = false;

    /**
     * User location data
     *
     * @type {Boolean}
     */
    this.user_data = false;

    /**
     * User position
     *
     * @type {Boolean}
     */
    this.user_position = false;

    /**
     * User map icon
     *
     * @type {String}
     */
    this.user_map_icon = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";

    /**
     * User info-window
     *
     * @type {Boolean}
     */
    this.user_info_window = false;

    /**
     * Marker grouping type
     *
     * @type {String}
     */
    this.grouping_type = "normal";

    /**
     * Info window type
     *
     * @type {String}
     */
    this.info_window_type = "info_bubble";

    /**
     * User location map marker
     *
     * @type {Boolean}
     */
    this.user_marker = false;

    /**
     * markers Clusters
     * @type {Boolean}
     */
    this.clusters = false;

    /**
     * Spiderfier
     * @type {Boolean}
     */
    this.spiderfiers = false;

    /**
     * Bounds object
     *
     * @type {Boolean}
     */
    this.bounds = false;

    /**
     * Current marker - the marker clicked
     * @type {[type]}
     */
    this.active_marker = null;

    this.clusters_path =
        "https://raw.githubusercontent.com/googlemaps/js-marker-clusterer/gh-pages/images/m";

    /**
     * Polylines holder
     * @type {Array}
     */
    this.polylines = [];

    this.resize_map_control = false;

    this.auto_zoom_level = false;

    this.zoom_position = false;

    /**
     * Init function
     *
     * @return void
     */
    this.init = function (vars) {
        var self = this;

        // Generate new map if not already exists
        if (self.map == false) {
            // Show map element if hidden.
            jQuery("#" + self.prefix + "-map-wrapper-" + self.id).slideDown("fast", function () {
                self.render_map(vars);
            });

            // otherwise, update existing map
        } else {
            self.update_map(vars.locations, vars.user_position);
        }
    };
};

/**
 * Render the map
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.render_map = function (vars) {
    var self = this;

    // abort if map element not exist
    if (!jQuery("#" + self.map_element).length) {
        return;
    }

    // get updated values
    self.locations = vars.locations;
    self.user_data = vars.user_position;
    self.bounds = new google.maps.LatLngBounds();
    self.orgArgs = vars.args;
    self.zoom_position = vars.args.zoom_position;

    // some values passes via data attribute of the map element
    var map_settings = jQuery("#" + self.map_element).data();

    self.clusters_path = map_settings.clusters_path;
    self.grouping_type = map_settings.group_markers;
    self.user_map_icon = map_settings.user_marker;

    self.map_options = vars.map_options;
    self.map_options.mapTypeId = map_settings.map_type;
    self.map_options.scrollwheel = map_settings.scrollwhee;
    self.map_options.maxZoom = map_settings.max_zoom_level;
    self.map_options.zoomLevel = map_settings.zoom_level;

    // set auto zoom level
    if (self.map_options.zoomLevel == "auto") {
        self.auto_zoom_level = true;
        self.map_options.zoomLevel = 13;

        // otherwise specifiy the zoom level
    } else {
        self.auto_zoom_level = false;
        self.map_options.zoomLevel = parseInt(self.map_options.zoomLevel);
    }

    // map center
    //self.map_options['center'] = new google.maps.LatLng( user_position['lat'], user_position['lng'] );
    self.map_options.center = new google.maps.LatLng("40.758895", "-73.985131");

    // map type
    self.map_options.mapTypeId = google.maps.MapTypeId[self.map_options.mapTypeId];

    // generate the map element
    self.map = new google.maps.Map(document.getElementById(self.map_element), self.map_options);

    // after map was generated
    google.maps.event.addListenerOnce(self.map, "idle", function () {
        // fadeout the map loader
        jQuery("#" + self.prefix + "-map-loader-" + self.id).fadeOut(1000);

        // create map expand toggle if needed
        // temporary disabled. It seems that Google added this feature to his API
        if (
            self.map_options.resizeMapControl &&
            jQuery("#" + self.prefix + "-resize-map-toggle-" + self.id).length != 0
        ) {
            // generate resize toggle
            self.resize_map_control = document.getElementById(
                self.prefix + "-resize-map-toggle-" + self.id
            );
            self.resize_map_control.style.position = "absolute";
            self.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(self.resize_map_control);
            self.resize_map_control.style.display = "block";

            // resize map on click event
            jQuery("#" + self.prefix + "-resize-map-toggle-" + self.id).on("click", function () {
                // get the current map center
                var mapCenter = self.map.getCenter();

                // replace map wrapper class to expended
                jQuery(this)
                    .closest("." + self.prefix + "-map-wrapper")
                    .toggleClass("gjm-expanded-map");

                // replace the toggle icon
                jQuery(this)
                    .toggleClass("gjm-icon-resize-full")
                    .toggleClass("gjm-icon-resize-small");

                // we wait a short moment to allow the wrapper element to resize
                setTimeout(function () {
                    // resize map
                    google.maps.event.trigger(self.map, "resize");

                    // recenter map
                    self.map.setCenter(mapCenter);
                }, 100);
            });

            google.maps.event.addListener(self.map, "click", function (event) {
                self.close_info_window();
            });

            google.maps.event.addDomListener(self.map, "zoom_changed", function (event) {
                self.close_info_window();
            });
        }

        // clear existing markers
        self.clear_markers();

        self.remove_user_marker();
        self.generate_user_marker();

        // generate new markers
        self.generate_markers();
    });
};

/**
 * Remove markers if exists on the map
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.clear_markers = function () {
    var self = this;

    // loop through existing markers
    for (var i = 0; i < self.markers.length + 1; i++) {
        if (i < self.markers.length) {
            //if ( typeof self.markers[i] !== 'undefined' ) {

            // verify marker
            if (self.markers[i]) {
                // clear marker
                self.markers[i].setMap(null);
            }
            //}

            // proceed when doen
        } else {
            this.clear_polylines();

            // generate new markers array.
            self.markers = [];

            // clear group markers
            this.group_markers();
        }
    }
};

/**
 * Remove polyline from the map
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.clear_polylines = function () {
    for (var i = 0; i < this.polylines.length + 1; i++) {
        //remove each plyline from the map
        if (i < this.polylines.length) {
            this.polylines[i].setMap(null);

            //generate new polyline array
        } else {
            this.polylines = [];
        }
    }
};

/**
 * Initilize markers grouping.
 *
 * markers clusters, spiderfier and can be extended
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.group_markers = function () {
    // generate the grouping function
    var groupMarkerFunction = "grouping_type_" + this.grouping_type;

    // verify grouping function
    if (typeof this[groupMarkerFunction] === "function") {
        // run marker grouping
        this[groupMarkerFunction]();

        // otherwise show error message
    } else {
        console.log("The function " + groupMarkerFunction + " not exists.");
    }
};

/**
 * normal grouping function holder
 *
 * since there is no normal grouping we do nothing here.
 *
 * this is just a function holder.
 *
 * @return void
 *
 */
GJM_Map.prototype.grouping_type_normal = function () {};

/**
 * Markers Clusterer grouping
 *
 * @param  {[type]} group_markers [description]
 * @param  {[type]} mapObject     [description]
 * @return {[type]}               [description]
 */
GJM_Map.prototype.grouping_type_markers_clusterer = function () {
    // initialize markers clusterer if needed and if exists
    if (typeof MarkerClusterer === "function") {
        // remove existing clusters
        if (this.clusters != false) {
            this.clusters.clearMarkers();
        }

        //create new clusters object
        this.clusters = new MarkerClusterer(this.map, this.markers, {
            imagePath: this.clusters_path,
            clusterClass: this.prefix + "-cluster cluster",
            maxZoom: 15,
        });
    }
};

/**
 * Markers Spiderfier grouping
 *
 * @param  {[type]} map_object [description]
 * @return {[type]}            [description]
 */
GJM_Map.prototype.grouping_type_markers_spiderfier = function () {
    var self = this;

    // initialize marker spiderfier
    if (typeof OverlappingMarkerSpiderfier === "function") {
        // initiate markers spiderfier
        self.spiderfiers = new OverlappingMarkerSpiderfier(self.map, {
            legWeight: 2,
            markersWontMove: true,
            markersWontHide: true,
            basicFormatEvents: true,
            keepSpiderfied: true,
        });

        self.spiderfiers.addListener("spiderfy", function (event) {
            self.close_info_window();
        });
    }
};

/**
 * Move marker
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.move_marker = function () {
    // do the math
    var a = 360.0 / this.locations.length;

    var newLat =
        this.locations[i].marker_position.lat() + -0.000025 * Math.cos(((+a * i) / 180) * Math.PI); //x
    var newLng =
        this.locations[i].marker_position.lng() + -0.000025 * Math.sin(((+a * i) / 180) * Math.PI); //Y

    var newPosition = new google.maps.LatLng(newLat, newLng);

    // draw a line between the original location
    // to the new location of the marker after it moves
    this.polylines.push(
        new google.maps.Polyline({
            path: [this.locations[i].marker_position, newPosition],
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: this.map,
        })
    );

    return newPosition;
};

/**
 * Update existing map
 *
 * @param  {[type]} mapVars [description]
 * @return {[type]}         [description]
 */
GJM_Map.prototype.update_map = function (locations, user_data) {
    var self = this;

    // abort if map element not exist
    if (!jQuery("#" + self.map_element).length) {
        return;
    }

    self.locations = locations;
    self.user_data = user_data;
    self.bounds = new google.maps.LatLngBounds();

    // close info window if open
    self.close_info_window();

    jQuery("#" + self.prefix + "-map-wrapper-" + self.id).slideDown("fast", function () {
        // clear existing markers
        self.clear_markers();

        self.remove_user_marker();
        self.generate_user_marker();

        // generate new markers
        self.generate_markers();
    });
};

/**
 * User position
 *
 * Create the user's marker and info window
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.generate_user_marker = function () {
    var self = this;

    // generate new user location marker
    if (
        self.user_data.lat != false &&
        self.user_data.lng != false &&
        self.user_map_icon != "0" &&
        self.user_map_icon != ""
    ) {
        // generate user's position
        self.user_position = new google.maps.LatLng(self.user_data.lat, self.user_data.lng);

        // append user position to bounds
        self.bounds.extend(self.user_position);

        // generate user marker
        self.user_marker = new google.maps.Marker({
            position: self.user_position,
            map: self.map,
            icon: self.user_map_icon,
        });

        // generate info-window if content exists
        if (self.user_data.iw_content != false && self.user_data.iw_content != null) {
            self.user_marker.iwContent =
                '<span class="title">' + self.user_data.iw_content + "</span>";

            google.maps.event.addListener(self.user_marker, "click", function () {
                self.marker_click_info_bubble(self.user_marker);
            });
        }
    }
};

/**
 * Get previous locations.
 *
 * When using paginations we append previous locations into
 *
 * the locations array.
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.get_previous_locations = function () {
    var self = this;

    // only if not using pagination. We need to appened markers
    if (self.main_container.data("show_pagination") == false) {
        // we do this only if indeed locations exist.
        // Since indeed location generated dynamically using the div elements
        // we need to remove them from the previous locations object
        if (self.main_container.find(".indeed-enabled").length) {
            var tempLoc = [];

            jQuery.each(self.previous_locations, function (index, value) {
                if (typeof value.post_id != "undefined") {
                    tempLoc[index] = value;
                }
            });

            self.previous_locations = tempLoc;
        }

        if (self.previous_locations == 0) {
            self.previous_locations = self.locations;
        } else {
            if (self.main_container.data("append_results")) {
                temLoc = jQuery.merge(self.locations, self.previous_locations);

                self.previous_locations = self.locations;

                self.locations = temLoc;
            } else {
                self.previous_locations = self.locations;
            }
        }
    }
};

/**
 * Generate markers
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.generate_markers = function () {
    var self = this;

    self.get_previous_locations();

    var locations_count = self.locations.length;

    // loop through locations
    for (i = 0; i < locations_count + 1; i++) {
        // generate markers
        if (i < locations_count) {
            // verify location coordinates
            if (
                self.locations[i].lat == undefined ||
                self.locations[i].lng == undefined ||
                self.locations[i].lat == "0.000000" ||
                self.locations[i].lng == "0.000000"
            ) {
                continue;
            }

            // generate the marker position
            self.locations[i].marker_position = new google.maps.LatLng(
                self.locations[i].lat,
                self.locations[i].lng
            );

            // only if not using markers spiderfeir and if marker with the same location already exists
            // if so, we will move it a bit
            if (
                self.grouping_type != "markers_spiderfier" &&
                self.bounds.contains(self.locations[i].marker_position)
            ) {
                self.locations[i].marker_position = self.move_marker();
            }

            // append location into bounds
            self.bounds.extend(self.locations[i].marker_position);

            // generate marker
            var markerOptions = {
                position: self.locations[i].marker_position,
                icon: self.locations[i].map_icon,
                map: self.map,
                locId: i,
                iwContent: self.locations[i].info_window_content,
            };

            //marker_options = GMW.apply_filters( 'gmw_generate_marker_options', marker_options, marker_id, self );

            // generate marker
            self.markers[i] = new google.maps.Marker(markerOptions);

            // add marker to cluster
            if (
                self.grouping_type == "markers_clusterer" &&
                typeof MarkerClusterer === "function"
            ) {
                // add marker to cluster object
                self.clusters.addMarker(self.markers[i]);

                // init marker click event
                google.maps.event.addListener(self.markers[i], "click", function () {
                    self.marker_click(this);
                });

                // add marker to spiderfier
            } else if (
                self.grouping_type == "markers_spiderfier" &&
                typeof OverlappingMarkerSpiderfier === "function"
            ) {
                // add marker into spiderfier object
                self.spiderfiers.addMarker(self.markers[i]);

                // place marker on the map
                self.markers[i].setMap(self.map);

                google.maps.event.addListener(self.markers[i], "spider_click", function () {
                    self.marker_click(this);
                });

                // if no grouping
            } else {
                self.markers[i].setMap(self.map);

                // init marker click event
                google.maps.event.addListener(self.markers[i], "click", function () {
                    self.marker_click(this);
                });
            }

            // Continue when done generating the markers.
        } else {
            // center map when done creating the users position
            self.center_map();
        }
    }
};

/**
 * Remove user marker
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.remove_user_marker = function () {
    // remove existing user marker
    if (this.user_marker != false) {
        this.user_marker.setMap(null);
        this.user_marker = false;
        this.user_position = false;
    }
};

/**
 * center and zoom map
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.center_map = function () {
    var self = this;

    // custom zoom point
    if (self.zoom_position != false && !self.auto_zoom_level) {
        // get position
        var latLng = new google.maps.LatLng(self.zoom_position[0], self.zoom_position[1]);

        self.map.setZoom(parseInt(self.map_options.zoomLevel));
        self.map.panTo(latLng);

        // zoom map when a single marker exists on the map
    } else if (self.locations.length == 1 && self.user_position == false) {
        if (self.auto_zoom_level) {
            self.map.setZoom(13);
        } else {
            self.map.setZoom(parseInt(self.map_options.zoomLevel));
        }

        self.map.panTo(self.markers[0].getPosition());
    } else if (!self.auto_zoom_level && self.user_position != false) {
        self.map.setZoom(parseInt(self.map_options.zoomLevel));
        self.map.panTo(self.user_position);
    } else if (self.auto_zoom_level || self.user_position == false) {
        self.map.fitBounds(self.bounds);
    }
};

/**
 * Marker click event
 *
 * @param  {[type]} marker [description]
 *
 * @return {[type]}        [description]
 */
GJM_Map.prototype.marker_click = function (marker) {
    this.acvtive_marker = marker;

    // Clear directions if set on the map
    if (typeof directionsDisplay !== "undefined") {
        directionsDisplay.setMap(null);
    }

    // generate the click function
    var markerClickFunction = "marker_click_" + this.info_window_type;

    // verify marker click function
    if (typeof this[markerClickFunction] === "function") {
        // execute marker click event
        this[markerClickFunction](marker);

        // show an error if function is missing
    } else {
        console.log("The function " + markerClickFunction + " not exists.");
    }
};

/**
 * Close info window
 *
 * @return {[type]} [description]
 */
GJM_Map.prototype.close_info_window = function () {
    // close info window if open
    if (this.active_info_window) {
        this.active_info_window.close();
        this.active_info_window = false;
    }
};

/**
 * Normal info window
 *
 * @param  {[type]} marker    [description]
 * @param  {[type]} iw_type   [description]
 * @param  {[type]} mapObject [description]
 * @return {[type]}           [description]
 */
GJM_Map.prototype.marker_click_normal = function (marker) {
    // verify iw content
    if (marker.iwContent) {
        // close open window
        this.close_info_window();

        // generate new window
        this.active_info_window = new google.maps.InfoWindow({
            content: marker.iwContent,
            maxWidth: 300,
        });

        // open window
        this.active_info_window.open(this.map, marker);
    }
};

/**
 * Generate Info-bubble
 *
 * @param  {[type]} marker [description]
 * @return {[type]}        [description]
 */
GJM_Map.prototype.marker_click_info_bubble = function (marker) {
    // close open window
    this.close_info_window();

    if (marker.iwContent) {
        this.active_info_window = new InfoBubble({
            content: marker.iwContent,
            shadowStyle: 0,
            padding: 15,
            borderRadius: 5,
            borderWidth: 0,
            borderColor: "#ffffff",
            backgroundColor: "#ffffff",
            minWidth: "250px",
            maxWidth: "350px",
            minHeight: "80px",
            //maxHeight : '150px',
            arrowSize: 20,
            arrowPosition: 50,
            arrowStyle: 0,
            disableAutoPan: false,
            hideCloseButton: false,
            closeSrc: " ",
            backgroundClassName: this.prefix + "-info-window bubble gjm-icon-cancel-circled",
        });

        this.active_info_window.open(this.map, marker);
    }
};

/**
 * Calculate distance between 2 points on the map
 *
 * @param  {[type]} lat1 [description]
 * @param  {[type]} lng1 [description]
 * @param  {[type]} lat2 [description]
 * @param  {[type]} lng2 [description]
 * @return {[type]}      [description]
 */
function gjm_calculate_distance(lat1, lng1, lat2, lng2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a =
        0.5 -
        c((lat2 - lat1) * p) / 2 +
        (c(lat1 * p) * c(lat2 * p) * (1 - c((lng2 - lng1) * p))) / 2;

    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

jQuery(document).ready(function ($) {
    var session_storage_prefix = "job_listing_";

    /**
     * Check if we should maintain the state.
     *
     * Taken from WP Job Manager plugin to be able to retrieve the state storage.
     */
    function is_state_storage_enabled($target) {
        if (!supports_html5_session_storage()) {
            return false;
        }

        // Check to see if it is globally disabled.
        if ($(document.body).hasClass("disable-job-manager-form-state-storage")) {
            return false;
        }

        // Check if it is disabled on this specific element.
        if ($target.data("disable-form-state-storage")) {
            return false;
        }

        return true;
    }

    /**
     * Check if the sessionStorage object is available.
     *
     * Taken from WP Job Manager plugin to be able to retrieve the state storage.
     */
    function supports_html5_session_storage() {
        return window.sessionStorage && typeof window.sessionStorage.setItem === "function";
    }

    /**
     * Get the session storage key for the job listings instance.
     *
     * Taken from WP Job Manager plugin to be able to retrieve the state storage.
     */
    function get_session_storage_key($target) {
        var index = $("div.job_listings").index($target);
        var unique_page_id = $target.data("post_id");

        if (typeof unique_page_id === "undefined" || !unique_page_id) {
            unique_page_id = window.location.href.replace(location.hash, "");
        }

        return session_storage_prefix + unique_page_id + "_" + index;
    }

    /**
     * Retrieve the stored form values and maybe the rendered results from sessionStorage.
     *
     * Taken from WP Job Manager plugin to be able to retrieve the state storage.
     */
    function get_state($target) {
        if (!is_state_storage_enabled($target)) {
            return false;
        }

        var session_storage_key = get_session_storage_key($target);

        try {
            var state = window.sessionStorage.getItem(session_storage_key);
            if (state) {
                return JSON.parse(state);
            }
        } catch (e) {
            // If the browser has denied us access, continue gracefully as if there wasn't any stored state.
        }

        return false;
    }

    // When searching for jobs, check if need to append locations when usign the load more button.
    $(".job_listings, .resumes").on("update_results", function (event, page, append) {
        if (jQuery(this).data("show_pagination") == false) {
            jQuery(this).data("append_results", append);
        } else {
            jQuery(this).data("append_results", false);
        }
    });

    /**
     * Render/update the map after Jobs form updated.
     *
     * @param  {[type]} map_id [description]
     * @param  {[type]} prefix [description]
     * @return {[type]}        [description]
     */
    function gjm_render_map(gjmMapObject) {
        // abort if map object not exist
        if (typeof gjmMapObject == "undefined") {
            return;
        }

        var map_id = gjmMapObject.args.map_id;
        var prefix = gjmMapObject.args.prefix;

        // gjmMapObject.map_options.zoomLevel = parseInt(listifyLocationsData.mapZoom);

        console.log(gjmMapObject);
        // if not yet exists, generate a new map
        if (typeof GJM_Maps[map_id] == "undefined") {
            GJM_Maps[map_id] = new GJM_Map(map_id, prefix);

            GJM_Maps[map_id].init(gjmMapObject);

            gjmMapObject = {};

            // otherwise, update existing map
        } else {
            GJM_Maps[map_id].update_map(gjmMapObject.locations, gjmMapObject.user_position);

            gjmMapObject = false;
        }
    }

    /**
     * When the page first loads, check if jobs form loads from state fistory.
     *
     * If so, get the map object from the state storage.
     *
     * This code was taken from WP Job Manager plugin.
     *
     * @param  {[type]} ) {		$(        'div.job_listings' ).each( function() {			var $target [description]
     * @return {[type]}   [description]
     */
    $(window).on("load", function () {
        $("div.gjm-enabled").each(function () {
            var $target = $(this).closest(".job_listings");
            var $form = $target.find(".job_filters");
            var state = get_state($target);
            var elementId = jQuery(this).data("id");

            if (state) {
                /**
                 * preset the geolocation form filters from state storage if exists.
                 *
                 * @type {URLSearchParams}
                 */
                var searchParams = new URLSearchParams(state.results.data.form_data);

                if (searchParams.has("radius")) {
                    $form.find("#gjm-radius").val(searchParams.get("radius")).trigger("change");
                }

                if (searchParams.has("gjm_units")) {
                    $form.find("#gjm-units").val(searchParams.get("gjm_units")).trigger("change");
                }

                if (searchParams.has("gjm_orderby")) {
                    $form
                        .find("#gjm-orderby")
                        .val(searchParams.get("gjm_orderby"))
                        .trigger("change");
                }

                // Restore the map from cache when map exists.
                if (
                    state.results &&
                    typeof state.results.gjm_map !== "undefined" &&
                    jQuery(document).find("#gjm-map-" + elementId).length
                ) {
                    var result = state.results;
                    var gjmMapObject =
                        typeof result.gjm_map !== "undefined" ? result.gjm_map : false;
                    //var map_id       = $target.find( '.gjm-map-wrapper' ).data( 'map_id' );

                    /**
                     * This is a fix for a conflict with the GJM element ID when
                     *
                     * loading results from history.state
                     *
                     * Because the element ID is generated randomly on page load ( unless specified by the user via shortcode attribute )
                     *
                     * The element ID saved in the state will be different than the new ID generated on page load.
                     *
                     * This cause a conflict with the map element.
                     *
                     * To correct this, we get the element ID from the map element in the form and pass it into the form_data and map_args in the state storage.
                     *
                     * @return {[type]} [description]
                     */
                    result.data.form_data += "&gjm_element_id=" + elementId;
                    result.gjm_map.args.map_id = elementId;

                    gjm_render_map(gjmMapObject);
                }
            }
        });
    });
    /**
     * Update map when form done updating via AJAX
     *
     * @param  {[type]} event  [description]
     * @param  {[type]} result )             {		var currentElement [description]
     * @return {[type]}        [description]
     */
    jQuery(".job_listings, .resumes").on("updated_results", function (event, result) {
        console.log(result.additionalLocations);
        if (result.additionalLocations) {
            result.additionalLocations.forEach((locationObject) => {
                for (const key in locationObject) {
                    if (Object.hasOwnProperty.call(locationObject, key)) {
                        const singleLocation = locationObject[key];
                        result.gjm_map.locations.push({
                            post_id: singleLocation.postID,
                            address: singleLocation.address,
                            distance: "",
                            formatted_address: singleLocation.address,
                            info_window_content: `<a class="title" href="${singleLocation.postURL}" title="Test Hiring">${singleLocation.postTitle}</a><span class="location gjm-icon-location">${singleLocation.address}</span>`,
                            lat: singleLocation.lat,
                            lng: singleLocation.lng,
                            long: singleLocation.lng,
                            map_icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        });
                    }
                }
            });
        }

        // Look for map object in the result object.
        var gjmMapObject = typeof result.gjm_map !== "undefined" ? result.gjm_map : false;

        // Abort if map object was not found.
        if (gjmMapObject == false) {
            return;
        }

        var currentElement = jQuery(event.currentTarget);
        var map_id = currentElement.find(".gjm-enabled").data("id");
        var prefix = currentElement.find(".gjm-enabled").data("prefix");
        var activeTheme = "default";

        if (jQuery("body").is('[class*=" jobify"]')) {
            activeTheme = "jobify";
        }

        // if found jobs
        if (
            (event.target.className.indexOf("job_listings") >= 0 && result.found_jobs == true) ||
            (event.target.className == "resumes" && result.found_resumes == true)
        ) {
            // enable indeed only if enabled and exists on the page
            if (
                currentElement.find(".indeed-enabled").length &&
                currentElement.find(".wp-job-manager-attribution-row.job_listing").length
            ) {
                var userLat = false;
                var userLng = false;
                var mapExists = jQuery("#" + prefix + "-map-" + map_id).length ? true : false;

                // When gjm map data is missing it means that only indeed locations will show on the map.
                // When that is the case we will generate a new map object
                if (typeof gjmMapObject == "undefined" || gjmMapObject == false) {
                    // look for the user current location
                    userLat = currentElement.find(".gjm-lat").val();
                    userLng = currentElement.find(".gjm-lng").val();

                    var user_position = {
                        lat: false,
                        lng: false,
                    };

                    // generate user data
                    if (userLat != "undefined" && userLng != "undefined") {
                        user_position = {
                            lat: userLat,
                            lng: userLng,
                            iw_content: "You are here",
                            iw_open: false,
                        };
                    }

                    // generate the map object
                    gjmMapObject = {
                        args: {},
                        map_options: {},
                        locations: [],
                        user_position: user_position,
                    };
                }

                var sortBy = currentElement.find("#" + prefix + "-orderby").val();
                var units =
                    currentElement.find("#" + prefix + "-units").val() == "imperial" ? "mi" : "km";
                var radius = currentElement.find("#" + prefix + "-radius").val();
                var addressValue = currentElement.find("#search_location").val();
                var showDistance = currentElement.find(".indeed-enabled").data("distance");
                var mapIcon = currentElement.find(".indeed-enabled").data("map_icon");

                var indeedElements = currentElement.find(
                    ".wp-job-manager-attribution-row.job_listing"
                );
                var indeedElementsCount = indeedElements.length;
                var elementsDone = 0;

                // look for and loop through indeed locations.
                indeedElements.each(function () {
                    var indeed_element = jQuery(this);
                    var indeed_locations = jQuery(this)
                        .next(".job_listing")
                        .nextUntil(".type-job_listing, .wp-job-manager-attribution-row")
                        .addBack();
                    var locations_count = indeed_locations.length;

                    // loop indeed locations
                    for (i = 0; i < locations_count + 1; i++) {
                        if (i < locations_count) {
                            // get location data
                            var location_element = jQuery(indeed_locations[i]);
                            var location_data = location_element.data();
                            var jobLat = location_data.latitude;
                            var jobLng = location_data.longitude;
                            var distance = false;

                            // check if is remote location
                            var isRemote = jobLat == 25 && jobLng == -40 ? true : false;

                            // create marker only if not a remote location
                            if (!isRemote && addressValue != "undefined") {
                                // calculate distance
                                if (
                                    gjmMapObject.user_position.lat != false &&
                                    gjmMapObject.user_position.lng != false
                                ) {
                                    distance = gjm_calculate_distance(
                                        gjmMapObject.user_position.lat,
                                        gjmMapObject.user_position.lng,
                                        jobLat,
                                        jobLng
                                    );

                                    // convert to kilometers if needed
                                    if (units != "mi") {
                                        distance = distance * 1.609344;
                                    }

                                    distance = distance.toFixed(1);

                                    location_element.attr("data-distance", distance);

                                    if (showDistance == 1) {
                                        // update distance if exists
                                        if (
                                            location_element.find(
                                                "." + prefix + "-distance-wrapper"
                                            ).length
                                        ) {
                                            location_element
                                                .find("." + prefix + "-distance-wrapper")
                                                .html(distance + " " + units);

                                            // append distance
                                        } else {
                                            // append for both default themes and jobify
                                            location_element
                                                .find("ul.meta, ul.job_listing-meta")
                                                .append(
                                                    '<span class="' +
                                                        prefix +
                                                        '-distance-wrapper">' +
                                                        distance +
                                                        " " +
                                                        units +
                                                        "</span>"
                                                );
                                        }
                                    }
                                }

                                // generate locations only if map exists
                                if (mapExists) {
                                    // generate info-window
                                    info_window_content = "";

                                    // for jobify theme
                                    if (activeTheme == "jobify") {
                                        info_window_content +=
                                            '<a class="title" target="_blank" href="' +
                                            location_data.href +
                                            '">' +
                                            location_data.title +
                                            "</a>";
                                        info_window_content +=
                                            '<span class="location gjm-icon-location">' +
                                            location_element
                                                .find(".job_listing-about .job_listing-location")
                                                .html() +
                                            "</span>";
                                    } else {
                                        info_window_content +=
                                            '<a class="title" target="_blank" href="' +
                                            location_element.find("a").attr("href") +
                                            '">' +
                                            location_element.find(".position h3").html() +
                                            "</a>";
                                        info_window_content +=
                                            '<span class="location gjm-icon-location">' +
                                            location_element.find(".location").html() +
                                            "</span>";
                                    }

                                    if (showDistance == 1 && distance != false) {
                                        info_window_content +=
                                            '<span class="distance">' +
                                            distance +
                                            " " +
                                            units +
                                            "</span>";
                                    }

                                    gjmMapObject.locations.push({
                                        lat: jobLat,
                                        lng: jobLng,
                                        map_icon: mapIcon,
                                        info_window_content: info_window_content,
                                    });
                                }
                            }
                        } else {
                            // sort indeed elements by distance
                            if (sortBy == "distance" && distance != false) {
                                indeed_locations
                                    .sort(function (a, b) {
                                        return +a.dataset.distance - +b.dataset.distance;
                                    })
                                    .insertAfter(indeed_element);
                            }

                            elementsDone++;

                            if (elementsDone == indeedElementsCount) {
                                gjm_render_map(gjmMapObject);
                            }
                        }
                    }
                });
            } else {
                gjm_render_map(gjmMapObject);
            }

            // if no results found clear any existing markers and hide the map
        } else {
            if (typeof GJM_Maps[map_id] != "undefined") {
                GJM_Maps[map_id].clear_markers();

                if (
                    jQuery("#gjm-map-wrapper-" + map_id).length &&
                    jQuery("#gjm-map-" + map_id).data("show_without_locations") != true
                ) {
                    // hide the map
                    jQuery("#gjm-map-wrapper-" + map_id).slideUp();
                }
            }
        }

        gjmMapObject = false;
    });
});

/**
 * On document ready generate all maps exists in the global maps holder.
 *
 * @param  {GMW_Map}
 * @return {[type]}       [description]
 */
jQuery(document).ready(function ($) {
    if (typeof gjmMapObjects == "undefined") {
        return;
    }

    // loop through and generate all maps
    jQuery.each(gjmMapObjects, function (map_id, vars) {
        // generate new map
        GJM_Maps[map_id] = new GJM_Map(map_id, vars.args.prefix);
        // initiate it
        GJM_Maps[map_id].render_map(vars);
    });
});
