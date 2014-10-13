"use strict";
var lPath = require("path");
var lGlobule = require("globule");
var lFileSystem = require("fs");
var lGulpUtility = require("gulp-util");
var lThrough = require("through2");
var lExecuteSynchronous = require("execSync");

var cPluginError = lGulpUtility.PluginError;
var sModuleName = lGulpUtility.colors.magenta("gulp-hotswap-java:");

/*
	gulp-hotswap-java
	
	A fairly simple call of a Java hotswap agent to hot swap classes on a JVM (connected to by socket).
	This includes some helper functions to find Java on the system. At first glance, this seems pretty needless.
	However, tests with Windows have shown that even when on the path after a default install, a Java call will tank.
	
	Typical caveats for hot swapping apply:
		* This won't be able to connect to your JVM if another debugger is hooked up
		* This won't swap classes that have had their method signatures change	
*/

module.exports = function (oOptions) {
	/*
		searchPath
	
		Searches an array of base paths for a glob.
	*/
	function searchPath(aPaths, asSearch) {
		for (var i = 0; i < aPaths.length; i++) {
			var sPath = aPaths[i];
			var aPossibleMatches = lGlobule.find({src: asSearch, srcBase: sPath} );
			if (aPossibleMatches.length < 1) { continue; }
			var sPossibleMatch = lPath.join(sPath,aPossibleMatches[0]);
			if (lFileSystem.lstatSync(sPossibleMatch).isDirectory()) { continue; }
			return sPossibleMatch;
		}
	}
	/*
		findJava
	
		Quick search across program files and path to find java.
		Note that doing searches with short paths and looping is much, much faster than doing a
		massive globule find off of the root of the file system.
	*/
	function findJava () {
		var sPathJava = undefined;
		
		// if we're on windows, search program files (as those aren't actually on the PATH)
		if (process.platform === "win32") {
			var aPrograms = [ process.env["ProgramW6432"], process.env["ProgramFiles(x86)"] ];
			sPathJava = searchPath(aPrograms, ["java/**/bin/java.exe"]);
		}
		if (sPathJava) { return sPathJava; }
	
		// if we're on Mac or *nix or couldn't find java in Windows Program files, then try to find in path
		var sPaths = process.env["PATH"];
		var aPaths = sPaths.split(lPath.delimiter);
		sPathJava = searchPath(aPaths, ["java.exe", "java.sh", "java"]);
		if (sPathJava) { return sPathJava; }	
		
		if (typeof process.env["JAVA_HOME"] !== "string") { throw new cPluginError("gulp-hotswap-java",  "hot swap couldn't find java"); };
		return lPath.join(process.env["JAVA_HOME"],"bin","java");
	}
	
	// basic option setup
	oOptions = oOptions || {};
	oOptions.host = oOptions.host || "localhost";
	oOptions.port = oOptions.port || "9000";
	oOptions.debug = oOptions.debug || false;
	
	// java fix-up and configuration
	if (typeof oOptions.java !== "string") {
		oOptions.java = findJava();
	}
	
	// whatever we get back, we need to quote it to avoid pesky path spaces
	oOptions.java = "\"" + oOptions.java + "\"";
	
	// quick and dirty debug
	if (oOptions.debug) {
		lGulpUtility.log(sModuleName, "using java at " + oOptions.java);
	}
	
	// then add on some common options
	oOptions.java += " -Dhost=" + oOptions.host;
	oOptions.java += " -Dport=" + oOptions.port;
	
	return lThrough.obj(function (fsFile, sEncoding, fCallback) {
		// check for potentially deleted files
		if (fsFile.isNull()) {
			return fCallback(null, fsFile);
		}
		
		// just making these clearer
		var sBasePath = fsFile.base;
		var sFilePath = fsFile.relative;
		var sFileName = lPath.basename(fsFile.path);
		
		// TODO - for  now this is just a simple command put in place. The Java program will take multiple file arguments
		//		as files relative to the base globbing path and so could be more efficiently used
		var sJavaCommand = oOptions.java;
		sJavaCommand += " -Dpath=" + sBasePath;
		
		// finally add on the hotswap jar to use and the file path that will get hotswapped
		sJavaCommand += " -jar " + __dirname + lPath.sep + "hotswap.jar ";
		sJavaCommand += sFilePath;		
		
		// a quick and dirty debug
		if (oOptions.debug) {
			lGulpUtility.log(sModuleName, "attempting to hot swap " + sFileName + " on " + oOptions.host + ":" + oOptions.port);
		}
						
		// run the java program to do the hotswap
		var oResult = lExecuteSynchronous.exec(sJavaCommand);
		if (oResult.code > 0) { 
			var sException = "with exit code " + oResult.code;
			if (oOptions.debug) { sException += "\n\n" + oResult.stdout; }
			lGulpUtility.log(sModuleName, lGulpUtility.colors.red("hot swap failed for " + sFileName + " " + sException));
		}
		else {
			lGulpUtility.log(sModuleName, "hot swap successful for " + sFileName);
		}
		
		return fCallback(null, fsFile);
	});
};
