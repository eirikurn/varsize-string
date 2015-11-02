function VarSizeString (string, characterLookup) {
  if (!(this instanceof VarSizeString)) {
    return new VarSizeString(string, characterLookup)
  }

  string = string.replace(/^\s+|\s+$/g, '')
  this.string = string
  this.characterLookup = characterLookup
}
VarSizeString.prototype.init = function () {
  if (isNaN(this._size)) {
    if (this.string.length > 0) {
      var string = this.string
      const lookup = this.characterLookup
      const sizes = new Float32Array(string.length)
      const chars = new Uint16Array(string.length)
      for (var i = 0; i < string.length; i++) {
        chars[i] = string.charCodeAt(i)
      }
      const context = {}
      var size = 0
      var formerChar = null
      for (var i = 0; i < string.length; i++) {
        var c = chars[i]
        var cSize = lookup(c, formerChar, chars, i, context)
        sizes[i] = size
        size += cSize
        formerChar = c
      }
      this._sizes = sizes
      this._size = size
    } else {
      this._size = 0
    }
  }
}
VarSizeString.prototype.size = function () {
  this.init()
  return this._size
}
VarSizeString.prototype.substr = function (start, size) {
  if (size === undefined) {
    return this.substring(start)
  }
  return this.substring(start, start + size)
}
VarSizeString.prototype.substring = function (start, end) {
  this.init()

  var sizes = this._sizes

  if (start < 0) {
    start = 0
  }
  if (end === undefined) {
    end = this._size
  } else if (end < 0) {
    end = 0
  }

  if (start > end) {
    var tmp = end
    end = start
    start = tmp
  }

  if (end > this._size) {
    end = this._size
  }

  if (start > this._size || start === end) {
    return {
      string: '',
      size: 0
    }
  }

  if (start === 0 && end === this._size) {
    return {
      string: this.string,
      size: this._size
    }
  }

  var from = 0
  while (sizes[from] < start) {
    ++from
  }

  var to = from
  if (this._size <= end) {
    to = this.string.length
  } else {
    while (sizes[to] <= end) {
      ++to
    }
    to -= 1
  }

  var endSize
  if (to === this.string.length) {
    endSize = this._size
  } else {
    endSize = sizes[to]
  }
  return {
    string: this.string.substring(from, to),
    size: endSize - sizes[from]
  }
}
VarSizeString.prototype.width = function () {
  return this.getLines().reduce(function (max, line) {
    var size = line.size()
    return (size > max) ? size : max
  }, 0)
}
VarSizeString.prototype.getLines = function () {
  if (!this._lines) {
    this._lines = this.string.split(/[\r\n]+/).map(function (line) {
      return new VarSizeString(line, this.characterLookup)
    }.bind(this))
  }
  return this._lines
}
VarSizeString.prototype.wrap = function (width) {
  const sep = ' '
  const sepLength = 1
  const lineBreak = '\n'

  var remainingWidth = width
  var hadLeftOver = false

  return this.getLines().reduce(function (result, line) {
    var lineWidth = line.size()
    var lineOffset = 0
    while (lineWidth - lineOffset + (hadLeftOver ? sepLength : 0) > remainingWidth) {
      var sepPos = line.sizeBeforeLast(sep, lineOffset + remainingWidth - (hadLeftOver ? sepLength : 0))
      if (sepPos < lineOffset) {
        sepPos = -1 // Ignore it if the last space is before the start (in other words: there is no space in the expected area)
      }
      if (sepPos !== -1) {
        if (hadLeftOver) {
          result.push(sep)
          remainingWidth -= sepLength
        }
        result.push(line.substring(lineOffset, sepPos).string.replace(/^\s+|\s+$/g, ''))
        lineOffset = sepPos + 1
      } else if (!hadLeftOver) {
        var part = line.substr(lineOffset, remainingWidth)
        result.push(part.string.replace(/^\s+|\s+$/g, ''))
        lineOffset += part.size
      }
      result.push(lineBreak)
      hadLeftOver = false
      remainingWidth = width
    }
    var content = line.substring(lineOffset).string.replace(/^\s+|\s+$/g, '')
    if (hadLeftOver) {
      result.push(sep)
      remainingWidth -= sepLength
    }
    result.push(content)
    hadLeftOver = true
    remainingWidth -= (lineWidth - lineOffset)
    return result
  }, []).join('')
}
VarSizeString.prototype.sizeBeforeFirst = function (search, startAfter) {
  this.init()
  if (startAfter > this._size) {
    return -1
  }
  var i = 0
  while (this._sizes[i] < startAfter) {
    ++i
  }
  var found = this.string.indexOf(search, i)
  if (found === -1) {
    return -1
  }
  return this._sizes[found]
}
VarSizeString.prototype.sizeBeforeLast = function (search, endBefore) {
  this.init()
  if (endBefore < 1) {
    return -1
  }
  var i = this._sizes.length - 1
  while (this._sizes[i] > endBefore) {
    --i
  }
  var found = this.string.lastIndexOf(search, i)
  if (found === -1) {
    return -1
  }
  return this._sizes[found]
}
VarSizeString.prototype.truncate = function (size, suffix) {
  if (!(suffix instanceof VarSizeString)) {
    suffix = new VarSizeString(suffix, this.characterLookup)
  }
  if (this.size() <= size) {
    return this.string
  }
  return this.substring(0, size - suffix.size()).string + suffix.string
}

module.exports = VarSizeString
