var isAnalysePlaying = false;
var isStreamPlaying = false;

/* Detections */
let detections = [];

/* UI Functions */
const analyseBtn= document.getElementById("analyse_button");
const streamBtn= document.getElementById("stream_button");
const ai = document.getElementById("ai")
const steth = document.getElementById("steth");
const analyseLottie = document.getElementById("start_analysis")
const streamLottie = document.getElementById("start_stream")

const detection_class = document.getElementById('det');

const btn__secondary = document.querySelectorAll("btn__secondary");

$(btn__secondary).hide();
$(analyseLottie).hide();
$(streamLottie).hide();
$(det).hide();

analyseBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (isAnalysePlaying) {
        analyseLottie.pause();
        $(analyseLottie).hide();
        $(ai).show();
        isAnalysePlaying = false;
        analyseBtn.classList.remove("btn__secondary");
        analyseBtn.classList.add("btn__primary");
        analyseBtn.textContent = "Analyse";
        
    } else {
        $(ai).hide();
        $(analyseLottie).show();
        analyseLottie.play();
        isAnalysePlaying = true;
        analyseBtn.classList.remove("btn__primary");
        analyseBtn.classList.add("btn__secondary");
        analyseBtn.textContent = "Analysing...";
        analyseBtn.disabled = true;

        // Perform an action after 5 seconds
        setTimeout(function() {
            $(analyseBtn).hide();
            $(analyseLottie).hide();
            $(det).show();
            det = findMostOccurringValue(detections);
            detections = [];
            $(detection_class).text(det);
            console.log("MOST: " + det)
        }, 20000); // 5000 milliseconds = 5 seconds
    }
});

streamBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (isStreamPlaying) {
        streamLottie.pause();
        $(streamLottie).hide();
        $(steth).show();
        isStreamPlaying = false;
        streamBtn.classList.remove("btn__secondary");
        streamBtn.classList.add("btn__primary");
        streamBtn.textContent = "Stream";
        
    } else {
        $(steth).hide();
        $(streamLottie).show();
        streamLottie.play();
        isStreamPlaying = true;
        streamBtn.classList.remove("btn__primary");
        streamBtn.classList.add("btn__secondary");
        streamBtn.textContent = "Streaming...";
    }
});

// MQTT functions
const MQTT_BROKER = 'ws://test.mosquitto.org:8080';
const AUDIO_TOPIC = 'VIAM-AI-STETH/AUDIO_STREAM';
const ANALYSE_TOPIC = 'VIAM-AUDIO-TEST'
const COMMAND_TOPIC = 'VIAM-AI-STETH/COMMAND'

// Create variables to store audio data
let audioChunks = [];
let audioBlob = null;

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER);

// Subscribe to the audio stream topic
client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe(ANALYSE_TOPIC);
    client.subscribe(AUDIO_TOPIC)
});

// Handle incoming MQTT messages
client.on('message', function (topic, message) {
    // Check if the message is from the audio stream topic
    if (topic === AUDIO_TOPIC) {
        // Decode the message (assuming it's base64 encoded audio data)
        const audioData = atob(message);
        
        // Convert binary data to Uint8Array
        const dataArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            dataArray[i] = audioData.charCodeAt(i);
        }

        // Append the new data to the existing audioChunks array
        audioChunks.push(dataArray);

        // Concatenate all chunks into a single Blob
        audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

        // Create a URL for the audio Blob
        const audioURL = URL.createObjectURL(audioBlob);

        // Update the audio element's source
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = audioURL;
    }
});

client.on('message', function (topic, message) {
    // Check if the message is from the analyse topic
    if (topic === ANALYSE_TOPIC) {
        msg = message.toString();
        console.log(msg);
        detections.push(msg)
    }
    
});

function sendCommand(command){
    client.publish(COMMAND_TOPIC, command);
}

// Function to play the audio when the user interacts with the document
function playAudio() {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.play();
}

//
function findMostOccurringValue(arr) {
    let counts = {}; // Object to store counts of each value

    // Count occurrences of each value
    for (let i = 0; i < arr.length; i++) {
        let value = arr[i];
        counts[value] = (counts[value] || 0) + 1;
    }

    let maxCount = 0;
    let mostOccurringValue;

    // Find the value with the maximum count
    for (let value in counts) {
        if (counts[value] > maxCount) {
            maxCount = counts[value];
            mostOccurringValue = value;
        }
    }

    return mostOccurringValue;
}