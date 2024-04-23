
// Vars to tweak packet spawn rate, speed and possible colors
let speed = 1.5;
let spawn_interval = 0.2;
let colors = [
    "#00FF00",
    "#00FF00",
    "#00FF00"
];

// reference holders
let cables;
let svg;
let id;


function spawn() {
    // Select a random cable
    cable = cables[Math.floor(Math.random()*cables.length)]
    // Spawn packet for that cable
    spawn_packet(cable);
}


function spawn_packet(cable) {

    // Get color for packet to spawn
    let color = colors[Math.floor(Math.random() * colors.length)];

    // Create packet SVG object
    let new_packet = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    new_packet.setAttribute("id",id);
    new_packet.setAttribute("r","3.5");
    new_packet.setAttribute("fill",color);

    // Get animation path and direction
    let packet_path = cable.getAttribute("d");
    let direction = Math.random() > 0.5 ? "normal" : "reverse";

    //Set animation for packet
    let style = new_packet.style;
    style.animationDirection = direction;
    style.animationName = "ball-move";
    style.animationDuration = speed + "s";
    style.animationTimingFunction = "linear";
    style.animationIterationCount = "1";

    // Set animation path for packet
    style.offsetPath = "path('"+packet_path+"')";
    style.offsetDistance = "0%";
    
    // Add generated packet to webpage SVG
    svg.appendChild(new_packet);

    // Trick: id will be changed by future calls but is needed to delete element
    // This stores the id locally for the setTimeout function call and then increments the global id
    let loc_id = id;
    id = id + 1;
    // Delete Packets once they arrive at destination
    setTimeout(function(){
        svg.getElementById(loc_id).remove();
    },speed*1000);
}

// Load SVG and cables on document load and start packet spawn
document.addEventListener("DOMContentLoaded", function() {

    // Reference to SVG object
    var svg_src = document.getElementById("svg-object");

    // Initialize packet SVG object IDs
    id = 0;
    svg_src.addEventListener("load",function() {

        // Set reference to SVG content
        svg = svg_src.getSVGDocument().querySelector("svg");

        // Add animation style to SVG
        let anim_style = document.createElementNS("http://www.w3.org/2000/svg", 'style');
        anim_style.innerHTML = `
            <style>
                @keyframes ball-move {
                    from {
                        offset-distance: 0%;
                    } to {
                        offset-distance: 100%
                    }
                }
            </style>
        `;
        svg.appendChild(anim_style);
        
        // Set reference to all cables in SVG
        // Drawio does not allow to set a class name for svg elements
        //  hence all cables have a stroke with color "#fffffe"
        cables = svg_src.getSVGDocument().querySelector("svg").querySelectorAll('[stroke="#fffffe"]');

        // Start packet spawn
        var intervalId = window.setInterval(function(){
            spawn();
        }, spawn_interval*1000);
    })
});
