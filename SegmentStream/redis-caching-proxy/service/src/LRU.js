/*  Fun fact: I was preparing for a Yandex interview recently, and this was one of
              the assignments that I've been cracking on. So the code here is
              maybe not the best, but it's highly authentic, lol :)                       */

export default function makeLRUCached (maxKeys, maxTTL, getFn) {

    const map  = new Map () // works slightly faster than a plain object!
    const list = DoublyLinkedList ()
 
    return async x => {
 
        let cached = map.get (x)

        if (cached === undefined || (Date.now () - cached.timestamp) > maxTTL) {
            map.set (x, cached = { key: x, timestamp: Date.now (), value: await getFn (x) })
        }

        list.prepend (cached)

        if (list.length > maxKeys) map.delete (list.pop ().key) // Evicts!

        return cached.value
    }
}

//  -----------------------------------------------------------------------------------

function DoublyLinkedList () {

    let head   = null
    let tail   = null
    let length = 0

    function unlink (node) {

        if (node.next || node.prev) length--

        if (node.next) node.next.prev = node.prev
        if (node.prev) node.prev.next = node.next

        if (node === head) head = node.next
        if (node === tail) tail = node.prev

        node.next = null
        node.prev = null

        return node
    }

    function prepend (node) {

        if (node === head) return
        if (head) head.prev = unlink (node)
        node.next = head
        head = node
        tail = tail || node
        length++
    }

    return {
        prepend,
        pop () { return unlink (tail) },
        get length () { return length }
    }
}

//  -----------------------------------------------------------------------------------
