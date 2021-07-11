// @ts-nocheck
const fps_array = new Array();
// @ts-ignore
window.lastTime = performance.now();
function check_fps() {
    // @ts-ignore
    fps_array.push(performance.now() - window.lastTime);
    const max = Math.min.apply(null, fps_array);
    document.getElementById("fps_main").innerHTML = max;
    if (fps_array.length > 10) {
        fps_array.shift();
    }
    // @ts-ignore
    window.lastTime = performance.now();
    window.requestAnimationFrame(check_fps);
}
check_fps();

const showVideo = true;

const showCanvas = true;
const targetWidth = 2160 * 1;

const targetHeight = 3840 * 1;

const drawPreview = false;
const offscreen = false;
const webgl = false;
const readPixels = false;

const render = true;
const upload = true;
const asyncRead = true;
const buffer = new Uint8ClampedArray(targetHeight * targetWidth);
const bufferRendering = new Uint8ClampedArray(
    targetHeight * targetWidth * 4
);

let diff = {};

const test = false;
const bufferTest = new Uint8ClampedArray(targetHeight * targetWidth * 4);
for (let i = 0; i < buffer.length; i += 1) { }

let bx = 1;
let by = 1;
if (test)
    for (let y = 0; y < targetHeight; y += by) {
        for (let x = 0; x < targetWidth; x += bx) {
            let pixel = Math.floor(Math.random() * 255);
            for (let dy = 0; dy < by; dy++) {
                for (let dx = 0; dx < bx; dx++) {
                    let i = (y + dy) * targetWidth + x + dx;
                    bufferTest[i * 4] = pixel;
                    bufferTest[i * 4 + 1] = pixel;
                    bufferTest[i * 4 + 2] = pixel;
                    bufferTest[i * 4 + 3] = 255;
                }
            }
        }
    }

const canvas3 = document.getElementById("canvas3") as HTMLCanvasElement;

canvas3.width = targetWidth;
canvas3.height = targetHeight;

console.log(bufferTest.length, targetHeight * targetWidth * 4);
canvas3.getContext("2d")
    .putImageData(
        new ImageData(bufferTest, targetWidth, targetHeight),
        0,
        0
    );
var videoReady = false;
var video: HTMLVideoElement | null = null;
setupVideo("video.mp4");
getUserMedia();

const canvas = (showCanvas
    ? document.getElementById("canvas")
    : document.createElement("canvas")) as HTMLCanvasElement;

const canvas2 = document.getElementById("canvas2") as HTMLCanvasElement;

canvas.width = webgl ? (offscreen ? 1 : targetWidth / 4) : targetWidth;
canvas.height = webgl ? (offscreen ? 1 : targetHeight) : targetHeight;
canvas2.width = targetWidth;
canvas2.height = targetHeight;

var uploadTimeSpan = document.getElementById("uploadTime");
var fpsSpan = document.getElementById("fps");

var contextAttributes = {
    alpha: true,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
};

let gl: RenderingContext | null = null;
let pbo = null;
if (webgl) {
    gl = canvas.getContext("webgl2", contextAttributes) as WebGL2RenderingContext;

    if (!gl) {
        break;
    }
    // Prepare webgl
    // Code modified from https://krpano.com/ios/bugs/ios8-webgl-video-performance/
    var vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
        vs,
        "attribute highp vec2 vx; varying highp vec2 tx; void main(){gl_Position = vec4(vx.x*2.0-1.0,1.0-vx.y*2.0,0,1); tx = vx;}"
    );
    gl.compileShader(vs);

    var ps = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(
        ps,
        "uniform sampler2D sm; varying highp vec2 tx; " +
        "lowp float lum(lowp vec4 v){return 0.2126 * v.r + 0.7152 * v.g + 0.0722 * v.b;}" +
        "void main(){" +
        "highp float p = 1.0/2160.0;" +
        "highp float bx = tx.x - 1.5/2160.0;" +
        "lowp float y = 1.0 - tx.y;" +
        "lowp float a = lum(texture2D(sm, vec2(bx,y)));" +
        "lowp float b = lum(texture2D(sm, vec2(bx + p,y)));" +
        "lowp float c = lum(texture2D(sm, vec2(bx+p*2.0,y)));" +
        "lowp float d =  lum(texture2D(sm, vec2(bx+p*3.0,y)));" +
        " gl_FragColor = vec4(a,b,c,d);}"
    );
    gl.compileShader(ps);

    var shader = gl.createProgram();
    gl.attachShader(shader, vs);
    gl.attachShader(shader, ps);
    gl.linkProgram(shader);

    var vx = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vx);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        gl.STATIC_DRAW
    );

    var ix = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ix);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        gl.STATIC_DRAW
    );

    // Set up the shader parameters
    gl.useProgram(shader);
    var vx_loc = gl.getAttribLocation(shader, "vx");
    gl.vertexAttribPointer(vx_loc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vx_loc);
    gl.uniform1i(gl.getUniformLocation(shader, "sm"), 0);

    if (offscreen) {
        const targetTextureWidth = targetWidth / 4;
        const targetTextureHeight = targetHeight;
        const targetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            targetTextureWidth,
            targetTextureHeight,
            border,
            format,
            type,
            data
        );

        // set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            attachmentPoint,
            gl.TEXTURE_2D,
            targetTexture,
            level
        );
    }

    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.viewport(0, 0, targetWidth / 4, targetHeight);
    // Initialize the texture data (opaque blue)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0.0, 0.0, 1.0, 1.0])
    );

    if (asyncRead) {
        pbo = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.bufferData(
            gl.PIXEL_PACK_BUFFER,
            buffer.byteLength,
            gl.STREAM_READ
        );
        //  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }
}

