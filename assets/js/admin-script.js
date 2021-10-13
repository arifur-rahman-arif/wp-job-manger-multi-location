jQuery(function ($) {
    var i = 0;
    // load existing locations
    $.each(additionallocations, function (k, v) {
        if (v) {
            // let clone = $('.fieldset-job_location').clone();
            $("#wpjmel_location .inside").append(
                '<div><input type="text" style="width:100%" value="' +
                    additionallocations[k]["address"] +
                    '" name="additionallocation[' +
                    i +
                    '][address]" id="job_location' +
                    i +
                    '"><p class="remove_location">Remove Location</p></div>'
            );
            // console.log(clone);
            wpjmel_mb.input = "#job_location" + i;
            wpjmel_mb.lat_input = "additionallocation[" + i + "][lat]";
            wpjmel_mb.lng_input = "additionallocation[" + i + "][lng]";
            wpjmel_mb.lat = additionallocations[k]["lat"];
            wpjmel_mb.lng = additionallocations[k]["lng"];
            $("#job_location" + i).mapify(wpjmel_mb);
            i++;
        }
    });

    $("#wpjmel_location").append(
        '<p class="button button-primary button-medium addLocation"> Add another location</p>'
    );
    $("body").on("click", ".addLocation", function () {
        $("#wpjmel_location .inside").append(
            '<div><input type="text" class="input-text" name="additionallocation[' +
                i +
                '][address]" id="job_location' +
                i +
                '"><p class="remove_location">Remove Location</p></div>'
        );
        wpjmel_mb.input = "#job_location" + i;
        wpjmel_mb.lat_input = "additionallocation[" + i + "][lat]";
        wpjmel_mb.lng_input = "additionallocation[" + i + "][lng]";
        $("#job_location" + i).mapify(wpjmel_mb);
        i++;
    });

    $("body").on("click", ".remove_location", function () {
        $(this).parent().remove();
    });
});
