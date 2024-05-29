export default class Packet {
    color
    data
    type

    constructor(type, data, color) {
        this.type = type;
        this.data = data;
        this.color = color;
    }
}