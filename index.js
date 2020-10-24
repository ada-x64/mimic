#!/usr/bin/env node
//--
//-- simple code verifier
//-- created by phoenix ada rose mandala for roll20 user collaboration
//--

//-- requires
const fs = require('fs');
const process = require('process');
const vm = require('vm');
const r20 = require('r20');
const _ = require('underscore');
const {parentPort, MessageChannel, Worker, isMainThread, workerData} = require('worker_threads');
const {port1,port2} = new MessageChannel();
const jsdom = require('jsdom');
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);
const {JSDOM} = jsdom;
const dom = new JSDOM(``, {virtualConsole});
const node_exe = process.argv.shift();
const thisdir = process.argv.shift();
const dir = process.argv.shift();
const attrs = {};

//-- boot
if (!dir) {
    log("No directory provided.");
    process.exit(1);
}
var watch = false;
var filenames = [];
for (i in process.argv) {
    if (process.argv[i] == "--watch") {
        watch = true;
    }
    else {
        if (process.argv[i].search(".js") === 0) {
            filenames.push(process.argv[i]+".js");
        }
        else {
            filenames.push(process.argv[i]);
        }
    }
}

mainLoop(dir,filenames,watch);


//-- Main loop
function mainLoop(directory,filenames,watch) {
    console.log("\x1b[34mProcessing directory ",directory);
    if (filenames.length !== 0) {
        console.log("Verifying files:",...filenames,"\x1b[0m");
    }
    runScripts(loadFiles(directory,filenames));
    if (watch) {
        log("Watching for changes. Press ^C to exit.");
        var waiting = false;
        fs.watch(directory, (event, filename)=>{
            if(waiting) {return;}
            waiting = true;
            runScripts(loadFiles(directory,filenames));
            setTimeout(()=>{waiting = false;}, 1000);
        });
    }

}
function loadFiles(directory, filenames) {
    const scripts = [];
    if (filenames.length == 0) {
        try {
            filenames = fs.readdirSync(dir);
            log("Scraped filenames",filenames);
        }
        catch(e) {
            log("ERROR: Directory not found: ",dir);
            log(e);
            process.exit(1);
        }
    }
    for (i in filenames) {
        try {
            if (filenames[i].search(".js") > 0) {
                scripts[i] = fs.readFileSync(directory + "/" + filenames[i]);
            }
        }
        catch (e) {
            log("ERROR LOADING FILE: ",filenames[i],"\n ERROR: ", e);
        }
    }
    if (!scripts) {
        log("No scripts found! Exiting.");
        process.exit(1);
    }
    return scripts;
}
function runScripts(scripts) {
    try {
        //initalize contextobj
        const contextobj = {
            _:_,
            console:console
        };
        vm.createContext(contextobj);

        //add extra functions
        Object.assign(contextobj,dom);
        Object.assign(contextobj,r20.api.api);
        contextobj.postMessage = postMessage;
        vm.runInContext(r20.workers.init(contextobj,eval,_),contextobj);
        
        //clear out attribute cache
        Object.keys(attrs).forEach(k=>delete attrs[k]);

        //run sheet scripts
        for (i in scripts) {
            vm.runInContext(scripts[i],contextobj);
        }

        //yay
        log("\x1b[32mSuccessful compilation! :)");
    }
    catch (e) {
        log("ERROR:",e);
    }
}

//-- Helpers
function log(...params) {
    for (i in params) {
        if (typeof(params[i]) === "string") {
            params[i] = `\x1b[33m${params[i]}\x1b[0m`;
        }
    }
    console.log(...params);
}
function postMessage(message) {
    // TODO:
    // fill out this switch
    // return appropriate values to messageHandler
    // several front-end events can just be ignored (e.g. setCharmancerText)

    returned = {};
    switch(message.type) {
        case("attrlist"):
        break;
        case("setattrs"):
        break;
        case("attrreq"):
            for (i in message.data) {
                returned[i] = attrs[message.data[i]];
            }
        break;
    }
    messageHandler(returned);
}