// Kick off the render loop
setTimeout(drawScene, 1);

var frameCount = 0;
var texUploadCount = 0;
var texUploadTotal = 0;
var texDrawTotal = 0;
var texSyncTotal = 0;
var texWaitTotal = 0;
var texReadTotal = 0;
var texWaitTotal = 0;
var texBufferTotal = 0;
var lastFrameTime = 0;
var totalFrameTime = 0;

async function waitFor(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 1);
    });
}

async function clientWaitAsync(gl, sync) {
    while (gl.clientWaitSync(sync, 0, 0) != gl.CONDITION_SATISFIED) {
        await waitFor(1);
    }
    //gl.deleteSync(sync);
}

async function drawScene() {
    var frameStartTime = performance.now();

    async function readPixelsAsync(gl, x, y, w, h, format, type, dest) {
        //  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);

        //const sync_0 = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        //  await clientWaitAsync(gl, sync_0);
        gl.flush();
        {
            const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            await clientWaitAsync(gl, sync);
        }

        gl.readPixels(x, y, w, h, format, type, 0);

        var readTime = performance.now() - frameStartTime;
        texReadTotal += readTime;
        // gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

        var syncTime = performance.now() - frameStartTime;
        texSyncTotal += syncTime;

        await clientWaitAsync(gl, sync);

        var waitTime = performance.now() - frameStartTime;
        texWaitTotal += waitTime;

        // gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, dest);
        //gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        var bufferTime = performance.now() - frameStartTime;
        texBufferTotal += bufferTime;
        return dest;
    }

    if (true) {
        if (webgl) {
            if (videoReady && !video.paused) {
                //  video.srcObject.getVideoTracks()[0].stop();
                if (upload) {
                    if (test) {
                        gl.texImage2D(
                            gl.TEXTURE_2D,
                            0,
                            gl.RGBA,
                            targetWidth,
                            targetHeight,
                            0,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            bufferTest
                        );
                    } else {
                        gl.texImage2D(
                            gl.TEXTURE_2D,
                            0,
                            gl.LUMINANCE,
                            gl.LUMINANCE,
                            gl.UNSIGNED_BYTE,
                            video
                        );
                    }
                }

                var uploadTime = performance.now() - frameStartTime;
                texUploadCount += 1;
                texUploadTotal += uploadTime;
            }

            if (render) {
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            }

            var drawTime = performance.now() - frameStartTime;
            texDrawTotal += drawTime;

            if (readPixels) {
                if (asyncRead) {
                    await readPixelsAsync(
                        gl,
                        0,
                        0,
                        targetWidth / 4,
                        targetHeight,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        buffer
                    );
                } else {
                    gl.readPixels(
                        0,
                        0,
                        targetWidth / 4,
                        targetHeight,
                        gl.RGBA,
                        gl.UNSIGNED_BYTE,
                        buffer
                    );

                    if (test) {
                        let his = {};

                        let size = 16;
                        console.log(buffer.subarray(0, size));
                        //  console.log(bufferTest.subarray(0, size * 4));

                        const real = new Uint8Array(size);
                        for (let i = 0; i < real.length; i++) {
                            real[i] = bufferTest[i * 4];
                        }

                        console.log(real);

                        diff = 0;
                        for (let i = 0; i < buffer.length; i++) {
                            let dif = Math.abs(buffer[i] - bufferTest[i * 4]);

                            if (dif != 0) {
                                diff++;
                            }
                        }
                    }
                }
            }

            if (drawPreview) {
                for (let i = 0; i < buffer.length; i++) {
                    bufferRendering[i * 4] = buffer[i];
                    bufferRendering[i * 4 + 1] = buffer[i];

                    bufferRendering[i * 4 + 2] = buffer[i];

                    bufferRendering[i * 4 + 3] = 255;
                }
                document
                    .getElementById("canvas2")
                    .getContext("2d", { alpha: false, desynchronized: true })
                    .putImageData(
                        new ImageData(bufferRendering, targetWidth, targetHeight),
                        0,
                        0
                    );
            }
        } else {
            const realCanvas =
                window.OffscreenCanvas && offscreen
                    ? new OffscreenCanvas(targetWidth, targetHeight)
                    : canvas;
            const context = realCanvas.getContext("2d");

            context.drawImage(
                video,
                0,
                0,
                video.videoWidth,
                video.videoHeight,
                0,
                0,
                targetWidth,
                targetHeight
            );

            var uploadTime = performance.now() - frameStartTime;
            texUploadCount += 1;
            texUploadTotal += uploadTime;

            const imageData = context.getImageData(
                0,
                0,
                targetWidth,
                targetHeight
            );

            var drawTime = performance.now() - frameStartTime;
            texDrawTotal += drawTime;

            if (window.OffscreenCanvas && offscreen) {
                //canvas.putImageData(imageData, targetWidth, targetHeight);
            }
        }
    }

    if (video.requestVideoFrameCallback && !video.paused) {
        setTimeout(drawScene, 1);
    } else {
        setTimeout(drawScene, 1);
    }

    if (lastFrameTime == 0) {
        resetStats();
        lastFrameTime = frameStartTime;
        return;
    }

    // Update timing measurements
    totalFrameTime += frameStartTime - lastFrameTime;
    lastFrameTime = frameStartTime;
    frameCount += 1;
    if (frameCount == (test ? 3 : 5)) {
        printStats();
        resetStats();
    }
}

