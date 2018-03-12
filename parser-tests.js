
let parser = require("./parser");

let test = {
    string: "string",
    number: 0,
    boolean: true,
    null: null,
    undefined: undefined,
    regex: /.*/,
    date: new Date(),
    object: {
        prop: "value"
    },
    array: ["value", undefined, null, "value2"]
};

let json = parser.stringifyToJSON(test);
let qso = parser.stringifyToSO(test);

console.log(json);
console.log(qso);
console.log(parser.parse("number", qso.number));
console.log(parser.parse("boolean", qso.boolean));
console.log(parser.parse("regex", qso.regex));
console.log(parser.parse("date", qso.date));


