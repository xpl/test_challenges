'use strict'

let state = {
    authToken: null,
    userProfile: null,
    loginError: null,
    isLoggingIn: false
}

function getState () {
    return state
}

function updateState (newProps) {
    state = { ...state, ...newProps }
    chrome.storage.local.set ({ authToken:   state.authToken })
    chrome.storage.local.set ({ userProfile: state.userProfile })
    chrome.runtime.sendMessage ({ type: 'state_updated', state })
}

chrome.storage.local.get ('authToken',   result => { updateState ({ authToken:   result.authToken }) })
chrome.storage.local.get ('userProfile', result => { updateState ({ userProfile: result.userProfile }) })

function logout () {
    updateState ({ authToken: null })
}

async function login (authCode) {

    updateState ({ isLoggingIn: true })

    try {
        
        // Отправляем этот одноразовый код в наш «сервис», где тот использует его для получения секретного access token,
        // который, в свою очередь, используется для получения инфы об аккаунте. Нам же возвращается постоянный токен уже от нашего сервиса
        const { authToken } = await fetch (`http://localhost:31337/api/login?provider=github&code=${authCode}`, { method: 'post' }).then (x => x.json ())

        // Получаем профиль пользователя из апи нашего сервиса, используя авторизационный токен
        const userProfile = await fetch (`http://localhost:31337/api/profile?authToken=${authToken}`).then (x => x.json ())

        updateState ({ authToken, userProfile })

    } catch (e) {
        updateState ({ loginError: e.message })

    } finally {
        updateState ({ isLoggingIn: false })
    }
}