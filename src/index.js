function apply (base, patch) {
  for (const operation of patch) {
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
      const value = getValue(base, operation.from)
      if (value === undefined) {
        throw new Error("Location 'from' missing")
      }
      addOrReplace(base, operation.path, value, true)
    } else if (operation.op === 'move') {
      const value = remove(base, operation.from)
      addOrReplace(base, operation.path, value, true)
    } else if (operation.op === 'test') {
      if (operation.value === undefined) {
        throw new Error("Parameter 'value' required")
      }
      handleOperation((current, pathPart) => {
        let value
        if (Array.isArray(current)) {
          const index = pathPart === '-' ? current.length - 1 : pathPart
          value = current[index]
        } else {
          value = current[pathPart]
        }

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
  handleOperation((current, pathPart) => {
    if (Array.isArray(current)) {
      if (pathPart !== '-' && Number.isNaN(Number.parseInt(pathPart))) {
        throw new Error('Object operation on array')
      }

      const index = pathPart === '-' ? current.length : pathPart
      if (!/^\d+$/g.test(index)) throw new Error('Bad index')
      if (index < 0 || index > current.length) {
        throw new Error('Out of bounds')
      }

      if (replace === true) {
        current.splice(index, 1, value)
      } else {
        current.splice(index, 0, value)
      }
    } else {
      current[pathPart] = value
    }
  }, base, path)
}

function remove (base, path) {
  return handleOperation((current, pathPart) => {
    if (Array.isArray(current)) {
      const index = pathPart === '-' ? current.length - 1 : pathPart
      if (!/^\d+$/g.test(index)) throw new Error('Bad index')
      if (index < 0 || index >= current.length) {
        throw new Error('Out of bounds')
      }
      return current.splice(index, 1)[0]
    } else {
      if (current[pathPart] === undefined) {
        throw new Error("Can't remove nonexistent field")
      }
      const ret = current[pathPart]
      delete current[pathPart]
      return ret
    }
  }, base, path)
}

function getValue (base, path) {
  return handleOperation((current, pathPart) => {
    if (Array.isArray(current)) {
      const index = pathPart === '-' ? current.length - 1 : pathPart
      if (!/^\d+$/g.test(index)) throw new Error('Bad index')
      if (index < 0 || index >= current.length) {
        throw new Error('Out of bounds')
      }
      return current[index]
    } else {
      return current[pathPart]
    }
  }, base, path)
}

function handleOperation (handle, base, path) {
  if (!path.startsWith('/')) {
    throw new Error('Incorrect JSON Pointer token')
  }

  let current = base
  const splitPath = path.split('/')
  for (let i = 1; i < splitPath.length; i++) {
    const pathPart = splitPath[i].replace('~1', '/').replace('~0', '~')

    if (i === splitPath.length - 1) {
      return handle(current, pathPart)
    }

    if (current[pathPart] === undefined) {
      throw new Error('path ' + splitPath.slice(0, i + 1).join('/') + ' does not exist -- missing objects are not created recursively')
    }

    current = current[pathPart]
  }
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
    if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false

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

export default { apply }
