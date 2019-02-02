var camera, scene, renderer;
var cubeGeometry, material, plane, planeGeometry;
var three_d6n, three_d10, three_d20; // Die meshes
var d6nGroup, d20Group;
var testBox, testIco; // For testing die geometries

var cannon_d6n, cannon_d10, cannon_d20; // Die bodies
var d6nVerts = [], d10Verts = [], d20Verts = []; // Vertex arrays for die models
var d6nFaces = [], d10Faces = [], d20Faces = []; // Face arrays for die models
var d6nGeo, d20Geo; // Die geometries
var light, light2, ambientLight, rectLightHelper;
var loader, textureLoader;

var d6nCurrentPos, d6nLastPos, d20CurrentPos, d20LastPos; // Position variables for checking whether dice are stopped
var d6nResult = 0, d20Result = 0; // The result of the roll once the die is stopped

var physicsMaterial, physicsContactMaterial; // Cannon.js materials
var world, timeStep = 1/60; // Cannon.js world/update variables

var raycaster = new THREE.Raycaster();
var mousePos = new THREE.Vector2(), mousePressed = false;

function Main() {
    init();
    // Promise to run initThree, then run initCannon.
    promise = initThree().then(initCannon);
}

function init() { // Initialization abstracted from three and cannon.
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('contextmenu', event => event.preventDefault());
}

function initThree() {
    d = new $.Deferred();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 2, 2);
    camera.rotation.set(-Math.PI / 3, 0, 0);

    scene = new THREE.Scene();
    scene.addEventListener('update', function () { });

    initLights();

    material = new THREE.MeshLambertMaterial({ color: 0x4f4f4f });

    // TEST this is for testing d20 geometry location
    //var icoGeo = new THREE.IcosahedronGeometry(0.25, 0);
    //testIco = new THREE.Mesh(icoGeo, material);
    //scene.add(testIco);

    planeGeometry = new THREE.CubeGeometry(5, 0.1, 5);
    plane = new THREE.Mesh(planeGeometry, material);
    plane.position.set(0, -2, 0);
    scene.add(plane);

    loader = new THREE.ObjectLoader();

    loader.load("Assets/Dices/d6n.json", function (obj) {
        var materialObj = new THREE.MeshPhongMaterial({ color: 0x0E3386 });

        obj.scale.set(24, 24, 24);

        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;

                d6nGeo = new THREE.Geometry().fromBufferGeometry(child.geometry);
            }
        });

        d6nGeo.translate(obj.position);

        three_d6n = obj;
        //scene.add(three_d6n);

        // Create a group to force the mesh to a relative position
        d6nGroup = new THREE.Group();
        three_d6n.position.set(.5, -.15, .45); // Relative position within the group (this should equal initial global location of cannon_d6n)
        d6nGroup.add(three_d6n);

        scene.add(d6nGroup);
    });

    /*loader.load("Assets/Dices/d10.json", function (obj) {
        var materialObj = new THREE.MeshLambertMaterial({ color: 0xc92424 });
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;
            }
        });
        obj.scale.set(20, 20, 20);
        obj.position.set(2, 0, 0);

        cannon_d10 = obj;
        scene.add(cannon_d10);
    });*/

    loader.load("Assets/Dices/d20.json", function (obj) {
        var materialObj = new THREE.MeshPhongMaterial({ color: 0x139615 });
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;

                //d20Geo = new THREE.Geometry().fromBufferGeometry(child.geometry);
                d20Geo = new THREE.IcosahedronGeometry(0.25, 0);

                // Populate d20Verts with the vertices of the Icosahedron for translation to Cannon geometry
                for (i = 0; i < d20Geo.vertices.length; i++) {
                    d20Verts[i * 3] = d20Geo.vertices[i].x;
                    d20Verts[i * 3 + 1] = d20Geo.vertices[i].y;
                    d20Verts[i * 3 + 2] = d20Geo.vertices[i].z;
                }

                // Likewise, populate d20Faces
                for (i = 0; i < d20Geo.faces.length; i++) {
                    d20Faces[i * 3] = d20Geo.faces[i].a;
                    d20Faces[i * 3 + 1] = d20Geo.faces[i].b;
                    d20Faces[i * 3 + 2] = d20Geo.faces[i].c;
                }

                d.resolve(); // Resolve goes here so that initCannon function waits until it has this data available.
                             // Another way to do this might be to have a boolean waiting for d20Verts and d20Faces to not be undefined.
            }
        });
        obj.scale.set(24, 24, 24);

        obj.geometry = d20Geo;

        three_d20 = obj;

        d20Group = new THREE.Group();
        three_d20.position.set(0, .1, .75);
        three_d20.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 7);
        d20Group.add(three_d20);
        //d20Group.add(testIco);

        //scene.add(three_d20);
        scene.add(d20Group);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return d.promise();
}

