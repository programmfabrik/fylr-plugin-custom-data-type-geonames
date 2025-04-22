const fs = require('fs')
const https = require('https')
const http = require('http')
const fetch = (...args) => import('node-fetch').then(({
    default: fetch
}) => fetch(...args));

let databaseLanguages = [];
let frontendLanguages = [];
let default_language = 'de';
let geonames_username = '-';

let info = {}

let access_token = '';

if (process.argv.length >= 3) {
    info = JSON.parse(process.argv[2])
}

function hasChanges(objectOne, objectTwo) {
    var len;
    const ref = ["conceptName", "conceptURI", "_standard", "_fulltext", "conceptAncestors", "conceptGeoJSON", "frontendLanguage"];
    for (let i = 0, len = ref.length; i < len; i++) {
        let key = ref[i];
        if (!GeonamesUtil.isEqual(objectOne[key], objectTwo[key])) {
            return true;
        }
    }
    return false;
}

function getConfigFromAPI() {
    return new Promise((resolve, reject) => {
        var url = 'http://fylr.localhost:8081/api/v1/config?access_token=' + access_token
        fetch(url, {
                headers: {
                    'Accept': 'application/json'
                },
            })
            .then(response => {
                if (response.ok) {
                    resolve(response.json());
                } else {
                    console.error("DANTE-Updater: Fehler bei der Anfrage an /config ");
                }
            })
            .catch(error => {
                console.error(error);
                console.error("DANTE-Updater: Fehler bei der Anfrage an /config");
            });
    });
}

main = (payload) => {
    switch (payload.action) {
        case "start_update":
            outputData({
                "state": {
                    "personal": 2
                },
                "log": ["started logging"]
            })
            break
        case "update":

            ////////////////////////////////////////////////////////////////////////////
            // run iconclass-api-call for every given uri
            ////////////////////////////////////////////////////////////////////////////

            // collect URIs
            let URIList = [];
            for (var i = 0; i < payload.objects.length; i++) {
                URIList.push(payload.objects[i].data.conceptURI);
            }
            // unique urilist
            URIList = [...new Set(URIList)]

            let requestUrls = [];
            let requests = [];

            URIList.forEach((uri) => {
                // https://uri.gbv.de/terminology/geonames/2921044?format=json
                var geonamesID = uri.replace('http://www.geonames.org/', '');
                geonamesID = geonamesID.replace('https://www.geonames.org/', '');
                geonamesID = geonamesID.replace('http://geonames.org/', '');
                geonamesID = geonamesID.replace('https://geonames.org/', '');
                geonamesID = geonamesID.replace('/', '');

                let dataRequestUrl = 'http://api.geonames.org/getJSON?formatted=true&geonameId=' + geonamesID + '&username=' + geonames_username + '&style=full'
                let dataRequest = fetch(dataRequestUrl);
                requests.push({
                    url: dataRequestUrl,
                    uri: uri,
                    request: dataRequest
                });
                requestUrls.push(dataRequest);
            });

            Promise.all(requestUrls).then(function(responses) {
                let results = [];
                // Get a JSON object from each of the responses
                responses.forEach((response, index) => {
                    let url = requests[index].url;
                    let uri = requests[index].uri;
                    let result = {
                        url: url,
                        uri: uri,
                        data: null,
                        error: null
                    };
                    if (response.ok) {
                        result.data = response.json();
                    } else {
                        result.error = "Error fetching data from " + url + ": " + response.status + " " + response.statusText;
                    }
                    results.push(result);
                });
                return Promise.all(results.map(result => result.data));
            }).then(function(data) {
                let results = [];
                data.forEach((data, index) => {
                    let url = requests[index].url;
                    let uri = requests[index].uri;
                    let result = {
                        url: url,
                        uri: uri,
                        data: data,
                        error: null
                    };
                    if (data instanceof Error) {
                        result.error = "Error parsing data from " + url + ": " + data.message;
                    }
                    results.push(result);
                });

                // build cdata from all api-request-results
                let cdataList = [];
                payload.objects.forEach((result, index) => {
                    let originalCdata = payload.objects[index].data;
                    let newCdata = {};
                    let originalURI = originalCdata.conceptURI;

                    const matchingRecordData = results.find(record => record.uri === originalURI);

                    if (matchingRecordData) {
                        // rematch uri, because maybe uri changed / rewrites ..
                        let uri = matchingRecordData.uri;

                        ///////////////////////////////////////////////////////
                        // conceptName, conceptURI, _standard, _fulltext, facet, frontendLanguage
                        data = matchingRecordData.data;
                        if (data) {
                            // get desired language for preflabel. This is frontendlanguage from original data...
                            let desiredLanguage = originalCdata.frontendLanguage;
                            
                            // init updated cdata
                            newCdata = {};
                            
                            // conceptName
                            newCdata.conceptName = GeonamesUtil.getConceptNameFromObject(data);

                            newCdata.conceptURI = GeonamesUtil.getConceptURIFromObject(data);

                            // _standard & _fulltext
                            newCdata._fulltext = GeonamesUtil.getFullTextFromObject(data, databaseLanguages);
                            newCdata._standard = GeonamesUtil.getStandardTextFromObject(null, data, originalCdata, databaseLanguages);

                            // get ancestors from data
                            newCdata.conceptAncestors = GeonamesUtil.getConceptAncestorsFromObject(data);
                        
                            // TODO ADD conceptgeojson
                            newCdata.conceptGeoJSON = GeonamesUtil.getGeoJSONFromGeonamesJSON(data);
                            
                            // save facet
                            newCdata.facetTerm = GeonamesUtil.getFacetTerm(data, databaseLanguages);
                            
                            // save frontend language (same as given)
                            newCdata.frontendLanguage = originalCdata.frontendLanguage;
                                
                            if (hasChanges(payload.objects[index].data, newCdata)) {
                                payload.objects[index].data = newCdata;
                            } else {}
                        }
                    } else {
                        console.error('No matching record found');
                    }
                });
                outputData({
                    "payload": payload.objects,
                    "log": [payload.objects.length + " objects in payload"]
                });
            });
            // send data back for update
            break;
        case "end_update":
            outputData({
                "state": {
                    "theend": 2,
                    "log": ["done logging"]
                }
            });
            break;
        default:
            outputErr("Unsupported action " + payload.action);
    }
}

