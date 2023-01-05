// Miscellaneous utilities for dealing with browser tab title

export function getTitleBase(): string {

    const subdomain  = window.location.host.split('.')[0]
    return `${subdomain[0].toUpperCase()}${subdomain.substring(1)}`

}