function initCannon() {
    d = new $.Deferred();

    world = new CANNON.World(); // Create a new cannon.js world
    world.gravity.set(0, -9.82 / 2, 0); // Set the gravity
    world.broadphase = new CANNON.NaiveBroadphase(); // Broadphase algorithm detects collisions

    // Add a physics material for objects
    physicsMaterial = new CANNON.Material("baseMaterial");
    physicsMaterial.friction = 0.4;
    physicsMaterial.restitution = 0.2;
    physicsContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        physicsMaterial,
        0.4,  // Friction coefficient
        0.2); // Restitution (bounciness)

    // Add material to the Cannon.js world
    world.addContactMaterial(physicsContactMaterial);

    // Add a cube corresponding to the d6n to the cannon world.
    cannon_d6n = new CANNON.Body({ mass: 0 });
    cannon_d6n.type = CANNON.Body.DYNAMIC;

    var d6nShape = new CANNON.Box(new CANNON.Vec3(0.15, 0.15, 0.15)); // Make a box to correspond to d6n
    cannon_d6n.addShape(d6nShape); // Add the new shape to the body.
    cannon_d6n.position.set(-1, 0, 0);
    cannon_d6n.angularVelocity.set(0, 0, 3); // Position, velocity, and angular velocity assignments for testing purposes.
    //cannon_d6n.velocity.set(-2, 0, -.1);
    world.addBody(cannon_d6n); // Add d6n to world.

    // Add a convex polyhedron, based on the THREE.IcosahedronGeometry d20Geo, to the cannon world.
    cannon_d20 = new CANNON.Body({ mass: 0 });
    cannon_d20.type = CANNON.Body.DYNAMIC;

    // Convert the collected vertices and faces of the d20 geometry to CANNON.Vec3 and Int32Array variables to build a Cannon geometry
    var d20CannonVerts = [CANNON.Vec3()]; 
    for (i = 0; i < d20Verts.length / 3; i++) {
        d20CannonVerts[i] = new CANNON.Vec3(d20Verts[i * 3], d20Verts[i * 3 + 1], d20Verts[i * 3 + 2]);
    }
    var d20CannonFaces = [new Int32Array(3)];
    for (i = 0; i < d20Faces.length / 3; i++) {
        d20CannonFaces[i] = [d20Faces[i * 3], d20Faces[i * 3 + 1], d20Faces[i * 3 + 2]];
    }

    d20shape = new CANNON.ConvexPolyhedron(d20CannonVerts, d20CannonFaces);
    //d20shape.transformAllPoints(new CANNON.Vec3(-2, 0, 0));
    cannon_d20.addShape(d20shape);
    cannon_d20.position.set(1, 0, 0); // Position, velocity, and angular velocity assignments for testing purposes.
    cannon_d20.angularVelocity.set(0, 0, -3);
    world.addBody(cannon_d20);

    initBorders();


    requestAnimationFrame(render);
    return d.promise();
}

function initLights() {

    light = new THREE.PointLight(0x43B536, 0.8, 100);
    light.position.set(-2, -2, 2);
    scene.add(light);

    light2 = new THREE.PointLight(0xffffff, 0.8, 100);
    light2.position.set(2, 2, -2);
    scene.add(light2);

    ambientLight = new THREE.AmbientLight(0xbfbfbf);
    scene.add(ambientLight);
}

