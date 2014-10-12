# gulp-hotswap-java
=================

Hotswap Java class files via a debug port

## Overview

This module allows you to pass changed class files through it in order to swap them on a running JVM. Presently, this only includes connection via socket (not shared mem). This is still in alpha, as I did not test drive it like a good developer. It has only been tested on Windows, though it was built using the path module to help with cross-platform needs.

Typical caveats for hot swapping apply:

- This will not be able to connect to a JVM that has a debugger already attached
- This will not be able to hot swap a class that has had its method signatures change (methods added/deleted or arguments changed)


## Getting Started
Install the module with: `npm install gulp-hotswap-java`

```javascript
var lHotSwapJava = require('gulp-hotswap-java');
...
  .pipe(lHotSwapJava())
...
```

## Documentation

### Usage
When used in a pipe, will attempt to hot swap the file that gets passed in to it.

```js
lHotSwapJava()
lHotSwapJava({options})
```

Here are the `options` and their defaults:

* `host` This is used to specify what host the JVM is on. Default (string): "localhost"
* `port` This is used to specify what port the JVM is listening on. Default (string): "9000"
* `debug` This is used to specify if the module should debug basic information. Default (boolean): false
* `java` This is used to specify what local java binary to use. Default (string): if on Windows, Program Files directories are globbed, then PATH is searched, then JAVA_HOME is referenced.

## Examples

Given a code output directory of C:\code\target\classes, here is a typical gulp file, utilizing the [gulp-watch][] module. Note that class with $ are filtered out by the underlying [globule][] module :

[globule]: https://github.com/cowboy/node-globule
[gulp-watch]: https://github.com/floatdrop/gulp-watch

```js
var lGulp = require("gulp");
var lWatch = require("gulp-watch");
var lHotSwapJava = require("gulp-hotswap-java");

var sBasePath = "/code/target/classes/"
var sSourcePath = "**/*.class";

lGulp.task("watch", function () {
    return lWatch([sSourcePath,"!**/*$*.class"], {cwd: sBasePath})
		      .pipe(lHotSwapJava());
});

```

Here is the same example, but with a passed in Java:
```js
...
var sJavaPath = "C:\\dev\\java\\bin\\java.exe";

lGulp.task("watch", function () {
    return lWatch([sSourcePath,"!**/*$*.class"], {cwd: sBasePath})
		      .pipe(lHotSwapJava(java: sJavaPath));
});

```

And with a changed host and port:
```js
...
lGulp.task("watch", function () {
    return lWatch([sSourcePath,"!**/*$*.class"], {cwd: sBasePath})
		      .pipe(lHotSwapJava(host: "127.0.0.1", port:"9001"));
});

```

## Under the hood
The module uses [globule][] and [execSync][]. It uses globule to search for Java on the system, and uses execSyc to kick off the Java program that connects to the JVM.

The hot swapping library itself (github link coming soon), utilizes [hotswap-ant][], a great little Java library that connects to a JVM via a socket and swaps out the files using JDI. At present, the hotswap.jar included in the module has a stripped down version of the JDK 1.6 tools.jar classes to assist in the hot swap.

[hotswap-ant]: https://code.google.com/p/hotswap
[execSync]: https://github.com/mgutz/execSync

## License
Copyright (c) 2014 Ben Brewer
Licensed under the MIT license.
