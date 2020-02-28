import Redis           from 'redis'      // a widely used high performance Redis client
import http            from 'http'       // the built-in Node http server
import { performance } from 'perf_hooks' // a built-in high-resolution timer
import { red, green }  from 'ansicolor'  // ANSI colored output (I maintain the module :)
import makeLRUCached   from './LRU'      // our ad-hoc LRU cache implementation

import { justDieOnAnyError, readEnv } from './util' // a bit of boilerplate...

//  -----------------------------------------------------------------------------------

justDieOnAnyError () // ...and let the orchestrator handle the restart

const env = readEnv ({

    // NB: all vars are mandatory
    REDIS_HOST:       String,
    PROXY_PORT:       Number,
    CACHE_MAX_TTL_MS: Number,
    CACHE_MAX_KEYS:   Number
})

console.log ('Redis Caching Proxy is starting', env)

//  -----------------------------------------------------------------------------------

class HttpError extends Error { constructor (code, msg) { super (msg); this.code = code } }

//  -----------------------------------------------------------------------------------

const redis = (function initRedis () {
    
    let isConnected = false

    function setConnected (yes, reason) {
        console.log ((yes ? green : red) (`Redis connected: ${reason || yes}`))
        isConnected = yes
    }

    const client = Redis.createClient ({
        host: env.REDIS_HOST,
        retry_strategy: options => Math.min (options.attempt * 100, 1000) // always reconnect (with a simple backoff)
    })

    client.on ('ready', ()   => { setConnected (true) })
    client.on ('error', opts => { setConnected (false, opts.error && opts.error.code) })
    client.on ('end',   ()   => { setConnected (false, 'connection closed') })

    return {

        get (key) {

            return new Promise ((return_, throw_) => {

                if (!isConnected) {

                /*  NB: don't await until Redis is available, because that could lead to lots of hanging connections,
                        so let the client handle the error, be "dumb" and don't overengineer things!                   */

                    throw_ (new HttpError (503, 'Redis is unavailable'))

                } else {
                                        
                    client.get (key, (err, val) => {
                        if (err)               throw_  (new HttpError (502, 'Redis responded with an error'))
                        else if (val === null) throw_  (new HttpError (404, 'No such key'))
                        else                   return_ (val)
                    })
                }
            })
        }
    }
}) ()

//  -----------------------------------------------------------------------------------

const redisCachedGet = makeLRUCached (env.CACHE_MAX_KEYS, env.CACHE_MAX_TTL_MS, redis.get)

//  -----------------------------------------------------------------------------------

const server = http.createServer (async function onRequest ({ url, method }, response) {
    
    const timestamp = performance.now () // the measurement is needed for the "processes concurrent requests in parallel" test

    try {

        const key = decodeURIComponent (url.slice (1))

        if (method === 'GET') respondWith         (200, await redisCachedGet (key))
        else                  throw new HttpError (405, 'Only GET is supported')

    } catch (e) {
        if (e instanceof HttpError) {
            respondWith (e.code, e.message)

        } else {
            console.error (e)
            respondWith (500, 'Internal error')
        }
    }

    function respondWith (code, text) {
        response.writeHead (code, { 'Content-Type':  'text/plain',
                                    'X-Time-Started': String (timestamp),
                                    'X-Time-Ended':   String (performance.now ()) }).end (text)
    }
})

server.listen (env.PROXY_PORT, e => { if (e) throw e }) // let's just die if it fails