function initBorders() {
    // Initialize the platform and invisible walls
    var platformBody = new CANNON.Body({ mass: 0, material: physicsMaterial, position: new CANNON.Vec3(0, -2, 0) });
    var platform = new CANNON.Box(new CANNON.Vec3(2.5, 0.1, 2.5));
    var backWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial, position: new CANNON.Vec3(0, 0, -2.5) });
    var frontWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial, position: new CANNON.Vec3(0, 0, 2.5) });
    var backWall = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 0.1));
    var leftWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial, position: new CANNON.Vec3(-2.5, 0, 0) });
    var rightWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial, position: new CANNON.Vec3(2.5, 0, 0) });
    var sideWall = new CANNON.Box(new CANNON.Vec3(0.1, 2.5, 2.5));
    platformBody.addShape(platform);
    world.addBody(platformBody);
    backWallBody.addShape(backWall);
    world.addBody(backWallBody);
    frontWallBody.addShape(backWall);
    world.addBody(frontWallBody);
    leftWallBody.addShape(sideWall);
    world.addBody(leftWallBody);
    rightWallBody.addShape(sideWall);
    world.addBody(rightWallBody);
}

function render() {
    requestAnimationFrame(render);

    updatePhysics();

    renderer.render(scene, camera);
}

function updatePhysics() {

    world.step(timeStep);

    // Reflect the cannon object's position onto the three mesh
    d6nGroup.position.copy(cannon_d6n.position);
    d6nGroup.quaternion.copy(cannon_d6n.quaternion);

    d20Group.position.copy(cannon_d20.position);
    d20Group.quaternion.copy(cannon_d20.quaternion);

    // Update position variables to check if the dice have stopped
    d6nCurrentPos = cannon_d6n.position;
    d20CurrentPos = cannon_d20.position;

    if (d6nCurrentPos == d6nLastPos) {
        d6nResultDisplay();
    }

    if (d20CurrentPos == d20LastPos) {
        d20ResultDisplay();
    }
}

function d6nResultDisplay() {
    var p = document.getElementById("d6result");

    var rot = cannon_d6n.quaternion;

    var xyDiff = Math.abs(rot.x - rot.y);
    var yzDiff = Math.abs(rot.y - rot.z);
    var absxyDiff = Math.abs(Math.abs(rot.x) - Math.abs(rot.y));
    var absyzDiff = Math.abs(Math.abs(rot.y) - Math.abs(rot.z));

    if (yzDiff < 0.01) {
        p.innerHTML = "D6 Result: 2";
    }
    else if (xyDiff < 0.01) {
        p.innerHTML = "D6 Result: 4";
    }
    else if (absxyDiff < 0.01) {
        p.innerHTML = "D6 Result: 3";
    }
    else if (absyzDiff < 0.01) {
        p.innerHTML = "D6 Result: 5";
    }
    else if (Math.abs(rot.x) < 0.001 && Math.abs(rot.z) < 0.001) {
        p.innerHTML = "D6 Result: 6";
    }
    else if (Math.abs(rot.y) < 0.001) {
        p.innerHTML = "D6 Result: 1";
    }
    else {
        p.innerHTML = "D6 result unclear. Please wait a moment or roll again.";
    }
}

function d20ResultDisplay() {
    var p = document.getElementById("d20result");

    d20Group.rotation.reorder("XYZ"); // Debug
    console.log(d20Group.rotation); // Rotation in euler form
}

function onDocumentMouseDown(event) {

    mousePressed = true;

    switch (event.button) {
        case 0: // Left click = d6n
            cannon_d6n.mass = 1;
            cannon_d6n.position.set(0, 0, 0);
            cannon_d6n.velocity = new CANNON.Vec3(mousePos.x * 10, 0, (mousePos.y - 2) * 10);
            cannon_d6n.angularVelocity = new CANNON.Vec3(-mousePos.x * 10, 0, -(mousePos.y - 2) * 10);
            cannon_d6n.updateMassProperties();

            document.getElementById("d6result").innerHTML = "D6 rolling...";
            setTimeout(d6nResultDisplay, 5000);
            break;
        case 2: // Right click = d20
            cannon_d20.mass = 1;
            cannon_d20.position.set(0, 0, 0);
            cannon_d20.velocity = new CANNON.Vec3(mousePos.x * 10, 0, (mousePos.y - 2) * 10);
            cannon_d20.angularVelocity = new CANNON.Vec3(-mousePos.x * 10, -(mousePos.y - 2) * 10, 0);
            cannon_d20.updateMassProperties();

            document.getElementById("d20result").innerHTML = "D20 rolling...";
            setTimeout(d20ResultDisplay, 7000);
            break;
    }
}

function onDocumentMouseUp(event) { mousePressed = false; }

function onDocumentMouseMove(event) {
    mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePos.clone(), camera);
}