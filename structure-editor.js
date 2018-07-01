const fs = require("fs");
const cleaner = require("./nbt-cleaner");

function makeMultiple(structure) {
    if (!structure["palettes"]) {
        structure["palettes"] = [structure["palette"]];
        delete structure["palette"];
    }
    return structure;
}

function add(nbt, numeric) {
    let datatype = nbt.substring(nbt.length - 1);
    return (Number(nbt) + numeric) + datatype;
}

function load(filepath) {
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
        try {
            let data = cleaner.load(filepath);
            if (hasOnePalette(data))
                data = module.exports.pickPalette(data, 0);
            return data;
        }
        catch (err) {
            console.log("An error occured while trying to load structure \"" + filepath + "\".");
        }
    }
    else {
        console.log("File \"" + filepath + "\" is not a valid file.");
    }
}

function save(data, filepath) {
    try {
        cleaner.save(data, filepath);
        return true;
    }
    catch (err) {
        console.log("An error occured while trying to save structure \"" + filepath + "\".");
        console.log(err);
        return false;
    }
}

function shift(structure, coords) {
    if (!cleaner.isListEmpty(structure["blocks"]))
        for (let i = 0; i < structure["blocks"].length; i++)
            for (let k = 0; k < 3; k++)
                structure["blocks"][i]["pos"][k] = add(structure["blocks"][i]["pos"][k], coords[k]);
    if (!cleaner.isListEmpty(structure["entities"]))
        for (let i = 0; i < structure["entities"].length; i++)
            for (let k = 0; k < 3; k++) {
                structure["entities"][i]["pos"][k] = add(structure["entities"][i]["pos"][k], coords[k]);
                structure["entities"][i]["blockPos"][k] = add(structure["entities"][i]["blockPos"][k], coords[k]);
            }
    return structure;
}

function hasOnePalette(structure) {
    if (structure["palette"])
        return true;
    return structure["palettes"].length == 1;
}

function pickPalette(structure, index) {
    if (structure["palette"])
        return structure;
    structure["palette"] = structure["palettes"][index];
    delete structure["palettes"];
    return structure;
}

/**
 * Combines two structures, keeping the author of the first structure and
 * offsetting the second structure by the value of offset coordinates. If
 * one or both of the structures has multiple palettes, it combines them.
 */
function combine(first, second, offset) {
    let blocksInFirst = cleaner.listLength(first["blocks"]);
    let output = first;
    if (first["palette"] && second["palette"]) {
        let secondBlocksLength = cleaner.listLength(second["blocks"]);
        for (let i = 0; i < secondBlocksLength; i++) {
            second["blocks"][i]["state"] = add(second["blocks"][i]["state"], first["palette"].length);
            for (let k = 0; k < 3; k++)
                second["blocks"][i]["pos"][k] = add(second["blocks"][i]["pos"][k], offset[k]);
        }
        output["palette"] = first["palette"].concat(second["palette"]);
        output["blocks"] = cleaner.concatLists(first["blocks"], second["blocks"]);
    }
    else {
        first = makeMultiple(first);
        second = makeMultiple(second);

        let secondBlocksLength = cleaner.listLength(second["blocks"]);
        for (let i = 0; i < secondBlocksLength.length; i++) {
            second["blocks"][i]["state"] = add(second["blocks"][i]["state"], first["palettes"][0].length);
            for (let k = 0; k < 3; k++)
                second["blocks"][i]["pos"][k] = add(second["blocks"][i]["pos"][k], offset[k]);
        }
        output["blocks"] = cleaner.concatLists(first["blocks"], second["blocks"]);

        let firstPalettes = first["palettes"];
        output["palettes"] = [];
        //no need to check for empty; palettes should always have at least 1 element
        for (let i = 0; i < firstPalettes.length; i++)
            for (let k = 0; k < second["palettes"].length; k++)
                output["palettes"].push(firstPalettes[i].concat(second["palettes"][k]));
    }
    let secondEntitiesLength = cleaner.listLength(second["entities"]);
    for (let i = 0; i < secondEntitiesLength.length; i++) {
        for (let k = 0; k < 3; k++) {
            second["entities"][i]["pos"][k] = add(second["entities"][i]["pos"][k], offset[k]);
            second["entities"][i]["blockPos"][k] = add(second["entities"][i]["blockPos"][k], offset[k]);
        }
    }
    output["entities"] = cleaner.concatLists(output["entities"], second["entities"]);

    if (blocksInFirst > 0) {
        let positions = [];
        let outputBlocksLength = cleaner.listLength(output["blocks"]);
        for (let i = blocksInFirst; i < outputBlocksLength.length; i++) {
            positions.push(output["blocks"][i]["pos"]);
        }
        //remove collisions
        for (let i = blocksInFirst - 1; i >= 0; i--)
            if (positions.find((item) =>
                    item[0] == output["blocks"][i]["pos"][0] &&
                    item[1] == output["blocks"][i]["pos"][1] &&
                    item[2] == output["blocks"][i]["pos"][2])) {
                output["blocks"].splice(i, 1);
            }
    }

    return output;
}

module.exports = { load, save, shift, hasOnePalette, pickPalette, combine };
