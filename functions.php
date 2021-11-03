<?php

/**
 * @param  $postID
 * @return mixed
 */
function getSingleJobLocations($postID) {

    $additionalLocations = get_post_meta($postID, '_additionallocations', true);

    $primaryLocationLating = get_post_meta($postID, 'geolocation_lat', true);
    $primaryLocationLong = get_post_meta($postID, 'geolocation_long', true);
    $primaryLocationAddress = get_post_meta($postID, '_job_location', true);

    if (!$additionalLocations) {
        $additionalLocations = [];
    }

    array_unshift($additionalLocations, [
        'address' => $primaryLocationAddress,
        'lat'     => $primaryLocationLating,
        'lng'     => $primaryLocationLong
    ]);

    return $additionalLocations;

}

/**
 * @param $locations
 */
function singleLocationString($locations) {
    if (!$locations) {
        return '';
    }

    $locationArray = [];

    foreach ($locations as $key => $location) {
        array_push($locationArray, $location['address']);
    }

    return implode(" | ", $locationArray);
}