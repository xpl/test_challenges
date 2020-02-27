// Имитация базы данных — тупо херачим в JSON-файлик

const fs = require ('fs')

const defaults = {
    users: {},
    sessions: {}
}

const db = (() => { try { return JSON.parse (fs.readFileSync ('./db.json', 'utf-8')) } catch (e) { return defaults } }) ()

function write () {
    fs.writeFileSync ('./db.json', JSON.stringify (db, null, 4), 'utf-8')
}

module.exports = {

    ...db,

    getAllData () {
        return db
    },

    getUserProfile (email) {
        return db.users[email]
    },

    updateUserProfile (email, info) {
        db.users[email] = { ...db.users[email], ...info }
        write ()
    },

    getSession (id) {
        return db.sessions[id]
    },

    setSession (id, email) {
        db.sessions[id] = email
        write ()
    }
}