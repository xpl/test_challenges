const { entries } = Object

// A little helper for making API requests!
export async function fetchAPI (path, params={}) {
  const urlBase = 'https://magiclab-twitter-interview.herokuapp.com/vitaly/'
  while (true) {
    try {
      return await fetch (urlBase + [path, queryString (params)].join ('?')).then (x => x.json ())
    } catch (e) {
      // console.error (e) // do nothing and repeat...
    }
  }
}

// makes key1=value1&key2=value2 thing
function queryString (params) {
  return entries (params)
            .filter (kv => kv[1] !== undefined) // NB: drops things like { key: undefined }
            .map (pair => pair.map (encodeURIComponent).join ('='))
            .join ('&')
}