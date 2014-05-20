
// Copyright 2014 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

exports.setup = function() {
    var splunkjs        = require("../../index");
    var ET              = require("elementtree");
    var ModularInputs   = splunkjs.ModularInputs;
    var Logger          = ModularInputs.Logger;
    var ModularInput    = ModularInputs.ModularInput;
    var Event           = ModularInputs.Event;
    var EventWriter     = ModularInputs.EventWriter;
    var Scheme          = ModularInputs.Scheme;
    var Argument        = ModularInputs.Argument;
    var utils           = ModularInputs.utils;
    var testUtils       = require("./utils");

    splunkjs.Logger.setLevel("ALL");

    var TEST_SCRIPT_PATH = "__IGNORED_SCRIPT_PATH__";

    return {
        "ModularInput tests": {
            setUp: function(done) {
                done();
            },

            "ModularInputs logger works, severity: DEBUG": function(test) {
                var err = testUtils.getDuplexStream();
                try {
                    Logger.debug("Modular Input Tests", "Something happened!", err);
                    test.ok(utils.startsWith(err._read(), Logger.DEBUG));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },

            "ModularInputs logger works, severity: INFO": function(test) {
                var err = testUtils.getDuplexStream();
                try {
                    Logger.info("Modular Input Tests", "Something happened!", err);
                    test.ok(utils.startsWith(err._read(), Logger.INFO));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },

            "ModularInputs logger works, severity: WARN": function(test) {
                var err = testUtils.getDuplexStream();
                try {
                    Logger.warn("Modular Input Tests", "Something happened!", err);
                    test.ok(utils.startsWith(err._read(), Logger.WARN));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },

            "ModularInputs logger works, severity: ERROR": function(test) {
                var err = testUtils.getDuplexStream();
                try {
                    Logger.error("Modular Input Tests", "Something happened!", err);
                    test.ok(utils.startsWith(err._read(), Logger.ERROR));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },

            "ModularInputs logger works, severity: FATAL": function(test) {
                var err = testUtils.getDuplexStream();
                try {
                    Logger.fatal("Modular Input Tests", "Something happened!", err);
                    test.ok(utils.startsWith(err._read(), Logger.FATAL));
                }
                catch (e) {
                    test.ok(false);
                }
                test.done();
            },

            "An error happens when a ModularInput gets bad args": function(test) {
                // A script that returns a null scheme should generate no output on stdout
                // and an error on stderr saying that the scheme was null.

                exports.getScheme = function() {
                    return null;
                };
                
                exports.streamEvents = function() {
                    // Not used
                    return null;
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var args = [TEST_SCRIPT_PATH, "foobar"];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    var error = ew._err._read();
                    
                    test.ok(utils.startsWith(error, "ERROR Modular input Invalid arguments to modular input script:"));
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
            },

            "An error happens when a ModularInput has a null scheme": function(test) {
                // A script that returns a null scheme should generate no output on stdout
                // and an error on stderr saying that the scheme was null.

                exports.getScheme = function() {
                    return null;
                };
                
                exports.streamEvents = function() {
                    // Not used
                    return null;
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var args = [TEST_SCRIPT_PATH, "--scheme"];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    var error = ew._err._read();

                    test.strictEqual(error, "FATAL Modular input script returned a null scheme.\n");
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
            },

            "ModularInput properly generates Scheme": function(test) {
                // Check that a scheme generated by a script is what we expect.

                exports.getScheme = function() {
                    var scheme = new Scheme("abcd");
                    scheme.description = "\uC3BC and \uC3B6 and <&> f\u00FCr";
                    scheme.streamingMode = Scheme.streamingModeSimple;
                    scheme.useExternalValidation = false;
                    scheme.useSingleInstance = true;

                    var arg1 = new Argument("arg1");
                    scheme.addArgument(arg1);

                    var arg2 = new Argument("arg2");
                    arg2.description = "\uC3BC and \uC3B6 and <&> f\u00FCr";
                    arg2.dataType = Argument.dataTypeNumber;
                    arg2.requiredOnCreate = true;
                    arg2.requiredOnEdit = true;
                    arg2.validation = "is_pos_int('some_name')";
                    scheme.addArgument(arg2);

                    return scheme;
                };
                
                exports.streamEvents = function() {
                    // Not used
                    return null;
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var args = [TEST_SCRIPT_PATH, "--scheme"];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    var expected = utils.readFile(__filename, "../data/scheme_without_defaults.xml");
                    var output = ew._out._read();

                    test.ok(utils.XMLCompare(ET.parse(expected), ET.parse(output)));
                    test.strictEqual("", ew._err._read());
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
            },

            "ModularInput Input Validation succeeds": function(test) {
                exports.getScheme = function() {
                    return null;
                };

                exports.validateInput = function(definition, done) {
                    // Always succeed
                    done();
                };

                exports.streamEvents = function() {
                    // not used
                    return;
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var validationFile = utils.readFile(__filename, "../data/validation.xml");

                var inStream = testUtils.getReadableStream();

                var args = [TEST_SCRIPT_PATH, "--validate-arguments"];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);

                    test.strictEqual("", ew._out._read());
                    test.strictEqual("", ew._err._read());
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
                inStream.emit("data", new Buffer(validationFile));
            },

            "ModularInput Input Validation fails": function(test) {
                exports.getScheme = function() {
                    return null;
                };

                exports.validateInput = function(definition, done) {
                    done(new Error("Big fat validation error!"));
                };

                exports.streamEvents = function() {
                    // not used
                    return;
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var validationFile = utils.readFile(__filename, "../data/validation.xml");

                var args = [TEST_SCRIPT_PATH, "--validate-arguments"];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    test.ok(err);
                    var expected = utils.readFile(__filename, "../data/validation_error.xml");
                    var output = ew._out._read();

                    test.ok(utils.XMLCompare(ET.parse(expected).getroot(), ET.parse(output).getroot()));
                    test.strictEqual("", ew._err._read());
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
                inStream.emit("data", new Buffer(validationFile));
            },

            "ModularInput streaming events works": function(test) {
                exports.getScheme = function() {
                    return null;
                };

                exports.streamEvents = function(name, input, eventWriter, callback) {
                    var myEvent = new Event({
                        data: "This is a test of the emergency broadcast system.",
                        stanza: "fubar",
                        time: 1372275124.466,
                        host: "localhost",
                        index: "main",
                        source: "hilda",
                        sourcetype: "misc",
                        done: true,
                        unbroken: true
                    });

                    try {
                        eventWriter.writeEvent(myEvent);
                        callback(null);    
                    }
                    catch (e) {
                        callback(e);    
                    }
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var inputConfiguration = utils.readFile(__filename, "../data/conf_with_2_inputs.xml");

                var args = [TEST_SCRIPT_PATH];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);

                    var expected = utils.readFile(__filename, "../data/stream_with_two_events.xml");
                    var found = ew._out._read() + "</stream>";
                    
                    test.ok(utils.XMLCompare(ET.parse(expected).getroot(), ET.parse(found).getroot()));
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
                inStream.emit("data", new Buffer(inputConfiguration));
            },

            "ModularInput gets a valid Service": function(test) {
                exports.getScheme = function() {
                    return null;
                };

                exports.validateInput = function(definition) {
                    return false;
                };

                exports.streamEvents = function(name, input, eventWriter, callback) {
                    var service = ModularInput.service();
                    
                    test.ok(service instanceof splunkjs.Service);
                    test.strictEqual(service.prefix, this._inputDefinition.metadata["server_uri"]);
                    callback(null);
                };

                var out = testUtils.getDuplexStream();
                var err = testUtils.getDuplexStream();
                var ew = new EventWriter(out, err);

                var inStream = testUtils.getReadableStream();

                var inputConfiguration = utils.readFile(__filename, "../data/conf_with_2_inputs.xml");

                test.ok(!ModularInput._service);

                var args = [TEST_SCRIPT_PATH];
                ModularInput.runScript(exports, args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);
                    test.strictEqual("", ew._err._read());
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
                inStream.emit("data", new Buffer(inputConfiguration));
            }
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var test        = require('../../contrib/nodeunit/test_reporter');

    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}