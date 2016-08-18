# NCI Clinical Trials API
[https://clinicaltrialsapi.cancer.gov]

## Endpoints

### `GET /clinical-trial/<id>`
Retrieves the clinical trial with supplied `nci_id` or `nct_id`. [All fields](/clinical-trial.json) (including nested ones) are returned.

Examples:
* [/clinical-trial/NCT02194738](/clinical-trial/NCT02194738)
* [/clinical-trial/NCI-2014-01509](/clinical-trial/NCI-2014-01509)

### `GET /clinical-trials?<filter_params>`
Filters all clinical trials based upon supplied filter params. Filter params may be any of the [fields in the schema](/clinical-trial.json) as well as any of the following params...

`size`: limit the amount of results a supplied amount (default is 10, max is 50)

`from`: start the results from a supplied starting point (default is 0)

`include`: include only the supplied filter param fields in all results (useful if you want to minimize the payload returned)

`exclude`: exclude the supplied filter param fields from all results (useful if you want most of the payload returned with the exception of a few fields)

`_all`: filter results by any of the [fields listed in the schema](/clinical-trial.json) as `include_in_all`: `true`

Example: [/clinical-trials?eligibility.structured.gender=female&include=nct_id](/clinical-trials?eligibility.structured.gender=female&include=nct_id)

-------

When supplying an array of values for a single filter param, please use the following convention: `/clinical-trials?<field_param>=<field_value_a>&<field_param>=<field_value_b>` and note that `string` field values are not case sensitive (must otherwise must match exactly).

Example: [/clinical-trials?sites.org.state_or_province=CA&sites.org.state_or_province=OR](/clinical-trials?sites.org.state_or_province=CA&sites.org.state_or_province=OR)

-------

For field params which are filtering as ranges (`date` and `long` types), please supply `_gte` or `_lte` to the end of the field param (depending on if you are filtering on greater than or equal (gte), less than or equal (lte), or both): `/clinical-trials?<field_param>_gte=<field_value_from>&<field_param>_lte=<field_value_to>`

Example: [/clinical-trials?date_last_updated_anything_gte=2016-06-16](/clinical-trials?date_last_updated_anything_gte=2016-06-16)

-------

For field params which are geolocation coordinates (`geo_point`), please supply the following to the end of the field param:
* `_lat` - The latitude in decimal degrees and plus/minus. 
* `_lon` - The longitude in decimal degrees and plus/minus.
* `_dist` - The radius to search within. Format must be an integer followed by a unit defined as:
  * mi - miles (for example `2mi`)
  * km - kilometer (for example `5km`)  

`/clinical-trials?<field_param>_lat=<field_value_latitude>&<field_param>_lon=<field_value_longitude>&<field_param>_dist=<field_value_dist>`

Example: [/clinical-trials?sites.org_coordinates_lat=39.1292&sites.org_coordinates_lon=-77.2953&sites.org_coordinates_dist=100mi](/clinical-trials?sites.org_coordinates_lat=39.1292&sites.org_coordinates_lon=-77.2953&sites.org_coordinates_dist=100mi)

-------

If you are crafting more complicated queries, it might be best to use the `POST` endpoint of the same name.

### `POST /clinical-trials`
Same as the `GET` endpoint, but allows you to craft a JSON body as the request.

Example:

```
curl -XPOST 'https://clinicaltrialsapi.cancer.gov/clinical-trials' \
     -H 'Content-Type: application/json' \
     -d '{
        "sites.org.state_or_province": ["CA", "OR"],
        "date_last_updated_anything_gte": "2016-06-01",
        "include": ["nci_id"]
      }'
```

## Fetching Daily Updates

Updates to the API are made daily (with future plans to make updates in realtime). Although the API does not do a `diff` to track changes, it is possible to query the `date_last_updated_anything` field for any clinical trials that have been updated. This field uses all other `date` fields which track changes in a clinical trial (and selects the latest/max `date` value). For example, if you wish to see which clinical trials have changed in any way since 2016-06-16...

Example: [/clinical-trials?date_last_updated_anything_gte=2016-06-16](/clinical-trials?date_last_updated_anything_gte=2016-06-16)

`date_last_updated_anything` uses the following fields...
* `amendment_date`
* `current_trial_status_date`
* `date_last_created`
* `date_last_updated`
* `diseases.disease.date_last_created`
* `diseases.disease.date_last_updated`
* `sites.recruitment_status_date`
* `sites.org.status_date`

-------

As another example, if you wish to only see clinical trials which have changed their `current_trial_status` since 2016-06-16...

Example: [/clinical-trials?current_trial_status_date_gte=2016-06-16](/clinical-trials?current_trial_status_date_gte=2016-06-16)