function resetStats() {
    frameCount = 0;
    texUploadCount = 0;
    texUploadTotal = 0;
    texDownloadTotal = 0;
    texDrawTotal = 0;
    texReadTotal = 0;
    texSyncTotal = 0;
    texWaitTotal = 0;
    texBufferTotal = 0;
    totalFrameTime = 0;
}

function printStats() {
    if (texUploadCount > 0) {
        var texTime = texUploadTotal / texUploadCount;
        var texTimeDraw = texDrawTotal / texUploadCount - texTime;

        var texRead = texReadTotal / texUploadCount - texTime - texTimeDraw;
        var texSync =
            texSyncTotal / texUploadCount - texRead - texTime - texTimeDraw;
        var texWait =
            texWaitTotal / texUploadCount -
            texRead -
            texSync -
            texTime -
            texTimeDraw;
        var texBuffer =
            texBufferTotal / texUploadCount -
            texSync -
            texWait -
            texRead -
            texTime -
            texTimeDraw;

        var texTimeRead =
            totalFrameTime / texUploadCount - texTime - texTimeDraw;
        var texStats =
            texTime.toFixed(2) +
            " ms, " +
            texTimeDraw.toFixed(2) +
            " ms, " +
            texTimeRead.toFixed(2) +
            " ms, " +
            texRead.toFixed(2) +
            " ms, " +
            texSync.toFixedte(2) +
            " ms, " +
            texWait.toFixed(2) +
            " ms, " +
            texBuffer.toFixed(2) +
            " ms, " +
            texUploadCount.toFixed(0) +
            " uploads," +
            +diff +
            "diff,";
        document.getElementById("video").videoWidth;
        uploadTimeSpan.textContent = texStats;
    } else {
        uploadTimeSpan.textContent =
            "0 ms, 0 uploads" + document.getElementById("video").videoWidth;
    }

    var avFrameTime = totalFrameTime / frameCount;
    var avFPS = 1000 / avFrameTime;
    fpsSpan.textContent = avFPS.toFixed(2);

    resetStats();
}

// ==========
// Video management stuff below here
// ==========

function createVideo() {
    const videoNode = !showVideo
        ? document.createElement("video")
        : document.getElementById("video");
    videoNode.muted = true;
    videoNode.setAttribute("playsinline", "");

    var playing = false;
    var timeupdate = false;

    // Waiting for these 2 events ensures
    // there is data in the video
    videoNode.addEventListener(
        "playing",
        function () {
            playing = true;
            checkReady();
        },
        true
    );

    videoNode.addEventListener(
        "timeupdate",
        function () {
            timeupdate = true;
            checkReady();
        },
        true
    );

    function checkReady() {
        if (playing && timeupdate) {
            videoReady = true;
        }
    }

    return videoNode;
}

function setupVideo(url) {
    if (video == null) video = createVideo();

    if (video.srcObject) {
        video.srcObject.getVideoTracks()[0].stop();
        video.srcObject = null;
    }
    video.loop = true;
    video.src = url;
    video.play();
}

function getUserMedia() {
    var constraints = {
        audio: false,
        video: {
            facingMode: "environment",
            width: 3840,
            height: 2160,
        },
    };

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (mediaStream) {
            video.src = "";
            video.loop = false;

            video.srcObject = mediaStream;
            video.onloadedmetadata = function (e) {
                video.play().catch(function (err) {
                    console.log("Play error: " + err.name + ": " + err.message);
                });
            };
        })
        .catch(function (err) {
            console.log(err.name + ": " + err.message);
        });
}
