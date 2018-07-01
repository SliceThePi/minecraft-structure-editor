const fs = require("fs");
const zlib = require("zlib");
const nbt = require("./nbt");
const numerics = ["byte", "short", "int", "long", "float", "double"];
const emptyVal = "emptylist:"

/**
 * Warning, throws errors if data is not valid!
 */
function clean(data) {
    let buffer;
    if (data.name || data.name === "" || data.type == "compound") {
        buffer = {};
        Object.keys(data.value).forEach((key) => buffer[key] = clean(data.value[key]));
    }
    else if (data.type == "list") {
        if (data.value.value.length == 0)
            buffer = [emptyVal + data.value.type];
        else {
            buffer = [];
            data.value.value.forEach((item) =>
                buffer.push(clean({
                    "type": data.value.type,
                    "value": item
                })));
        }
    }
    else if (numerics.includes(data.type))
        buffer = data.value.toString() + data.type.substring(0, 1);
    else if (data.type == "string")
        buffer = JSON.stringify(data.value); //does this look right?
    else if (data.type == "byteArray" || data.type == "intArray")
        buffer = JSON.stringify(data.value) + data.type.substring(0, 1);
    else
        throw "Error: invalid data!";

    return buffer;
}

function getNBTType(data) {
    if (Array.isArray(data))
        return "list";
    else {
        let str = data.toString();
        if (str.startsWith("[")) {
            if (str.endsWith("]b"))
                return "byteArray";
            else if (str.endsWith("]i"))
                return "intArray";
            else if (str == "[object Object]")
                return "compound";
        }
        else if (str.startsWith("\"") && str.endsWith("\""))
            return "string";
        else if (str.startsWith(emptyVal))
            return str.substring(emptyVal.length);
        else return numerics.find((item) => str.endsWith(item.substring(0, 1)));
    }
}

/**
 * Warning, throws errors if data is not valid!
 */
function unclean(data, isTopLevel = true) {
    let buffer = {};
    if (isTopLevel) {
        buffer.name = "";
        buffer.value = {};
        Object.keys(data).forEach((key) => buffer.value[key] = unclean(data[key], false));
    }
    else {
        buffer.type = getNBTType(data);
        if (buffer.type == "list") {
            let listType = getNBTType(data[0]);
            buffer.value = {
                "type": listType,
                "value": []
            };
            if (!isListEmpty(data))
                data.forEach((item) => buffer.value.value.push(unclean(item, false).value));
        }
        else if (buffer.type == "compound") {
            buffer.value = {};
            Object.keys(data).forEach((key) => buffer.value[key] = unclean(data[key], false));
        }
        else if (buffer.type == "string") {
            buffer.value = JSON.parse(data);
        }
        else if (buffer.type == "intArray" || buffer.type == "byteArray") {
            buffer.value = JSON.parse(data.substring(0, data.length - 1));
        }
        else if (numerics.includes(buffer.type)) {
            buffer.value = Number(data.substring(0, data.length - 1));
        }
    }
    return buffer;
}

function load(filepath) {
    return clean(nbt.parseUncompressed(zlib.gunzipSync(fs.readFileSync(filepath))));
}

function save(data, filepath) {
    fs.writeFileSync(filepath, zlib.gzipSync(nbt.writeUncompressed(unclean(data))));
}

function isListEmpty(arr) {
    return arr[0].toString().startsWith(emptyVal);
}

function listLength(arr) {
    return isListEmpty(arr) ? 0 : arr.length;
}

function concatLists(a, b) {
    if (isListEmpty(a)) {
        if (isListEmpty(b))
            return [a[0]];
        else
            return b;
    }
    else if (isListEmpty(b))
        return a;
    else return a.concat(b);
}

module.exports = { unclean, unclean, load, save, isListEmpty, listLength, concatLists };
