const proj4 = require('proj4');

// Define projections
const SIRGAS_2000_UTM_22S = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const WGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

/**
 * Parse coordinate values from various formats (GMS, Decimal, UTM)
 * @param {string|number} val - The coordinate value to parse
 * @returns {Object} - Object containing parsed coordinate information
 */
function parseCoordinate(val) {
    // Handle null/undefined/empty values
    if (val === null || val === undefined || val === '') {
        return { lat: null, lng: null, raw: val, valid: false };
    }

    // Convert to string and clean up any extra quotes
    let str = String(val).trim();
    if (typeof val === 'string') {
        // Remove extra quotes at the end
        str = str.replace(/"+$/, '');
    }

    // Check if it's a GMS format (degrees, minutes, seconds)
    const gmsMatch = str.match(/^(\d+)°(\d+)'(\d+(?:\.\d+)?)["″]?\s*([NSEW])/i);
    if (gmsMatch) {
        const [, degrees, minutes, seconds, direction] = gmsMatch;
        let decimal = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600;
        
        if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
            decimal = -decimal;
        }
        
        return { 
            lat: direction.toUpperCase() === 'N' || direction.toUpperCase() === 'S' ? decimal : null,
            lng: direction.toUpperCase() === 'E' || direction.toUpperCase() === 'W' ? decimal : null,
            raw: str,
            valid: true 
        };
    }

    // Check if it's a decimal format
    const decimalMatch = str.match(/^(-?\d+\.?\d*)\s*([NSEW])?$/i);
    if (decimalMatch) {
        let decimal = parseFloat(decimalMatch[1]);
        const direction = decimalMatch[2];
        
        if (direction) {
            if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
                decimal = -decimal;
            }
        }
        
        return { 
            lat: direction && (direction.toUpperCase() === 'N' || direction.toUpperCase() === 'S') ? decimal : null,
            lng: direction && (direction.toUpperCase() === 'E' || direction.toUpperCase() === 'W') ? decimal : null,
            raw: str,
            valid: !isNaN(decimal) 
        };
    }

    // Check if it's a UTM coordinate (typically large numbers > 10000)
    const numVal = parseFloat(str);
    if (!isNaN(numVal) && Math.abs(numVal) > 10000) {
        // Assume it's a UTM coordinate, need to convert to lat/lng
        try {
            // For UTM, we need both Easting (E) and Northing (N) to convert properly
            // This function handles only single coordinate values
            // We'll return the value as-is but mark it as needing proper UTM conversion
            // A more complete implementation would require knowing if this is Easting or Northing
            return { 
                lat: null, 
                lng: null, 
                raw: str, 
                valid: false,
                utm: numVal
            };
        } catch (error) {
            console.error('Error converting UTM to lat/lng:', error);
            return { lat: null, lng: null, raw: str, valid: false };
        }
    }

    // If it's a numeric value that's not a UTM, treat as decimal
    if (!isNaN(numVal) && isFinite(numVal)) {
        return { 
            lat: null, 
            lng: null, 
            raw: str, 
            valid: true,
            decimal: numVal
        };
    }

    // If none of the above matched, return as invalid
    return { lat: null, lng: null, raw: val, valid: false };
}

/**
 * Convert UTM coordinates to Lat/Lng
 * @param {number} easting - UTM Easting
 * @param {number} northing - UTM Northing
 * @param {number} zoneNumber - UTM Zone Number
 * @param {boolean} isNorth - Whether the location is in the northern hemisphere
 * @returns {Object} - Object containing latitude and longitude
 */
function convertUtmToLatLon(easting, northing, zoneNumber, isNorth) {
    try {
        // Construct the UTM projection string
        const utmProj = `+proj=utm +zone=${zoneNumber} +${isNorth ? 'north' : 'south'} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`;
        
        // Perform the transformation from UTM to WGS84
        const [longitude, latitude] = proj4(utmProj, WGS84, [easting, northing]);
        
        return { lat: latitude, lng: longitude };
    } catch (error) {
        console.error('Error converting UTM to Lat/Lon:', error);
        return { lat: null, lng: null };
    }
}

/**
 * Parse coordinate pair (Easting and Northing) from CSV data
 * @param {string|number} eastingVal - Easting value
 * @param {string|number} northingVal - Northing value
 * @returns {Object} - Object containing parsed coordinate information
 */
function parseCoordinatePair(eastingVal, northingVal) {
    // First, try to parse as GMS
    const eastingParsed = parseCoordinate(eastingVal);
    const northingParsed = parseCoordinate(northingVal);

    // If both are GMS format or decimal with direction, return accordingly
    if (eastingParsed.lat !== null && northingParsed.lng !== null) {
        return {
            lat: northingParsed.lat || northingParsed.decimal,
            lng: eastingParsed.lng || eastingParsed.decimal,
            valid: eastingParsed.valid && northingParsed.valid
        };
    }

    // If values are large numbers, they are likely UTM coordinates
    const eastingNum = parseFloat(String(eastingVal).replace(/"+$/, ''));
    const northingNum = parseFloat(String(northingVal).replace(/"+$/, ''));
    
    if (!isNaN(eastingNum) && !isNaN(northingNum) && (Math.abs(eastingNum) > 10000 || Math.abs(northingNum) > 10000)) {
        // Assuming these are SIRGAS 2000 UTM Zone 22S coordinates
        try {
            const result = proj4(SIRGAS_2000_UTM_22S, WGS84, [eastingNum, northingNum]);
            return {
                lat: result[1], // latitude
                lng: result[0], // longitude
                valid: true
            };
        } catch (error) {
            console.error('Error converting UTM coordinates to Lat/Lon:', error);
            return {
                lat: null,
                lng: null,
                valid: false
            };
        }
    }

    // If we have decimal values that look like lat/lng
    if (!isNaN(eastingNum) && !isNaN(northingNum)) {
        // Assuming easting is longitude and northing is latitude for this context
        // This might need adjustment depending on data format
        return {
            lat: northingNum,
            lng: eastingNum,
            valid: !isNaN(northingNum) && !isNaN(eastingNum)
        };
    }

    return {
        lat: null,
        lng: null,
        valid: false
    };
}

module.exports = {
    parseCoordinate,
    parseCoordinatePair,
    convertUtmToLatLon
};