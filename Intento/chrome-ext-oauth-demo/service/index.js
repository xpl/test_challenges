const fetch   = require ('node-fetch')
const express = require ('express')
const app     = express ()
const log     = require ('ololog').handleNodeErrors ().noLocate
const db      = require ('./db')
const crypto  = require ('crypto')

const OAUTH_KEYS = {

    github: {
        client_id: 'c9aa1784cbbf6fe23924',
        secret:    'b9402f1d10d16e78265b7562b0662ae77aa184ca'
    }
}

app.post ('/api/login', async (req, res) => {

    res.header ('Access-Control-Allow-Origin', '*')

    const { provider, code } = req.query

    log.magenta (`Obtaining access token + user info from ${provider} using an one-time auth code: ${code}`)

    const { client_id, secret } = OAUTH_KEYS[provider] || {}

    if (provider === 'github') {

        const { access_token } = log.blue (await fetch (`https://github.com/login/oauth/access_token?client_id=${client_id}&client_secret=${secret}&code=${code}`, {

            method: 'post',
            headers: { Accept: 'application/json' }

        }).then (x => x.json ()))

        // Authorized GitHub API access
        const ghFetch = url => fetch (url, { headers: { Authorization: 'token ' + access_token } }).then (x => x.json ())

        // Fetch user profile
        const { name, login, avatar_url } = log (await ghFetch ('https://api.github.com/user'))

        // NB: GitHub's api/user doesn't return the email if the user turned off the email visibility...
        //     ...but this API returns the email addresses regardless of that setting!
        //
        const emails = log.cyan (await ghFetch ('https://api.github.com/user/emails'))
        const { email } = emails.find (x => x.primary) || emails[0]

        const id = crypto.randomBytes (20).toString ('hex')

        db.setSession (id, email)
        db.updateUserProfile (email, { email, name: name || login, picture: avatar_url })

        res.json ({ authToken: id })

    } else {
        throw new Error (`unsupported OAuth provider: ${provider}`)
    }
})

app.get ('/api/profile', async (req, res) => {

    res.header ('Access-Control-Allow-Origin', '*')

    log.magenta ('Fetching user profile', req.query)

    const { authToken } = req.query
    const email   = db.getSession (authToken)
    const profile = email && db.getUserProfile (email)

    if (profile) {
        res.json (profile)
    
    } else {
        log.red ('DB state:', db.getAllData ())
        throw new Error ('invalid session: ' + authToken)
    }
})

app.listen (31337, () => {
    
    log.bright.green ('Demo Service is running at port 31337')
})