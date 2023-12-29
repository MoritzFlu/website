

let speed = 0.5;
let spawn_rate = 0.015;

let cables;
let svg;

function move_packet(packet) {

}


function start() {
    cables = svg.getElementsByClassName("cable");

    spawn_packet(cables[0]);
}


function spawn_packet(cable) {
    console.log(cable);
    let new_packet = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    
    // <circle r="7.4" fill="#979797">
    //<animateMotion dur="10s" repeatCount="1" fill="freeze" path="M7 53 2 23C1 11 10-1 22 0c14 1 29 20 35 31l22 57 7 10c3 3 33 27 39 10 10-24 5-57 6-81 1-7-2-18 4-20l3-4c42-11 52 40 63 67 10 23 31 26 45 5l1-6" />
    //</circle>

}

document.addEventListener("DOMContentLoaded", function() {
    var svg_src = document.getElementById("svg-object");
    svg_src.addEventListener("load",function() {
        svg = svg_src.contentDocument;
        start();
    })
});