

let speed = 2;
let spawn_rate = 0.015;

let cables;
let svg;

let colors = [
    "#00FF00",
    "#00FF00",
    "#00FF00"
];

let id;

function move_packet(packet) {

}


function start() {
    cables = svg.getElementsByClassName("cable");

    cable = cables[Math.floor(Math.random()*cables.length)]

    spawn_packet(cable);
}


function spawn_packet(cable) {

    // To select
    // speed in seconds
    // size
    // color

    let color = colors[Math.floor(Math.random() * colors.length)];

    //console.log(cable);
    let new_packet = document.createElementNS("http://www.w3.org/2000/svg", 'circle');

    new_packet.setAttribute("r","7.4");
    new_packet.setAttribute("fill",color);

    let packet_path = cable.getAttribute("d");

    //new_packet.classList.add("packet");
    new_packet.style.animation = "ball-move "+speed+"s linear 1";
    new_packet.style.offset = "path('"+packet_path+"') 0% auto";
    //new_packet.style.offsetPath = "path("+packet_path+")";


    new_packet.id = id;
    //new_packet.style.animationDuration = speed;
    //new_packet.style.offsetPath = path;

    let loc_id = id;
    id = id + 1;


    //let container = document.createElement("object");
    //container.setAttribute("type","image/svg+xml");
    //container.id = id;


    //let anim = document.createElementNS("http://www.w3.org/2000/svg","animateMotion");

    //anim.setAttribute("dur",speed);

    // Has to be indefinite, otherwise the animation will not repeat for
    // another packet on the same path!
    // Even if the SVG object is remove inbetween animations
    //anim.setAttribute("repeatCount","indefinite");
    //anim.setAttribute("fill","freeze");

    //anim.setAttribute("path",path);

    //new_packet.appendChild(anim);
    //target.appendChild(new_packet);

    //container.appendChild(new_packet);
    //svg.appendChild(container);

    svg.appendChild(new_packet);
    //new_packet.beginElement();

    setTimeout(function(){
        svg.getElementById(loc_id).remove();
    },speed*1000);

    // <circle r="7.4" fill="#979797">
    //<animateMotion dur="10s" repeatCount="1" fill="freeze" path="M7 53 2 23C1 11 10-1 22 0c14 1 29 20 35 31l22 57 7 10c3 3 33 27 39 10 10-24 5-57 6-81 1-7-2-18 4-20l3-4c42-11 52 40 63 67 10 23 31 26 45 5l1-6" />
    //</circle>

}

document.addEventListener("DOMContentLoaded", function() {
    var svg_src = document.getElementById("svg-object");
    id = 0;
    svg_src.addEventListener("load",function() {
        svg = svg_src.contentDocument.getElementById("svg");
        start();
    })
});


var intervalId = window.setInterval(function(){
    // call your function here
    start();
  }, speed*1000*0.5);