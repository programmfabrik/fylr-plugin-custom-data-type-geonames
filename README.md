> This Plugin / Repo is being maintained by a community of developers.
There is no warranty given or bug fixing guarantee; especially not by
Programmfabrik GmbH. Please use the github issue tracking to report bugs
and self organize bug fixing. Feel free to directly contact the committing
developers.

# fylr-custom-data-type-geonames
Custom Data Type "GEONAMES" for fylr

This is a plugin for [fylr](https://docs.fylr.io/) with Custom Data Type `CustomDataTypeGeonames` for references to entities of the [GeoNames geographical database)](<http://www.geonames.org/>).

The Plugins uses <http://ws.gbv.de/suggest/geonames/> for the autocomplete-suggestions and [GeoNames database](<http://www.geonames.org/export/JSON-webservices.html>) for additional informations about GeoNames entities. Maps are displayed via the [mapbox-API](https://docs.mapbox.com/api/).

## installation

The latest version of this plugin can be found [here](https://github.com/programmfabrik/fylr-plugin-custom-data-type-geonames/releases/latest/download/customDataTypeGeonames.zip).

The ZIP can be downloaded and installed using the plugin manager, or used directly (recommended).

Github has an overview page to get a list of [all releases](https://github.com/programmfabrik/fylr-plugin-custom-data-type-geonames/releases/).

## requirements
This plugin requires https://github.com/programmfabrik/fylr-plugin-commons-library. In order to use the GND-Plugin, you need to add the [commons-library-plugin](https://github.com/programmfabrik/fylr-plugin-commons-library) to your pluginmanager.

## configuration

In `manifest.yml` you can configure:

* `schema-options`:
    * which [featureclasses] (<http://www.geonames.org/source-code/javadoc/org/geonames/FeatureClass.html>)  are offered for search.
    *  if a mapbox-token is added, the plugin shows geonames-places in a static map.
    *  if a valid geonames-username is given, fulltext will be available

* `mask-options`:
    * wether to show a dropdown with available featureclasses (place-categorie) or not
    * wether to show a dropdown with available featurecodes (place-type) or not
    * default country for the country-dropdown (2 digits-code)
    * default value for search expansion (Records of the lowest administrative level ("admin4") are also found via the higher-level administrative unit ("admin3"))
    * wether the ancestors are shown in hitlist
    * editordisplay: default or condensed (oneline)

* `base-config`:
    * "days"
    * "default_language"
    * "geonames_username"

## saved data

* conceptName
    * Preferred label of the linked record
* conceptURI
    * URI to linked record
* conceptFulltext
    * fulltext-string which contains: geonameId, adminName1, adminName2, adminName3, adminName4, adminName5, countryName, toponymName, alternateNames
* conceptAncestors
    * the parent hierarchy of the selected record
* conceptGeoJSON
    * point or polygon as geoJSON
* frontendLanguage
    * the frontendlanguage of the entering user
* facetTerm
    * custom facets, which support multilingual facetting
* _fulltext
    * easydb-fulltext
* _standard
    * easydb-standard
    * geo

## updater

Note: The automatic nightly updater can be configured. Make sure to also activate the corresponding fylr service.


## sources

The source code of this plugin is managed in a git repository at <https://github.com/programmfabrik/fylr-custom-data-type-geonames>.
