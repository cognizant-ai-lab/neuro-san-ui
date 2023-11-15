# Documentation for package.json

Comments aren't allowed in JSON files, so this file is for documenting package.json.

1. Why do we need echarts-gl? ECharts depends on it for 3D plots (but for some reason doesn't declare it as a dependency)
   Link (use Google translate!) https://blog.csdn.net/RubyLinT/article/details/109100726
1. These warnings on `yarn install`:
    ```
    warning @blueprintjs/core > popper.js@1.16.1: You can find the new Popper v2 at @popperjs/core, this package is dedicated to the legacy v1
    warning @blueprintjs/core > react-popper > popper.js@1.16.1: You can find the new Popper v2 at @popperjs/core, this package is dedicated to the legacy v1
    ```
    See: https://github.com/palantir/blueprint/issues/5500 and https://github.com/palantir/blueprint/wiki/Popover2-migration
    blueprintjs is in transition to 5.0. Once they release it and we migrate to that, it should be fine.
1. "sharp" -- required by NextJS. See: https://nextjs.org/docs/messages/sharp-missing-in-production
