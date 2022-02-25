import _ from 'lodash';
import './en.i18n.json';
import './it.i18n.json';
import {CookieGetStringVal, CookieSetStringVal} from "../website/cookiehandler";

const availableLocales = ["en", "it"];
export const defaultLocale = "en";

const _translations = {};
_translations.en = require('./en.i18n.json');
_translations.it = require('./it.i18n.json');
console.log(_translations);

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

export function encodeEscapeParams(messageId, params) {
    const res = _.mapValues(params, encodeURIComponent);
    return messageId + _.reduce(res, function (result, value, key) {
        if (!isNotEmpty(value))
            value = '%20'
        result = isNotEmpty(result) ? (result + `&${key}=${value}`) : `?${key}=${value}`;
        return result;
    }, "");
}

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
            const [attr, value] = _.split(v, /=/); //console.log("attr", attr); console.log("value", value);
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

/**
 * Translate messages
 */
export class Locale {
    constructor(locale) {
        this._locale = locale;
        this._translations = {};
    }

    setLocale(newLocale) {
        if (!isNotEmpty(newLocale) || !availableLocales.includes(newLocale))
            newLocale = defaultLocale;

        this._locale = newLocale;
        this._translations = _translations[newLocale];
        CookieSetStringVal ('ov_locale_id', newLocale);
    }

    getLocale() {
        return this._locale;
    }

    /**
     * localize message
     * @returns {string}
     * @param {string} messageId
     * @param {string} defaultMsg
     * @param {Object} params
     */
    _localize(messageId, defaultMsg, params = {}) {
        let res = defaultMsg ? defaultMsg : messageId;
        let tr = this._translations[messageId];
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

    localize(messageId, defaultMsg, params = {}) {
        if (isNotEmpty(params)) {
            let strToTransl = encodeEscapeParams(messageId, params);
            return decodeStringAndTranslate(this._locale, strToTransl, defaultMsg).translatedStr;
        }

        return this._localize(messageId, defaultMsg, params);
    }
}

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

export function localize(messageId, defaultMsg, params = {}) {
    let _lang = CookieGetStringVal('ov_locale_id', defaultLocale);

    if (!isNotEmpty(_lang) || _lang === 'undefined' || !availableLocales.includes(_lang)) {
        _lang = defaultLocale;
        CookieSetStringVal ('ov_locale_id', _lang);
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

export default Locale;

