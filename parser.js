(function (name, deps, definition) {
    if (!definition) {
        definition = deps;
        deps = [];
    }
    if (!Array.isArray(deps)) {
        deps = [deps];
    }
    if (typeof define === "function" && typeof define.amd === "object") {
        define(deps, definition);
    } else if (typeof module !== "undefined") {
        module.exports = definition.apply(this, deps.map(function (dep) {
            return require(dep);
        }));
    } else {
        var that = this;
        this[name] = definition.apply(this, deps.map(function (dep) {
            return that[dep.split("/").pop()];
        }));
    }
})("parser", ["../utils/utils"], function (utils) {

    /**
     * A stringifier/parser for js entities.
     * @exports parser
     */
    var api = {};

    /* Stringifier  */

    api.stringifyDate = function (target) {
        return target.toJSON();
    };
    api.stringifyRegex = function (target) {
        var str = target.toString();
        return str.substr(1, str.length - 2);
    };
    api.stringifyNumber = function (target) {
        return "" + target;
    };
    api.stringifyBoolean = function (target) {
        return target ? "true" : "false";
    };
    api.stringify = function (type, target, strict) {
        switch (type) {
            case "string":
                return target;
            case "number":
                return api.stringifyNumber(target);
            case "boolean":
                return api.stringifyBoolean(target);
            case "date":
                return api.stringifyDate(target);
            case "regex":
                return api.stringifyRegex(target);
            default:
                if (strict) {
                    throw new Error("cannot stringify " + type);
                } else {
                    return undefined;
                }
        }
    };

    /**
     * Stringifies a js entity to a valid JSON object. The original entity is left
     * untouched and only a clone is returned. RegExp and Date objects are specially 
     * handled. All prototypal inheritance is lost. All null and undefined properties
     * as well as all methods are stripped from the clone.
     * 
     * @param {*} target A JSON-stringifiable js entity.
     * @param {boolean} [strict=false] Enable strict mode. In strict mode, only undefined properties are stripped from 
     * the target, null properties and methods will throw errors.
     * @returns {JSON object}
     * 
     * @throws {Error} cannot convert null|function|undefined to JSON
     */
    api.stringifyToJSON = function (target, strict) {
        var type = utils.typeof(target);
        switch (type) {
            case "function":
                if (strict) {
                    throw new Error("cannot convert a function to a JSON object");
                } else {
                    return undefined;
                }
            case "null":
                if (strict) {
                    throw new Error("cannot convert null to a JSON object");
                } else {
                    return undefined;
                }
            case "array":
                return target.map(function (el) {
                    return api.stringifyToJSON(el, strict);
                }).filter(function (el) {
                    return el !== undefined;
                });
                break;
            case "object":
                var ret = {};
                for (var prop in target) {
                    if (target.hasOwnProperty(prop)) {
                        let pret = api.stringifyToJSON(target[prop], strict);
                        if (pret !== undefined){
                            ret[prop] = pret;
                        }
                    }
                }
                return ret;
            case "undefined":
                return undefined;
            default:
                return api.stringify(type, target);
        }
    };



    /**
     * Stringifies a js entity to a valid SO (String Object). The original entity is left
     * untouched and only a clone is returned. RegExp and Date objects are specially 
     * handled. All prototypal inheritance is lost. All null and undefined properties
     * as well as all methods are stripped from the clone. Numbers and Booleans are converted
     * to strings.
     * 
     * @param {type} target
     * @param {boolean|number} [strict=false] Strict mode. In strict mode null properties and methods trigger errors.
     * @returns {SO}
     * 
     * @throws {Error} cannot convert null|function to a SO
     */
    api.stringifyToSO = function (target, strict) {
        var type = utils.typeof(target);
        switch (type) {
            case "function":
                if (strict) {
                    throw new Error("cannot convert a function to a StringObject");
                } else {
                    return undefined;
                }
            case "null":
                if (strict) {
                    throw new Error("cannot convert null to a StringObject");
                } else {
                    return undefined;
                }
            case "array":
                return target.map(function (el) {
                    return api.stringifyToSO(el, strict);
                }).filter(function (el) {
                    return el !== undefined;
                });
                break;
            case "object":
                var ret = {};
                for (var prop in target) {
                    if (target.hasOwnProperty(prop)) {
                        let pret = api.stringifyToSO(target[prop], strict);
                        if (pret !== undefined){
                            ret[prop] = pret;
                        }
                    }
                }
                return ret;
            case "undefined":
                return undefined;
            default:
                return api.stringify(type, target);
        }
    };



    /* Parser  */

    /**
     * Parses base 10 floats (/^(\-|\+)?\d+(\.\d+)?$/) 
     * 
     * @param {string} str
     * @returns {number}
     * 
     * @throws {Error} If number is NaN.
     */
    api.parseNumber = function (str) {
        if (/^(\-|\+)?\d+(\.\d+)?$/.test(str)){
            return Number(str);
        } else {
            throw new Error(str + " is not a number");
        }
    };

    /**
     * Parses a boolean from a string.
     * 
     * @param {string} str
     * @returns {boolean}
     * 
     * @throws {Error} str must be "true" or "false".
     */
    api.parseBoolean = function (str) {
        if (str === "true") {
            return true;
        } else if (str === "false") {
            return false;
        } else {
            throw new Error(str + " is not a boolean");
        }
    };

    /**
     * Parses a Date from a string in getTime() or any other format.
     * 
     * @param {string} str
     * @returns {Date}
     * 
     * @throws {Error} str must be a valid time.
     */
    api.parseDate = function (str) {
        var time = new Date(str);
        if (Number.isNaN(time.getTime())) {
            throw new Error("invalid date");
        }
        return time;
    };

    /**
     * Parses a Regex from a string.
     * 
     * @param {string} str
     * @returns {RegExp}
     */
    api.parseRegex = function (str) {
        return new RegExp(str);
    };


    /**
     * Parses a string to the type type.
     * 
     * @param {string} type ="string"|"number"|"boolean"|"date"|"regex"|"undefined"|"null"
     * @param {string} str
     * @returns {(string|number|boolean|Date|RegExp|null|undefined)}
     * 
     * @throws {Error} type not supported.
     * @throws {Error} @see utils.parseDate, @see utils.parseBoolean, @see utils.parseNumber
     */
    api.parse = function (type, str) {
        switch (type) {
            case "string":
                return str;
            case "number":
                return api.parseNumber(str);
            case "boolean":
                return api.parseBoolean(str);
            case "date":
                return api.parseDate(str);
            case "regex":
                return api.parseRegex(str);
            case "undefined":
                return undefined;
            case "null":
                return null;
            default:
                throw new Error("cannot parse " + type);
        }
    };

    /**
     * Alias for schema.fromJSON(target);
     * 
     * @requires Schema
     * 
     * @param {Schema} schema
     * @param {JSON object} target
     * @returns {*}
     */
    api.parseFromJSON = function (schema, target) {
        return schema.fromJSON(target);
    };

    /**
     * Alias for schema.fromSO(target);
     * 
     * @requires Schema
     * 
     * @param {Schema} schema
     * @param {SO} target
     * @returns {*}
     */
    api.parseFromSO = function (schema, target) {
        return schema.fromSO(target);
    };



    return api;
});


