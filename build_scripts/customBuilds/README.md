# Motivation
For business and usability reasons, it is sometimes desirable to create a custom build of the application that
includes and excludes specified features. Some users may only want part of the application, and some contracts may
only allow access to certain features of the application.

# About Custom Builds
"Custom builds" are a feature of this project that allow you to create a build of the project with a subset of the 
features and pages. By specifying a particular build target, only certain pages will be included in the final build
and thereby in the final Docker image. In addition, setting a custom build target causes certain parts of the 
application to behave differently at runtime, for example, showing or hiding certain buttons and menu options 
depending on the build target chosen.

For example, you might want to create a build that only includes the Neuro-san/MAA UI part of the application and
excludes other features. This is possible with the customer builds feature.

If you do not specify a custom build target, the default build target is used which includes the entire application.

It is anticipated that custom builds will be handled via "set-and-forget" in CI. This README is to give you some
more in-depth information in case you need to troubleshoot or understand the process better, or create your own custom
build.

## Using Custom Builds
The environment variable `BUILD_TARGET` is used both at build time and runtime to create custom builds.

### Build time
Normally, this procedure would be performed automatically by CI, but if you need to perform it manually for whatever
reason, use these instructions.

1. Choose one of the custom builds from the `build_scripts/customBuilds` directory. The file names are in the format
`customBuildName.txt`, for example, `neuroSan.txt`. In this case your custom build is `neuroSan`. This is the value
you will use later for `BUILD_TARGET`.
1. Ensure your working directory is clean with no local modifications
    ```bash
    git status
    ```
    This is required because the build process will modify your working directory to remove the files and directories
    that are not part of the custom build.
1. Run the command to prepare your working directory for the build:
    ```bash
    BUILD_TARGET=<your_custom_build_name> ./build_scripts/customBuilds/prune_working_dir.sh
    ```
1. Now you can build the project as you normally would. For example, if you are using Docker, you can run:
    ```bash
    docker build --build-arg BUILD_TARGET=<your_custom_build_name> <other Docker build options> .
    ```
You should now have a Docker image containing the requested custom build. You can reset your working directory using:
```bash
git reset --hard HEAD
```

### Runtime
The custom build target is set at runtime using the environment variable `BUILD_TARGET`. This can be done either in
"dev" mode or in "production mode", for example using the previously-created Docker build.

#### Dev mode
Sample command line:
```bash
UNILEAF_VERSION=$(git branch --show-current) DEBUG=_none BUILD_TARGET="neuroSan" yarn run dev
```
The application starts and you can connect to it on the default port. Verify that it is working as expected and 
only contains the items expected in your custom build.

Note that the application shows the custom build version in the title bar where the usual app version is shown, for 
example:
```text
Build: DS-separate-builds (myCustomBuild)
```
where `myCustomBuild` is the name of the custom build you specified in `BUILD_TARGET`.

#### Production mode
Sample command line:
```bash
docker run -p 3000:3000 -e BUILD_TARGET="neuroSan" <your_docker_image_name>
```
The Docker process starts and you can connect to it on the default port. Verify that it is working as expected and
only contains the items expected in your custom build.

## Creating Custom Builds (advanced)
If you want to create your own custom build, you can do so by creating a new file in the `build_scripts/customBuilds`
directory. The file should be named `customBuildName.txt`, for example, `myCustomBuild.txt`. The contents of the file
should be a list of the files and directories that you want to _exclude_ from the custom build.

### Format of the custom build file
The file should contain a list of files and directories to exclude from the custom build. The format is as follows:
```text
# This is a comment
# Blank lines are ignored:

# Exclude a file
fileToExclude.ts
# Exclude a directory
directoryToExclude/
```
Note that wildcards and globs are _not_ currently supported.

### Using the custom build file
Once you have created your custom build file, you can use it to create a custom build by following the instructions
in the previous section, using the name of your file without the `.txt` extension as the value for `BUILD_TARGET`.

## FAQ
### Why do I need to prune my working directory?
The custom build process modifies your working directory to remove files and directories that are not part of the 
custom build. This solution is necessary because NextJS has strict, opinionated defaults about app layouts, and in 
particular anything under `pages` is precompiled by NextJS as part of the build process. Therefore, it is not enough
to just exclude files from webpack, they also need to be removed from the working directory.

### Why do I need to reset my working directory?
You don't. It's up to you what you want to do with it after the build is complete.

### Why do I need to set the `BUILD_TARGET` environment variable?
The `BUILD_TARGET` environment variable is used to specify the custom build target at both build time and runtime.

### Why do I need to set the `UNILEAF_VERSION` environment variable?
The `UNILEAF_VERSION` environment variable is used to specify the version of the application at build time. This is
unrelated to custom builds.

### Why can't I use wildcards in the custom build file?
The custom build process uses a simple text file to specify the files and directories to exclude from the custom build.
This is a simple solution that works for most cases. Wildcards may be supported in a future version.

### How should I name my custom builds?
Camel case is recommended as it is a common convention in the JavaScript community. For example, `myCustomBuild`.

### Why do I need to specify `BUILD_TARGET` both at build time and runtime?
At build time, `BUILD_TARGET` is used by the prune script to determine which files and directories to exclude from the
build. At runtime, `BUILD_TARGET` is used to determine which features (buttons, menu items, widgets etc.) to show
and hide in the application. At build time, `BUILD_TARGET` acts on a coarser level, excluding entire files and 
directories; at runtime, `BUILD_TARGET` acts on a finer level, showing and hiding individual features.