outputData = (data) => {
    out = {
        "status_code": 200,
        "body": data
    }
    process.stdout.write(JSON.stringify(out))
    process.exit(0);
}

outputErr = (err2) => {
    let err = {
        "status_code": 400,
        "body": {
            "error": err2.toString()
        }
    }
    console.error(JSON.stringify(err))
    process.stdout.write(JSON.stringify(err))
    process.exit(0);
}

(() => {

    let data = ""

    process.stdin.setEncoding('utf8');

    ////////////////////////////////////////////////////////////////////////////
    // check if hour-restriction is set
    ////////////////////////////////////////////////////////////////////////////

    if (info?.config?.plugin?.['custom-data-type-geonames']?.config?.update_geonames?.restrict_time === true) {
        geonames_config = info.config.plugin['custom-data-type-geonames'].config.update_geonames;
        // check if hours are configured
        if (geonames_config?.from_time !== false && geonames_config?.to_time !== false) {
            const now = new Date();
            const hour = now.getHours();
            // check if hours do not match
            if (hour < geonames_config.from_time && hour >= geonames_config.to_time) {
                // exit if hours do not match
                outputData({
                    "state": {
                        "theend": 2,
                        "log": ["hours do not match, cancel update"]
                    }
                });
            }
        }
    }

    access_token = info && info.plugin_user_access_token;

    if (access_token) {

        ////////////////////////////////////////////////////////////////////////////
        // get config and read the languages
        ////////////////////////////////////////////////////////////////////////////

        getConfigFromAPI().then(config => {
            databaseLanguages = config.system.config.languages.database;
            databaseLanguages = databaseLanguages.map((value, key, array) => {
                return value.value;
            });

            frontendLanguages = config.system.config.languages.frontend;

            const testDefaultLanguageConfig = config.plugin['custom-data-type-geonames'].config.update_interval_geonames.default_language;
            if (testDefaultLanguageConfig) {
                if (testDefaultLanguageConfig.length == 2) {
                    defaultLanguage = testDefaultLanguageConfig;
                }
            }
            
            const testGeonamesUsernameConfig = config.plugin['custom-data-type-geonames'].config.update_interval_geonames.geonames_username;
            if (testGeonamesUsernameConfig) {
                geonames_username = testGeonamesUsernameConfig;
            }

            ////////////////////////////////////////////////////////////////////////////
            // availabilityCheck for iconclass-api
            ////////////////////////////////////////////////////////////////////////////
            let testURL = 'http://api.geonames.org/getJSON?formatted=true&geonameId=2921044&username=' + geonames_username + '&style=full';
            http.get(testURL, res => {
                let testData = [];
                res.on('data', chunk => {
                    testData.push(chunk);
                });
                res.on('end', () => {
                    const testRecord = JSON.parse(Buffer.concat(testData).toString());
                    if (testRecord.geonameId == "2921044") {
                        ////////////////////////////////////////////////////////////////////////////
                        // test successfull --> continue with custom-data-type-update
                        ////////////////////////////////////////////////////////////////////////////
                        process.stdin.on('readable', () => {
                            let chunk;
                            while ((chunk = process.stdin.read()) !== null) {
                                data = data + chunk
                            }
                        });
                        process.stdin.on('end', () => {
                            ///////////////////////////////////////
                            // continue with update-routine
                            ///////////////////////////////////////
                            try {
                                let payload = JSON.parse(data)
                                main(payload)
                            } catch (error) {
                                console.error("caught error", error)
                                outputErr(error)
                            }
                        });
                    } else {
                        console.error('Error while interpreting data from geonames-API.');
                    }
                });
            }).on('error', err => {
                console.error('Error while receiving data from geonames-API: ', err.message);
            });
        }).catch(error => {
            console.error('Es gab einen Fehler beim Laden der Konfiguration:', error);
        });
    } else {
        console.error("kein Accesstoken gefunden");
    }
})();