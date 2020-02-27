import './style'
import { initFeedUpdater } from './updater'

import { render } from '../base/dom'
import { renderCircularLoader } from '../circular-loader'

export function renderFeed ({ updateInterval = 2000 } = {}) {

  let feedEl, newItemsEl, itemsContainerEl, itemsEl, loaderEl

  // I know, the formatting is a bit wacky here — I was just having fun :)
  //
  feedEl          = render ('.feed', {}, [
  newItemsEl        = render ('.feed-items-new'),
  itemsContainerEl  = render ('.feed-items-container', {}, [
  itemsEl             = render ('.feed-items'),
  loaderEl            = render ('.feed-loader', {}, [renderCircularLoader ()])
                    ])
                  ])

  let pendingNewItems = []

  initFeedUpdater ({

    // This comes from the specification...
    newItemsUpdateInterval: 2000,

    // Newly fetched items (coming each ~2s in batches)
    onItemsPrepended (items) {
      pendingNewItems = [...items, ...pendingNewItems]
    },

    // Old items
    shouldUpdateEarlierItems () {
      return hasScrolledFarEnoughToTheBottom ()
    },
    onItemsAppended (items) {
      for (const item of items) itemsEl.appendChild (renderFeedItem (item))
    },
    onDoneLoadingEarlierItems () {
      loaderEl.remove ()
    },
  })

  let appendTransitionActive = false

  ;(function pullNextPendingItem () {

    if (pendingNewItems.length && !appendTransitionActive && !hasScrolledFarEnoughFromTheTop ()) {

      // Append new items to a separate container first
      newItemsEl.appendChild (renderFeedItem (pendingNewItems.pop ()))

      // Trigger the transition...
      appendTransitionActive = true
      itemsContainerEl.style.transform = `translateY(${newItemsEl.offsetHeight}px)`
      
      // ...wait until it ends...
      itemsContainerEl.addEventListener ('transitionend', () => {

        // ...move newly added items to the main container
        for (const el of [...newItemsEl.children].reverse ()) {
          itemsEl.insertBefore (el, itemsEl.children[0] || null)
        }

        // ...reset the transform of the container
        itemsContainerEl.style.transitionProperty = 'none' // disable transition to apply the transform instantaneously
        itemsContainerEl.style.transform = ''          
        itemsContainerEl.getBoundingClientRect ()          // force reflow
        itemsContainerEl.style.transitionProperty = ''     // re-enable transition back
        
        appendTransitionActive = false
      }, { once: true }) // NB: once
    }
    setTimeout (pullNextPendingItem, 10)
  }) ()

  function hasScrolledFarEnoughFromTheTop () {
    const feedTop = feedEl.getBoundingClientRect ().top / window.innerHeight
    return feedTop < -0.5 // threshold distance = 0.5 screens from the top
  }

  function hasScrolledFarEnoughToTheBottom () {
    const loaderTop = loaderEl.getBoundingClientRect ().top / window.innerHeight
    return loaderTop < 1.5 // threshold distance = 1.5 screens from the top
  }

  return feedEl
}

function renderFeedItem ({ image, id, text, username, timeStamp }) {

  return render ('.feed-item', {}, [
    render ('.pic', { style: { backgroundImage: `url(${image})` } }),
    render ('.content', {}, [
      render ('.user', {}, [username]),
      render ('.text', {}, [text])
    ])
  ])
}
