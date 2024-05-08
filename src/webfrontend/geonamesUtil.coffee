class GeonamesUtil

  @getConceptNameFromObject: (object) ->
    conceptName = ''
    if object?.asciiName
      conceptName = object.asciiName
    else
        if object?.name
          conceptName = object.name
    return conceptName


  @getConceptURIFromObject: (object) ->
    conceptURI = ''
    if object?.geonameId
      conceptURI = 'http://geonames.org/' + object.geonameId
    return conceptURI


  # from https://github.com/programmfabrik/coffeescript-ui/blob/fde25089327791d9aca540567bfa511e64958611/src/base/util.coffee#L506
  # has to be reused here, because cui not be used in updater
  @isEqual: (x, y, debug) ->
    #// if both are function
    if x instanceof Function
      if y instanceof Function
        return x.toString() == y.toString()
      return false

    if x == null or x == undefined or y == null or y == undefined
      return x == y

    if x == y or x.valueOf() == y.valueOf()
      return true

    # if one of them is date, they must had equal valueOf
    if x instanceof Date
      return false

    if y instanceof Date
      return false

    # if they are not function or strictly equal, they both need to be Objects
    if not (x instanceof Object)
      return false

    if not (y instanceof Object)
      return false

    p = Object.keys(x)
    if Object.keys(y).every( (i) -> return p.indexOf(i) != -1 )
      return p.every((i) =>
        eq = @isEqual(x[i], y[i], debug)
        if not eq
          if debug
            console.debug("X: ",x)
            console.debug("Differs to Y:", y)
            console.debug("Key differs: ", i)
            console.debug("Value X:", x[i])
            console.debug("Value Y:", y[i])
          return false
        else
          return true
      )
    else
      return false

    
  @getGeoJSONFromGeonamesJSON: (object) ->
    geoJSON = false

    coordsFound = false;
    
    # if bbox
    if object?.bbox
        if object?.bbox.east and object?.bbox.south and object?.bbox.north and object?.bbox.west
            geoJSON =
                type: "Polygon"
                coordinates: [[
                    [object.bbox.east*1, object.bbox.south*1],
                    [object.bbox.west*1, object.bbox.south*1],
                    [object.bbox.west*1, object.bbox.north*1],
                    [object.bbox.east*1, object.bbox.north*1],
                    [object.bbox.east*1, object.bbox.south*1]
                ]]
            coordsFound = true

    # lat + lng?
    if coordsFound == false
        if object?.lat and object?.lng
              geoJSON =
                type: "Point"
                coordinates: [object.lat*1, object.lng*1]

    return geoJSON

  ########################################################################
  #generates a json-structure, which is only used for facetting (aka filter) in frontend
  ########################################################################
  @getFacetTerm: (data, databaseLanguages) ->

    shortenedDatabaseLanguages = databaseLanguages.map((value, key, array) ->
      value.split('-').shift()
    )

    _facet_term = {}
    l10nObject = {}

    # init l10nObject
    for language in databaseLanguages
      l10nObject[language] = ''

    # build facetTerm upon prefLabel and uri!
    hasl10n = false

    label = if data?.name != '' then data?.name else data?.asciiName
    for l10nObjectKey, l10nObjectValue of l10nObject
      l10nObject[l10nObjectKey] = label + '@$@http://www.geonames.org/' + data.geonameId

    # if l10n-object is not empty
    _facet_term = l10nObject
    return _facet_term


  @getConceptAncestorsFromObject: (object) ->
    conceptAncestors = []
    if object?.countryId
      conceptAncestors.push 'http://geonames.org/' + object.countryId
    if object?.adminId1
      conceptAncestors.push 'http://geonames.org/' + object.adminId1
    if object?.adminId2
      conceptAncestors.push 'http://geonames.org/' + object.adminId2
    if object?.adminId3
      conceptAncestors.push 'http://geonames.org/' + object.adminId3
    if object?.adminId4
      conceptAncestors.push 'http://geonames.org/' + object.adminId4
    # push itself to ancestors
    conceptAncestors.push 'http://geonames.org/' + object.geonameId
    # join array to string
    conceptAncestors = conceptAncestors.join(' ')
    return conceptAncestors


  @getStandardTextFromObject: (context, object, cdata, databaseLanguages = false) ->
    if databaseLanguages == false
      databaseLanguages = ez5.loca.getDatabaseLanguages()
    shortenedDatabaseLanguages = databaseLanguages.map((value, key, array) ->
      value.split('-').shift()
    )
    activeFrontendLanguage = null
    if context
      activeFrontendLanguage = context.getFrontendLanguage()

    if cdata?.frontendLanguage
        if cdata?.frontendLanguage?.length == 2
          activeFrontendLanguage = cdata.frontendLanguage

    if Array.isArray(object)
      object = object[0]

    _standard = {}
    standardTextString = ''
    l10nObject = {}

    # init l10nObject for fulltext
    for language in databaseLanguages
      l10nObject[language] = ''

    # 1. L10N
    #  give l10n-languages the easydb-language-syntax
    for l10nObjectKey, l10nObjectValue of l10nObject
      # add to l10n
      l10nObject[l10nObjectKey] = object.asciiName

    _standard.l10ntext = l10nObject

    geoJSON = @getGeoJSONFromGeonamesJSON object
    if geoJSON
       _standard.geo =  geoJSON
    
    return _standard


  @getFullTextFromObject: (object, databaseLanguages = false) ->
    if databaseLanguages == false
      databaseLanguages = ez5.loca.getDatabaseLanguages()

    shortenedDatabaseLanguages = databaseLanguages.map((value, key, array) ->
      value.split('-').shift()
    )

    if Array.isArray(object)
      object = object[0]

    _fulltext = {}
    fullTextString = ''
    l10nObject = {}
    l10nObjectWithShortenedLanguages = {}

    # init l10nObject for fulltext
    for language in databaseLanguages
      l10nObject[language] = ''

    for language in shortenedDatabaseLanguages
      l10nObjectWithShortenedLanguages[language] = ''

    objectKeys = ["asciiName", "alternateNames", "toponymName", "geonameId", "countryName"]

    # parse all object-keys and add all values to fulltext
    for key, value of object
      if objectKeys.includes(key)
        propertyType = typeof value

        # string
        if propertyType == 'string' || propertyType == 'number'
          fullTextString += value + ' '
          # add to each language in l10n
          for l10nObjectWithShortenedLanguagesKey, l10nObjectWithShortenedLanguagesValue of l10nObjectWithShortenedLanguages
            l10nObjectWithShortenedLanguages[l10nObjectWithShortenedLanguagesKey] = l10nObjectWithShortenedLanguagesValue + value + ' '

        # object / array
        if propertyType == 'object'
          # array?
          if Array.isArray(object[key])
            if Array.isArray(object[key])
              for arrayValue in object[key]
                # no language: add to every l10n-fulltext
                if typeof arrayValue == 'string'
                  fullTextString += arrayValue + ' '
                  for l10nObjectWithShortenedLanguagesKey, l10nObjectWithShortenedLanguagesValue of l10nObjectWithShortenedLanguages
                    l10nObjectWithShortenedLanguages[l10nObjectWithShortenedLanguagesKey] = l10nObjectWithShortenedLanguagesValue + arrayValue + ' '
            if typeof object[key] == 'object'
              for altnamekey, altnameVal of object[key]
                if altnameVal.name
                  fullTextString += altnameVal.name + ' '
                  for l10nObjectWithShortenedLanguagesKey, l10nObjectWithShortenedLanguagesValue of l10nObjectWithShortenedLanguages
                    l10nObjectWithShortenedLanguages[l10nObjectWithShortenedLanguagesKey] = l10nObjectWithShortenedLanguagesValue + altnameVal.name + ' '
          else
            # object?
            for objectKey, objectValue of object[key]
              if Array.isArray(objectValue)
                for arrayValueOfObject in objectValue
                  fullTextString += arrayValueOfObject + ' '
                  # check key and also add to l10n
                  if l10nObjectWithShortenedLanguages.hasOwnProperty objectKey
                    l10nObjectWithShortenedLanguages[objectKey] += arrayValueOfObject + ' '
              if typeof objectValue == 'string'
                fullTextString += objectValue + ' '
                # check key and also add to l10n
                if l10nObjectWithShortenedLanguages.hasOwnProperty objectKey
                  l10nObjectWithShortenedLanguages[objectKey] += objectValue + ' '
    # finally give l10n-languages the easydb-language-syntax
    for l10nObjectKey, l10nObjectValue of l10nObject
      # get shortened version
      shortenedLanguage = l10nObjectKey.split('-')[0]
      # add to l10n
      if l10nObjectWithShortenedLanguages[shortenedLanguage]
        l10nObject[l10nObjectKey] = l10nObjectWithShortenedLanguages[shortenedLanguage]

    _fulltext.text = fullTextString
    _fulltext.l10ntext = l10nObject

    return _fulltext
