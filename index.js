const fs = require("fs");
const path = require("path");
const readlineSync = require("readline-sync");

const nbt = require("./nbt");
const structureEditor = require("./structure-editor");
const cleaner = require("./nbt-cleaner");

function help() {
    console.log(
        `Welcome to SliceThePi's Minecraft Structure Editor!
Valid commands (in the order you'll probably execute them) are:
author <name>
    Sets the author of the output structure. Defaults to SliceThePi. ;)
source <directory>
    Sets what directory to load and save structures to. Defaults to the current
    directory.
converttojson <filename>
    Converts an NBT structure to JSON.
converttonbt <filename>
    Converts a JSON structure to NBT.
origin <x> <y> <z>
    Sets where in the output structure to put future loaded input structures.
    Default origin is 0 0 0.
import <filename>
    Imports an NBT file into the output structure.
load <filename>
    Loads an input structure json file into the output structure.
shift <x> <y> <z>
    Shifts all blocks and entities.
save <filename>
    Saves the structure.
export <filename>
    Export the output structure to an NBT file.
clear
    Restarts progress after confirming that you really want to.
exit
    Exits the program after confirming that you really want to.
help
    Displays this message again.
`);
}

help();

let structureAuthor = "SliceThePi";
let sourceDir = process.cwd();
let structureOrigin = [0, 0, 0];
let structure;

function confirm(action) {
    let confirmation = "00" + Math.floor(Math.random() * 1000).toString();
    confirmation = confirmation.substr(confirmation.length - 3);
    let response = readlineSync.question("Type " + confirmation + " to confirm that you really want to " + action + ": ");
    return confirmation == response;
}

function author(name) {
    if (!name)
        console.log("Author is currently set to\"" + structureAuthor + "\".");
    else {
        structureAuthor = name;
        console.log("Author is now set to\"" + structureAuthor + "\".");
    }
}

function source(directory) {
    if (!directory) {
        console.log("Source is currently set to \"" + sourceDir + "\".");
        return;
    }
    if (fs.existsSync(directory)) {
        let stat = fs.statSync(directory);
        if (stat.isDirectory()) {
            console.log("JSON source is now set to \"" + directory + "\".");
            sourceDir = directory;
        }
    }
    else {
        console.log("Error: folder \"" + directory + "\" does not exist!");
    }
}

function origin(x, y, z) {
    let coords = [x, y, z];
    if (coords.every(item => item == undefined)) {
        console.log("Origin is currently set to " + structureOrigin.join(" ") + ".");
        return;
    }
    else if (coords.every(item => !isNaN(item))) {
        structureOrigin = coords.map(item => Math.floor(item));
        console.log("Origin is now set to " + structureOrigin.join(" ") + ".");
    }
    else
        console.log("Invalid coordinates. Example command: origin 23 -5 1");
}

function loadStructure(data) {
    if (!structureEditor.hasOnePalette(data)) {
        let len = data["palettes"].length;
        let response = readlineSync.question("This structure has " + len + " palettes.\n" +
            "Would you like to load just one palette, or load all of them?\n" +
            "Warning: loading multiple palettes for multiple structures results\n" +
            "in an exponential number of palettes in the output structure!\n" +
            "Type 0 to load all of them, or a number 1 - " + len + " to load just one: ");
        while (isNaN(response)) {
            response = readlineSync.question("Please specify a number 0 - " + len + ": ");
        }
        if (Number(response) != 0) {
            data = structureEditor.pickPalette(data, response - 1);
        }
    }
    if (!structure)
        structure = structureEditor.shift(data, structureOrigin);
    else
        structure = structureEditor.combine(structure, data, structureOrigin);
}

function importStructure(filename) {
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    if (!filename.endsWith(".nbt"))
        filename += ".nbt";
    let data = structureEditor.load(path.join(sourceDir, filename));
    if (data) {
        loadStructure(data);
        console.log("Alright, loaded structure!");
    }
    else
        console.log("Unable to load structure!");
}

