
let data = [0,16,19]
let firstByte = data[1]
let secondByte = data[2]
console.log('First byte: ' + firstByte)
console.log('Second byte: ' + secondByte)
console.log('Second byte << 8 ' + (secondByte << 8))
let x = (secondByte << 8) || firstByte

console.log('xxx ' + x/200)

// let buf = Buffer([secondByte, firstByte])
// let weight = buf.readInt16LE()()
// console.log('weight: ' + weight)