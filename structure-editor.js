const fs = require("fs");
const nbt = require("./nbt");
const zlib = require("zlib");

function makeMultiple(structure) {
    if (!structure.value["palettes"]) {
        structure.value["palettes"] = {
            "type": "list",
            "value": {
                "type": "list",
                "value": [
                    structure.value["palette"].value
                ]
            }
        };
        delete structure.value["palette"];
    }
    return structure;
}

module.exports = {
    "load": (filepath) => {
        if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
            try {
                let data = nbt.parseUncompressed(zlib.gunzipSync(fs.readFileSync(filepath)));
                if (data.value["palettes"] && data.value["palettes"].value.value.length == 1)
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
    },
    "save": (data, filepath) => {
        try {
            fs.writeFileSync(filepath, zlib.gzipSync(nbt.writeUncompressed(data)));
            return true;
        }
        catch (err) {
            console.log("An error occured while trying to save structure \"" + filepath + "\".");
            console.log(err);
            return false;
        }
    },
    "shift": (structure, coords) => {
        for (let i = 0; i < structure.value["blocks"].value.value.length; i++)
            for (let k = 0; k < 3; k++)
                structure.value["blocks"].value.value[i]["pos"].value.value[k] += coords[k];
        for (let i = 0; i < structure.value["entities"].value.value.length; i++)
            for (let k = 0; k < 3; k++) {
                structure.value["entities"].value.value[i]["pos"].value.value[k] += coords[k];
                structure.value["entities"].value.value[i]["blockPos"].value.value[k] += coords[k];
            }
        return structure;
    },
    "hasOnePalette": (structure) => {
        if (structure.value["palette"])
            return true;
        return structure.value["palettes"].value.value.length == 1;
    },
    "pickPalette": (structure, index) => {
        if (structure.value["palette"])
            return structure;
        structure.value["palette"] = {
            "type": "list",
            "value": structure.value["palettes"].value.value[index]
        };
        delete structure.value["palettes"];
        return structure;
    },
    /**
     * Combines two structures, keeping the author of the first structure and
     * offsetting the second structure by the value of offset coordinates. If
     * one or both of the structures has multiple palettes, it combines them.
     */
    "combine": (first, second, offset) => {
        let output = first;
        if (first.value["palette"] && second.value["palette"]) {
            let len = first.value["palette"].value.value.length;
            let secondBlocks = second.value["blocks"].value.value;
            for (let i = 0; i < secondBlocks.length; i++) {
                secondBlocks[i]["state"].value += len;
                for (let k = 0; k < 3; k++)
                    secondBlocks[i]["pos"].value.value[k] += offset[k];
            }
            output.value["palette"].value.value = first.value["palette"].value.value.concat(second.value["palette"].value.value);
            output.value["blocks"].value.value = first.value["blocks"].value.value.concat(secondBlocks);
        }
        else {
            first = makeMultiple(first);
            second = makeMultiple(second);
            let firstPalettes = first.value["palettes"].value.value;
            let secondPalettes = second.value["palettes"].value.value;
            let outputPalettes = [];
            let secondBlocks = second.value["blocks"].value.value;
            let len = firstPalettes[0].value.length;

            for (let i = 0; i < secondBlocks.length; i++) {
                secondBlocks[i]["state"].value += len;
                for (let k = 0; k < 3; k++)
                    secondBlocks[i]["pos"].value.value[k] += offset[k];
            }
            output.value["blocks"].value.value = first.value["blocks"].value.value.concat(secondBlocks);

            for (let i = 0; i < firstPalettes.length; i++)
                for (let k = 0; k < secondPalettes.length; k++)
                    outputPalettes.push(firstPalettes[i].concat(secondPalettes[k]));

            output.value["palettes"].value.value = outputPalettes;
        }
        let secondEntities = second.value["entities"].value.value;
        for (let i = 0; i < secondEntities.length; i++) {
            for (let k = 0; k < 3; k++) {
                secondEntities[i]["pos"].value.value[k] += offset[k];
                secondEntities[i]["blockPos"].value.value[k] += offset[k];
            }
        }
        output.value["entities"].value.value = output.value["entities"].value.value.concat(secondEntities);
        return output;
    }
}