function shift(x, y, z) {
    if (!structure) {
        console.log("You don't have anything loaded! You can't shift the structure.");
        return;
    }
    let coords = [x, y, z];
    if (coords.every(item => !isNaN(item))) {
        coords = coords.map(item => Math.floor(item));
        structure = structureEditor.shift(structure, coords);
        console.log("Shifted structure by " + coords.join(" ") + ".");
    }
    else
        console.log("Invalid coordinates. Example command: shift 18 2 -6");
}

function exportStructure(filename) {
    if (!structure) {
        console.log("You don't have anything loaded! You can't save anything.");
        return;
    }
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    if (!filename.endsWith(".nbt"))
        filename += ".nbt";
    let filepath = path.join(sourceDir, filename);
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile() && !confirm("overwrite the file \"" + filepath + "\"")) {
        console.log("Alright, not saving!");
        return;
    }
    structure["author"] = JSON.stringify(structureAuthor);
    if (structureEditor.save(structure, filepath))
        console.log("Alright, saved structure to \"" + filepath + "\"!");
    else
        console.log("Unable to save structure!");
}

function clear() {
    if (confirm("clear the structure and reset the origin")) {
        structure = undefined;
        structureOrigin = [0, 0, 0];
        console.log("Alright, the structure has been reset!");
    }
    else
        console.log("Alright, not doing anything!");
}

function exit() {
    if (confirm("exit without saving current progress")) {
        console.log("Alright, bye!");
        return true;
    }
    else {
        console.log("Alright, not exiting!");
    }
}

function load(filename) {
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    if (!filename.endsWith(".json"))
        filename += ".json";
    let data;
    try {
        data = JSON.parse(fs.readFileSync(path.join(sourceDir, filename)));
    }
    catch (err) {}
    if (data) {
        loadStructure(data);
        console.log("Alright, loaded structure!");
    }
    else
        console.log("Unable to load structure!");
}

function saveJSONStructure(data, filepath) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), "utf8");
    }
    catch (err) {
        console.log(err);
        return false;
    }
    return true;
}

function save(filename) {
    if (!structure) {
        console.log("You don't have anything loaded! You can't save anything.");
        return;
    }
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    if (!filename.endsWith(".json"))
        filename += ".json";
    let filepath = path.join(sourceDir, filename);
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile() && !confirm("overwrite the file \"" + filepath + "\"")) {
        console.log("Alright, not saving!");
        return;
    }
    structure["author"] = JSON.stringify(structureAuthor);
    if (saveJSONStructure(structure, filepath))
        console.log("Alright, saved structure to \"" + filepath + "\"!");
    else
        console.log("Unable to save structure!");
}

function converttonbt(filename) {
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    let jsonFile = filename + ".json";
    let nbtFile = filename + ".nbt";
    let data;
    try {
        data = JSON.parse(fs.readFileSync(path.join(sourceDir, jsonFile)));
    }
    catch (err) {
        console.log("Couldn't load JSON version!");
        return;
    }
    let filepath = path.join(sourceDir, nbtFile);
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile() && !confirm("overwrite the file \"" + filepath + "\"")) {
        console.log("Alright, not saving!");
        return;
    }
    if (structureEditor.save(data, filepath))
        console.log("Alright, saved NBT version to \"" + filepath + "\"!");
    else
        console.log("Unable to save NBT version!");
}

function converttojson(filename) {
    if (!filename) {
        console.log("Please provide a file name!");
        return;
    }
    let jsonFile = filename + ".json";
    let nbtFile = filename + ".nbt";
    let data = structureEditor.load(path.join(sourceDir, nbtFile));
    if (!data) {
        console.log("Couldn't load NBT version!");
        return;
    }
    let filepath = path.join(sourceDir, jsonFile);
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile() && !confirm("overwrite the file \"" + filepath + "\"")) {
        console.log("Alright, not saving!");
        return;
    }
    if (saveJSONStructure(data, filepath))
        console.log("Alright, saved JSON version to \"" + filepath + "\"!");
    else
        console.log("Unable to save JSON version!");
}

readlineSync.promptCLLoop({ author, converttojson, converttonbt, source, origin, load, shift, save, clear, exit, help, "import": importStructure, "export": exportStructure });
