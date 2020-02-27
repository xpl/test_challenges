import { fetchAPI } from '../base/api'

export function initFeedUpdater ({
                    newItemsUpdateInterval = 2000,
                    shouldUpdateEarlierItems,
                    onItemsPrepended,
                    onItemsAppended,
                    onDoneLoadingEarlierItems } = {}) {

  let latestId
  let earliestId

  async function fetchItems (params) {

    const items = await fetchAPI ('api', { count: 50, ...params })

    if (items.length) {
      latestId   = Math.max (latestId   || -Infinity, items[0].id)
      earliestId = Math.min (earliestId ||  Infinity, items[items.length - 1].id)
    }

    return items
  }

  // This gets called each 2s (as specified)
  ;(async function loadMoreLatestItems () {
    onItemsPrepended (await fetchItems ({ afterId: latestId }))
    await checkIfNeedToResetAndReloadThePage (latestId) // NB: This is just for the development/demoing convenience, not a production feature :)
    setTimeout (loadMoreLatestItems, newItemsUpdateInterval)
  }) ()

  // This gets called when we are nearby the bottom of the page (the behavior is injected via the shouldUpdateEarlierItems() callback)
  ;(async function loadMoreEarlierItems () {
    if (shouldUpdateEarlierItems ()) {
      const items = await fetchItems ({ beforeId: earliestId })
      if (items.length) onItemsAppended (items)
      else {
        onDoneLoadingEarlierItems ()
        return // prevents itself from re-scheduling
      }
    }
    setTimeout (loadMoreEarlierItems, 50)
  }) ()
}

async function checkIfNeedToResetAndReloadThePage (latestId) {
    if (latestId > 10000) {
      await fetchAPI ('reset') // Reset the feed
      window.location.reload ()
    }
}