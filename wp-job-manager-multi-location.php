<?php
/**
 * Plugin Name: Listify Multi Location for WP Job Manager
 * Plugin URI:  https://plugins.keendevs.com/listify-wp-job-manager-multi-location
 * Description: Enable adding multiple locations for a single listing for admin. This plugin also shows in the multiple locations on the frontend search and single listing page location map.
 * Author:      Azizul Haque
 * Author URI:  https://keendevs.com
 * Version:     7.0
 * Text Domain: multi-location
 * Domain Path: /languages
 * License: GPLv2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Keendevs_Multi_Location_WP_JOB_M {

    /**
     * @var $instance
     */
    private static $instance;

    /**
     * Make sure only one instance is only running.
     */
    public static function instance() {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Start things up.
     *
     * @since 1.0
     */
    public function __construct() {
        $this->version = '7.0';
        // $this->version = time();
        $this->file = __FILE__;
        $this->basename = plugin_basename($this->file);
        $this->plugin_dir = plugin_dir_path($this->file);
        $this->plugin_url = set_url_scheme(plugin_dir_url($this->file), is_ssl() ? 'https' : 'http');
        $this->lang_dir = trailingslashit($this->plugin_dir . 'languages');
        $this->domain = 'multi-location';
        $this->setup_actions();
    }

    /**
     * Setup the default hooks and actions
     *
     * @since 1.0
     *
     * @return void
     */
    private function setup_actions() {

        /* Register Scripts */
        add_action('admin_enqueue_scripts', array($this, 'register_scripts'), 99);
        add_action('wp_enqueue_scripts', array($this, 'frontEndScripts'), 9999);

        /* load text domain */
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        /* Save Geo for New Post */
        add_action('job_manager_save_job_listing', array($this, 'save_post_location'), 31, 2);
        add_action('resume_manager_save_resume', array($this, 'save_post_location'), 31, 2);
        add_action('wpjm_events_save_event', array($this, 'save_post_location'), 30, 2);

        /* Save Geo on Update Post */
        add_action('job_manager_update_job_data', array($this, 'save_post_location'), 26, 2);
        add_action('resume_manager_update_resume_data', array($this, 'save_post_location'), 25, 2);
        add_action('wpjm_events_update_event_data', array($this, 'save_post_location'), 26, 2);

        add_filter('job_manager_get_listings_result', [$this, 'injectAdditionalLocationData'], 10, 2);

        add_filter('the_content', [$this, 'integrateSingleListingMap'], 999);

        // Add meta box to control the map zoom option
        add_action('add_meta_boxes_job_listing', [$this, 'registerMetaBox']);

        // Save the post meta on saving the post
        add_action('save_post_job_listing', [$this, 'saveMetaValue'], 10, 2);

        // Filter Main job location
        add_filter('the_job_location_map_link', [$this, 'filterMainJobLocation'], 10, 3);

        add_filter('manage_edit-job_listing_columns', [$this, 'filterJobListingColumn'], 999);
        add_filter('manage_edit-job_listing_sortable_columns', [$this, 'makeLocationSortable'], 999);
        add_action('manage_job_listing_posts_custom_column', [$this, 'manageDataOfLocationColumn'], 99, 2);

        /* get job listing based on location meta serach */
        add_action('wp_ajax_addition_loation_search', [$this, 'getJobListingByMeta']);
        add_action('wp_ajax_nopriv_addition_loation_search', [$this, 'getJobListingByMeta']);
    }

    public function getJobListingByMeta() {
        $output = [];

        if (sanitize_text_field($_POST['action']) !== 'addition_loation_search') {
            $output['response'] = 'invalid';
            $output['message'] = 'Action is not valid';
            echo json_encode($output);
            wp_die();
        }

        $nearbyLocations = $this->sanitizeData($_POST['nearbyLocations']);

        $args = [
            'post_type'      => 'job_listing',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'meta_query'     => [
                'relation' => 'OR',
                [
                    'key'     => '_job_location',
                    'value'   => $nearbyLocations,
                    'compare' => 'LIKE'
                ],
                [
                    'key'     => '_additionallocations',
                    'value'   => $nearbyLocations,
                    'compare' => 'LIKE'
                ]
            ]
        ];

        $jobListings = get_posts($args);

        if (!$jobListings) {
            $output['response'] = 'empty';
            $output['message'] = 'No job found';
            echo json_encode($output);
            wp_die();
        }

        $posts = [];

        foreach ($jobListings as $key => $job) {

            $posts[$job->ID]['locations'] = get_post_meta($job->ID, '_additionallocations', true);
            $posts[$job->ID]['postID'] = $job->ID;
            $posts[$job->ID]['postTitle'] = esc_html(get_the_title($job->ID));
            $posts[$job->ID]['postURL'] = esc_url(get_permalink($job->ID));
            $posts[$job->ID]['attachmentURL'] = esc_url(get_the_post_thumbnail_url($job->ID));
            $posts[$job->ID]['companyName'] = esc_html(get_post_meta($job->ID, '_company_name', true));
            $posts[$job->ID]['jobTypes'] = [];
            $posts[$job->ID]['postedTime'] = '<li class="date"><time datetime="' . get_the_time('y-m-d', $job->ID) . '">Posted ' . human_time_diff(get_the_time('U', $job->ID), current_time('U')) . ' ago</time></li>';

            $jobTypes = get_the_terms($job->ID, 'job_listing_type');

            if ($jobTypes) {
                foreach ($jobTypes as $key => $jobType) {
                    array_push($posts[$job->ID]['jobTypes'], '<li class="job-type ' . esc_attr($jobType->slug) . '">' . esc_html($jobType->name) . '</li>');
                }
            }

            $primaryLocationLating = get_post_meta($job->ID, 'geolocation_lat', true);
            $primaryLocationLong = get_post_meta($job->ID, 'geolocation_long', true);
            $primaryLocationAddress = get_post_meta($job->ID, '_job_location', true);

            if ($primaryLocationLating && $primaryLocationLong && $primaryLocationAddress) {

                array_push($posts[$job->ID]['locations'], [
                    'address' => $primaryLocationAddress,
                    'lat'     => $primaryLocationLating,
                    'lng'     => $primaryLocationLong
                ]);
            }

        }

        if ($posts) {
            $output['response'] = 'success';
            $output['message'] = 'Job found';
            $output['results'] = $posts;
            echo json_encode($output);
        } else {
            $output['response'] = 'empty';
            $output['message'] = 'No job found';
            echo json_encode($output);
            wp_die();
        }

        wp_die();
    }

    /**
     * @param  array   $NonSanitzedData
     * @return mixed
     */
    public function sanitizeData(array $NonSanitzedData) {
        $sanitizedData = null;

        $sanitizedData = array_map(function ($data) {
            if (gettype($data) == 'array') {
                return $this->sanitizeData($data);
            } else {
                return sanitize_text_field($data);
            }
        }, $NonSanitzedData);

        return $sanitizedData;
    }

    /**
     * @param  $columns
     * @return mixed
     */
    public function filterJobListingColumn($columns) {
        unset($columns['job_location']);

        $columns['job_locations'] = esc_html('Job Locations');

        return $columns;
    }

    /**
     * @param $column
     * @param $postID
     */
    public function manageDataOfLocationColumn($column, $postID) {

        switch ($column) {

        case 'job_locations':

            $locations = $this->getSingleJobLocations($postID);

            echo $this->singleLocationString($locations);

            break;

        default:
            echo '';
            break;
        }
    }

    /**
     * @param $sortableColumns
     */
    public function makeLocationSortable($sortableColumns) {

        $sortableColumns['job_locations'] = 'job_locations';

        return $sortableColumns;
    }

    /**
     * @param $postID
     */
    public function getSingleJobLocations($postID) {

        $additionalLocations = get_post_meta($postID, '_additionallocations', true);

        $primaryLocationLating = get_post_meta($postID, 'geolocation_lat', true);
        $primaryLocationLong = get_post_meta($postID, 'geolocation_long', true);
        $primaryLocationAddress = get_post_meta($postID, '_job_location', true);

        if (!$additionalLocations) {
            $additionalLocations = [];
        }

        array_push($additionalLocations, [
            'address' => $primaryLocationAddress,
            'lat'     => $primaryLocationLating,
            'lng'     => $primaryLocationLong
        ]);

        return $additionalLocations;

    }

    // Make all the location of a single job post type as a single string with comma separated
    /**
     * @param  $locations
     * @return mixed
     */
    public function singleLocationString($locations) {
        if (!$locations) {
            return '';
        }

        $locationArray = [];

        foreach ($locations as $key => $location) {
            array_push($locationArray, $location['address']);
        }

        return implode(" | ", $locationArray);
    }

    /**
     * @return array
     */
    public function localize_scripts_data() {
        global $post;

        if (get_post_type($post) != 'job_listing') {
            return;
        }

        $listing_id = $post->ID;

        $defaultLatLng = array(
            'lat' => esc_attr(get_option('wpjmel_start_geo_lat', 40.712784)),
            'lng' => esc_attr(get_option('wpjmel_start_geo_long', -74.005941))
        );
        if ($listing_id) {
            $locations = get_post_meta($listing_id, '_additionallocations', true);
            if (is_array($locations)) {
                $extraMarkers = array_filter($locations, array($this, 'secure_location_data'));
            }
        }
        $markers = array(
            'defaultLatLng'       => $defaultLatLng,
            'additionallocations' => isset($extraMarkers) ? $extraMarkers : null
        );

        return $markers;
    }

    /**
     * @param  $location
     * @return mixed
     */
    public function secure_location_data($location) {
        $allowedKeys = ['address', 'lat', 'lng'];
        if (!is_array($location)) {
            return false;
        }
        foreach ($location as $k => $v) {
            if (in_array($k, $allowedKeys, true)) {
                if ('address' === $k) {
                    $location[$k] = sanitize_text_field($v);
                } else {
                    $location[$k] = floatval(filter_var($v, FILTER_SANITIZE_NUMBER_FLOAT));
                }
            } else {
                return;
            }
        }
        return $location;
    }

    public function register_scripts() {
        $localizeData = $this->localize_scripts_data();

        wp_enqueue_style('multi-location-css', $this->plugin_url . 'assets/css/multilocation.css');

        wp_enqueue_script('admin-script', $this->plugin_url . 'assets/js/admin-script.js', array('jquery', 'mapify'), $this->version, true);

        wp_localize_script('admin-script', 'additionallocations', $localizeData);
    }

    public function frontEndScripts() {

        if (is_singular('job_listing')) {
            wp_enqueue_script('single-listing', $this->plugin_url . 'assets/js/single-listing.js', array('jquery', 'mapify'), $this->version, true);
        }

        // First de-register the wp job geoloaction script
        wp_deregister_script('gjm-map');

        // Than we will register our own script
        wp_register_script(
            'gjm-map',
            $this->plugin_url . 'assets/js/gjm.map.js',
            array(
                'jquery',
                'wp-job-manager-ajax-filters'
            ),
            $this->version,
            true
        );

        // Localize variables for frontend scripts
        wp_localize_script('gjm-map', 'localizeData', [
            'siteURL' => site_url('/'),
            'ajaxURL' => admin_url('admin-ajax.php'),
            'apiKey'  => get_option('gjm_google_api_key')
        ]);

    }

    /**
     * @param $post_id
     * @param $values
     */
    function save_post_location(
        $post_id,
        $values
    ) {
        $post_type = get_post_type($post_id);
        /* save / update the locations */
        if ('job_listing' == $post_type) {
            // sanitize the data before saving
            $extraMarkers = array_filter($_POST['additionallocation'], array($this, 'secure_location_data'));
            update_post_meta($post_id, '_additionallocations', $extraMarkers);
        }
    }

    /**
     * @param $result
     * @param $post
     */
    public function injectAdditionalLocationData(
        $result,
        $post
    ) {

        $additionalLocations = [];

        $posts = $post->posts;
        if ($posts) {
            foreach ($posts as $key => $singlePost) {
                $locations = get_post_meta($singlePost->ID, '_additionallocations', true);
                if ($locations) {

                    foreach ($locations as $key => $value) {

                        $locations[$key]['postID'] = $singlePost->ID;
                        $locations[$key]['postTitle'] = esc_html(get_the_title($singlePost->ID));
                        $locations[$key]['postURL'] = esc_url(get_permalink($singlePost->ID));

                    }

                    array_push($additionalLocations, $locations);
                }
            }
        }

        $result['additionalLocations'] = $additionalLocations;

        return $result;
    }

    /**
     * @param  $content
     * @return mixed
     */
    public function integrateSingleListingMap($content) {
        $postID = get_the_ID();

        $previousContent = $content;

        $content = '';

        if (get_post_type($postID) == 'job_listing') {

            $additionalLocations = get_post_meta($postID, '_additionallocations', true);

            $primaryLocationLating = get_post_meta($postID, 'geolocation_lat', true);
            $primaryLocationLong = get_post_meta($postID, 'geolocation_long', true);
            $primaryLocationAddress = get_post_meta($postID, '_job_location', true);

            if (!$additionalLocations) {
                $additionalLocations = [];
            }

            array_push($additionalLocations, [
                'address' => $primaryLocationAddress,
                'lat'     => $primaryLocationLating,
                'lng'     => $primaryLocationLong
            ]);

            $additionalLocationHTML = $this->additionalLocationHTML($additionalLocations);

            wp_localize_script('single-listing', 'singleLocationsData', [
                'additionalLocations' => $additionalLocations,
                'mapZoom'             => get_post_meta($postID, '_map_zoom', true) ? get_post_meta($postID, '_map_zoom', true) : 10
            ]);

            $content .= $additionalLocationHTML;

            $mapContainer = '<div id="ar-map" style="width: 100%; position: relative; height: 500px"></div><br>';

            $content .= $mapContainer;

        }

        $content .= '<style>
            .single_job_listing .location::before {
                display: none !important;
            }
            </style>';

        $content .= $previousContent;

        return $content;
    }

    /**
     * @param  array   $additionalLocations
     * @return mixed
     */
    public function additionalLocationHTML(array $additionalLocations) {

        if (!$additionalLocations) {
            return '';
        }

        $additionalLocationHTML = '<h4>All Locations:</h4><ul class="job-listing-meta meta">';

        foreach ($additionalLocations as $key => $location) {
            $additionalLocationHTML .= '<li class="location"><a class="google_map_link" href="https://maps.google.com/maps?q=' . $location['address'] . ';zoom=14&#038;size=512x512&#038;maptype=roadmap&#038;sensor=false">' . $location['address'] . '</a></li>';
        }

        $additionalLocationHTML .= '</ul>';

        return $additionalLocationHTML;

    }

    // Register Meta box for controlling zoom option in frontend google map
    public function registerMetaBox() {
        add_meta_box(
            'map_zoom',
            'Google Map Zoom',
            [$this, 'metaBoxHTML'],
            ['page', 'job_listing'],
            'side',
            'core'
        );
    }

    // Meta box html layout to generate in meta box
    /**
     * @param $post
     */
    public function metaBoxHTML($post) {
        wp_nonce_field('listify_map_zoom_action', 'listify_map_meta_nonce');
        $metaValue = get_post_meta($post->ID, '_map_zoom', true);

        $metaValue = $metaValue ? $metaValue : 10;

        echo '
            <div>
                <strong>
                    <label for="map_zoom">Google Map Zoom</label>
                    <br/>
                </strong>
                <br />
                <span>Zoom value must be from 0 to 19</span>
                <br />
                <input type="number" name="_map_zoom" min="0" max="19" id="map_zoom" value="' . $metaValue . '"/>
            </div>
       ';
    }

    /**
     * @param  int     $postID
     * @param  object  $postObject
     * @return mixed
     */
    public function saveMetaValue(int $postID, object $postObject) {

        if (!isset($_POST['listify_map_meta_nonce']) || !wp_verify_nonce($_POST['listify_map_meta_nonce'], 'listify_map_zoom_action')) {
            return $postID;
        }

        /* Does current user have capabitlity to edit post */
        $postType = get_post_type_object($postObject->post_type);

        if (!current_user_can($postType->cap->edit_post, $postID)) {
            return $postID;
        }

        /* Get the posted data and check it for uses. */
        $new_meta_value = (isset($_POST['_map_zoom']) ? $_POST['_map_zoom'] : "");

        /* Get the meta key. */
        $meta_key = '_map_zoom';

        /* Get the meta value of the custom field key. */
        $meta_value = get_post_meta($postID, $meta_key, true);

        if ($new_meta_value && "" == $meta_value) {
            /* If a new meta value was added and there was no previous value, add it. */
            add_post_meta($postID, $meta_key, $new_meta_value);
        } elseif ($new_meta_value && $new_meta_value != $meta_value) {
            /* If the new meta value does not match the old value, update it. */
            update_post_meta($postID, $meta_key, $new_meta_value);
        } elseif ("" == $new_meta_value && $meta_value) {
            /* If there is no new meta value but an old value exists, delete it. */
            delete_post_meta($postID, $meta_key, $meta_value);
        }

    }

    /**
     * @param  $link
     * @param  $location
     * @param  $post
     * @return mixed
     */
    public function filterMainJobLocation($link, $location, $post) {
        $location = '';
        return $location;
    }

}

/**
 * Start things up.
 *
 * Use this function instead of a global.
 *
 * @since 1.0
 */
function wp_job_manager_multi_location() {

    // deactivate the plugin if dependency plugins not active
    $required = array('WP_Job_Manager', 'WP_Job_Manager_Extended_Location');
    foreach ($required as $class) {
        if (!class_exists($class)) {
            // Deactivate the plugin.
            deactivate_plugins(plugin_basename(__FILE__));
            return;
        }
    }

    require_once plugin_dir_path(__FILE__) . 'functions.php';
    return Keendevs_Multi_Location_WP_JOB_M::instance();
}

add_action('plugins_loaded', 'wp_job_manager_multi_location', 99);

// [jobs gjm_use=2]
// AIzaSyBS1Z4OP83YXpyI08oOoz-JTSGuRta8G-g
// AIzaSyD9rSRK-_zeTZlpTbgiityQ4NkoIxQWcmo