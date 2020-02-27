'use strict'

// Методы из background.js
const backgroundPage = chrome.extension.getBackgroundPage ()

const $ = document.querySelector.bind (document)

/*  -------------------------------------------------------------------------------------   */

function stateUpdated ({ authToken, userProfile, isLoggingIn, loginError }) {
        
    $('.demo-page').classList.toggle ('demo-page_busy', isLoggingIn)
    $('.demo-page').classList.toggle ('demo-page_not-logged-in', !authToken)

    if (userProfile) {
            
        const { name, email, picture } = userProfile
        
        $('.user-profile__name').innerText  = name
        $('.user-profile__email').innerText = email
        $('.user-profile__picture').style.backgroundImage = 'url(' + picture + ')'
    }
    
    $('.demo-page__error').innerText = loginError || ''
}

stateUpdated (backgroundPage.getState ())

chrome.runtime.onMessage.addListener (msg => {

    if (msg.type === 'state_updated') stateUpdated (msg.state)
})

/*  -------------------------------------------------------------------------------------   */

$('.demo-page__login-btn') .addEventListener ('click', () => onLoginClicked ())
$('.demo-page__logout-btn').addEventListener ('click', () => onLogoutClicked ())

async function onLoginClicked () {

    backgroundPage.updateState ({ isLoggingIn: true, loginError: null })

    try {
            
        // Получаем одноразовый код от гитхаба (на этом этапе вылезет окно логина, если мы еще не были залогинены в гитхабе)
        const authCode = await getAuthCodeFromGitHub ()

        // NB: тут у нас возникает проблемка — сраный Chrome уничтожает popup после закрытия окна логина, и это последнее, что
        //     мы успеваем выполнить перед тем как скрипт перестанет выполняться. Мы не можем здесь сделать fetch api/login,
        //     потому что его коллбек не будет вызван — popup перестанет существовать раньше. Поэтому мы вынуждены продолжить
        //     выполнение (вызовы /api/login и /api/profile) в background-скрипт, и заодно вынести туда весь state management...
        //
        await backgroundPage.login (authCode)

    } finally {
        backgroundPage.updateState ({ isLoggingIn: false })
    }
}

function onLogoutClicked () {
    backgroundPage.logout ()
    window.close ()
}

/*  -------------------------------------------------------------------------------------   */

function getAuthCodeFromGitHub () {

    return new Promise ((resolve, reject) => {

        const clientId    = 'c9aa1784cbbf6fe23924'
        const redirectURL = chrome.identity.getRedirectURL ()
        const scope       = 'user:email'
                
        chrome.identity.launchWebAuthFlow ({
            url: `https://github.com/login/oauth/authorize/?client_id=${clientId}&redirect_uri=${redirectURL}&scope=${scope}`,
            interactive: true

        }, responseURL => {

            if (responseURL) {
                resolve (responseURL.match (/code=([^&]+)/)[1])
            } else {
                reject (new Error ('GitHub auth failed'))
            }
        })
    }) 
}