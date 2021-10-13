jQuery(document).ready(function ($) {
    let additionalLocations = singleLocationsData.additionalLocations;
    let mapZoom = singleLocationsData?.mapZoom ? parseInt(singleLocationsData.mapZoom) : 10;

    let locations = [];

    additionalLocations.forEach((location) => {
        locations.push([location.address, parseFloat(location.lat), parseFloat(location.lng)]);
    });

    if (!locations) return false;

    let map = new google.maps.Map(document.getElementById("ar-map"), {
        zoom: mapZoom,
        center: new google.maps.LatLng(
            locations[locations.length - 1][1],
            locations[locations.length - 1][2]
        ),
    });

    let marker, i;

    let infowindow = new google.maps.InfoWindow();

    for (i = 0; i < locations.length; i++) {
        marker = new google.maps.Marker({
            position: new google.maps.LatLng(locations[i][1], locations[i][2]),
            map: map,
        });

        google.maps.event.addListener(
            marker,
            "click",
            (function (marker, i) {
                return function () {
                    infowindow.setContent(locations[i][0]);
                    infowindow.open(map, marker);
                };
            })(marker, i)
        );
    }
});
