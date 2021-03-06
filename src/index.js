function apply (base, patch) {
  for (var index in patch) {
    var operation = patch[index]
    if (operation.op === 'add' || operation.op === 'replace') {
      if (operation.value === undefined) {
        throw new Error("Parameter 'value' required")
      }
      if (operation.path === '') {
        base = operation.value
        continue
      }
      addOrReplace(base, operation.path, operation.value, operation.op === 'replace')
    } else if (operation.op === 'remove') {
      remove(base, operation.path)
    } else if (operation.op === 'copy') {
      if (operation.from === undefined) {
        throw new Error("Parameter 'from' required")
      }
      var value = getValue(base, operation.from)
      if (value === undefined) {
        throw new Error("Location 'from' missing")
      }
      addOrReplace(base, operation.path, value, true)
    } else if (operation.op === 'move') {
      var removed = remove(base, operation.from)
      addOrReplace(base, operation.path, removed, true)
    } else if (operation.op === 'test') {
      if (operation.value === undefined) {
        throw new Error("Parameter 'value' required")
      }
      handleOperation(function (current, pathPart) {
        var key = Array.isArray(current)
          ? (pathPart === '-' ? current.length - 1 : pathPart)
          : pathPart

        var value = current[key]
        if (!compare(value, operation.value)) {
          throw new Error('string not equivalent')
        }
      }, base, operation.path)
    } else {
      throw new Error('Operation unknown')
    }
  }

  return base
}

function addOrReplace (base, path, value, replace) {
  handleOperation(function (current, pathPart) {
    if (Array.isArray(current)) {
      if (pathPart !== '-' && Number.isNaN(pathPart)) {
        throw new Error('Object operation on array')
      }
      var index = getAndCheckIndex(current, pathPart, 0)

      current.splice(index, replace ? 1 : 0, value)
    } else {
      current[pathPart] = value
    }
  }, base, path)
}

function remove (base, path) {
  return handleOperation(function (current, pathPart) {
    if (Array.isArray(current)) {
      var index = getAndCheckIndex(current, pathPart)
      return current.splice(index, 1)[0]
    } else {
      if (current[pathPart] === undefined) {
        throw new Error("Can't remove nonexistent field")
      }
      var ret = current[pathPart]
      delete current[pathPart]
      return ret
    }
  }, base, path)
}

function getValue (base, path) {
  return handleOperation(function (current, pathPart) {
    var key = Array.isArray(current) ? getAndCheckIndex(current, pathPart) : pathPart
    return current[key]
  }, base, path)
}

function handleOperation (handle, base, path) {
  if (!path.startsWith('/')) {
    throw new Error('Incorrect JSON Pointer token')
  }

  var current = base
  var splitPath = path.split('/')
  for (var i = 1; i < splitPath.length; i++) {
    var pathPart = splitPath[i].replace('~1', '/').replace('~0', '~')

    if (i === splitPath.length - 1) {
      return handle(current, pathPart)
    }

    if (current[pathPart] === undefined) {
      throw new Error('path ' + splitPath.slice(0, i + 1).join('/') + ' does not exist -- missing objects are not created recursively')
    }

    current = current[pathPart]
  }
}

function getAndCheckIndex (current, pathPart, offset) {
  offset = offset === undefined ? -1 : offset
  var index = pathPart === '-' ? current.length + offset : pathPart
  if (!/^\d+$/g.test(index)) throw new Error('Bad index')
  if (index < 0 || index > current.length + offset) {
    throw new Error('Out of bounds')
  }
  return index
}

/**
 * The following code does a comparison of objects. Javascript has no builtin way to do this. Since
 * "===" fails to understand { a: "foo", b: "bar" } === { b: "bar", a: "foo" }.
 * Taken from https://gist.github.com/nicbell/6081098#file-object-compare-js.
 */
function compare (obj1, obj2) {
  // Loop through properties in object 1
  for (var p in obj1) {
    // Check property exists on both objects
    if (Object.prototype.hasOwnProperty.call(obj1, p) !== Object.prototype.hasOwnProperty.call(obj2, p)) return false

    switch (typeof (obj1[p])) {
      // Deep compare objects
      case 'object':
        if (!compare(obj1[p], obj2[p])) return false
        break
        // Compare function code
      case 'function':
        if (typeof (obj2[p]) === 'undefined' || (p !== 'compare' && obj1[p].toString() !== obj2[p].toString())) return false
        break
        // Compare values
      default:
        if (obj1[p] !== obj2[p]) return false
    }
  }

  // Check object 2 for any extra properties
  for (var prop in obj2) {
    if (typeof (obj1[prop]) === 'undefined') return false
  }
  return true
};

module.exports = { apply: apply }
