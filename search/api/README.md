# NCI Clinical Trials API
[https://clinicaltrialsapi.cancer.gov/v1]

## Endpoints

### `GET clinical-trial<id>`
Retrieves the clinical trial with supplied `nci_id` or `nct_id`. [All fields](clinical-trial.json) (including nested ones) are returned.

Examples:
* [clinical-trial/NCT02194738](clinical-trial/NCT02194738)
* [clinical-trial/NCI-2014-01509](clinical-trial/NCI-2014-01509)

### `GET clinical-trials?<filter_params>`
Filters all clinical trials based upon supplied filter params. Filter params may be any of the [fields in the schema](clinical-trial.json) as well as any of the following params...

`size`: limit the amount of results a supplied amount (default is 10, max is 50)

`from`: start the results from a supplied starting point (default is 0)

`include`: include only the supplied filter param fields in all results (useful if you want to minimize the payload returned)

`exclude`: exclude the supplied filter param fields from all results (useful if you want most of the payload returned with the exception of a few fields)

`_fulltext`: filter results by examining a variety of text-based fields (including the trial title, description, treatments, etc)

Example: [clinical-trials?eligibility.structured.gender=female&include=nct_id](clinical-trials?eligibility.structured.gender=female&include=nct_id)

-------

When supplying an array of values for a single filter param, please use the following convention: `clinical-trials?<field_param>=<field_value_a>&<field_param>=<field_value_b>` and note that `string` field values are not case sensitive (must otherwise must match exactly).

Example: [clinical-trials?sites.org_state_or_province=CA&sites.org_state_or_province=OR](clinical-trials?sites.org_state_or_province=CA&sites.org_state_or_province=OR)

-------

For field params which are filtering as ranges (`date` and `long` types), please supply `_gte` or `_lte` to the end of the field param (depending on if you are filtering on greater than or equal (gte), less than or equal (lte), or both): `clinical-trials?<field_param>_gte=<field_value_from>&<field_param>_lte=<field_value_to>`

Example: [clinical-trials?record_verification_date_gte=2016-08-25](clinical-trials?record_verification_date_gte=2016-08-25)

-------

For field params which are geolocation coordinates (`geo_point`), please supply the following to the end of the field param:
* `_lat` - The latitude in decimal degrees and plus/minus.
* `_lon` - The longitude in decimal degrees and plus/minus.
* `_dist` - The radius to search within. Format must be an integer followed by a unit defined as:
  * mi - miles (for example `2mi`)
  * km - kilometer (for example `5km`)  

`clinical-trials?<field_param>_lat=<field_value_latitude>&<field_param>_lon=<field_value_longitude>&<field_param>_dist=<field_value_dist>`

Example: [clinical-trials?sites.org_coordinates_lat=39.1292&sites.org_coordinates_lon=-77.2953&sites.org_coordinates_dist=100mi](clinical-trials?sites.org_coordinates_lat=39.1292&sites.org_coordinates_lon=-77.2953&sites.org_coordinates_dist=100mi)

-------

If you are crafting more complicated queries, it might be best to use the `POST` endpoint of the same name.

### `POST clinical-trials`
Same as the `GET` endpoint, but allows you to craft a JSON body as the request.

Example:

```
curl -XPOST 'https://clinicaltrialsapi.cancer.gov/v1/clinical-trials' \
     -H 'Content-Type: application/json' \
     -d '{
        "sites.org_state_or_province": ["CA", "OR"],
        "record_verification_date_gte": "2016-06-01",
        "include": ["nci_id"]
      }'
```

### `GET terms?term=<search_term>[&term_type=<search_term_type>]`
The `terms` endpoint is intended for typeaheads and other use cases where it is necessary to search for available terms which can later be used to filter clinical trial results. Terms are matched partially by supplying a string to the `term` field and may be filtered by clinical trial type using the `term_type` field. Results are sorted by a combination of string relevancy and popularity.

Example:
[terms?term=pancreatic%20n](https://clinicaltrialsapi.cancer.gov/v1/terms?term=pancreatic%20n)

## Fetching Daily Updates

Updates to the API are made daily (the refresh occurs each morning at 7:30 AM ET). Unfortunately, the API does not do a `diff` to track changes, and there is no one field in the underlying database (which the API taps into) which captures when a trial has been modified. Future modifications to the database architecture are being scheduled to change this by adding `date_created` and `date_updated` fields to each table.

Until these updates are made, the best field to use to see which trials have *possibly* been changed in the past 24 hours is the `record_verification_date` field. This field is updated whenever a human auditor verifies a clinical trial record. It is important to note that verification does not necessarily imply that a change was made to the clinical trial record, simply that an auditor took another look at it - but this is inclusive of any instances where the auditor made modifications to the trial.

As an example, to see which clinical trials have been verified by an auditor since 2016-08-25...

Example: [clinical-trials?record_verification_date_gte=2016-08-25](clinical-trials?record_verification_date_gte=2016-08-25)

-------

For the time-being, if you simply wish to track when a trial has changed its status, the `current_trial_status_date` field might be more helpful...

Example: [clinical-trials?current_trial_status_date_gte=2016-08-25](clinical-trials?current_trial_status_date_gte=2016-08-25)

## Issues

Please file any questions or issues at the [clinical-trials-search repository](https://github.com/presidential-innovation-fellows/clinical-trials-search/issues).
