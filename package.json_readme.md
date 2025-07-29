# Documentation for package.json

Comments aren't allowed in JSON files, so this file is for documenting package.json.

1. "sharp" -- required by NextJS. See: https://nextjs.org/docs/messages/sharp-missing-in-production
1. "csstype": "<3.1.3" -- see https://github.com/emotion-js/emotion/issues/3136 and
   https://github.com/frenic/csstype/issues/189 for the issues with version 3.1.3 of this library
1. "jose": "4.15.5" -- fixes vulnerability. Required by next-auth.
