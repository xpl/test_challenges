# Badoo Test Challenge (by [Vitaly Gordon](https://www.linkedin.com/in/xpl/))

**NB:** it auto-resets (by calling the `/reset` endpoint) when reaching 10k items, for the development convenience. So at the very first load it could flicker with a page reload — that is not a bug!

#### 👉👉👉 https://codesandbox.io/s/thirsty-bush-rhk9o

Screencast (for the reference):

<a href="https://youtu.be/8163z7a4a2Y"><img width="640" alt="Youtube" src="https://user-images.githubusercontent.com/1707/74883699-94787e80-5382-11ea-985d-4ae8fc3d3115.png"></a>

# Remarkable Features

- It has **infinite scrolling** with auto-loading of the old items when we scroll far enough to the bottom of the page

- API polling and the view updating are **two distinct asynchronous processes**:

  - We read new tweets from the API **in batches** with **2 seconds intervals** (as specified)

  - ...but on the "view" side, we append those new tweets **one-by-one** (as it looks much fancier) as fast as our animation allows that (0.25s intervals)!

    - **NB:** on the server side, new items are added so quickly that it looks quite scary, but I have intentionally kept the animation interval small to showcase the high performance animation capabilities.
      In a real project I would've implemented it some other way, to keep the CPU usage low and to avoid distracting users with the constant rapid-fire popping of new items! So the breakneck speed is purely for the tech demoing purposes, keep it in mind please!
      
    - **If it burns your CPU too hard**, you can tweak it down in `feed/style.css` (`--new-items-appear-speed`)

- Newly loaded items are auto-prepended **only when we have scrolled to the top** of the page

  - Otherwise it would have had a terrible UX — newly added items would've constantly pushed everything to the bottom, making us unable to read anything below that.

- **High-performance animation** of items adding

  - New items added to a separate absolute-positioned element first (so its animation doesn't affect other items)
  - Old items shifted down **as a group** using CSS transform (which is hardware-accelerated)
  - When the animation ends, we transfer new items to the old items container
  - Repeat until there are no more newly loaded items

# On Architecture

1. It **doesn't use any framework** — as I wanted to showcase my expertise in building things "from scratch"!
2. ...but in a real project I would've probably wrapped the component using an existing library/framework
3. Initially I wanted to code an additional version of the test challenge using TS + React, but I ran out of time :)

### Directory structure

- **`base`**
  - **`api.js`** a helper for making API requests (`fetchAPI (path, params)`)
  - **`dom.js`** a tiny ~10 LOC `render` function for outputting DOM nodes declaratively
  
- **`circular-loader`** a component that renders a nice-looking spinning loader using CSS-animated SVG
  - **`index.js`**
  - **`style.css`**

- **`feed`** our Twitter-like feed component
  - **`index.js`** the "view" part (rendering, user interaction)
  - **`updater.js`** state management, API interaction (fetching new items, fetching old items)
  - **`style.css`**

- **`index.html`** HTML entry point
- **`index.js`** JS entry point
- **`index.css`** resets default browser styles

# Missing Things

- If it was a real project, I would've probably implemented a **virtual scrolling** feature — i.e. re-using a limited number of DOM elements to display what's contained in an area nearby the scroll position.
  This way I would've kept the memory footprint and the rendering times really small. But since our demo app is limited to 10k entries, it is not really required there + I also didn't have the time to implement it properly.
  
  Had I utilized a popular framework (e.g. React) I would've probably looked into re-using an existing virtual scrolling library, there are plenty of ones!
  
- There is no crossbrowser compatibility stuff whatsoever. I omitted that for the sake of simplicity. Chromium FTW! I also used `vw` as sizing units to avoid thinking about different screen sizes / layouts. So the whole UI scales proportionally when changing the window width. In a real project I would've probably put more labor into that...

- I haven't tested it on any other device/browser except Mac/Chrome. Sorry about that and let's hope that it runs well on your computer!