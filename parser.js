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
})("parser", function () {

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
    api.stringify = function (type, target) {
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
                throw new Error("unkown type, cannot stringify " + type);
        }
    };

    /**
     * Stringifies a js entity to a valid JSON object. The original entity is left
     * untouched and only a clone is returned. RegExp and Date objects are specially 
     * handled. All prototypal inheritance is lost. All null and undefined properties
     * as well as all methods are stripped from the clone.
     * 
     * @param {*} target A JSON-stringifiable js entity. That is anything but undefined, null, or a function.
     * @param {boolean} [strict=false] Enable strict mode. In strict mode, only undefined properties are stripped from 
     * the target, null properties and methods will throw errors.
     * @returns {JSON object}
     * 
     * @throws {Error} cannot convert null|function|undefined to JSON
     */
    api.stringifyToJSON = function (target, strict) {
        if (typeof target === "function") {
            throw new Error("cannot convert a function to JSON");
        } else if (typeof target === "object") {
            if (target === null) {
                throw new Error("cannot convert a null value to JSON");
            } else if (Array.isArray(target)) {
                return target.map(function (el) {
                    var ret;
                    try {
                        ret = api.stringifyToJSON(el);
                    } catch (err) {
                        ret = null;
                        if (strict && !err.undefined) {
                            throw err;
                        }
                    }
                    return ret;
                }).filter(function (el) {
                    return el !== null;
                });
            } else if (target instanceof Date) {
                return api.stringify("date", target);
            } else if (target instanceof RegExp) {
                return api.stringify("regex", target);
            } else {
                var ret = {};
                for (var prop in target) {
                    if (target.hasOwnProperty(prop)) {
                        var pret;
                        try {
                            pret = api.stringifyToJSON(target[prop]);
                            ret[prop] = pret;
                        } catch (err) {
                            if (strict && !err.undefined) {
                                throw err;
                            }
                        }
                    }
                }
                return ret;
            }
        } else if (typeof target === "undefined") {
            var err = new Error("cannot convert an undefined value to JSON");
            err.undefined = true;
            throw err;
        } else {
            return target;
        }
    };

    /**
     * Stringifies a js entity to a valid QSO object. The original entity is left
     * untouched and only a clone is returned. RegExp and Date objects are specially 
     * handled. All prototypal inheritance is lost. All null and undefined properties
     * as well as all methods are stripped from the clone. Numbers and Booleans are converted
     * to strings.
     * **Valid QSO objects cannot possess objects or arrays embedded into arrays.**
     * 
     * @param {type} target
     * @param {boolean|number} [strict=true] Strict mode.
     *  1. If strict is 0 or false, embedded arrays are normalized.
     *  2. If strict is 1 or true, embedded arrays trigger errors.
     *  3. If strict is 2, embedded arrays, null properties and methods trigger errors 
     * @param {type} _flag internal, used by recursive calls.
     * @returns {QSO}
     * 
     * @throws {Error} QSO objects cannot possess objects or arrays embedded into arrays
     * @throws {Error} cannot convert null|function|undefined to QSO
     */
    api.stringifyToQSO = function (target, strict, _flag) {
        if (strict === 0 || strict === false) {
            strict = 0;
        } else if (strict !== 2) {
            strict = 1;
        }

        var type;
        if (typeof target === "function") {
            throw new Error("cannot convert a function to QSO");
        } else if (typeof target === "object") {
            if (target === null) {
                throw new Error("cannot convert a null value to QSO");
            } else if (Array.isArray(target)) {
                if (_flag) {
                    var err = new Error("cannot convert embedded arrays to QSO");
                    err.embedded = true;
                    throw err;
                }
                return target.map(function (el) {
                    var ret;
                    try {
                        ret = api.stringifyToQSO(el, strict, true);
                    } catch (err) {
                        if (strict === 0) {
                            ret = null;
                        } else if (strict === 1) {
                            if (err.embedded) {
                                throw err;
                            } else {
                                ret = null;
                            }
                        } else {
                            if (err.undefined) {
                                ret = null;
                            } else {
                                throw err;
                            }
                        }
                    }
                    return ret;
                }).filter(function (el) {
                    return el !== null;
                });
            } else if (target instanceof Date) {
                type = "date";
            } else if (target instanceof RegExp) {
                type = "regex";
            } else {
                if (_flag) {
                    var err = new Error("cannot convert objects embedded into arrays to QSO");
                    err.embedded = true;
                    throw err;
                }
                var ret = {};
                for (var prop in target) {
                    if (target.hasOwnProperty(prop)) {
                        var pret;
                        try {
                            pret = api.stringifyToQSO(target[prop], strict, _flag);
                        } catch (err) {
                            if (strict === 0) {
                                continue;
                            } else if (strict === 1) {
                                if (err.embedded) {
                                    throw err;
                                } else {
                                    continue;
                                }
                            } else {
                                if (err.undefined) {
                                    continue;
                                } else {
                                    throw err;
                                }
                            }
                        }
                        ret[prop] = pret;
                    }
                }
                return ret;
            }
        } else if (typeof target === "undefined") {
            var err = new Error("cannot convert an undefined value to QSO");
            err.undefined = true;
            throw err;
        } else {
            type = typeof target;
        }
        return api.stringify(type, target);
    };
    
    /**
     * Stringifies a js entity to a valid PSO object. The original entity is left
     * untouched and only a clone is returned. RegExp and Date objects are specially 
     * handled. All prototypal inheritance is lost. All null and undefined properties
     * as well as all methods and arrays are stripped from the clone. Numbers and Booleans are converted
     * to strings.
     * 
     * @param {type} target
     * @param {boolean} [strict=true] Strict mode.
     *  1. If strict is false, arrays, null properties and methods are silently stripped from the PSO.
     *  2. If strict is true, arrays, null properties and methods trigger errors.
     * @returns {PSO}
     * 
     * @throws {Error} cannot convert null|function|undefined|array to PSO
     */
    api.stringifyToPSO = function (target, strict) {
        strict = strict === false ? false : true;
        var type;
        if (typeof target === "function") {
            throw new Error("cannot convert a function to PSO");
        } else if (typeof target === "object") {
            if (target === null) {
                throw new Error("cannot convert a null value to PSO");
            } else if (Array.isArray(target)) {
                throw new Error("cannot convert a arrays to PSO");
            } else if (target instanceof Date) {
                type = "date";
            } else if (target instanceof RegExp) {
                type = "regex";
            } else {
                var ret = {};
                for (var prop in target) {
                    if (target.hasOwnProperty(prop)) {
                        var pret;
                        try {
                            pret = api.stringifyToPSO(target[prop], strict);
                        } catch (err) {
                            if (strict){
                                throw err;
                            } else {
                                continue;
                            }
                        }
                        ret[prop] = pret;
                    }
                }
                return ret;
            }
        } else if (typeof target === "undefined") {
            var err = new Error("cannot convert an undefined value to PSO");
            err.undefined = true;
            throw err;
        } else {
            type = typeof target;
        }
        return api.stringify(type, target);
    };


    /* Parser  */



    /**
     * Base 10 Number.parseInt().
     * 
     * @param {string} str
     * @returns {number}
     * 
     * @throws {Error} If number is NaN.
     */
    api.parseNumber = function (str) {
        var parsed = Number.parseInt(str, 10);
        if (Number.isNaN(parsed)) {
            throw new Error(str + " is not a number");
        }
        return parsed;
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
     * @param {string} type
     * @param {string} str
     * @returns {(string|number|boolean|Date)}
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
            default:
                throw new Error("unkown type, cannot parse " + type);
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
     * Alias for schema.fromQSO(target);
     * 
     * @requires Schema
     * 
     * @param {Schema} schema
     * @param {QSO} target
     * @returns {*}
     */
    api.parseFromQSO = function (schema, target) {
        return schema.fromQSO(target);
    };

    /**
     * Alias for schema.fromPSO(target);
     * 
     * @requires Schema
     * 
     * @param {Schema} schema
     * @param {PSO} target
     * @returns {*}
     */
    api.parseFromPSO = function (schema, target) {
        return schema.fromPSO(target);
    };

    return api;
});


