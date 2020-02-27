import { red } from 'ansicolor'

export function justDieOnAnyError () {

    function onUncaughtException (e) {
        console.error (red.bright (e && (e.stack || e.toString ())))
        process.exit (1)
    }
    
    process.on ('uncaughtException',  onUncaughtException)
    process.on ('unhandledRejection', onUncaughtException)
}

export function readEnv (spec) {
    return Object.fromEntries (
            Object.entries (spec).map (
                ([k, type]) => [k, k in process.env
                                    ? type (process.env[k])
                                    : (() => { throw new Error (`${k} is not specified!`) }) ()]))
}
