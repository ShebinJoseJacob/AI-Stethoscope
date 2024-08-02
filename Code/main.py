import asyncio
import sounddevice as sd
import numpy as np
from scipy.signal import resample
from viam.robot.client import RobotClient
from viam.rpc.dial import Credentials, DialOptions
from viam.services.mlmodel.client import MLModelClient
from pubsub_python import Pubsub
import base64
import json

labels = ['AS', 'MR', 'MS', 'MVP', 'N']

async def connect_robot():
    opts = RobotClient.Options.with_api_key(
        api_key='XXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        api_key_id='XXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    )
    return await RobotClient.at_address('ai-steth-main.yyyyyyyyy.viam.cloud', opts)
async def connect_pubsub(robot):
    api = Pubsub.from_robot(robot, name="MQTT")
    return api

async def record_audio(duration, sample_rate):
    print("Recording audio...")
    audio_data = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='float32')
    sd.wait()
    print("Recording finished.")
    return audio_data

async def infer_audio(robot, audio_data):
    target_sample_rate = 16000  # Target sample rate
    audio_data = audio_data.squeeze()  # Remove singleton dimensions
    resampled_audio_data = resample(audio_data, int(len(audio_data) * target_sample_rate / 44100))

    input_tensors = {"0": resampled_audio_data}
    yamnet = MLModelClient.from_robot(robot=robot, name="TF")

    yamnet_output = await yamnet.infer(input_tensors)
    print(yamnet_output)

    keys = list(yamnet_output.keys())
    keys.sort()

    # Create the array using the sorted keys
    array = np.array([yamnet_output[key] for key in keys])
    index = np.argmax(array)
    label = labels[index]
    print(label)
    analyse_topic = "VIAM-ANALYSE"
    analyse_api = Pubsub.from_robot(robot, name="")
    await analyse_api.publish(analyse_topic, label, 0)

async def pubsub_publisher(api):
    await asyncio.sleep(1)
    await api.publish("VIAM-ANALYSE", "test message", 0)

async def pubsub_subscriber(api):
    def print_msg(msg):
        print(msg)
    await api.subscribe("VIAM-TEST", print_msg)

async def send_audio_stream(robot, audio_data):
    # Encode the audio data to base64
    audio_base64 = base64.b64encode(audio_data.tobytes()).decode('utf-8')

    # Connect to VIAM-AUDIO-STREAM MQTT topic and publish the payload
    audio_stream_topic = "VIAM-AUDIO-STREAM"
    audio_stream_api = Pubsub.from_robot(robot, name="MQTT")
    await audio_stream_api.publish(audio_stream_topic, audio_base64, 0)

async def main():
    robot = await connect_robot()
    api = await connect_pubsub(robot)

    duration = 2  # Record for 2 seconds

    while True:
        audio_data = await record_audio(duration, 44100)
        asyncio.ensure_future(infer_audio(robot, audio_data))
        asyncio.ensure_future(pubsub_subscriber(api))
        await pubsub_publisher(api)
        asyncio.ensure_future(send_audio_stream(robot, audio_data))
        await asyncio.sleep(2)

    await robot.close()

if __name__ == '__main__':
    asyncio.run(main())