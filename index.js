const fs = require("fs");
const path = require("path");
const readlineSync = require("readline-sync");

const nbt = require("./nbt");
const structureEditor = require("./structure-editor");

console.log(
    `Welcome to SliceThePi's Minecraft Structure Editor!
Valid commands (in the order you'll probably execute them) are:
author <name>
    Sets the author of the output structure. Defaults to SliceThePi. ;)
source <directory>
    Sets what directory to load and save structures to. Defaults to the current
    directory.
origin <x> <y> <z>
    Sets where in the output structure to put future loaded input structures.
    Default origin is 0 0 0.
load <filename>
    Loads an input structure into the output structure.
shift <x> <y> <z>
    Shifts all blocks and entities.
save <filename>
    Saves the structure.
clear
    Restarts progress after confirming that you really want to.
exit
    Exits the program after confirming that you really want to.
`);

let author = "SliceThePi";
let source = process.cwd();
let origin = [0, 0, 0];
let structure;

function confirm(action) {
    let confirmation = "00" + Math.floor(Math.random() * 1000).toString();
    confirmation = confirmation.substr(confirmation.length - 3);
    let response = readlineSync.question("Type " + confirmation + " to confirm that you really want to " + action + ": ");
    return confirmation == response;
}

readlineSync.promptCLLoop({
    "author": (name) => {
        if (!name)
            console.log("Author is currently set to\"" + author + "\".");
        else {
            author = name;
            console.log("Author is now set to\"" + author + "\".");
        }
    },
    "source": (directory) => {
        if (!directory) {
            console.log("Source is currently set to \"" + source + "\".");
            return;
        }
        if (fs.existsSync(directory)) {
            let stat = fs.statSync(directory);
            if (stat.isDirectory()) {
                console.log("Source is now set to \"" + directory + "\".");
                source = directory;
            }
        }
        else {
            console.log("Error: folder \"" + directory + "\" does not exist!");
        }
    },
    "origin": (x, y, z) => {
        let coords = [x, y, z];
        if (coords.every(item => item == undefined)) {
            console.log("Origin is currently set to " + origin.join(" ") + ".");
            return;
        }
        else if (coords.every(item => !isNaN(item))) {
            origin = coords.map(item => Math.floor(item));
            console.log("Origin is now set to " + origin.join(" ") + ".");
        }
        else
            console.log("Invalid coordinates. Example command: origin 23 -5 1");
    },
    "load": (filename) => {
        if (!filename) {
            console.log("Please provide a file name!");
            return;
        }
        if (!filename.endsWith(".nbt"))
            filename += ".nbt";
        let data = structureEditor.load(path.join(source, filename));
        if (data) {
            if (!structureEditor.hasOnePalette(data)) {
                let len = data.value["palettes"].value.value.length;
                let response = readlineSync.question("This structure has " + len + " palettes.\n" +
                    "Would you like to load just one palette, or load all of them?\n" +
                    "Warning: loading multiple palettes for multiple structures results\n" +
                    "in an exponential number of palettes in the output structure!\n" +
                    "Type 0 to load all of them, or a number 1 - " + len + " to load just one: ");
                if (isNaN(response)) {
                    console.log("Not sure what you meant, so not loading the structure.");
                    return;
                }
                if (response != "0") {
                    data = structureEditor.pickPalette(data, response - 1);
                }
            }
            if (!structure) {
                structure = structureEditor.shift(data, origin);
                /*we don't properly manage size, as
                (a) it's only for display purposes and
                (b) that takes more work and
                (c) it doesn't work with negative coordinates anyways
                so we just set it to display a 1-block bounding box*/
                structure.value["size"].value.value = [1, 1, 1];
            }
            else {
                structure = structureEditor.combine(structure, data, origin);
            }
            console.log("Alright, loaded structure!");
        }
        else
            console.log("Unable to load structure!");
    },
    "shift": (x, y, z) => {
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
    },
    "save": (filename) => {
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
        let filepath = path.join(source, filename);
        if (fs.existsSync(filepath) && fs.statSync(filepath).isFile() && !confirm("overwrite the file \"" + filepath + "\"")) {
            console.log("Alright, not saving!");
            return;
        }
        structure.value["author"].value = author;
        if (structureEditor.save(structure, filepath))
            console.log("Alright, saved structure to \"" + filepath + "\"!");
        else
            console.log("Unable to save structure!");
    },
    "clear": () => {
        if (confirm("clear the structure and reset the origin")) {
            structure = undefined;
            origin = [0, 0, 0];
            console.log("Alright, the structure has been reset!");
        }
        else
            console.log("Alright, not doing anything!");
    },
    "exit": () => {
        if (confirm("exit without saving current progress")) {
            console.log("Alright, bye!");
            return true;
        }
        else {
            console.log("Alright, not exiting!");
        }
    }
});
