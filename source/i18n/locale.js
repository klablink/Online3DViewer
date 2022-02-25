import _ from 'lodash';
import {CookieGetStringVal, CookieSetStringVal} from "../website/cookiehandler";

export const availableLocales = ["en", "it"];
export const defaultLocale = "en";

const _translations = {};
_translations.en = require('./en.i18n.json');
_translations.it = require('./it.i18n.json');
// console.log(_translations);

export function isNotEmpty(item) {
    let returnedValue = true;
    if (_.isUndefined(item) || item == null || item === '' || _.isNaN(item) || _.isNull(item)
        || (_.isObject(item) && _.isEmpty(item) && !_.isDate(item))) {
        returnedValue = false;
    }
    return returnedValue;
}

export function escapeHtml(str) {
    let map =
        {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            "%": '&percnt;'
        };
    return isNotEmpty(str) ? str.replace(/[&<>"'%]/g, function (m) {
        return map[m];
    }) : "";
}

export function decodeHtml(str) {
    let map =
        {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'",
            '&percnt;': "%"

        };
    return isNotEmpty(str) ? str.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&percnt;/g, function (m) {
        return map[m];
    }) : "";
}

/**
 * Function to correctly compose the messages to be translated including parameters.
 * @function encodeEscapeParams
 * @param {String} messageId Message code corresponding to
 * a code present in the translation files (at least in en.i18n.json)
 * @param {Object} params Object in JSON format, containing "name": "value" pairs of
 * parameters expected from the string corresponding to the "messageId" in the translation
 * files - if for example the string to be completed with the parameters is of the type
 * "bla bla {$name} bla"-.
 * This function takes care of encoding eventual HTML strings present in "value",
 * so that they will be well interpreted when inserted in the composition of the string to be displayed.
 * @return {string} the value expected by the encoding and translation function "decodeStringAndTranslate",
 * i.e. a string in the format messageId?name1=value1&name2=value2&name3=value3&...&nameN=valueN
 */
export function encodeEscapeParams(messageId, params) {
    const res = _.mapValues(params, encodeURIComponent);
    return messageId + _.reduce(res, function (result, value, key) {
        if (!isNotEmpty(value))
            value = '%20'
        result = isNotEmpty(result) ? (result + `&${key}=${value}`) : `?${key}=${value}`;
        return result;
    }, "");
}

/**
* Function which translates the string identified by the "messageId" argument,
 * inserting where necessary the values of the parameters in the "params" object
 * to correctly compose the translated string
 * or, in case of failure, uses the string argument "defaultMsg".
 * @function _localize
 * @param {String} lang Code for the string representing the language
 * to be used to return the translations
 * @param {String} messageId Message code corresponding to
 * a code present in the translation files (at least in en.i18n.json)
 * @param {String} defaultMsg Default string to be returned in case
 * it is not possible to decode and translate "messageId".
 * @param {Object} params Object in JSON format, containing "name": "value" pairs of
 * parameters expected from the string corresponding to the "messageId" in the translation
 * files - if for example the string to be completed with the parameters is of the type
 * "bla bla {$name} bla"-.
 * @return {string} localized string
 */
export function _localize(lang, messageId, defaultMsg, params = {}) {
    let res = defaultMsg ? defaultMsg : messageId;
    let tr = _translations[lang][messageId];
    if (isNotEmpty(tr)) {
        for (const [key, value] of Object.entries(params)) {
            const tag = '{$' + key + '}';
            if (tr.includes(tag)) {
                tr = tr.split(tag).join(value);
            }
        }
        res = tr;
    }
    return res;
}

/**
 * Function that decodes and translates the encoded string into "str" argument
 * or, in case it fails, uses the string argument "dft"
 * @function decodeStringAndTranslate
 * @param {String} lang Code for the string representing the language to be used
 * to return the translations
 * @param {String} str String code to be translated, corresponding to a code contained
 * in the *.i18n.json translation files, with any parameters if provided by the corresponding
 * translation. Expected format:
 *   messageId?param1=value1&param2=value2&param3=value3&...&paramN=valueN
 * @param {String} dft Default string to be returned in case it is not possible to decode and translate "str".
 * @return {Object} {
            "translatedStr": <translation associated to "str" argument, or dft>
            "code": <code related to the translation>,
            "params": <params part in "str">,
            "message": <(_.isString(dft) ? _.decodeHtml(dft) : null)>
        }
 */
export function decodeStringAndTranslate(lang, str, dft) {
    if (!isNotEmpty(str)) {
        return {
            "translatedStr": decodeHtml(dft),
            "code": null,
            "params": null,
            "message": (_.isString(dft) ? decodeHtml(dft) : null)
        };
    }

    try {
        // format: messageId?param1=value1&param2=value2&param3=value3&…&paramN=valueN
        const regex = /((?:\w+))(?:\?*((?:[^ ]+)*|))(.*)*/gm;
        const [, code = null, params = null] = regex.exec(str) || []; // console.log(`code = ${code}, params= ${params}`)
        const result = params && _.reduce(_.split(params, /&/g), (r, v) => {
            const [attr, value] = _.split(v, /=/);
            let trValue = escapeHtml(decodeURIComponent(value)); //console.log("trValue", trValue)

            attr && trValue && (r[attr] = trValue);
            return r;
        }, {})

        let retStr = _localize(lang, code, dft, result);

        return {
            "translatedStr": decodeHtml(decodeURIComponent(retStr)),
            "code": code,
            "params": params,
            "message": (_.isString(dft) ? decodeHtml(dft) : null)
        };
    } catch (err) {
        return {
            "translatedStr": `ERROR in decoding and translating ${str}`,
            "code": null,
            "params": null,
            "message": (_.isString(dft) ? decodeHtml(dft) : null)
        };
    }
}

export function localize(messageId, defaultMsg, params = {}) {
    let _lang = CookieGetStringVal('ov_locale_id', defaultLocale);

    if (!isNotEmpty(_lang) || _lang === 'undefined' || !availableLocales.includes(_lang)) {
        _lang = defaultLocale;
        CookieSetStringVal('ov_locale_id', _lang);
    }

    let res = defaultMsg ? defaultMsg : messageId;

    let tr = _translations[_lang][messageId];
    if (isNotEmpty(params)) {
        let strToTransl = encodeEscapeParams(messageId, params);
        tr = decodeStringAndTranslate(_lang, strToTransl, defaultMsg).translatedStr;
    }
    if (isNotEmpty(tr))
        res = tr;

    return res;
}




