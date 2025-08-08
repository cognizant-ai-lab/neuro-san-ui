const signIn = jest.fn()
const signOut = jest.fn()
const useSession = jest.fn()

// eslint-disable-next-line unicorn/prefer-module
module.exports = {signOut, useSession, signIn}
