import fetch from 'node-fetch'
import Redis from 'redis'

import { readFileSync } from 'fs'
import { promisify }    from 'util'

const { fromEntries, assign } = Object

//  -----------------------------------------------------------------------------------

export const env = {
    
    ...fromEntries (readFileSync ('.env', 'utf8').split ('\n').map (x => x.split ('='))), // docker-compose .env vars
    ...process.env                                                                        // cmdline overrides
}                                                                      

//  -----------------------------------------------------------------------------------

export const proxy = {
            
    async get (key) {

        const r = await proxy.fetch (encodeURIComponent (key))

        if (r.status !== 200) throw assign (new Error (await r.text ()), { httpStatus: r.status })
        else                  return r.text ()
    },

    fetch: path => fetch (`http://${env.PROXY_HOST}:${env.PROXY_PORT}/${path}`),
}

//  -----------------------------------------------------------------------------------

export function connectToRedisFromTestsRunner () {

    const client = Redis.createClient ({ host: env.REDIS_HOST })
                        .on ('error', () => { throw new Error ("oh noes... where's redis?") })

/*  Attach to Mocha test runner    */

    before (done => { client.on ('ready', () => { done () }) })  // suspends tests until connected
    after  (()   => { client.end (true) })                       // forcibly exits not caring about further commands

/*  Public methods */

    return { set: promisify (client.set.bind (client)) }
}

//  -----------------------------------------------------------------------------------

export const longRunningTest = f => function (...args) { this.timeout (15000); return f.apply (this, args) }

export const sleep = ms => new Promise (resolve => setTimeout (resolve, ms))

export const randomStr = () => Math.random ().toString (36).substring (2)

//  -----------------------------------------------------------------------------------