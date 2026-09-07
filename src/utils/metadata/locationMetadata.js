import { addIfPresent, findFirstValue } from './formatters'

const FIELD_ALIASES = {
  latitude: ['latitude', 'Latitude', 'GPSLatitude', 'GPSLatitudeRef'],
  longitude: ['longitude', 'Longitude', 'GPSLongitude'],
  altitude: ['GPSAltitude', 'Altitude'],
  direction: ['GPSImgDirection', 'GPSDirection', 'ImageDirection'],
  gpsDate: ['GPSDateStamp', 'GPSTimeStamp', 'GPSTime'],
  city: [
    'City',
    'city',
    'LocationCity',
    'LocationShownCity',
    'Sub-location',
    'Sublocation',
    'Location',
    'LocationName'
  ],
  subLocation: [
    'Sub-location',
    'Sublocation',
    'SubLocation',
    'LocationShownSublocation',
    'LocationShownSubLocation'
  ],
  district: ['District', 'district', 'LocationDistrict', 'SubLocation'],
  state: [
    'State',
    'Province',
    'StateProvince',
    'ProvinceState',
    'LocationShownProvinceState',
    'LocationShownState'
  ],
  country: [
    'Country',
    'CountryName',
    'Country-PrimaryLocationName',
    'LocationShownCountryName'
  ],
  countryCode: [
    'CountryCode',
    'Country-PrimaryLocationCode',
    'CountryCodeName'
  ],
  description: [
    'LocationDescription',
    'LocationDesc',
    'ImageDescription',
    'Description',
    'Caption-Abstract'
  ]
}

const LABELED_FIELDS = [
  ['GPS Latitude', 'latitude'],
  ['GPS Longitude', 'longitude'],
  ['GPS Altitude', 'altitude'],
  ['GPS Direction', 'direction'],
  ['GPS Date / Time', 'gpsDate'],
  ['City / Locality', 'city'],
  ['Sub-location', 'subLocation'],
  ['District', 'district'],
  ['State / Province', 'state'],
  ['Country', 'country'],
  ['Country Code', 'countryCode'],
  ['Location Description', 'description']
]

export function extractLocationMetadata(exif) {
  const location = {}

  for (const [label, field] of LABELED_FIELDS) {
    addIfPresent(location, label, findFirstValue(exif, FIELD_ALIASES[field]))
  }

  return location
}
